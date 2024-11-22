// 导入所需的模块和库
import { MarketCache, PoolCache } from './cache'; // 缓存相关
import { Listeners } from './listeners'; // 监听器
import { Connection, KeyedAccountInfo, Keypair } from '@solana/web3.js'; // Solana 连接和账户信息
import { LIQUIDITY_STATE_LAYOUT_V4, MARKET_STATE_LAYOUT_V3, Token, TokenAmount } from '@raydium-io/raydium-sdk'; // Raydium SDK
import { AccountLayout, getAssociatedTokenAddressSync } from '@solana/spl-token'; // 账户布局和代币地址
import { Bot, BotConfig } from './bot'; // 机器人相关
import { DefaultTransactionExecutor, TransactionExecutor } from './transactions'; // 交易执行器
import {
  getToken,
  getWallet,
  logger,
  COMMITMENT_LEVEL,
  RPC_ENDPOINT,
  RPC_WEBSOCKET_ENDPOINT,
  PRE_LOAD_EXISTING_MARKETS,
  LOG_LEVEL,
  CHECK_IF_MUTABLE,
  CHECK_IF_MINT_IS_RENOUNCED,
  CHECK_IF_FREEZABLE,
  CHECK_IF_BURNED,
  QUOTE_MINT,
  MAX_POOL_SIZE,
  MIN_POOL_SIZE,
  QUOTE_AMOUNT,
  PRIVATE_KEY,
  USE_SNIPE_LIST,
  ONE_TOKEN_AT_A_TIME,
  AUTO_SELL_DELAY,
  MAX_SELL_RETRIES,
  AUTO_SELL,
  MAX_BUY_RETRIES,
  AUTO_BUY_DELAY,
  COMPUTE_UNIT_LIMIT,
  COMPUTE_UNIT_PRICE,
  CACHE_NEW_MARKETS,
  TAKE_PROFIT,
  STOP_LOSS,
  BUY_SLIPPAGE,
  SELL_SLIPPAGE,
  PRICE_CHECK_DURATION,
  PRICE_CHECK_INTERVAL,
  SNIPE_LIST_REFRESH_INTERVAL,
  TRANSACTION_EXECUTOR,
  CUSTOM_FEE,
  FILTER_CHECK_INTERVAL,
  FILTER_CHECK_DURATION,
  CONSECUTIVE_FILTER_MATCHES,
} from './helpers'; // 辅助函数和常量
import { version } from './package.json'; // 获取版本信息
import { WarpTransactionExecutor } from './transactions/warp-transaction-executor'; // Warp 交易执行器
import { JitoTransactionExecutor } from './transactions/jito-rpc-transaction-executor'; // Jito 交易执行器

// 创建与Solana区块链的连接
const connection = new Connection(RPC_ENDPOINT, {
  wsEndpoint: RPC_WEBSOCKET_ENDPOINT,
  commitment: COMMITMENT_LEVEL,
});

