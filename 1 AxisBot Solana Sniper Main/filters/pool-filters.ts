// 导入所需的模块和库
import { Connection } from '@solana/web3.js'; // Solana 相关库
import { LiquidityPoolKeysV4, Token, TokenAmount } from '@raydium-io/raydium-sdk'; // Raydium SDK
import { getMetadataAccountDataSerializer } from '@metaplex-foundation/mpl-token-metadata'; // Metaplex 相关库
import { BurnFilter } from './burn.filter'; // 引入销毁过滤器
import { MutableFilter } from './mutable.filter'; // 引入可变性过滤器
import { RenouncedFreezeFilter } from './renounced.filter'; // 引入放弃冻结过滤器
import { PoolSizeFilter } from './pool-size.filter'; // 引入池大小过滤器
import { CHECK_IF_BURNED, CHECK_IF_FREEZABLE, CHECK_IF_MINT_IS_RENOUNCED, CHECK_IF_MUTABLE, logger } from '../helpers'; // 引入辅助函数和常量

// 过滤器接口
export interface Filter {
  execute(poolKeysV4: LiquidityPoolKeysV4): Promise<FilterResult>; // 执行过滤器的方法
}

// 过滤器结果接口
export interface FilterResult {
  ok: boolean; // 过滤器是否通过
  message?: string; // 可选的消息
}

// 池过滤器参数接口
export interface PoolFilterArgs {
  minPoolSize: TokenAmount; // 最小池大小
  maxPoolSize: TokenAmount; // 最大池大小
  quoteToken: Token; // 报价代币
}

// 池过滤器类
export class PoolFilters {
  private readonly filters: Filter[] = []; // 存储过滤器数组

  constructor(
    readonly connection: Connection, // Solana 连接
    readonly args: PoolFilterArgs, // 过滤器参数
  ) {
    // 根据配置条件添加相应的过滤器
    if (CHECK_IF_BURNED) {
      this.filters.push(new BurnFilter(connection)); // 添加销毁过滤器
    }

    if (CHECK_IF_MINT_IS_RENOUNCED || CHECK_IF_FREEZABLE) {
      this.filters.push(new RenouncedFreezeFilter(connection, CHECK_IF_MINT_IS_RENOUNCED, CHECK_IF_FREEZABLE)); // 添加放弃冻结过滤器
    }

    if (CHECK_IF_MUTABLE) {
      this.filters.push(new MutableFilter(connection, getMetadataAccountDataSerializer())); // 添加可变性过滤器
    }

    // 如果最小或最大池大小不为零，添加池大小过滤器
    if (!args.minPoolSize.isZero() || !args.maxPoolSize.isZero()) {
      this.filters.push(new PoolSizeFilter(connection, args.quoteToken, args.minPoolSize, args.maxPoolSize));
    }
  }

  // 执行所有过滤器的方法
  public async execute(poolKeys: LiquidityPoolKeysV4): Promise<boolean> {
    // 如果没有过滤器，则通过
    if (this.filters.length === 0) {
      return true;
    }

    // 并行执行所有过滤器
    const result = await Promise.all(this.filters.map((f) => f.execute(poolKeys)));
    const pass = result.every((r) => r.ok); // 检查是否所有过滤器都通过

    if (pass) {
      return true; // 如果所有过滤器都通过，返回 true
    }

    // 记录未通过过滤器的消息
    for (const filterResult of result.filter((r) => !r.ok)) {
      logger.trace(filterResult.message);
    }

    return false; // 返回 false，表示未通过
  }
}
