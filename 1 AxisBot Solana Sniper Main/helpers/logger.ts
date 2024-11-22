// 导入 pino 日志库
import pino from 'pino';

// 配置日志传输格式
const transport = pino.transport({
  target: 'pino-pretty', // 使用 pino-pretty 格式化日志输出
});

// 创建日志记录器
export const logger = pino(
  {
    level: 'info', // 设置日志级别为 info
    redact: ['poolKeys'], // 遮蔽 poolKeys 字段以保护敏感信息
    serializers: {
      error: pino.stdSerializers.err, // 使用标准错误序列化器
    },
    base: undefined, // 不输出基础字段
  },
  transport, // 使用配置的传输格式
);
