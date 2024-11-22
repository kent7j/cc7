// 导入所需的模块和库
import {
  ComputeBudgetProgram,
  Connection,
  Keypair,
  PublicKey,
  TransactionMessage,
  VersionedTransaction,
} from '@solana/web3.js'; // Solana 相关库
import {
  createAssociatedTokenAccountIdempotentInstruction,
  createCloseAccountInstruction,
  getAccount,
  getAssociatedTokenAddress,
  RawAccount,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token'; // 代币相关操作
import { Liquidity, LiquidityPoolKeysV4, LiquidityStateV4, Percent, Token, TokenAmount } from '@raydium-io/raydium-sdk'; // Raydium SDK
import { MarketCache, PoolCache, SnipeListCache } from './cache'; // 缓存相关
import { PoolFilters } from './filters'; // 过滤器
import { TransactionExecutor } from './transactions'; // 交易执行器
import { createPoolKeys, logger, NETWORK, sleep } from './helpers'; // 辅助函数和常量
import { Mutex } from 'async-mutex'; // 互斥锁
import BN from 'bn.js'; // 大数字库
import { WarpTransactionExecutor } from './transactions/warp-transaction-executor'; // Warp 交易执行器
import { JitoTransactionExecutor } from './transactions/jito-rpc-transaction-executor'; // Jito 交易执行器

// 机器人配置接口
export interface BotConfig {
  wallet: Keypair; // 钱包密钥对
  checkRenounced: boolean; // 检查代币是否被放弃
  checkFreezable: boolean; // 检查代币是否可冻结
  checkBurned: boolean; // 检查代币是否已销毁
  minPoolSize: TokenAmount; // 最小池大小
  maxPoolSize: TokenAmount; // 最大池大小
  quoteToken: Token; // 报价代币
  quoteAmount: TokenAmount; // 报价金额
  quoteAta: PublicKey; // 报价代币的关联地址
  oneTokenAtATime: boolean; // 是否一次处理一个代币
  useSnipeList: boolean; // 是否使用抢购列表
  autoSell: boolean; // 是否自动出售
  autoBuyDelay: number; // 自动购买延迟
  autoSellDelay: number; // 自动出售延迟
  maxBuyRetries: number; // 最大购买重试次数
  maxSellRetries: number; // 最大出售重试次数
  unitLimit: number; // 计算单元限制
  unitPrice: number; // 计算单元价格
  takeProfit: number; // 止盈设置
  stopLoss: number; // 止损设置
  buySlippage: number; // 购买滑点
  sellSlippage: number; // 出售滑点
  priceCheckInterval: number; // 价格检查间隔
  priceCheckDuration: number; // 价格检查持续时间
  filterCheckInterval: number; // 过滤器检查间隔
  filterCheckDuration: number; // 过滤器检查持续时间
  consecutiveMatchCount: number; // 连续匹配次数
}

// 机器人类
export class Bot {
  private readonly poolFilters: PoolFilters; // 池过滤器

  // 抢购列表缓存
  private readonly snipeListCache?: SnipeListCache;

  // 一次处理一个代币
  private readonly mutex: Mutex; // 互斥锁
  private sellExecutionCount = 0; // 出售执行计数
  public readonly isWarp: boolean = false; // 是否使用Warp执行器
  public readonly isJito: boolean = false; // 是否使用Jito执行器

  constructor(
    private readonly connection: Connection, // Solana 连接
    private readonly marketStorage: MarketCache, // 市场缓存
    private readonly poolStorage: PoolCache, // 池缓存
    private readonly txExecutor: TransactionExecutor, // 交易执行器
    readonly config: BotConfig, // 机器人配置
  ) {
    this.isWarp = txExecutor instanceof WarpTransactionExecutor; // 判断是否使用Warp执行器
    this.isJito = txExecutor instanceof JitoTransactionExecutor; // 判断是否使用Jito执行器

    this.mutex = new Mutex(); // 初始化互斥锁
    this.poolFilters = new PoolFilters(connection, { // 初始化池过滤器
      quoteToken: this.config.quoteToken,
      minPoolSize: this.config.minPoolSize,
      maxPoolSize: this.config.maxPoolSize,
    });

    // 如果使用抢购列表，则初始化缓存
    if (this.config.useSnipeList) {
      this.snipeListCache = new SnipeListCache();
      this.snipeListCache.init();
    }
  }

  // 验证账户是否存在
  async validate() {
    try {
      await getAccount(this.connection, this.config.quoteAta, this.connection.commitment); // 获取代币账户
    } catch (error) {
      logger.error(
        `${this.config.quoteToken.symbol} 代币账户在钱包中未找到: ${this.config.wallet.publicKey.toString()}`,
      );
      return false; // 验证失败
    }

    return true; // 验证成功
  }

  // 购买代币
  public async buy(accountId: PublicKey, poolState: LiquidityStateV4) {
    logger.trace({ mint: poolState.baseMint }, `正在处理新池...`);

    // 如果使用抢购列表且代币不在列表中，则跳过购买
    if (this.config.useSnipeList && !this.snipeListCache?.isInList(poolState.baseMint.toString())) {
      logger.debug({ mint: poolState.baseMint.toString() }, `跳过购买，因为代币不在抢购列表中`);
      return;
    }

    // 等待自动购买延迟
    if (this.config.autoBuyDelay > 0) {
      logger.debug({ mint: poolState.baseMint }, `等待 ${this.config.autoBuyDelay} 毫秒再进行购买`);
      await sleep(this.config.autoBuyDelay);
    }

    // 一次处理一个代币
    if (this.config.oneTokenAtATime) {
      if (this.mutex.isLocked() || this.sellExecutionCount > 0) {
        logger.debug(
          { mint: poolState.baseMint.toString() },
          `跳过购买，因为一次只处理一个代币且代币已在处理中`,
        );
        return;
      }

      await this.mutex.acquire(); // 获取锁
    }

    try {
      const [market, mintAta] = await Promise.all([ // 并行获取市场和代币地址
        this.marketStorage.get(poolState.marketId.toString()),
        getAssociatedTokenAddress(poolState.baseMint, this.config.wallet.publicKey),
      ]);
      const poolKeys: LiquidityPoolKeysV4 = createPoolKeys(accountId, poolState, market); // 创建池密钥

      // 如果不使用抢购列表，则检查过滤器匹配
      if (!this.config.useSnipeList) {
        const match = await this.filterMatch(poolKeys);

        if (!match) {
          logger.trace({ mint: poolKeys.baseMint.toString() }, `跳过购买，因为池不匹配过滤器`);
          return;
        }
      }

      // 尝试购买代币
      for (let i = 0; i < this.config.maxBuyRetries; i++) {
        try {
          logger.info(
            { mint: poolState.baseMint.toString() },
            `发送购买交易尝试: ${i + 1}/${this.config.maxBuyRetries}`,
          );
          const tokenOut = new Token(TOKEN_PROGRAM_ID, poolKeys.baseMint, poolKeys.baseDecimals); // 代币输出
          const result = await this.swap(
            poolKeys,
            this.config.quoteAta,
            mintAta,
            this.config.quoteToken,
            tokenOut,
            this.config.quoteAmount,
            this.config.buySlippage,
            this.config.wallet,
            'buy', // 购买方向
          );

          if (result.confirmed) {
            logger.info(
              {
                mint: poolState.baseMint.toString(),
                signature: result.signature,
                url: `https://solscan.io/tx/${result.signature}?cluster=${NETWORK}`,
              },
              `确认购买交易`,
            );

            break; // 成功后退出循环
          }

          logger.info(
            {
              mint: poolState.baseMint.toString(),
              signature: result.signature,
              error: result.error,
            },
            `确认购买交易时出错`,
          );
        } catch (error) {
          logger.debug({ mint: poolState.baseMint.toString(), error }, `确认购买交易时出错`);
        }
      }
    } catch (error) {
      logger.error({ mint: poolState.baseMint.toString(), error }, `购买代币失败`);
    } finally {
      if (this.config.oneTokenAtATime) {
        this.mutex.release(); // 释放锁
      }
    }
  }

  // 出售代币
  public async sell(accountId: PublicKey, rawAccount: RawAccount) {
    if (this.config.oneTokenAtATime) {
      this.sellExecutionCount++; // 增加出售执行计数
    }

    try {
      logger.trace({ mint: rawAccount.mint }, `正在处理新代币...`);

      const poolData = await this.poolStorage.get(rawAccount.mint.toString()); // 获取池数据

      // 如果未找到池数据，则无法出售
      if (!poolData) {
        logger.trace({ mint: rawAccount.mint.toString() }, `代币池数据未找到，无法出售`);
        return;
      }

      const tokenIn = new Token(TOKEN_PROGRAM_ID, poolData.state.baseMint, poolData.state.baseDecimal.toNumber()); // 输入代币
      const tokenAmountIn = new TokenAmount(tokenIn, rawAccount.amount, true); // 输入代币金额

      // 如果输入代币金额为零，则无法出售
      if (tokenAmountIn.isZero()) {
        logger.info({ mint: rawAccount.mint.toString() }, `余额为空，无法出售`);
        return;
      }

      // 等待自动出售延迟
      if (this.config.autoSellDelay > 0) {
        logger.debug({ mint: rawAccount.mint }, `等待 ${this.config.autoSellDelay} 毫秒再进行出售`);
        await sleep(this.config.autoSellDelay);
      }

      const market = await this.marketStorage.get(poolData.state.marketId.toString()); // 获取市场数据
      const poolKeys: LiquidityPoolKeysV4 = createPoolKeys(new PublicKey(poolData.id), poolData.state, market); // 创建池密钥

      await this.priceMatch(tokenAmountIn, poolKeys); // 检查价格匹配

      // 尝试出售代币
      for (let i = 0; i < this.config.maxSellRetries; i++) {
        try {
          logger.info(
            { mint: rawAccount.mint },
            `发送出售交易尝试: ${i + 1}/${this.config.maxSellRetries}`,
          );

          const result = await this.swap(
            poolKeys,
            accountId,
            this.config.quoteAta,
            tokenIn,
            this.config.quoteToken,
            tokenAmountIn,
            this.config.sellSlippage,
            this.config.wallet,
            'sell', // 出售方向
          );

          if (result.confirmed) {
            logger.info(
              {
                dex: `https://dexscreener.com/solana/${rawAccount.mint.toString()}?maker=${this.config.wallet.publicKey}`,
                mint: rawAccount.mint.toString(),
                signature: result.signature,
                url: `https://solscan.io/tx/${result.signature}?cluster=${NETWORK}`,
              },
              `确认出售交易`,
            );
            break; // 成功后退出循环
          }

          logger.info(
            {
              mint: rawAccount.mint.toString(),
              signature: result.signature,
              error: result.error,
            },
            `确认出售交易时出错`,
          );
        } catch (error) {
          logger.debug({ mint: rawAccount.mint.toString(), error }, `确认出售交易时出错`);
        }
      }
    } catch (error) {
      logger.error({ mint: rawAccount.mint.toString(), error }, `出售代币失败`);
    } finally {
      if (this.config.oneTokenAtATime) {
        this.sellExecutionCount--; // 减少出售执行计数
      }
    }
  }

  // 交换代币
  private async swap(
    poolKeys: LiquidityPoolKeysV4,
    ataIn: PublicKey,
    ataOut: PublicKey,
    tokenIn: Token,
    tokenOut: Token,
    amountIn: TokenAmount,
    slippage: number,
    wallet: Keypair,
    direction: 'buy' | 'sell', // 购买或出售方向
  ) {
    const slippagePercent = new Percent(slippage, 100); // 计算滑点百分比
    const poolInfo = await Liquidity.fetchInfo({ // 获取池信息
      connection: this.connection,
      poolKeys,
    });

    // 计算输出金额
    const computedAmountOut = Liquidity.computeAmountOut({
      poolKeys,
      poolInfo,
      amountIn,
      currencyOut: tokenOut,
      slippage: slippagePercent,
    });

    const latestBlockhash = await this.connection.getLatestBlockhash(); // 获取最新区块哈希
    const { innerTransaction } = Liquidity.makeSwapFixedInInstruction(
      {
        poolKeys: poolKeys,
        userKeys: {
          tokenAccountIn: ataIn,
          tokenAccountOut: ataOut,
          owner: wallet.publicKey,
        },
        amountIn: amountIn.raw,
        minAmountOut: computedAmountOut.minAmountOut.raw,
      },
      poolKeys.version,
    );

    // 创建交易消息
    const messageV0 = new TransactionMessage({
      payerKey: wallet.publicKey,
      recentBlockhash: latestBlockhash.blockhash,
      instructions: [
        ...(this.isWarp || this.isJito
          ? []
          : [
            ComputeBudgetProgram.setComputeUnitPrice({ microLamports: this.config.unitPrice }), // 设置计算单元价格
            ComputeBudgetProgram.setComputeUnitLimit({ units: this.config.unitLimit }), // 设置计算单元限制
          ]),
        ...(direction === 'buy'
          ? [
            createAssociatedTokenAccountIdempotentInstruction( // 创建代币账户指令
              wallet.publicKey,
              ataOut,
              wallet.publicKey,
              tokenOut.mint,
            ),
          ]
          : []),
        ...innerTransaction.instructions,
        ...(direction === 'sell' ? [createCloseAccountInstruction(ataIn, wallet.publicKey, wallet.publicKey)] : []), // 创建关闭账户指令
      ],
    }).compileToV0Message(); // 编译为 V0 消息

    const transaction = new VersionedTransaction(messageV0); // 创建版本化交易
    transaction.sign([wallet, ...innerTransaction.signers]); // 签名交易

    // 执行并确认交易
    return this.txExecutor.executeAndConfirm(transaction, wallet, latestBlockhash);
  }

  // 检查过滤器匹配
  private async filterMatch(poolKeys: LiquidityPoolKeysV4) {
    if (this.config.filterCheckInterval === 0 || this.config.filterCheckDuration === 0) {
      return true; // 如果检查间隔或持续时间为0，直接返回true
    }

    const timesToCheck = this.config.filterCheckDuration / this.config.filterCheckInterval; // 计算检查次数
    let timesChecked = 0; // 记录检查次数
    let matchCount = 0; // 记录匹配次数

    do {
      try {
        const shouldBuy = await this.poolFilters.execute(poolKeys); // 执行过滤器

        if (shouldBuy) {
          matchCount++;

          if (this.config.consecutiveMatchCount <= matchCount) {
            logger.debug(
              { mint: poolKeys.baseMint.toString() },
              `过滤器匹配 ${matchCount}/${this.config.consecutiveMatchCount}`,
            );
            return true; // 如果匹配次数达到要求，返回true
          }
        } else {
          matchCount = 0; // 如果不匹配，重置匹配次数
        }

        await sleep(this.config.filterCheckInterval); // 等待检查间隔
      } finally {
        timesChecked++; // 增加检查次数
      }
    } while (timesChecked < timesToCheck); // 继续检查直到达到最大次数

    return false; // 没有匹配，返回false
  }

  // 检查价格匹配
  private async priceMatch(amountIn: TokenAmount, poolKeys: LiquidityPoolKeysV4) {
    if (this.config.priceCheckDuration === 0 || this.config.priceCheckInterval === 0) {
      return; // 如果检查持续时间或间隔为0，直接返回
    }

    const timesToCheck = this.config.priceCheckDuration / this.config.priceCheckInterval; // 计算检查次数
    const profitFraction = this.config.quoteAmount.mul(this.config.takeProfit).numerator.div(new BN(100)); // 计算止盈金额
    const profitAmount = new TokenAmount(this.config.quoteToken, profitFraction, true); // 止盈金额
    const takeProfit = this.config.quoteAmount.add(profitAmount); // 计算止盈点

    const lossFraction = this.config.quoteAmount.mul(this.config.stopLoss).numerator.div(new BN(100)); // 计算止损金额
    const lossAmount = new TokenAmount(this.config.quoteToken, lossFraction, true); // 止损金额
    const stopLoss = this.config.quoteAmount.subtract(lossAmount); // 计算止损点
    const slippage = new Percent(this.config.sellSlippage, 100); // 计算出售滑点
    let timesChecked = 0; // 记录检查次数

    do {
      try {
        const poolInfo = await Liquidity.fetchInfo({ // 获取池信息
          connection: this.connection,
          poolKeys,
        });

        const amountOut = Liquidity.computeAmountOut({ // 计算输出金额
          poolKeys,
          poolInfo,
          amountIn: amountIn,
          currencyOut: this.config.quoteToken,
          slippage,
        }).amountOut;

        logger.debug(
          { mint: poolKeys.baseMint.toString() },
          `止盈: ${takeProfit.toFixed()} | 止损: ${stopLoss.toFixed()} | 当前: ${amountOut.toFixed()}`,
        );

        // 如果当前输出金额小于止损点，则退出
        if (amountOut.lt(stopLoss)) {
          break;
        }

        // 如果当前输出金额大于止盈点，则退出
        if (amountOut.gt(takeProfit)) {
          break;
        }

        await sleep(this.config.priceCheckInterval); // 等待价格检查间隔
      } catch (e) {
        logger.trace({ mint: poolKeys.baseMint.toString(), e }, `检查代币价格时失败`);
      } finally {
        timesChecked++; // 增加检查次数
      }
    } while (timesChecked < timesToCheck); // 继续检查直到达到最大次数
  }
}
