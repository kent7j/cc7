// 导入所需的模块和库
import { BlockhashWithExpiryBlockHeight, Keypair, VersionedTransaction } from '@solana/web3.js'; // Solana 相关库

// 交易执行器接口
export interface TransactionExecutor {
  // 执行并确认交易的方法
  executeAndConfirm(
    transaction: VersionedTransaction, // 版本化交易
    payer: Keypair, // 付款方的密钥对
    latestBlockHash: BlockhashWithExpiryBlockHeight, // 最新区块哈希和过期区块高度
  ): Promise<{ confirmed: boolean; signature?: string; error?: string }>; // 返回确认结果、交易签名和可能的错误信息
}
