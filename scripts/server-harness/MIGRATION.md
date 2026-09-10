# 正式服务迁移记录

用户在 harness 自测及独立复核完成后已授权正式迁移，要求继续使用 harness 限制并保留版本管理。本路线只使用 `worktrees/server-migration-harness` / `codex/server-migration-harness`，与工作区的 TNB/tsgo 任务分开。部署及实验运行时均保留 Node.js；平台调整不改变协议功能、测试场景或内存预算。

## 固定基线

- 原应用基线：`e0be9cd6d3758026a301ef91c65e6bf419bd595e`。
- Harness 基线：`86c8582f10374096f55f87ae1e5405af42bb43b0`；此提交未改应用行为，包含独立复核后的认证、二进制、ACK、隐私及 RSS 验收。
- 旧服务构建使用上述提交的独立 Linux 源码快照，不从正在改写的服务目录构建。不复制其它任务的 node_modules/dist。
- 旧、新服务均使用独立 PostgreSQL/身份 stub，测服务进程 RSS，数据库/测试客户端另计。各次报告绑定源码版本与实际构建产物。

## 实现与验收范围

当前状态为进行中。只有实际运行证据才能把项目改为完成。

- [x] 旧服务生产构建及 SSE 基线，包括真实游戏、回收期、持久化。
- [x] Elysia/Node.js HTTP 服务及既有 OAuth、用户、牌组、房间、对局、指标、静态页面行为。
- [x] Drizzle/PostgreSQL 数据访问、DDL/约束兼容、重复迁移、重启持久化（当时包含把旧 `_prisma_migrations` 记录登记进 `__drizzle_migrations` 的兼容路径）。
- [x] 二进制 WebSocket 服务和浏览器客户端，认证、ACK、重连去重、认输、观战；移除 SSE。
- [x] 游戏回放完整保留，减少原状态图的内存保留；无截断记录或提前回收绕过预算。
- [x] 对应单测、真实连接/数据库负测、应用构建与类型检查、浏览器流程验证。
- [ ] 同一最终候选版本运行完整 harness gate：各空闲阶段 RSS 峰值 ≤100 MiB、单局峰值相对首次冷空闲 RSS 中位数的增量 ≤50 MiB。
- [x] 重复游戏/慢消费者/并发连接及清理检查，部署配置和说明更新。
- [ ] 对已完成功能整理代码和文档，修正语言错误、重复展开及不必要的复杂写法，并验证行为不变。尚在实验中的实现待功能确定后再整理。
- [ ] 服务代码改为 Elysia 原生写法：插件组合与 `derive`/`resolve`/`macro`/`decorate`、`t` 校验、`status`/`error` 错误处理；移除 `*.controller.ts`/`*.service.ts`/`*.module.ts` 命名、容器类与 `*Exception` 兼容层。
- [ ] 清除全部 Prisma 遗留：`prisma/` 目录与随构建发布的 SQL、依赖与 lockfile 条目、`allowBuilds` 放行项、`_prisma_migrations` 兼容导入逻辑及相关测试与文档；候选库只保留全新 Drizzle 迁移。
- [ ] `node scripts/server-harness/constraints.mjs` 通过，并作为最终验收的必需证据之一。

## 2026-09-10 目标变更：Elysia 原生 + 无 Prisma 遗留

用户明确两条新的硬约束，并确认运行时不变：**继续使用 Node.js，不使用 Bun**；**Prisma 不得留下历史遗留**。据此调整目标：

