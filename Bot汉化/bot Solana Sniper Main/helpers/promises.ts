// 创建一个睡眠函数，返回一个 Promise
export const sleep = (ms = 0) => new Promise((resolve) => setTimeout(resolve, ms));
// 默认参数 ms 为 0，调用 setTimeout 在指定的毫秒数后解析 Promise
