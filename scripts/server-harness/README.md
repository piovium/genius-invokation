# 服务迁移 harness

本 harness 用同一套场景比较 NestJS/Fastify + Prisma + SSE 旧服务与 Elysia（Node.js）+ Drizzle + WebSocket 候选服务。迁移进度、固定基线与应用验收证据见 [MIGRATION.md](MIGRATION.md)。

本目录包含测试客户端、RSS 采样器、隔离环境和协议实验。fixture 自测、真实服务行为检查与内存预算各有独立结果；harness 自测通过不能代替应用验收。

## 立即自测

在仓库根目录执行，Node 24+ 即可，**不需要安装 monorepo 依赖**：

```powershell
npm ci --prefix scripts/server-harness/experiments --ignore-scripts --no-audit --no-fund
node --test scripts/server-harness/*.test.mjs scripts/server-harness/experiments/*.test.mjs scripts/server-harness/environment/*.test.mjs
node scripts/server-harness/doctor.mjs --output temp/server-harness/doctor.json
```

`harness:check`、`harness:doctor` 是对应的 package scripts。doctor 只读检查生产基线所需的 Node 26.1+、pnpm 12、构建文件、Prisma 生成文件和 `DATABASE_URL` 是否设置；缺失返回 1，不读取 `.env`、安装依赖或改 lockfile。当前 harness 自测使用的 Node 24 与生产服务要求是两个独立条件。

自测包含真实 HTTP/SSE fixture、独立服务进程与操作系统 RSS 读取，完成三局、重连、清理和报告检查；WebSocket 除可控 socket 单测外，还用真实 Node 服务做认证、断线、丢 ACK、重发和二进制适配器实验，见 [实验入口](experiments/README.md) 和 [实测结果](experiments/RESULTS.md)。实验依赖独立安装的 ws；缺失依赖时明确失败，不生成“成功”的替代结果。fixture 不运行完整游戏引擎，**自测和协议实验通过不能证明真实服务内存达标**。

本路线现在独立位于 worktree `worktrees/server-migration-harness`、分支 `codex/server-migration-harness`。已确认：使用隔离 Linux/Docker 环境、自动创建测试库和账号，游戏消息直接用二进制；能够实测解决的疑问通过实验验证，不再逐项要求用户选择实现细节。

## 真实旧服务基线

使用 [MIGRATION.md](MIGRATION.md) 中固定的旧服务版本及对应构建说明，准备独立测试数据库和生产构建。运行目标是直接执行旧服务生产 `dist/main.js` 的 Node 进程，不能使用开发模式、watch、pnpm 包装器的 PID；旧构建内嵌的前端资源也应保留。harness 在服务器所在主机运行，URL 使用 loopback，可指定自定义 API 前缀。候选服务的构建与启动方式见 [服务说明](../../packages/server/README.md)。

```powershell
# 在仓库根目录，12345 替换为正在运行的生产服务进程 PID
node scripts/server-harness/run.mjs --config scripts/server-harness/baseline.json --pid 12345
```

也可以让 harness 直接启动和收尾一个服务：复制 baseline.json 到自定义配置，加入以下字段，运行时不传 `--pid`。`command` 可以填 Node 26 可执行文件的绝对路径。`DATABASE_URL`、`JWT_SECRET`、可选 `PORT` 从运行 harness 的环境继承，不写进配置或报告。

```json
{
  "launch": {
    "command": "node",
    "args": ["--experimental-vm-modules", "--enable-source-maps", "dist/main.js"],
    "cwd": "packages/server"
  }
}
```

必须使用独立测试服务/数据库。harness 创建自己的房间、测试牌组和历史对局；仅删除自己创建的牌组，历史对局留在测试数据库供复查。attach 模式不停止服务；launch 模式仅停止自己启动的运行时。操作系统会检查监听端口的归属，防止错误地测量另一个低内存进程。当前不汇总子进程；若未来引入独立 game worker 进程，需要先扩展采样范围。

默认三局依次覆盖正常战斗、回合上限长局、带重连的战斗；提高 `cycles` 可做重复对局 soak。旧服务结束房间保留约 300 秒，每局都会等到 `GET /rooms/:id` 返回 404，再观察空闲内存，默认每局回收超时 330 秒。因此真实旧服务三局基线通常至少需要 **15 分钟**，不是卡死；每 30 秒输出当前采样阶段。不要为了缩短测试而修改旧服务的回收行为。

