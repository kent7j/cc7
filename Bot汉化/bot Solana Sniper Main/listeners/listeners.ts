// 导入所需的模块和库
import { LIQUIDITY_STATE_LAYOUT_V4, MAINNET_PROGRAM_ID, MARKET_STATE_LAYOUT_V3, Token } from '@raydium-io/raydium-sdk'; // Raydium SDK
import bs58 from 'bs58'; // Base58 编码库
import { Connection, PublicKey } from '@solana/web3.js'; // Solana 相关库
import { TOKEN_PROGRAM_ID } from '@solana/spl-token'; // 代币程序 ID
import { EventEmitter } from 'events'; // 事件发射器

// 监听器类，扩展自 EventEmitter
export class Listeners extends EventEmitter {
  private subscriptions: number[] = []; // 存储订阅 ID

  constructor(private readonly connection: Connection) {
    super(); // 调用父类构造函数
  }

  // 启动监听器，接受配置参数
  public async start(config: {
    walletPublicKey: PublicKey; // 钱包公钥
    quoteToken: Token; // 报价代币
    autoSell: boolean; // 是否自动出售
    cacheNewMarkets: boolean; // 是否缓存新市场
  }) {
    // 如果配置了缓存新市场，则订阅开放市场变化
    if (config.cacheNewMarkets) {
      const openBookSubscription = await this.subscribeToOpenBookMarkets(config);
      this.subscriptions.push(openBookSubscription); // 存储订阅 ID
    }

    // 订阅 Raydium 池变化
    const raydiumSubscription = await this.subscribeToRaydiumPools(config);
    this.subscriptions.push(raydiumSubscription); // 存储订阅 ID

    // 如果配置了自动出售，则订阅钱包变化
    if (config.autoSell) {
      const walletSubscription = await this.subscribeToWalletChanges(config);
      this.subscriptions.push(walletSubscription); // 存储订阅 ID
    }
  }

  // 订阅开放书市场的变化
  private async subscribeToOpenBookMarkets(config: { quoteToken: Token }) {
    return this.connection.onProgramAccountChange(
      MAINNET_PROGRAM_ID.OPENBOOK_MARKET, // 订阅的程序 ID
      async (updatedAccountInfo) => {
        this.emit('market', updatedAccountInfo); // 触发市场更新事件
      },
      this.connection.commitment, // 提交级别
      [
        { dataSize: MARKET_STATE_LAYOUT_V3.span }, // 数据大小过滤
        {
          memcmp: { // 根据报价代币的 mint 过滤
            offset: MARKET_STATE_LAYOUT_V3.offsetOf('quoteMint'),
            bytes: config.quoteToken.mint.toBase58(),
          },
        },
      ],
    );
  }

  // 订阅 Raydium 池的变化
  private async subscribeToRaydiumPools(config: { quoteToken: Token }) {
    return this.connection.onProgramAccountChange(
      MAINNET_PROGRAM_ID.AmmV4, // 订阅的程序 ID
      async (updatedAccountInfo) => {
        this.emit('pool', updatedAccountInfo); // 触发池更新事件
      },
      this.connection.commitment, // 提交级别
      [
        { dataSize: LIQUIDITY_STATE_LAYOUT_V4.span }, // 数据大小过滤
        {
          memcmp: { // 根据报价代币的 mint 过滤
            offset: LIQUIDITY_STATE_LAYOUT_V4.offsetOf('quoteMint'),
            bytes: config.quoteToken.mint.toBase58(),
          },
        },
        {
          memcmp: { // 根据市场程序 ID 过滤
            offset: LIQUIDITY_STATE_LAYOUT_V4.offsetOf('marketProgramId'),
            bytes: MAINNET_PROGRAM_ID.OPENBOOK_MARKET.toBase58(),
          },
        },
        {
          memcmp: { // 根据状态过滤
            offset: LIQUIDITY_STATE_LAYOUT_V4.offsetOf('status'),
            bytes: bs58.encode([6, 0, 0, 0, 0, 0, 0, 0]),
          },
        },
      ],
    );
  }

  // 订阅钱包变化
  private async subscribeToWalletChanges(config: { walletPublicKey: PublicKey }) {
    return this.connection.onProgramAccountChange(
      TOKEN_PROGRAM_ID, // 订阅的程序 ID
      async (updatedAccountInfo) => {
        this.emit('wallet', updatedAccountInfo); // 触发钱包更新事件
      },
      this.connection.commitment, // 提交级别
      [
        {
          dataSize: 165, // 数据大小过滤
        },
        {
          memcmp: { // 根据钱包公钥过滤
            offset: 32, // 偏移量
            bytes: config.walletPublicKey.toBase58(),
          },
        },
      ],
    );
  }

  // 停止所有订阅
  public async stop() {
    for (let i = this.subscriptions.length; i >= 0; --i) {
      const subscription = this.subscriptions[i];
      await this.connection.removeAccountChangeListener(subscription); // 移除账户变化监听
      this.subscriptions.splice(i, 1); // 从订阅列表中删除
    }
  }
}
