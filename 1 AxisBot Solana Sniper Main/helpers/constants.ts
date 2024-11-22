// 导入所需的模块和库
import { Logger } from 'pino'; // 日志记录库
import dotenv from 'dotenv'; // 环境变量加载库
import { Commitment } from '@solana/web3.js'; // Solana 相关库
import { logger } from './logger'; // 自定义日志记录器

// 加载环境变量
dotenv.config();

// 检索环境变量的函数
const retrieveEnvVariable = (variableName: string, logger: Logger) => {
  const variable = process.env[variableName] || ''; // 从环境变量中获取值
  if (!variable) {
    logger.error(`${variableName} 未设置`); // 记录错误日志
    process.exit(1); // 退出程序
  }
  return variable; // 返回环境变量的值
};

// 钱包
export const PRIVATE_KEY = retrieveEnvVariable('PRIVATE_KEY', logger); // 私钥

// 连接配置
export const NETWORK = 'mainnet-beta'; // 网络
export const COMMITMENT_LEVEL: Commitment = retrieveEnvVariable('COMMITMENT_LEVEL', logger) as Commitment; // 提交级别
export const RPC_ENDPOINT = retrieveEnvVariable('RPC_ENDPOINT', logger); // RPC 端点
export const RPC_WEBSOCKET_ENDPOINT = retrieveEnvVariable('RPC_WEBSOCKET_ENDPOINT', logger); // RPC WebSocket 端点

// 机器人配置
export const LOG_LEVEL = retrieveEnvVariable('LOG_LEVEL', logger); // 日志级别
export const ONE_TOKEN_AT_A_TIME = retrieveEnvVariable('ONE_TOKEN_AT_A_TIME', logger) === 'true'; // 一次处理一个代币
export const COMPUTE_UNIT_LIMIT = Number(retrieveEnvVariable('COMPUTE_UNIT_LIMIT', logger)); // 计算单元限制
export const COMPUTE_UNIT_PRICE = Number(retrieveEnvVariable('COMPUTE_UNIT_PRICE', logger)); // 计算单元价格
export const PRE_LOAD_EXISTING_MARKETS = retrieveEnvVariable('PRE_LOAD_EXISTING_MARKETS', logger) === 'true'; // 预加载现有市场
export const CACHE_NEW_MARKETS = retrieveEnvVariable('CACHE_NEW_MARKETS', logger) === 'true'; // 缓存新市场
export const TRANSACTION_EXECUTOR = retrieveEnvVariable('TRANSACTION_EXECUTOR', logger); // 交易执行器类型
export const CUSTOM_FEE = retrieveEnvVariable('CUSTOM_FEE', logger); // 自定义费用

// 购买配置
export const AUTO_BUY_DELAY = Number(retrieveEnvVariable('AUTO_BUY_DELAY', logger)); // 自动购买延迟
export const QUOTE_MINT = retrieveEnvVariable('QUOTE_MINT', logger); // 报价代币的 mint
export const QUOTE_AMOUNT = retrieveEnvVariable('QUOTE_AMOUNT', logger); // 报价金额
export const MAX_BUY_RETRIES = Number(retrieveEnvVariable('MAX_BUY_RETRIES', logger)); // 最大购买重试次数
export const BUY_SLIPPAGE = Number(retrieveEnvVariable('BUY_SLIPPAGE', logger)); // 购买滑点

// 出售配置
export const AUTO_SELL = retrieveEnvVariable('AUTO_SELL', logger) === 'true'; // 是否自动出售
export const AUTO_SELL_DELAY = Number(retrieveEnvVariable('AUTO_SELL_DELAY', logger)); // 自动出售延迟
export const MAX_SELL_RETRIES = Number(retrieveEnvVariable('MAX_SELL_RETRIES', logger)); // 最大出售重试次数
export const TAKE_PROFIT = Number(retrieveEnvVariable('TAKE_PROFIT', logger)); // 止盈设置
export const STOP_LOSS = Number(retrieveEnvVariable('STOP_LOSS', logger)); // 止损设置
export const PRICE_CHECK_INTERVAL = Number(retrieveEnvVariable('PRICE_CHECK_INTERVAL', logger)); // 价格检查间隔
export const PRICE_CHECK_DURATION = Number(retrieveEnvVariable('PRICE_CHECK_DURATION', logger)); // 价格检查持续时间
export const SELL_SLIPPAGE = Number(retrieveEnvVariable('SELL_SLIPPAGE', logger)); // 出售滑点

// 过滤器配置
export const FILTER_CHECK_INTERVAL = Number(retrieveEnvVariable('FILTER_CHECK_INTERVAL', logger)); // 过滤器检查间隔
export const FILTER_CHECK_DURATION = Number(retrieveEnvVariable('FILTER_CHECK_DURATION', logger)); // 过滤器检查持续时间
export const CONSECUTIVE_FILTER_MATCHES = Number(retrieveEnvVariable('CONSECUTIVE_FILTER_MATCHES', logger)); // 连续过滤器匹配次数
export const CHECK_IF_MUTABLE = retrieveEnvVariable('CHECK_IF_MUTABLE', logger) === 'true'; // 检查是否可变
export const CHECK_IF_MINT_IS_RENOUNCED = retrieveEnvVariable('CHECK_IF_MINT_IS_RENOUNCED', logger) === 'true'; // 检查是否被放弃
export const CHECK_IF_FREEZABLE = retrieveEnvVariable('CHECK_IF_FREEZABLE', logger) === 'true'; // 检查是否可冻结
export const CHECK_IF_BURNED = retrieveEnvVariable('CHECK_IF_BURNED', logger) === 'true'; // 检查是否已销毁
export const MIN_POOL_SIZE = retrieveEnvVariable('MIN_POOL_SIZE', logger); // 最小池大小
export const MAX_POOL_SIZE = retrieveEnvVariable('MAX_POOL_SIZE', logger); // 最大池大小
export const USE_SNIPE_LIST = retrieveEnvVariable('USE_SNIPE_LIST', logger) === 'true'; // 使用抢购列表
export const SNIPE_LIST_REFRESH_INTERVAL = Number(retrieveEnvVariable('SNIPE_LIST_REFRESH_INTERVAL', logger)); // 抢购列表刷新间隔
