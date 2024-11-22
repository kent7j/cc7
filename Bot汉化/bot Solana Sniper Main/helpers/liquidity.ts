// 导入所需的模块和库
import { PublicKey } from '@solana/web3.js'; // Solana 相关库
import { Liquidity, LiquidityPoolKeys, LiquidityStateV4, MAINNET_PROGRAM_ID, Market } from '@raydium-io/raydium-sdk'; // Raydium SDK
import { MinimalMarketLayoutV3 } from './market'; // 最小市场布局

// 创建流动池密钥的函数
export function createPoolKeys(
  id: PublicKey, // 流动池 ID
  accountData: LiquidityStateV4, // 流动池状态
  minimalMarketLayoutV3: MinimalMarketLayoutV3, // 最小市场布局
): LiquidityPoolKeys { // 返回流动池密钥
  return {
    id, // 流动池 ID
    baseMint: accountData.baseMint, // 基础代币的 mint 地址
    quoteMint: accountData.quoteMint, // 报价代币的 mint 地址
    lpMint: accountData.lpMint, // 流动性代币的 mint 地址
    baseDecimals: accountData.baseDecimal.toNumber(), // 基础代币的小数位数
    quoteDecimals: accountData.quoteDecimal.toNumber(), // 报价代币的小数位数
    lpDecimals: 5, // 流动性代币的小数位数
    version: 4, // 版本号
    programId: MAINNET_PROGRAM_ID.AmmV4, // 程序 ID
    authority: Liquidity.getAssociatedAuthority({ // 获取关联的授权公钥
      programId: MAINNET_PROGRAM_ID.AmmV4,
    }).publicKey,
    openOrders: accountData.openOrders, // 当前开放订单
    targetOrders: accountData.targetOrders, // 目标订单
    baseVault: accountData.baseVault, // 基础代币的库房地址
    quoteVault: accountData.quoteVault, // 报价代币的库房地址
    marketVersion: 3, // 市场版本号
    marketProgramId: accountData.marketProgramId, // 市场程序 ID
    marketId: accountData.marketId, // 市场 ID
    marketAuthority: Market.getAssociatedAuthority({ // 获取市场的关联授权公钥
      programId: accountData.marketProgramId,
      marketId: accountData.marketId,
    }).publicKey,
    marketBaseVault: accountData.baseVault, // 市场基础代币的库房地址
    marketQuoteVault: accountData.quoteVault, // 市场报价代币的库房地址
    marketBids: minimalMarketLayoutV3.bids, // 市场买入订单
    marketAsks: minimalMarketLayoutV3.asks, // 市场卖出订单
    marketEventQueue: minimalMarketLayoutV3.eventQueue, // 市场事件队列
    withdrawQueue: accountData.withdrawQueue, // 提款队列
    lpVault: accountData.lpVault, // 流动性代币库房地址
    lookupTableAccount: PublicKey.default, // 查找表账户
  };
}
