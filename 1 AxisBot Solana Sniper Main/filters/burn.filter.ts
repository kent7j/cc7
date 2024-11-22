// 导入所需的模块和库
import { Filter, FilterResult } from './pool-filters'; // 过滤器接口和结果类型
import { Connection } from '@solana/web3.js'; // Solana 相关库
import { LiquidityPoolKeysV4 } from '@raydium-io/raydium-sdk'; // Raydium SDK 的流动性池密钥类型
import { logger } from '../helpers'; // 自定义日志记录器

// 创建 BurnFilter 类实现 Filter 接口
export class BurnFilter implements Filter {
  constructor(private readonly connection: Connection) {} // 构造函数，接受 Solana 连接

  // 执行过滤器的方法
  async execute(poolKeys: LiquidityPoolKeysV4): Promise<FilterResult> {
    try {
      // 获取流动性池的代币供应量
      const amount = await this.connection.getTokenSupply(poolKeys.lpMint, this.connection.commitment);
      const burned = amount.value.uiAmount === 0; // 判断 LP 是否已被销毁
      return { ok: burned, message: burned ? undefined : "已销毁 -> 创建者未销毁 LP" }; // 返回结果
    } catch (e: any) {
      // 捕获错误，检查错误代码
      if (e.code == -32602) {
        return { ok: true }; // 如果是特定错误代码，返回 ok 为 true
      }

      // 记录错误日志
      logger.error({ mint: poolKeys.baseMint }, `检查 LP 是否已销毁失败`);
    }

    return { ok: false, message: '检查 LP 是否已销毁失败' }; // 返回未通过的结果
  }
}
