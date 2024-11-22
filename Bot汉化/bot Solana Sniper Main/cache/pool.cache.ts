// 导入所需的模块和库
import { LiquidityStateV4 } from '@raydium-io/raydium-sdk'; // Raydium SDK
import { logger } from '../helpers'; // 自定义日志记录器

// 创建 PoolCache 类
export class PoolCache {
  private readonly keys: Map<string, { id: string; state: LiquidityStateV4 }> = new Map< // 存储池的 Map
    string,
    { id: string; state: LiquidityStateV4 } // 键为代币 mint，值为池 ID 和状态
  >();

  // 保存池信息的方法
  public save(id: string, state: LiquidityStateV4) {
    // 如果状态的基础代币 mint 不在缓存中
    if (!this.keys.has(state.baseMint.toString())) {
      logger.trace(`缓存新池，代币 mint: ${state.baseMint.toString()}`); // 记录缓存新池的信息
      this.keys.set(state.baseMint.toString(), { id, state }); // 将池信息存入缓存
    }
  }

  // 获取池信息的方法
  public async get(mint: string): Promise<{ id: string; state: LiquidityStateV4 }> {
    return this.keys.get(mint)!; // 返回缓存的池信息
  }
}
