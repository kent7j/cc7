// 导入所需的模块和库
import { Filter, FilterResult } from './pool-filters'; // 过滤器接口和结果类型
import { Connection, PublicKey } from '@solana/web3.js'; // Solana 相关库
import { LiquidityPoolKeysV4 } from '@raydium-io/raydium-sdk'; // Raydium SDK 的流动性池密钥类型
import { getPdaMetadataKey } from '@raydium-io/raydium-sdk'; // 获取 PDA 元数据键的函数
import { getMetadataAccountDataSerializer, MetadataAccountData, MetadataAccountDataArgs } from '@metaplex-foundation/mpl-token-metadata'; // Metaplex 相关库
import { Serializer } from '@metaplex-foundation/umi/serializers'; // Serializer 类型
import { logger } from '../helpers'; // 自定义日志记录器

// 创建 MutableFilter 类实现 Filter 接口
export class MutableFilter implements Filter {
  constructor(
    private readonly connection: Connection, // Solana 连接
    private readonly metadataSerializer: Serializer<MetadataAccountDataArgs, MetadataAccountData> // 元数据序列化器
  ) {}

  // 执行过滤器的方法
  async execute(poolKeys: LiquidityPoolKeysV4): Promise<FilterResult> {
    try {
      // 获取与基础代币相关的元数据 PDA
      const metadataPDA = getPdaMetadataKey(poolKeys.baseMint);
      // 获取元数据账户信息
      const metadataAccount = await this.connection.getAccountInfo(metadataPDA.publicKey);

      // 检查账户数据是否存在
      if (!metadataAccount?.data) {
        return { ok: false, message: '可变性 -> 获取账户数据失败' }; // 返回错误信息
      }

      // 反序列化账户数据
      const deserialize = this.metadataSerializer.deserialize(metadataAccount.data);
      const mutable = deserialize[0].isMutable; // 检查元数据是否可变

      // 返回结果
      return { ok: !mutable, message: !mutable ? undefined : "可变性 -> 创建者可以更改元数据" };
    } catch (e: any) {
      // 记录错误日志
      logger.error({ mint: poolKeys.baseMint }, `可变性 -> 检查元数据是否可变失败`);
    }

    return { ok: false, message: '可变性 -> 检查元数据是否可变失败' }; // 返回未通过的结果
  }
}