// 打印钱包和机器人配置信息的函数
function printDetails(wallet: Keypair, quoteToken: Token, bot: Bot) {
  logger.info(`  
  
 █████╗ ██╗  ██╗██╗███████╗██████╗  ██████╗ ████████╗
██╔══██╗╚██╗██╔╝██║██╔════╝██╔══██╗██╔═══██╗╚══██╔══╝
███████║ ╚███╔╝ ██║███████╗██████╔╝██║   ██║   ██║   
██╔══██║ ██╔██╗ ██║╚════██║██╔══██╗██║   ██║   ██║   
██║  ██║██╔╝ ██╗██║███████║██████╔╝╚██████╔╝   ██║   
╚═╝  ╚═╝╚═╝  ╚═╝╚═╝╚══════╝╚═════╝  ╚═════╝    ╚═╝                                                   
                            
          AxisBot Solana Sniper v1.0
          制作团队：AxisBot Team
          版本：${version}                                          
  `);

  const botConfig = bot.config; // 获取机器人配置

  logger.info('------- 配置开始 -------');
  logger.info(`钱包地址: ${wallet.publicKey.toString()}`);

  logger.info('- 机器人 -');

  logger.info(
    `使用的执行器: ${bot.isWarp || bot.isJito || (TRANSACTION_EXECUTOR === 'default' ? true : false)}`,
  );
  if (bot.isWarp || bot.isJito) {
    logger.info(`${TRANSACTION_EXECUTOR} 费用: ${CUSTOM_FEE}`); // 打印执行器费用
  } else {
    logger.info(`计算单元限制: ${botConfig.unitLimit}`); // 打印计算单元限制
    logger.info(`计算单元价格（微 lamports）: ${botConfig.unitPrice}`); // 打印计算单元价格
  }

  logger.info(`每次处理一个代币: ${botConfig.oneTokenAtATime}`); // 打印每次处理一个代币的设置
  logger.info(`预加载现有市场: ${PRE_LOAD_EXISTING_MARKETS}`); // 打印是否预加载现有市场
  logger.info(`缓存新市场: ${CACHE_NEW_MARKETS}`); // 打印缓存新市场的设置
  logger.info(`日志级别: ${LOG_LEVEL}`); // 打印日志级别

  logger.info('- 购买 -');
  logger.info(`购买金额: ${botConfig.quoteAmount.toFixed()} ${botConfig.quoteToken.name}`); // 打印购买金额
  logger.info(`自动购买延迟: ${botConfig.autoBuyDelay} 毫秒`); // 打印自动购买延迟
  logger.info(`最大购买重试次数: ${botConfig.maxBuyRetries}`); // 打印最大购买重试次数
  logger.info(`购买金额（${quoteToken.symbol}）: ${botConfig.quoteAmount.toFixed()}`); // 打印购买金额
  logger.info(`购买滑点: ${botConfig.buySlippage}%`); // 打印购买滑点

  logger.info('- 出售 -');
  logger.info(`自动出售: ${AUTO_SELL}`); // 打印自动出售设置
  logger.info(`自动出售延迟: ${botConfig.autoSellDelay} 毫秒`); // 打印自动出售延迟
  logger.info(`最大出售重试次数: ${botConfig.maxSellRetries}`); // 打印最大出售重试次数
  logger.info(`出售滑点: ${botConfig.sellSlippage}%`); // 打印出售滑点
  logger.info(`价格检查间隔: ${botConfig.priceCheckInterval} 毫秒`); // 打印价格检查间隔
  logger.info(`价格检查持续时间: ${botConfig.priceCheckDuration} 毫秒`); // 打印价格检查持续时间
  logger.info(`止盈: ${botConfig.takeProfit}%`); // 打印止盈设置
  logger.info(`止损: ${botConfig.stopLoss}%`); // 打印止损设置

  logger.info('- 抢购列表 -');
  logger.info(`使用抢购列表: ${botConfig.useSnipeList}`); // 打印抢购列表设置
  logger.info(`抢购列表刷新间隔: ${SNIPE_LIST_REFRESH_INTERVAL} 毫秒`); // 打印抢购列表刷新间隔

  if (botConfig.useSnipeList) {
    logger.info('- 过滤器 -');
    logger.info(`启用抢购列表时过滤器被禁用`); // 打印过滤器禁用信息
  } else {
    logger.info('- 过滤器 -');
    logger.info(`过滤器检查间隔: ${botConfig.filterCheckInterval} 毫秒`); // 打印过滤器检查间隔
    logger.info(`过滤器检查持续时间: ${botConfig.filterCheckDuration} 毫秒`); // 打印过滤器检查持续时间
    logger.info(`连续过滤器匹配次数: ${botConfig.consecutiveMatchCount}`); // 打印连续过滤器匹配次数
    logger.info(`检查是否被放弃: ${botConfig.checkRenounced}`); // 打印检查是否被放弃设置
    logger.info(`检查是否可冻结: ${botConfig.checkFreezable}`); // 打印检查是否可冻结设置
    logger.info(`检查是否已销毁: ${botConfig.checkBurned}`); // 打印检查是否已销毁设置
    logger.info(`最小池大小: ${botConfig.minPoolSize.toFixed()}`); // 打印最小池大小
    logger.info(`最大池大小: ${botConfig.maxPoolSize.toFixed()}`); // 打印最大池大小
  }

  logger.info('------- 配置结束 -------');

  logger.info('机器人正在运行！按 CTRL + C 停止它。');
}

