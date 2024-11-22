// 导入所需的模块和库
import fs from 'fs'; // 文件系统模块
import path from 'path'; // 路径处理模块
import { logger, SNIPE_LIST_REFRESH_INTERVAL } from '../helpers'; // 自定义日志记录器和常量

// 创建 SnipeListCache 类
export class SnipeListCache {
  private snipeList: string[] = []; // 存储抢购列表
  private fileLocation = path.join(__dirname, '../snipe-list.txt'); // 抢购列表文件的路径

  constructor() {
    // 设置定时器，定时刷新抢购列表
    setInterval(() => this.loadSnipeList(), SNIPE_LIST_REFRESH_INTERVAL);
  }

  // 初始化方法，加载抢购列表
  public init() {
    this.loadSnipeList(); // 加载抢购列表
  }

  // 检查某个 mint 是否在抢购列表中
  public isInList(mint: string) {
    return this.snipeList.includes(mint); // 返回结果
  }

  // 私有方法：加载抢购列表
  private loadSnipeList() {
    logger.trace(`正在刷新抢购列表...`); // 记录刷新日志

    const count = this.snipeList.length; // 记录当前列表的长度
    const data = fs.readFileSync(this.fileLocation, 'utf-8'); // 读取抢购列表文件
    this.snipeList = data
      .split('\n') // 按行分割
      .map((a) => a.trim()) // 去掉每行的空白
      .filter((a) => a); // 过滤掉空行

    // 如果列表长度发生变化，记录加载信息
    if (this.snipeList.length != count) {
      logger.info(`加载抢购列表: ${this.snipeList.length}`); // 记录加载的抢购列表数量
    }
  }
}