- 写法以 Elysia 原生为准：路由、校验、鉴权、错误与插件组合都用 Elysia 自身能力。此前按 NestJS 形状保留的 controller/service/module 命名、`createApplication` 手工装配的容器类、`errors.ts` 的 `*Exception` 层次都变成待清理项。
- Prisma 全清范围：`packages/server/prisma/**`（schema、迁移 SQL、生成产物）、`pnpm-workspace.yaml` 的 `prisma` 与 `@prisma/engines` 放行项、lockfile 中的 `prisma` 与 `@prisma/*` 条目、`src/db/migrate.ts` 读取 `_prisma_migrations` 并登记进 `__drizzle_migrations` 的兼容路径、`db/database.test.ts` 与 `db/migrate.test.ts` 的旧迁移记录断言、`packages/server/scripts/build.ts` 的打包项与 `packages/server/README.md` 的相关说明。
- 候选服务不再自带旧服务 SQL，harness 准备基线库改为从 `HARNESS_BASELINE_SQL_DIR` 指向的冻结旧服务源码读取并绑定校验和；该变量缺失、目录为空或缺 `migration.sql` 时 `prepare.mjs` 明确失败，不回退到候选目录。`doctor` 不再把 `packages/server/generated/prisma/client.ts` 当作前置条件。
- 新增可执行闸门 `scripts/server-harness/constraints.mjs`（`npm run harness:constraints`），单测纳入 `harness:check` 的 glob，并在 harness CI 中作为独立步骤执行。当前检查失败，其输出即清理清单。
- 「不使用 Bun」同样是可执行规则：依赖、`packageManager`、脚本命令、`Bun.` 全局对象、`bun:` 模块、Bun shebang 与 Bun 基础镜像都会被拒绝；文档中的说明性文字不参与判定。

待实现阶段决定并记录的问题：现有生产库（含 `_prisma_migrations` 与业务数据）如何在不引入 Prisma 的前提下升级或重建；房间 WebSocket 在 Node 下继续使用 `ws` 挂载这一例外如何长期维护；`new Response` 显式响应头的写法在适配器行为变化后能否收敛回 Elysia 原生返回。

## 版本管理

实现按可检查的阶段提交；依赖变更更新锁文件。每次验收保存命令、退出码、源码/产物身份和报告。局部测试、fixture 结果或仅运行时替换均不代表迁移完成，尚未执行的项目保留为未完成。

## 2026-09-10 实际记录

**正式内存验收仍失败，迁移尚未完成。** 下面的实现和部署记录不能替代最终同版本完整 gate。仓库原有 `packages/config/bin/bun.mjs` 拦截器及其注册配置保持原样；本路线的服务、实验和部署均使用 Node.js。

实现提交：`7d92083e` 完整回放增量序列化；`bfd057e0` 相同 harness 场景改在 Node 运行；`69cbe0a5` HTTP/Drizzle；`09c6c0a4` 浏览器 WS；`c68319c3` 本地精简牌组元数据；`1de6bc66` 房间 WS、ACK 与连接清理；`277786c2`/`4f72772c` 部署说明和数据库首次启动健康检查。

已实际通过：Node 后端 20 项测试、浏览器连接 21 项测试、核心 31 项测试及类型检查、PostgreSQL 3 项集成测试、服务/前端类型检查与生产构建。真实 Chrome 流程 11 项检查涵盖双玩家、断线重连、观战、离开页面关闭连接和认输。慢消费者测试暂停真实 TCP 读取，验证 512 KiB 发送队列上限和其它房间持续收包；另验证 8 个房间连接的 4 轮断开清理。后两项是传输压力验证，完整真实游戏另由 harness 执行。

本地牌组元数据保留 1626 个记录中的全部校验字段、619 个可获得牌分享编号，索引 JSON 为 138546 字节。测试对照同一原始卡牌快照、所有最低版本、关联/数量限制和原始分享码算法；禁止 fetch 时也能完成校验。未删除牌、历史版本或回放内容。

| 实际测量 | 初始空闲峰值 RSS | 后续空闲峰值 RSS | 最大单局增量 | 结论 |
| --- | ---: | ---: | ---: | --- |
| 原生产服务，完整四局 SSE 基线 | 376.07 MiB | 293.64–368.86 MiB | 14.97 MiB | 功能/存储通过，空闲超标 |
| 首轮 Node 生产版本，完整四局 WS gate | 192.77 MiB | 139.68–210.21 MiB | 36.375 MiB | 功能/重连/存储通过，空闲超标 |

