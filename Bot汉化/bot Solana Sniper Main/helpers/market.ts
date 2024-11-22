// 导入所需的模块和库
import { Commitment, Connection, PublicKey } from '@solana/web3.js'; // Solana 相关库
import { GetStructureSchema, MARKET_STATE_LAYOUT_V3, publicKey, struct } from '@raydium-io/raydium-sdk'; // Raydium SDK

// 定义最小市场状态布局 V3
export const MINIMAL_MARKET_STATE_LAYOUT_V3 = struct([
  publicKey('eventQueue'), // 事件队列的公钥
  publicKey('bids'), // 买入订单的公钥
  publicKey('asks'), // 卖出订单的公钥
]);

// 定义类型
export type MinimalMarketStateLayoutV3 = typeof MINIMAL_MARKET_STATE_LAYOUT_V3; // 最小市场状态布局类型
export type MinimalMarketLayoutV3 = GetStructureSchema<MinimalMarketStateLayoutV3>; // 获取最小市场布局的结构类型

// 获取最小市场 V3 的异步函数
export async function getMinimalMarketV3(
  connection: Connection, // Solana 连接
  marketId: PublicKey, // 市场 ID
  commitment?: Commitment, // 提交级别（可选）
): Promise<MinimalMarketLayoutV3> { // 返回最小市场布局 V3
                                    // 从区块链获取市场信息
  const marketInfo = await connection.getAccountInfo(marketId, {
    commitment, // 提交级别
    dataSlice: { // 数据切片
      offset: MARKET_STATE_LAYOUT_V3.offsetOf('eventQueue'), // 从事件队列开始的偏移
      length: 32 * 3, // 读取的长度
    },
  });

  // 解码并返回市场信息
  return MINIMAL_MARKET_STATE_LAYOUT_V3.decode(marketInfo!.data);
}
