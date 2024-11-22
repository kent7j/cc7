// 导入所需的模块和库
import { Token } from '@raydium-io/raydium-sdk'; // Raydium SDK 的 Token 类
import { TOKEN_PROGRAM_ID } from '@solana/spl-token'; // Solana 代币程序 ID
import { PublicKey } from '@solana/web3.js'; // Solana 相关库

// 获取代币的函数
export function getToken(token: string) {
  // 根据代币类型返回相应的 Token 对象
  switch (token) {
    case 'WSOL': { // 如果代币是 WSOL
      return Token.WSOL; // 返回 WSOL 代币对象
    }
    case 'USDC': { // 如果代币是 USDC
      return new Token(
        TOKEN_PROGRAM_ID, // 代币程序 ID
        new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'), // USDC 的公钥
        6, // USDC 的小数位数
        'USDC', // 代币符号
        'USDC', // 代币名称
      );
    }
    default: { // 处理不支持的代币类型
      throw new Error(`不支持的报价代币 "${token}"。支持的值为 USDC 和 WSOL`); // 抛出错误
    }
  }
}