原始报告分别在 `temp/server-harness/production-baseline/report.json`、`temp/server-harness/production-node-initial/report.json`。首次 Node 产物和最新精简元数据产物分别冻结于独立 Linux `/opt/gi-server-harness/runs/node-initial`、`node-compact`；产物 SHA 清单保存在各自 `artifact-identity.json`。后者绑定源码 `1de6bc66`，其主产物 SHA256 为 `76bcbf217cd55b5d01e3dd6a842555422e18ebf057fbfeeb9f28473ce7ac792e`。Linux 镜像没有 `.git`，原始 runner 报告中的 `checkout: null` 保留原样，另用源文件逐路径审计及产物哈希关联版本。

精简元数据版本另做了一局诊断，保留正常五分钟房间回收期。默认 Node 在回收后 RSS 为 137.78 MiB；`--max-semi-space-size=1 --max-old-space-size=64` 为 129.82 MiB，二者均超标。较小堆增加了 GC 和 CPU 消耗；两局实际回合/RPC 数不同，不能把 CPU 差异当作同一轨迹的精确性能比例。`--jitless` 使 Node 原生 fetch 因 WebAssembly 不可用而失败，已排除。诊断和强制 GC 的堆快照均不作为正式通过证据，未将这些参数写入生产配置。

实际 Dockerfile 已从无 node_modules 的上下文完成构建，部署镜像通过 HTTP、前端文件、迁移和退出检查。真实 Compose 在专用随机项目/全新数据库卷中验证 db healthy → migrate 成功 → server 启动、WS auth→ready、API 写入经数据库及服务重启持久化、重复迁移应用 0 条 SQL。首次 initdb 实测超过旧 60 秒健康等待窗口，现检查 TCP 并设置 120 秒启动宽限；相同业务断言复验通过。报告在 `temp/server-harness/compose-node/report.json`，包含先前失败记录引用和准确清理结果；仅删除测试创建的资源，既有卷全部保留。

当前继续用独立临时构建比较初始化/打包方式的实际 RSS。未采用未经完整验收的变体，100/50 MiB 门槛、五分钟保留期和既有场景不变。

后续隔离诊断中，原生 CommonJS、ASCII 源码与 Node `--max-opt=0 --max-semi-space-size=1 --max-old-space-size=52` 的组合通过注册用户 API 和存储预热，首五秒 RSS 峰值为 **107.74 MiB**，30 秒末为 **98.65 MiB**，仍未通过固定空闲窗口要求。相同组合将老生代限制降到 48 MiB 时启动 OOM。上述结果均未运行完整四局，不是正式验收，参数与构建方式尚未写入生产配置；继续验证初始化开销及允许堆随活跃对局增长的回收策略，并保留真实并发对局的容量验证。

按用户要求，可检查且已验证的阶段提交及时推送至 `origin/codex/server-migration-harness`。临时构建、原始测量、堆快照、运行时凭证和本地容器数据保持在忽略目录内，不随分支上传。

随后改用原 harness 的进程外 100ms RSS 采样做短诊断，仍在原注册用户 API/存储预热后立即观察空闲窗口。仅缩短 V8 原生回收调度延迟的 ASCII/CJS 版本首五秒峰值为 124.66 MiB；增加原生 memory-saver 模式后为 120.84 MiB，30 秒末为 107.42 MiB。共享生成代码中重复字面量参数函数的临时版本通过 34 个历史版本数据对照及 570 组数组独立性验证，但在 52 MiB 老生代上限下，首五秒仍为 112.78 MiB。三项均失败；后者与前两项的堆参数不同，不能据此计算函数共享的独立收益。原始报告及准确参数在 `temp/server-harness/ascii-source-experiment/external-summary.json`。

