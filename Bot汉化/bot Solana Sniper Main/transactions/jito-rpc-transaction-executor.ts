// 导入所需的模块和库
import {
  BlockhashWithExpiryBlockHeight,
  Keypair,
  PublicKey,
  SystemProgram,
  Connection,
  TransactionMessage,
  VersionedTransaction,
} from '@solana/web3.js'; // Solana 相关库
import { TransactionExecutor } from './transaction-executor.interface'; // 交易执行器接口
import { logger } from '../helpers'; // 日志记录器
import axios, { AxiosError } from 'axios'; // Axios 库用于 HTTP 请求
import bs58 from 'bs58'; // Base58 编码库
import { Currency, CurrencyAmount } from '@raydium-io/raydium-sdk'; // Raydium SDK

// Jito 交易执行器类
export class JitoTransactionExecutor implements TransactionExecutor {
  // Jito 提示账户列表
  private jitpTipAccounts = [
    'Cw8CFyM9FkoMi7K7Crf6HNQqf4uEMzpKw6QNghXLvLkY',
    'DttWaMuVvTiduZRnguLF7jNxTgiMBZ1hyAumKUiL2KRL',
    '96gYZGLnJYVFmbjzopPSU6QiEV5fGqZNyN9nmNhvrZU5',
    '3AVi9Tg9Uo68tJfuvoKvqKNWKkC5wPdSSdeBnizKZ6jT',
    'HFqU5x63VTqvQss8hp11i4wVV8bD44PvwucfZ2bU7gRe',
    'ADaUMid9yfUytqMBgopwjb2DTLSokTSzL1zt6iGPaS49',
    'ADuUkR4vqLUMWXxW9gh6D6L8pMSawimctcNZ5pGwDcEt',
    'DfXygSm4jCyNCybVYYK6DwvWqjKee8pbDmJGcLWNDXjh',
  ];

  private JitoFeeWallet: PublicKey; // Jito 费用钱包

  constructor(
    private readonly jitoFee: string, // Jito 费用
    private readonly connection: Connection, // Solana 连接
  ) {
    this.JitoFeeWallet = this.getRandomValidatorKey(); // 获取随机验证者密钥
  }

  // 获取随机验证者密钥
  private getRandomValidatorKey(): PublicKey {
    const randomValidator = this.jitpTipAccounts[Math.floor(Math.random() * this.jitpTipAccounts.length)];
    return new PublicKey(randomValidator); // 返回随机选择的验证者密钥
  }

  // 执行并确认交易的公共方法
  public async executeAndConfirm(
    transaction: VersionedTransaction, // 版本化交易
    payer: Keypair, // 付款方的密钥对
    latestBlockhash: BlockhashWithExpiryBlockHeight, // 最新区块哈希和过期区块高度
  ): Promise<{ confirmed: boolean; signature?: string }> {
    logger.debug('开始 Jito 交易执行...'); // 记录交易执行开始日志
    this.JitoFeeWallet = this.getRandomValidatorKey(); // 每次执行时更新钱包密钥
    logger.trace(`选择的 Jito 费用钱包: ${this.JitoFeeWallet.toBase58()}`); // 记录选中的费用钱包

    try {
      const fee = new CurrencyAmount(Currency.SOL, this.jitoFee, false).raw.toNumber(); // 计算费用
      logger.trace(`计算的费用: ${fee} lamports`); // 记录计算的费用

      // 创建 Jito 提示交易消息
      const jitTipTxFeeMessage = new TransactionMessage({
        payerKey: payer.publicKey, // 付款方公钥
        recentBlockhash: latestBlockhash.blockhash, // 最新区块哈希
        instructions: [
          SystemProgram.transfer({ // 转账指令
            fromPubkey: payer.publicKey, // 付款方公钥
            toPubkey: this.JitoFeeWallet, // 收款方公钥
            lamports: fee, // 转账的 lamports 数量
          }),
        ],
      }).compileToV0Message(); // 编译为 V0 消息

      const jitoFeeTx = new VersionedTransaction(jitTipTxFeeMessage); // 创建版本化交易
      jitoFeeTx.sign([payer]); // 签名交易

      const jitoTxsignature = bs58.encode(jitoFeeTx.signatures[0]); // 获取签名并进行 Base58 编码

      // 一次性序列化交易
      const serializedjitoFeeTx = bs58.encode(jitoFeeTx.serialize()); // 序列化 Jito 费用交易
      const serializedTransaction = bs58.encode(transaction.serialize()); // 序列化主交易
      const serializedTransactions = [serializedjitoFeeTx, serializedTransaction]; // 组合交易

      // Jito API 端点列表
      const endpoints = [
        'https://mainnet.block-engine.jito.wtf/api/v1/bundles',
        'https://amsterdam.mainnet.block-engine.jito.wtf/api/v1/bundles',
        'https://frankfurt.mainnet.block-engine.jito.wtf/api/v1/bundles',
        'https://ny.mainnet.block-engine.jito.wtf/api/v1/bundles',
        'https://tokyo.mainnet.block-engine.jito.wtf/api/v1/bundles',
      ];

      // 发送请求到所有端点
      const requests = endpoints.map((url) =>
        axios.post(url, {
          jsonrpc: '2.0',
          id: 1,
          method: 'sendBundle',
          params: [serializedTransactions], // 发送序列化的交易
        }),
      );

      logger.trace('正在向端点发送交易...'); // 记录发送交易日志
      const results = await Promise.all(requests.map((p) => p.catch((e) => e))); // 等待所有请求结果

      const successfulResults = results.filter((result) => !(result instanceof Error)); // 筛选成功的结果

      if (successfulResults.length > 0) { // 如果至少有一个成功的响应
        logger.trace(`至少有一个成功的响应`); // 记录成功响应日志
        logger.debug(`确认 Jito 交易...`); // 记录确认交易日志
        return await this.confirm(jitoTxsignature, latestBlockhash); // 确认交易
      } else {
        logger.debug(`没有收到 Jito 的成功响应`); // 记录无成功响应日志
      }

      return { confirmed: false }; // 返回未确认
    } catch (error) {
      if (error instanceof AxiosError) {
        logger.trace({ error: error.response?.data }, '执行 Jito 交易失败'); // 记录错误信息
      }
      logger.error('交易执行期间出错', error); // 记录错误日志
      return { confirmed: false }; // 返回未确认
    }
  }

  // 私有方法：确认交易
  private async confirm(signature: string, latestBlockhash: BlockhashWithExpiryBlockHeight) {
    const confirmation = await this.connection.confirmTransaction(
      {
        signature, // 交易签名
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight, // 最后有效区块高度
        blockhash: latestBlockhash.blockhash, // 区块哈希
      },
      this.connection.commitment, // 提交的确认级别
    );

    return { confirmed: !confirmation.value.err, signature }; // 返回确认结果
  }
}
