// 导入所需的模块和库
import { Connection, PublicKey } from '@solana/web3.js'; // Solana 相关库
import { getMinimalMarketV3, logger, MINIMAL_MARKET_STATE_LAYOUT_V3, MinimalMarketLayoutV3 } from '../helpers'; // 辅助函数和类型
import { MAINNET_PROGRAM_ID, MARKET_STATE_LAYOUT_V3, Token } from '@raydium-io/raydium-sdk'; // Raydium SDK

// 创建市场缓存类
export class MarketCache {
  private readonly keys: Map<string, MinimalMarketLayoutV3> = new Map<string, MinimalMarketLayoutV3>(); // 存储市场的 Map
  constructor(private readonly connection: Connection) {} // 构造函数，接受 Solana 连接

  // 初始化缓存的方法
  async init(config: { quoteToken: Token }) {
    logger.debug({}, `正在获取所有现有的 ${config.quoteToken.symbol} 市场...`); // 记录调试信息

    // 获取程序账户
    const accounts = await this.connection.getProgramAccounts(MAINNET_PROGRAM_ID.OPENBOOK_MARKET, {
      commitment: this.connection.commitment, // 提交级别
      dataSlice: {
        offset: MARKET_STATE_LAYOUT_V3.offsetOf('eventQueue'), // 数据偏移
        length: MINIMAL_MARKET_STATE_LAYOUT_V3.span, // 数据长度
      },
      filters: [
        { dataSize: MARKET_STATE_LAYOUT_V3.span }, // 数据大小过滤
        {
          memcmp: { // 根据报价代币的 mint 过滤
            offset: MARKET_STATE_LAYOUT_V3.offsetOf('quoteMint'),
            bytes: config.quoteToken.mint.toBase58(),
          },
        },
      ],
    });

    // 遍历账户并缓存市场信息
    for (const account of accounts) {
      const market = MINIMAL_MARKET_STATE_LAYOUT_V3.decode(account.account.data); // 解码市场信息
      this.keys.set(account.pubkey.toString(), market); // 将市场信息存入缓存
    }

    logger.debug({}, `缓存了 ${this.keys.size} 个市场`); // 记录缓存市场的数量
  }

  // 保存市场信息的方法
  public save(marketId: string, keys: MinimalMarketLayoutV3) {
    if (!this.keys.has(marketId)) { // 如果市场 ID 不在缓存中
      logger.trace({}, `缓存新市场: ${marketId}`); // 记录缓存新市场的信息
      this.keys.set(marketId, keys); // 将市场信息存入缓存
    }
  }

  // 获取市场信息的方法
  public async get(marketId: string): Promise<MinimalMarketLayoutV3> {
    if (this.keys.has(marketId)) { // 如果市场 ID 在缓存中
      return this.keys.get(marketId)!; // 返回缓存的市场信息
    }

    logger.trace({}, `获取市场 ${marketId} 的新密钥`); // 记录获取新市场信息的日志
    const market = await this.fetch(marketId); // 从区块链获取市场信息
    this.keys.set(marketId, market); // 将获取的市场信息存入缓存
    return market; // 返回市场信息
  }

  // 私有方法：从区块链获取市场信息
  private fetch(marketId: string): Promise<MinimalMarketLayoutV3> {
    return getMinimalMarketV3(this.connection, new PublicKey(marketId), this.connection.commitment); // 获取市场信息
  }
}