代码和文档整理与剩余内存优化并行开展。专门的审查 agent 先处理已通过功能验证的模块；运行时和引擎加载方式仍处于实验阶段，待实现确定后再整理。每批修改单独验证、提交和推送，不以格式检查替代功能或内存验收。

首批整理覆盖浏览器连接、协议实验辅助代码及 harness 说明：使用明确的类型谓词名称和终局枚举，复用标准 Promise 能力，统一排版并纠正过时的迁移状态。原有浏览器 21 项真实 WebSocket 测试及前端类型检查通过；Windows 下相关 harness 自测 114 项中 113 项通过、1 项明确跳过 Docker 环境测试。协议、消息时序、验收场景和内存门槛保持不变。

后端另一批整理覆盖认证、HTTP 桥接、数据库迁移、牌组元数据和回放序列化：明确变量与函数命名，提取同一事务内的 schema 核验步骤，复用测试请求和字段清单，整理服务说明。原有服务测试 8/8、实际 PostgreSQL 测试 3/3、核心回放测试 3/3 通过，服务与回放类型检查通过；四个元数据及分享码生成物逐字节不变。本批不改变 SQL、鉴权判断、API 返回值或回放结构。

房间与服务端 WebSocket 模块随后完成整理：校验器按实际返回或抛错行为命名，避免重复遍历字符串，使用 Node 的 `RegExp.escape` 构造字面路由前缀，并整理连接状态分支及对应测试。原有房间测试 12/12 通过，含正则元字符的真实连接前缀、近似路径拒绝及 Unicode 名称边界另做验证；服务类型检查通过。ACK、认证、限额、关闭顺序及五分钟保留期未调整。

共享协议、生成命令与 CI 的整理明确了 RPC 帧头长度和载荷偏移，改进参数命名，并让 CI 复用现有 npm 脚本。两项类型检查、6 项独立编解码对照和 7 项真实生成命令派发检查通过；Linux/Windows 的 harness 自测均为 122 项通过、1 项按原配置跳过，真实 WebSocket 故障实验均为 27 项通过。消息字节、错误顺序和生成参数保持一致；跳过项是需显式启用的 Docker 凭据隔离测试。本批未重新执行内存或部署验收。

指标路由和房间辅助模块的整理仅调整命名及排版，原鉴权、ID 解析和调用顺序经独立审查保持一致。冻结源码快照叠加三个实际改动文件后，Node 26.1.0 的服务类型检查和现有应用/房间测试 11/11 通过。指标服务、protobuf 生成配置及补丁换行配置完成审阅，保留原样。

新的内存诊断仍未找到达标版本：同进程 VM 上下文加载完整引擎的采样 RSS 增量为 59.75 MiB，释放引用 30 秒后为 111.85 MiB；Node 原生编译缓存的两组对照均确认真实命中，但命中后的首五秒空闲峰值分别为 118.88 MiB、116.59 MiB。两组缓存实验使用不同堆策略，后一组期间另有短暂运行时选项查询，不能用于精确性能比例比较。原始记录在 `temp/server-harness/vm-engine-lifecycle`、`temp/server-harness/compile-cache-experiment`；上述实验均无真实对局或主动 GC，未将 VM、缓存或实验参数用于生产。

随后真实 HTTP 检查发现 Node 适配器会把字符串响应的显式 `Content-Type` 覆盖为 `text/plain`，导致 OAuth 回调脚本不能在浏览器执行，指标接口也丢失版本信息。两个路由现返回带明确响应头的原生 `Response`，保留原正文、鉴权顺序和错误处理。新增回归先复现失败；修复后服务测试 21/21 和类型检查通过。Chrome 152 经实际 Node 26.1.0 HTTP 服务验证合成登录回调：HTML 类型与 `no-store` 保留、主窗口收到登录消息、弹窗关闭，身份交换另由既有真实 HTTP 测试覆盖。本批完成专门代码审查，未更换适配器或依赖；完整内存 gate 仍未通过。原始记录在 `temp/server-harness/adapter-dependency-audit`，不随分支上传。
