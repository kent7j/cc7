// 导入所需的模块和库
import {
  BlockhashWithExpiryBlockHeight,
  Keypair,
  PublicKey,
  SystemProgram,
  TransactionMessage,
  VersionedTransaction,
} from '@solana/web3.js'; // Solana 相关库
import { TransactionExecutor } from './transaction-executor.interface'; // 交易执行器接口
import { logger } from '../helpers'; // 日志记录器
import axios, { AxiosError } from 'axios'; // Axios 库用于 HTTP 请求
import bs58 from 'bs58'; // Base58 编码库
import { Currency, CurrencyAmount } from '@raydium-io/raydium-sdk'; // Raydium SDK

// Warp 交易执行器类
export class WarpTransactionExecutor implements TransactionExecutor {
  private readonly warpFeeWallet = new PublicKey('AXSBTx227eh6ZtEu5kHrKCWviW6R1JJV7oDJ63tX9GiH'); // Warp 费用钱包地址

  constructor(private readonly warpFee: string) {} // 初始化 Warp 费用

  // 执行并确认交易的公共方法
  public async executeAndConfirm(
    transaction: VersionedTransaction, // 版本化交易
    payer: Keypair, // 付款方的密钥对
    latestBlockhash: BlockhashWithExpiryBlockHeight, // 最新区块哈希和过期区块高度
  ): Promise<{ confirmed: boolean; signature?: string }> {
    logger.debug('正在执行交易...'); // 记录执行交易日志

    try {
      // 计算费用
      const fee = new CurrencyAmount(Currency.SOL, this.warpFee, false).raw.toNumber();
      // 创建 Warp 费用交易消息
      const warpFeeMessage = new TransactionMessage({
        payerKey: payer.publicKey, // 付款方公钥
        recentBlockhash: latestBlockhash.blockhash, // 最新区块哈希
        instructions: [
          SystemProgram.transfer({ // 转账指令
            fromPubkey: payer.publicKey, // 付款方公钥
            toPubkey: this.warpFeeWallet, // 收款方公钥
            lamports: fee, // 转账的 lamports 数量
          }),
        ],
      }).compileToV0Message(); // 编译为 V0 消息

      const warpFeeTx = new VersionedTransaction(warpFeeMessage); // 创建版本化交易
      warpFeeTx.sign([payer]); // 签名交易

      // 发送请求到 Warp 交易执行 API
      const response = await axios.post<{ confirmed: boolean; signature: string, error?: string }>(
        'https://tx.warp.id/transaction/execute', // API 地址
        {
          transactions: [bs58.encode(warpFeeTx.serialize()), bs58.encode(transaction.serialize())], // 发送序列化的交易
          latestBlockhash, // 最新区块哈希
        },
        {
          timeout: 100000, // 请求超时时间
        },
      );

      return response.data; // 返回响应数据
    } catch (error) {
      if (error instanceof AxiosError) {
        logger.trace({ error: error.response?.data }, '执行 Warp 交易失败'); // 记录错误信息
      }
    }

    return { confirmed: false }; // 返回未确认
  }
}
