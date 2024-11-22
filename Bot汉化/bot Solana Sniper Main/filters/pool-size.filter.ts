// 导入所需的模块和库
import { Filter, FilterResult } from './pool-filters'; // 过滤器接口和结果类型
import { LiquidityPoolKeysV4, Token, TokenAmount } from '@raydium-io/raydium-sdk'; // Raydium SDK
import { Connection } from '@solana/web3.js'; // Solana 相关库
import { logger } from '../helpers'; // 自定义日志记录器

// 创建 PoolSizeFilter 类实现 Filter 接口
export class PoolSizeFilter implements Filter {
  constructor(
    private readonly connection: Connection, // Solana 连接
    private readonly quoteToken: Token, // 报价代币
    private readonly minPoolSize: TokenAmount, // 最小池大小
    private readonly maxPoolSize: TokenAmount, // 最大池大小
  ) {}

  // 执行过滤器的方法
  async execute(poolKeys: LiquidityPoolKeysV4): Promise<FilterResult> {
    try {
      // 获取报价库的账户余额
      const response = await this.connection.getTokenAccountBalance(poolKeys.quoteVault, this.connection.commitment);
      const poolSize = new TokenAmount(this.quoteToken, response.value.amount, true); // 创建池大小的 TokenAmount 实例
      let inRange = true; // 默认池大小在范围内

      // 检查最大池大小
      if (!this.maxPoolSize?.isZero()) {
        inRange = poolSize.raw.lte(this.maxPoolSize.raw); // 检查当前池大小是否小于等于最大池大小

        if (!inRange) {
          return { ok: false, message: `池大小 -> 池大小 ${poolSize.toFixed()} > ${this.maxPoolSize.toFixed()}` }; // 返回未通过的结果
        }
      }

      // 检查最小池大小
      if (!this.minPoolSize?.isZero()) {
        inRange = poolSize.raw.gte(this.minPoolSize.raw); // 检查当前池大小是否大于等于最小池大小

        if (!inRange) {
          return { ok: false, message: `池大小 -> 池大小 ${poolSize.toFixed()} < ${this.minPoolSize.toFixed()}` }; // 返回未通过的结果
        }
      }

      return { ok: inRange }; // 返回检查结果
    } catch (error) {
      // 记录错误日志
      logger.error({ mint: poolKeys.baseMint }, `检查池大小失败`);
    }

    return { ok: false, message: '池大小 -> 检查池大小失败' }; // 返回未通过的结果
  }
}