## 内存口径

用户确认的口径：**单个服务运行时进程 RSS，常驻 ≤100 MiB，单局峰值相对首次空闲基线增量 ≤50 MiB；数据库和 harness 另计。** 1 MiB = 1,048,576 字节。静态资源、游戏数据、日志、ORM/运行时占用均在 RSS 内，不用 `heapUsed` 代替，不主动触发 GC。

| 阶段 | 采样与判定 |
| --- | --- |
| startup | 启动采样，记录生命周期峰值，不当成常驻值 |
| cold-idle | 接口准备完成、第一局之前观察至少 5 秒；RSS 中位数固定为所有局的共同基线，空闲峰值须 ≤100 MiB |
| game:N | 从建房前到两方收到 protobuf `GAME_END`、读取回放；记录真实战斗或长局峰值 |
| cleanup:N | 覆盖终局后的日志序列化、持久化和整个房间保留期，其峰值同样计入该局 |
| idle:N | 等到房间删除后再观察 5 秒；RSS 峰值须 ≤100 MiB，防止前局泄漏被算入新基线 |

Linux 读取 `/proc` VmRSS/VmHWM，Windows 读取 WorkingSet64/PeakWorkingSet64，macOS 使用 ps RSS。请求采样间隔默认 100ms，串行读取避免采样器自身堆积；Windows 启动 PowerShell 有开销，实际粒度可能约 0.5–1 秒，报告包含真实间隔。

OS high-water mark 是进程生命周期峰值。只有在某局期间**新增加**的 high-water mark 才归入该局；空闲期新增加的峰值计入空闲预算，既可捕捉采样间隙的新峰值，也避免重复计算历史启动/游戏峰值。低于历史峰值的短暂尖峰仍可能漏采；报告明确这一局限。此 harness 验证固定牌组/工作负载下的预算，不声称穷举所有牌组或给出任意时刻的数学上界。正式性能验收建议在部署同构 Linux 环境重复运行。

## 协议与数据库验收

两种传输共用同一个场景驱动，以下检查都实际执行：

- 版本接口、受保护 API、非法牌组、建房/等待/加入、双方初始化。
- 对手私有视图和动作权限；错误 RPC ID、非法 protobuf 必须明确拒绝，超时或断线不能算拒绝成功。
- 合法订阅的状态快照：双方牌堆、对手手牌身份/费用/描述/附件隐藏，对手骰子为未知且不包含其主动技能；双方均须实际观察到自己的可见手牌及需要隐藏的卡/骰子，防止全部字段为空也通过。规则对应当前 `core/io.ts`，不擅自屏蔽现有公开 tags/hints；mutation 和 RPC preview 的字段隐私仍需后续补充。
- 换牌、出战选择、重投、行动 RPC；战斗策略使用服务端给出的合法技能/牌和自动选骰，长局策略持续宣布结束直到第 15 回合终局。
- 重连时恢复原来的 pending RPC ID 和请求；两方终局 winner 一致、结束回放可读。
- 终局通知和断流同一时刻发生、最后动作确认晚于 SSE 结束的竞态。

牌组与机器人策略固定，建房也提交固定 `randomSeed`；旧服务的 `Room.start()` 没把该配置传给引擎，因此旧基线的逐步局面仍含随机性。报告比较协议、覆盖与内存，不强行比较两个对局的完整日志字节。

游客游戏在当前实现中不会写 Game 表。因此 Drizzle 验收需要两个注册测试账号的 bearer token：配置文件只写变量名 `HARNESS_USER_A_TOKEN`、`HARNESS_USER_B_TOKEN`，值放进环境。[隔离环境准备入口](environment/README.md) 自动创建数据库、账号和测试凭证，不需要真实 GitHub 凭证。harness 会测试牌组创建/读取/更新/归属隔离/删除，再进行一局注册用户对局，核验持久化回放、双方关联、胜者和各自历史列表。正式比较应让旧、新服务使用相同账号、预热和局数；默认不带数据库账号的三局 baseline 仅作游客流程检查。

这些 API 检查覆盖持久化行为。历史 PostgreSQL 数据迁移、DDL/索引/约束等价性、重启后数据验证由应用迁移检查覆盖，结果见 [MIGRATION.md](MIGRATION.md)；不能仅凭本目录的 gate 判断部署就绪。

## 二进制 WebSocket 与控制流程实验

