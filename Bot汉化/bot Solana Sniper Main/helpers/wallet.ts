// 导入所需的模块和库
import { Keypair } from '@solana/web3.js'; // Solana 相关库
import bs58 from 'bs58'; // Base58 编码库
import { mnemonicToSeedSync } from 'bip39'; // 处理助记词的库
import { derivePath } from 'ed25519-hd-key'; // HD 钱包路径推导库

// 获取钱包的函数
export function getWallet(wallet: string): Keypair {
  // 如果钱包字符串以 "[" 开头，表示可能是二进制格式的私钥
  if (wallet.startsWith('[')) {
    return Keypair.fromSecretKey(JSON.parse(wallet)); // 解析并返回密钥对
  }

  // 如果钱包字符串包含空格，表示可能是助记词
  if (wallet.split(' ').length > 1) {
    const seed = mnemonicToSeedSync(wallet, ''); // 将助记词转换为种子
    const path = `m/44'/501'/0'/0'`; // 假设使用第一个路径
    return Keypair.fromSeed(derivePath(path, seed.toString('hex')).key); // 从种子生成密钥对
  }

  // 如果钱包字符串是 Base58 编码的私钥
  return Keypair.fromSecretKey(bs58.decode(wallet)); // 解码并返回密钥对
}