// 启动监听器的函数
const runListener = async () => {
  logger.level = LOG_LEVEL; // 设置日志级别
  logger.info('机器人正在启动...'); // 打印启动信息

  const marketCache = new MarketCache(connection); // 创建市场缓存
  const poolCache = new PoolCache(); // 创建池缓存
  let txExecutor: TransactionExecutor; // 定义交易执行器变量

  // 根据配置选择交易执行器
  switch (TRANSACTION_EXECUTOR) {
    case 'warp': {
      txExecutor = new WarpTransactionExecutor(CUSTOM_FEE); // 创建Warp交易执行器
      break;
    }
    case 'jito': {
      txExecutor = new JitoTransactionExecutor(CUSTOM_FEE, connection); // 创建Jito交易执行器
      break;
    }
    default: {
      txExecutor = new DefaultTransactionExecutor(connection); // 默认交易执行器
      break;
    }
  }

  const wallet = getWallet(PRIVATE_KEY.trim()); // 获取钱包
  const quoteToken = getToken(QUOTE_MINT); // 获取报价代币
  const botConfig = <BotConfig>{
    wallet,
    quoteAta: getAssociatedTokenAddressSync(quoteToken.mint, wallet.publicKey), // 获取关联代币地址
    checkRenounced: CHECK_IF_MINT_IS_RENOUNCED,
    checkFreezable: CHECK_IF_FREEZABLE,
    checkBurned: CHECK_IF_BURNED,
    minPoolSize: new TokenAmount(quoteToken, MIN_POOL_SIZE, false), // 最小池大小
    maxPoolSize: new TokenAmount(quoteToken, MAX_POOL_SIZE, false), // 最大池大小
    quoteToken,
    quoteAmount: new TokenAmount(quoteToken, QUOTE_AMOUNT, false), // 报价金额
    oneTokenAtATime: ONE_TOKEN_AT_A_TIME,
    useSnipeList: USE_SNIPE_LIST,
    autoSell: AUTO_SELL,
    autoSellDelay: AUTO_SELL_DELAY,
    maxSellRetries: MAX_SELL_RETRIES,
    autoBuyDelay: AUTO_BUY_DELAY,
    maxBuyRetries: MAX_BUY_RETRIES,
    unitLimit: COMPUTE_UNIT_LIMIT, // 计算单元限制
    unitPrice: COMPUTE_UNIT_PRICE, // 计算单元价格
    takeProfit: TAKE_PROFIT, // 止盈设置
    stopLoss: STOP_LOSS, // 止损设置
    buySlippage: BUY_SLIPPAGE, // 购买滑点
    sellSlippage: SELL_SLIPPAGE, // 出售滑点
    priceCheckInterval: PRICE_CHECK_INTERVAL, // 价格检查间隔
    priceCheckDuration: PRICE_CHECK_DURATION, // 价格检查持续时间
    filterCheckInterval: FILTER_CHECK_INTERVAL, // 过滤器检查间隔
    filterCheckDuration: FILTER_CHECK_DURATION, // 过滤器检查持续时间
    consecutiveMatchCount: CONSECUTIVE_FILTER_MATCHES, // 连续匹配次数
  };

  const bot = new Bot(connection, marketCache, poolCache, txExecutor, botConfig); // 创建机器人实例
  const valid = await bot.validate(); // 验证机器人配置

  if (!valid) {
    logger.info('机器人正在退出...'); // 验证失败时退出
    process.exit(1); // 退出程序
  }

  if (PRE_LOAD_EXISTING_MARKETS) {
    await marketCache.init({ quoteToken }); // 初始化市场缓存
  }

  const runTimestamp = Math.floor(new Date().getTime() / 1000); // 获取当前时间戳
  const listeners = new Listeners(connection); // 创建监听器实例
  await listeners.start({
    walletPublicKey: wallet.publicKey,
    quoteToken,
    autoSell: AUTO_SELL,
    cacheNewMarkets: CACHE_NEW_MARKETS,
  });

  // 监听市场信息更新
  listeners.on('market', (updatedAccountInfo: KeyedAccountInfo) => {
    const marketState = MARKET_STATE_LAYOUT_V3.decode(updatedAccountInfo.accountInfo.data); // 解码市场状态
    marketCache.save(updatedAccountInfo.accountId.toString(), marketState); // 保存市场状态
  });

  // 监听池信息更新
  listeners.on('pool', async (updatedAccountInfo: KeyedAccountInfo) => {
    const poolState = LIQUIDITY_STATE_LAYOUT_V4.decode(updatedAccountInfo.accountInfo.data); // 解码池状态
    const poolOpenTime = parseInt(poolState.poolOpenTime.toString()); // 获取池开放时间
    const exists = await poolCache.get(poolState.baseMint.toString()); // 检查池是否存在

    // 如果池不存在且开放时间在当前时间之后，则进行购买
    if (!exists && poolOpenTime > runTimestamp) {
      poolCache.save(updatedAccountInfo.accountId.toString(), poolState); // 保存池状态
      await bot.buy(updatedAccountInfo.accountId, poolState); // 执行购买
    }
  });

  // 监听钱包信息更新
  listeners.on('wallet', async (updatedAccountInfo: KeyedAccountInfo) => {
    const accountData = AccountLayout.decode(updatedAccountInfo.accountInfo.data); // 解码账户数据

    // 如果账户数据的mint与报价代币相同，则返回
    if (accountData.mint.equals(quoteToken.mint)) {
      return;
    }

    await bot.sell(updatedAccountInfo.accountId, accountData); // 执行出售
  });

  printDetails(wallet, quoteToken, bot); // 打印详细信息
};

// 运行监听器
runListener();
