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
- [x] Drizzle/PostgreSQL 数据访问，原有数据/DDL约束兼容、重复迁移、重启持久化。
- [x] 二进制 WebSocket 服务和浏览器客户端，认证、ACK、重连去重、认输、观战；移除 SSE。
- [x] 游戏回放完整保留，减少原状态图的内存保留；无截断记录或提前回收绕过预算。
- [x] 对应单测、真实连接/数据库负测、应用构建与类型检查、浏览器流程验证。
- [ ] 同一最终候选版本运行完整 harness gate：常驻 RSS ≤100 MiB、单局相对首次空闲峰值增量 ≤50 MiB。
- [x] 重复游戏/慢消费者/并发连接及清理检查，部署配置和说明更新。

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
