// 导入所需的模块和库
import { Filter, FilterResult } from './pool-filters'; // 过滤器接口和结果类型
import { MintLayout } from '@solana/spl-token'; // 代币布局
import { Connection } from '@solana/web3.js'; // Solana 相关库
import { LiquidityPoolKeysV4 } from '@raydium-io/raydium-sdk'; // Raydium SDK 的流动性池密钥类型
import { logger } from '../helpers'; // 自定义日志记录器

// 创建 RenouncedFreezeFilter 类实现 Filter 接口
export class RenouncedFreezeFilter implements Filter {
  constructor(
    private readonly connection: Connection, // Solana 连接
    private readonly checkRenounced: boolean, // 是否检查是否放弃
    private readonly checkFreezable: boolean // 是否检查是否可冻结
  ) {}

  // 执行过滤器的方法
  async execute(poolKeys: LiquidityPoolKeysV4): Promise<FilterResult> {
    // 构建错误消息
    const errorMessage = [this.checkRenounced ? 'mint' : undefined, this.checkFreezable ? 'freeze' : undefined].filter((e) => e !== undefined);

    try {
      // 获取基础代币的账户信息
      const accountInfo = await this.connection.getAccountInfo(poolKeys.baseMint, this.connection.commitment);
      if (!accountInfo?.data) {
        return { ok: false, message: '放弃冻结 -> 获取账户数据失败' }; // 返回错误信息
      }

      // 解码代币账户信息
      const deserialize = MintLayout.decode(accountInfo.data);
      const renounced = !this.checkRenounced || deserialize.mintAuthorityOption === 0; // 检查是否放弃
      const freezable = !this.checkFreezable || deserialize.freezeAuthorityOption !== 0; // 检查是否可冻结

      // 构建返回消息
      const message = [renounced ? undefined : 'mint', !freezable ? undefined : 'freeze'].filter((e) => e !== undefined);
      const ok = renounced && !freezable; // 检查是否满足条件

      return { ok: ok, message: ok ? undefined : `放弃冻结 -> 创建者可以 ${message.join(' 和 ')} 代币` }; // 返回结果
    } catch (e) {
      // 记录错误日志
      logger.error({ mint: poolKeys.baseMint }, `放弃冻结 -> 检查创建者是否可以 ${errorMessage.join(' 和 ')} 代币失败`);
    }

    return { ok: false, message: `放弃冻结 -> 检查创建者是否可以 ${errorMessage.join(' 和 ')} 代币失败` }; // 返回未通过的结果
  }
}
