// 导入所需的模块和库
import {
  BlockhashWithExpiryBlockHeight,
  Connection,
  Keypair,
  Transaction,
  VersionedTransaction,
} from '@solana/web3.js'; // Solana 相关库
import { TransactionExecutor } from './transaction-executor.interface'; // 交易执行器接口
import { logger } from '../helpers'; // 日志记录器

// 默认交易执行器类
export class DefaultTransactionExecutor implements TransactionExecutor {
  constructor(private readonly connection: Connection) {} // 初始化连接

  // 执行并确认交易的公共方法
  public async executeAndConfirm(
    transaction: VersionedTransaction, // 版本化交易
    payer: Keypair, // 付款方的密钥对
    latestBlockhash: BlockhashWithExpiryBlockHeight, // 最新区块哈希和过期区块高度
  ): Promise<{ confirmed: boolean; signature?: string }> {
    logger.debug('正在执行交易...'); // 记录交易执行日志
    const signature = await this.execute(transaction); // 执行交易并获取签名

    logger.debug({ signature }, '正在确认交易...'); // 记录确认交易日志
    return this.confirm(signature, latestBlockhash); // 确认交易并返回结果
  }

  // 私有方法：执行交易
  private async execute(transaction: Transaction | VersionedTransaction) {
    return this.connection.sendRawTransaction(transaction.serialize(), { // 发送序列化的交易
      preflightCommitment: this.connection.commitment, // 提交前的确认级别
    });
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