路径：`/api/rooms/:roomId/players/:playerId/ws`，随 baseUrl 保留部署前缀。用户已选择直接使用二进制游戏消息，游戏 protobuf 不再转 base64。`wire.mjs` 的帧头为 8 字节：`GI` 魔数、版本 1、消息类型、uint32 大端 RPC ID；类型 1 为 notification，2 为 RPC 请求，3 为动作回答。请求还包含两个 float64 大端计时值，之后都是原始 protobuf 字节。通知的 ID 为 0。未知版本、截断和过大载荷直接拒绝。

认证、确认、初始化、计时等小控制消息继续用 JSON 文本帧；适配器拒绝以 JSON 发送游戏状态和非空 RPC，也不接受 base64 动作回答。SSE 基线适配器仍读取旧编码。

协议实验与候选服务采用连接后先认证的流程，token 不放 URL：

```json
{"type":"auth","token":"<bearer token>"}
```

服务端先返回 `{"type":"ready","sessionId":"..."}`，再发送游戏消息。凭证必须匹配该房间的玩家，重连重新验证；认证拒绝进入终态，之后已经排队的帧不能重新获得权限；未认证连接有超时。实验中的小超时用于快速验证资源回收，生产超时仍需真实网络条件验证。

上行动作为类型 3 的二进制帧，确认是控制消息：

```json
{"type":"ack","command":"actionResponse","id":7,"sessionId":"..."}
```

实验显示，同样是 1006 断线、客户端没有收到 ACK，服务端可能执行了 0 次，也可能已经执行 1 次。因此缺失 ACK 应视为结果未知。重连后验证 sessionId、同步当前 RPC，只用原 ID 和原始字节重试；服务端按 session/player/RPC ID 与载荷摘要缓存接受结果。同 ID 同内容重发返回原 ACK、不重复执行；冲突、未来 ID、已淘汰的旧 ID 拒绝或要求重新同步。实验用 32 项缓存证明可以限制保留量，这个容量不是生产最优值的结论。

ACK 表示通过校验并已被接受，不能替代持久化承诺。协议实验的脚本游戏在同一进程内同步接受并计数，这份证据不覆盖进程重启、跨进程 worker 或真实异步游戏引擎。动作错误继续用 commandError；正常关闭前应发完最后确认和通知，缺少终局不能用断流代替成功。认输控制消息在适配器单测覆盖，未包含在这个二进制命令实验 fixture 中；实际应用与浏览器的验证见 [MIGRATION.md](MIGRATION.md)。

WebSocket 模式不回退 SSE，且检查旧 notification SSE 路由已关闭（404/405/410/426）。实际服务器的慢消费者、代理超时、多房间并发、JWT/Origin/TLS 与重启恢复超出协议 fixture 的验证范围，应用检查结果见 [MIGRATION.md](MIGRATION.md)。超大帧实验保留实际关闭码，允许传输终止 1006 或明确大小错误 1009；两个 Node 平台的实测记录见 [RESULTS.md](experiments/RESULTS.md)。

## 报告与退出码

```powershell
# 启动候选服务，并加载隔离环境生成的两个测试账号 token 后执行
node scripts/server-harness/run.mjs --config scripts/server-harness/candidate.json --pid 12345
```

`baseline` 模式允许记录当前服务的内存超标，行为检查失败仍返回 1；`gate` 模式要求 WebSocket、持久化、内存预算和采样覆盖一起通过，否则返回 1。不允许以 SSE、跳过数据库、提高预算、过短空闲窗口或缺失样本蒙混过关。gate 至少需要每个空闲窗口 ≥5 秒/3 个样本、每局 ≥3 个样本；实际采样开始/结束间隔及单次读取耗时均不得超过 2 秒，缺失、倒序、重叠时间也会失败。

输出保存在配置的 `outputDir`（默认 `temp/server-harness/...`，已被仓库忽略）：

- `report.json`：版本/提交、目标 PID 监听校验、工作负载、行为和数据库检查、预算/覆盖结果、局限和错误。不会保存 token。
- `memory.ndjson`：逐次原始 RSS/OS 峰值、阶段和时间，便于复算和比较。
- `server.log`：仅 launch 模式，保留被测服务自己的输出，本地调试使用。

旧服务基线、候选服务与部署检查使用各自的配置和证据。当前已完成项、未通过预算及待验证项统一记录在 [MIGRATION.md](MIGRATION.md)，避免把早期协议实验结论当成最新应用验收结果。
