# AxisBot Solana Sniper v1.0

## 概述
AxisBot 是一个高速狙击和出售 SPL 代币的工具，旨在帮助用户在保持较高安全性的同时，提供最快的狙击速度。由交易者为交易者打造。

## 设置步骤

要运行脚本，你需要：

- 创建一个新的空 Solana 钱包
- 向其转入一些 SOL
- 将部分 SOL 转换为 USDC 或 WSOL（取决于配置）
  - 根据下面的配置选择 USDC 或 WSOL
- 通过更新 `.env.copy` 文件来配置脚本（完成后移除 `.copy` 后缀）
  - 参考下方的 [配置](#configuration) 部分
- 在终端中输入 `npm install` 安装依赖
- 输入 `npm run start` 运行脚本

### 配置

#### 钱包
- `PRIVATE_KEY`：你钱包的私钥。

#### 连接
- `RPC_ENDPOINT`：与 Solana 网络交互的 HTTPS RPC 端点。
- `RPC_WEBSOCKET_ENDPOINT`：从 Solana 网络实时接收更新的 WebSocket RPC 端点。
- `COMMITMENT_LEVEL`：交易的承诺级别（如“finalized”表示最高安全级别）。

#### 机器人配置
- `LOG_LEVEL`：设置日志级别，如 `info`、`debug`、`trace` 等。
- `ONE_TOKEN_AT_A_TIME`：设为 `true` 表示一次只处理一个代币的购买。
- `COMPUTE_UNIT_LIMIT` 和 `COMPUTE_UNIT_PRICE`：用于计算交易费用。
- `PRE_LOAD_EXISTING_MARKETS`：启动时预加载所有现有市场（不适用于公共 RPC）。
- `CACHE_NEW_MARKETS`：设为 `true` 以缓存新市场（不适用于公共 RPC）。
- `TRANSACTION_EXECUTOR`：设为 `jito` 以使用 JSON-RPC jito 执行器。
- `CUSTOM_FEE`：如果使用 warp 或 jito 执行器，将使用此值作为交易费用，而不是 `COMPUTE_UNIT_LIMIT` 和 `COMPUTE_UNIT_PRICE`。
  - 最小值为 0.0001 SOL，建议使用 0.01 SOL 或以上。
  - 此费用之外，还会应用 Solana 网络的最低费用。

#### 买入配置
- `QUOTE_MINT`：设置狙击的池子类型（USDC 或 WSOL）。
- `QUOTE_AMOUNT`：每次买入的金额。
- `AUTO_BUY_DELAY`：在买入代币前的延迟时间（以毫秒为单位）。
- `MAX_BUY_RETRIES`：买入代币的最大重试次数。
- `BUY_SLIPPAGE`：买入时的滑点百分比。

#### 卖出配置
- `AUTO_SELL`：设为 `true` 以启用自动卖出代币。如果你想手动卖出，请禁用此选项。
- `MAX_SELL_RETRIES`：卖出代币的最大重试次数。
- `AUTO_SELL_DELAY`：自动卖出代币前的延迟时间（以毫秒为单位）。
- `PRICE_CHECK_INTERVAL`：检查止盈和止损条件的时间间隔（以毫秒为单位）。
  - 设置为 0 可禁用止盈和止损功能。
- `PRICE_CHECK_DURATION`：等待止盈/止损条件的时间（以毫秒为单位）。如果未达到预期的利润或亏损，机器人将在此时间后自动卖出。
  - 设置为 0 以禁用该功能。
- `TAKE_PROFIT`：达到该百分比利润时进行止盈。
  - 利润基于报价资产（如 USDC 或 WSOL）计算。
- `STOP_LOSS`：达到该百分比亏损时止损。
  - 亏损基于报价资产计算。
- `SELL_SLIPPAGE`：卖出时的滑点百分比。

#### 狙击列表
- `USE_SNIPE_LIST`：设为 `true` 以启用只购买 `snipe-list.txt` 中列出的代币。
  - 该池子在机器人启动前不得存在。
  - 如果在机器人启动前可以交易该代币，则不会执行购买。
- `SNIPE_LIST_REFRESH_INTERVAL`：刷新狙击列表的时间间隔（以毫秒为单位）。你可以在机器人运行期间更新列表，它将在每次刷新时应用更改。

#### 过滤器
- `FILTER_CHECK_INTERVAL` 和 `FILTER_CHECK_DURATION`：设置检查池子是否符合过滤条件的时间间隔和持续时间。
- `CONSECUTIVE_FILTER_MATCHES`：连续多少次满足过滤条件时才购买。
- `CHECK_IF_MUTABLE`：设置为 `true` 仅购买不可修改的代币。
- `CHECK_IF_MINT_IS_RENOUNCED`：设置为 `true` 仅购买铸币已放弃的代币。
- `CHECK_IF_FREEZABLE` 和 `CHECK_IF_BURNED`：设置为 `true` 仅购买不可冻结或未被销毁的流动性池。
- `MIN_POOL_SIZE` 和 `MAX_POOL_SIZE`：设置池子大小范围以确定是否进行购买。

## 常见问题
如果遇到未列出的问题，请在此仓库中创建新的问题。为获取更多调试信息，可以将 `LOG_LEVEL` 设置为 `debug`。

### 没有代币账户
- 如果日志中显示如下错误：  
  `Error: No SOL token account found in wallet:`  
  这意味着你提供的钱包中没有 USDC/WSOL 代币账户。  
  - **解决方法**：前往去中心化交易所，将一些 SOL 转换为 USDC/WSOL。例如，转换后的 WSOL 应在钱包中显示。  

## 免责声明
AxisBot Solana Sniper 是一款简化许多常规交易任务的代码工具，整合了多种实用工具。  
加密货币交易存在巨大风险，包括可能的本金损失。该机器人不保证盈利或特定结果。用户需自行承担使用此工具的风险。