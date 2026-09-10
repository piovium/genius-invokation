# Genius Invokation → TNB / tsgo：执行与验收契约

版本：2.1.4。日期：2026-09-10。**核心 harness 已完成自测及独立复核，`contract.phase = "migration"`；产品迁移进行中，尚未验收。**

用户最新授权是“差不多就可以开干，你自己衡量进度”。协调者完成核心自测和独立复核后，可以审查并修改 phase、更新 seal、重新验证，然后生成新的多 agent 任务启动迁移，无需再次请求用户确认。此前中断的旧任务不得直接恢复。harness 自测成功、环境探测成功都不等于产品迁移成功。

## 1. 已确定的产品目标

所有 GTS 相关的 CLI、桌面语言服务和工具检查统一通过 **typescript-native-bridge（TNB）使用 tsgo**。允许修改 TNB；优先复用 GTS、Volar、现有编辑器和 TNB 测试设施，不重写已有解析器、LSP 或调度框架。

网页编辑器同时支持两条路线，分别验收：

- **浏览器本地检查**：保留现有 Worker 和 JS TypeScript 引擎，不依赖类型检查服务器；SDK 固定版本。当前实现启动时从 CDN 下载资源，不能据此承诺完全离线。
- **后台 TNB/tsgo 检查**：服务器可以运行在本机。用户方便选择并切换路线，记住选择；切换保留源码，释放旧 Worker／连接／会话；服务断开可见且可恢复，不静默切换引擎。默认保留现有浏览器路线。卡牌转译及执行功能继续可用。

有效源码必须无假诊断，真实错误必须检出并映射到源码，修复后诊断消失；全部既有检查和历史数据覆盖保留。禁止通过缩小 include、扩大 exclude、删除历史文件、增加宽泛 `any`／`@ts-ignore`／`@ts-nocheck`、放宽 strict、增加 skip 选项、关闭诊断或使用 `NO_TYPING=1` 获得通过。迁移暴露的相关真实类型问题采用保持语义的最小修复；涉及业务规则变化或无关既有错误时，先提交具体证据讨论。

**内存目标是尽可能降低实际占用。** 用户的 4 GB 是旧检查器 OOM 的背景，不是最终硬门槛。`--max-old-space-size=4096` 只限制 V8 old space，不限制 Go、RSS 或编辑器进程树。必须在可比负载下报告 JS heap、含 Go 的进程总内存、相关进程树总量和耗时；测不到的字段明确标缺失。不得把内存移到 Go／后台就称为总体改善，不预设未经测量的优化百分比。

## 2. 固定工作区与基线

只在以下隔离 worktree 内开展未来产品工作。原 checkout 仅用于调研；用户另一个进程维护的原主仓库 `scripts/server-harness/memory.mjs`、`memory.test.mjs` 不得修改。

| 标识 | 路径 | 基线 revision |
| --- | --- | --- |
| main | `worktrees/genius-invokation`，`codex/tsgo-integration` | `e0be9cd6d3758026a301ef91c65e6bf419bd595e` |
| gts | `worktrees/gts`，`codex/tsgo-gts` | `cf58a100132ef02af61c6a22a49feb1968841f06` |
| tnb | `worktrees/typescript-native-bridge`，`codex/tsgo-bridge` | `9281a12c7c4e42dc50c0c27a8dba4a0e93639ddc` |
| web | `worktrees/browser-routes`，`codex/tsgo-browser-routes` | 与 main 相同；网页修改由协调者合入 main |

主仓库基线有 **195 个跟踪中的 GTS 文件、10 个现有 check 包**。完整逐路径清单和 `{name, path, check}` 以 harness 固定 inventory 为准；数量相同不能替代清单一致。10 个包均为 `@gi-tcg/` 前缀：data、core、card-data-viewer、custom-data-loader、deck-builder、detail-log-viewer、server、standalone、web-client、web-ui-core。data 使用 `gtsc --noEmit`，其余使用 `tsc --noEmit`。没有 check 的包应登记覆盖缺口，不能称 recursive check 已检查全仓每个项目。

环境按各 manifest 和锁文件准备：主仓库 Node `^26.1.0`／pnpm `12.0.0`；GTS Node `>=26.0.0`／pnpm `11.5.2`，其 AGENTS 中的 `11.0.8` 已落后于 manifest。TNB 使用自身 npm 构建入口，候选版本精确固定为 `6.0.3-bridge.16.tsgo.7.0.2`。TNB 子模块 pin 分别是 TypeScript `050880ce59e30b356b686bd3144efe24f875ebc8`、typescript-go `2bd066d87f5bafd315be9f40889d0a60b9e58e0b`。

GTS 已有 [PR #14](https://github.com/piovium/gts/pull/14)，分支 `origin/fix-tsgo-integration`，revision `96e060bd14f226dc2697ee29963c25a8daa9f236`。后续先测试已发布 TNB 与当前 GTS，再按失败证据选择性复用该分支；不能用 PR 标题或已删除的旧测试作为通过证据。

## 3. Harness 的控制文件与命令

入口是根目录 `node harness/cli.mjs`。`harness/contract.json` 固定阶段、工作目录、角色边界、gate、命令、超时和平台要求；根 `AGENTS.md` 规定任务交接；`harness/REVIEW.md` 保存独立复核和尚未解决的缺口。使用本地运行时配置时，从 `harness/local.example.json` 填写 `harness/local.json`，不改变全局默认环境。

| 命令 | 用途与边界 |
| --- | --- |
| `verify` | 核验当前控制文件与 seal；缺文件、新增文件或内容变化不能沿用旧 seal |
| `selftest` | 运行 harness 自身测试，包括拒绝伪证据和绕过的负例；不运行产品迁移 |
| `run preflight` | 当前允许的探测：environment 与 inventory；不安装依赖、不构建、不执行产品 check |
| `run GATE` | 执行指定 gate 及其前置检查；局部成功不能用于完整验收；harness-only 阶段拒绝 |
| `run all` | 按 contract 枚举全部适用 gate；缺真实 collector 保持 BLOCKED |
| `status [RUN_DIRECTORY]` | 查看已记录的结果和缺口，不把缺失项推导为成功 |
| `task ROLE` | 生成包含 seal、角色边界和验收要求的新任务；当前 seal 的 selftest 未通过则拒绝 |
| `revise TASK_FILE` | 控制文件经审查更新后，以新 seal 续接已有任务；保留原基线及同范围改动，拒绝越界修改，旧验收回执仍须重跑 |
| `handoff TASK_FILE` | 根据任务文件核验交接；交接不授予开始产品工作的权限，也不代表迁移完成 |
| `finish RUN_DIRECTORY` | 协调者对最终集成树申请完整验收；缺失、过期、局部、运行期间变化或未通过的必需证据均拒绝 |

未知参数拒绝，不能通过额外参数改写命令或跳过 gate。`harness-only` 阶段只允许 `run preflight`。协调者已完成核心自测和独立复核，按用户已有授权切换 phase；新的 seal 必须再通过 selftest 才能生成任务，不能跳过派发门禁。

确需扩大集成职责时，必须先独立复核并将 `scopeTransitions` 纳入 contract/seal，固定旧任务 ID、旧 seal、旧任务文件哈希和扩展前后角色。扩展只能增加路径与 gate，不能更换仓库或基线；`revise` 会先按旧职责检查现有改动，拒绝事后追认越界修改。2.1.0 的明确扩展用于合入依赖 patch 和网页 agent 的提交。

运行器为每种包管理器生成本次证据目录内的命令入口，使递归 `pnpm` 也使用配置中已指纹固定的 Node/包管理器。Windows 命令文件仅含 ASCII，通过环境变量传递中文目录；不关闭包管理器自身的依赖状态检查。

2.1.1 修正已授权 Git 子模块的根路径识别：Git 报告的 `typescript` 对应职责表的 `typescript/`，仅实际 gitlink 目录或删除项可以按该边界匹配；普通文件或链接替换仍拒绝。任务派发只绑定子模块源码身份，与顶层源码一致；正式验收的完整依赖／生成物指纹没有改变。data/checks 已登记真实 CLI 采集器，其余缺失采集器仍 BLOCKED。职责、基线、数量、超时、平台和断言均保持原要求。

2.1.2 仅将 `vitest.setup.ts` 与 `packages/detail-log-viewer/src/DetailLogViewer.tsx` 两个文件前瞻性加入 integration 职责，用于已在 stock 和同 pin 原生 tsgo 对照的最小类型兼容修复。新增 transition 固定先前任务及其哈希；验收要求和执行器不变。

2.1.3 登记主仓库／GTS 的原构建和测试命令、网页双路线的真实浏览器采集器，并前瞻性授权 GTS 文档中的 8 个精确文件用于修复构建暴露的失效链接。原有 gate、平台、数量、超时与断言不变。CLI 进程身份按生命周期核验，允许 Windows 在前一进程退出后合法复用 PID，重叠／重放仍拒绝。Vitest 只恢复明确登记的 `results.json` 元数据原始字节，同时保留本次生成字节；不忽略执行／转换缓存变化，不修改原命令。独立父进程在既定 gate 预算内预留 5 秒收尾，子进程超时或失败不能变成成功。

2.1.4 仅调整 SHA256 文件读取：每个调用使用一个 64 KiB 缓冲区，读到 EOF，在每 MiB 和每个文件完成时让出事件循环。文件清单、子模块递归、ignored 运行时扫描、顺序、快照字段与失效规则逐字节保持原实现；不以 size/mtime 缓存替代实际内容。新增字节一致性、同大小同时间戳变更和事件循环自测。全量扫描及原有验收预算不减。

未来需要真实产品行为的 collector 必须放在根 `harness/collectors/`，经过独立审查后登记到 contract 的 adapter 集合并纳入 seal。初始不登记产品 adapter。**缺 collector 永远是 BLOCKED**；不能用手写 `PASS` JSON、任意退出 0 的脚本或暂缺的采集器冒充产品验收。已有 probe 是可复用组件，不自动构成完整的 CLI／编辑器／网页 collector。

## 4. Seal、证据与本地权限边界

Seal 覆盖 contract、执行器、断言、测试、说明和 CI 等控制文件。控制文件变化会使旧回执失效；协调者必须审查差异、取得独立复核并重新封存，不能修改 seal 来掩盖失败。产品 worker 不得削弱断言、删 gate 或改基线来完成自己的任务。

执行器直接运行固定命令，绑定实际 cwd、源码／锁文件／使用产物身份、gate、run、原始 stdout/stderr、退出码和日志哈希。成功之后修改源码、未跟踪源码、配置、依赖或实际加载的 ignored `dist`／`lib/typescript.js`／`bridge.node`，都需要重新验证；只检查 HEAD 或 Git clean 不足以证明结果仍有效。执行期异常、panic、OOM、超时、空结果、全部 skipped、只有 discovery 输出都不能获得 PASS。

安装、资源生成和首次构建先作为环境准备完成；正式验收针对准备好的稳定输入运行。执行期间源文件或产物内容改变会使回执无效，须在准备完成后重跑。跨进程重负载使用同一个运行锁；发现遗留锁时先核实 owner 已退出再清理，不自动猜测 PID 是否复用。Windows 使用 Job Object 收回本次命令的进程树，Linux 使用独立进程组。包管理器实现文件和 Node 可执行文件／伴随原生库也计入指纹。

本地 seal 能检查一致性，**不是针对同权限文件系统写入者的安全沙箱**。能改写执行器、seal、日志及 Git 历史的进程仍能伪造本地材料；最终依赖独立审查、固定 revision、受保护 CI 的重新执行与产物来源核验。当前未配置远程分支保护，不能声称本地哈希不可伪造。

现有 probe 的证据范围：

- `engine.mjs --repo ABSOLUTE_CONTEXT --version EXACT_VERSION` 从实际包上下文解析 TypeScript，校验 TNB 身份与版本，在临时 TS 项目中验证错误→修复、原生 RPC 增量和已加载 addon，记录文件哈希。它只证明该编译器 API 路径，不能替代 data/check、LSP、tsserver、后台各自的引擎身份。
- `coverage.mjs --repo ABSOLUTE_ROOT --inventory BASELINE_JSON --observed PROGRAM_JSON` 精确比较基线、磁盘和 program 的 GTS 路径集合。磁盘探测排除 `.git`、`node_modules`；跟随仓库内链接并保留路径，越界、循环或损坏的链接保持 BLOCKED，不静默忽略。观测格式是 `{ "files": [实际 program 的 GTS 路径] }`，非 GTS lib 列表不属于此输入。独立文件被实际检查的负例还须由 collector 执行。
- probe 输出 `PASS`／`FAIL`／`BLOCKED` JSON，退出码分别为 0／1／2。直接提交一份外部 observations JSON 不证明来源；正式验收还要求经过审查的 collector 和本次 run 的证据绑定。

## 5. 必需产品验收

以下是未来迁移的完成条件，**不是本轮已通过记录**。状态仅能为 PASS、FAIL、BLOCKED、NOT_RUN；前置条件未准备好须如实记录。

| 编号／gate | 验证内容 | 必须保留的证据 |
| --- | --- | --- |
| E0／environment | 各仓库版本、工作树、包管理器、依赖和生成物；Windows 与 Linux 环境 | SHA、dirty diff、锁文件／运行时／工具版本；不能把缺 Prisma／声明产物的基线当工具失败 |
| E1／engine、desktop、web | data、其他 check、GTS LSP、TS/TSX tsserver、网页后台均实际使用 TNB | 各路径的 resolved module、精确版本、native 运行与产物身份；横幅仅作辅助 |
| C1／data、memory | 完整 data check 三次独立运行，无 OOM／panic／崩溃；可比内存与耗时 | 完整日志、退出 0、零错误、一致诊断和内存口径；不能只报告 JS heap |
| C2／inventory、coverage | 195 文件逐路径进入实际 program；当前／历史／未被 import 的 GTS 和跨包消费负例 | 负例在正确文件、span、code 报错且 CLI 非零；修复后恢复成功；清单变化逐项解释 |
| C3／checks | 单并发执行全部 10 个现有 check | 每项真实命令与退出 0，没有因 filter／skip 遗漏 |
| L1／desktop | 从仓库根和 `packages/data` 冷启动；真实 GamingTS 扩展宿主 | GTS LSP 与 TS/TSX tsserver 均可用，无模块缺失、原生加载错误或重启循环；Node 测试不能替代 Electron |
| L2–L3／desktop | 未保存的语法／属性类型／导入错误及恢复、外部磁盘编辑；hover、F12、补全、签名帮助 | 请求／响应和最新文档版本关联，语义正确，映射回 GTS；不泄露 `__gts_*` 或以 any 冒充类型；覆盖中文、CRLF、Windows 路径 |
| L4／desktop | 同一服务 100 轮编辑→诊断→查询→恢复，含关闭／重开和跨文件变化 | 完整周期、版本链及内存趋势；无陈旧结果、panic、永久挂起或隐式重启 |
| R1／构建与测试 | GTS 既有 build／Vitest；主仓库 CI 构建和递归测试含 typecheck | 声明构建正常且消费者可用；零匹配／全 skipped 不能 PASS；资源下载失败单列 BLOCKED |
| R2／web | 本地与后台各自正反例、补全／hover、卡牌加载；双向切换、断开／重连 | 引擎身份明确；源码保留，旧会话释放，不叠加诊断，不静默降级，本地路线不依赖检查服务器 |
| D1／clean-install | 全新集成 checkout 按文档安装、检查、构建及选择工作区 SDK | 无开发机绝对 link、未提交 node_modules 改动或其他 agent 的未构建产物；包来源可追溯 |

Contract 当前固定 data 三次、desktop 100 轮、Windows/Linux 两平台。超时用于发现挂死，不能当性能优化目标；具体值见 contract。调整次数／超时需要测量依据和控制文件审查，不能因为失败而提高上限掩盖问题。Linux 或真实扩展环境未准备好时保持 BLOCKED／NOT_RUN。

若修改 TNB 源码、patch、overlay、子模块工作树或消费的 TNB 产物，触发其适用开发 gates；不接受 worker 自报“未改”。目前 contract 保守要求这些 gates 全部执行，待证明确实没有 TNB 行为或产物改动后，协调者才可审查调整策略。复用 TNB 当前 AGENTS／CI 的 `check:lib`、`check:enums`、`check:sourcefile-guard`、`check:go-as-guards`、实际 witnesses、`check:sim-nav` 和 Volar suite。`ci-witness-groups.mjs all` 只验证并输出 wiring，不执行见证；Vue／Glint 成功不能替代 GamingTS。

## 6. 实施和交接

核心 harness 自测与独立复核完成后，协调者审查并切换 phase、更新 seal、再次 `verify`／`selftest`，再通过 `task ROLE` 生成任务。角色为 integration、gts、browser、tnb，写入边界以 contract 为准。分派时原样传递生成任务，并追加具体实现目标；不复用此前被中断的旧分派。新发现需要越过角色边界时，协调者重新分配，不能擅自修改其他 worktree。

未来实施顺序：先在固定版本准备可比 stock／TNB 环境并复现；再验证最小接入；保存具体错误并在正确层修复；最后在同一最终代码／依赖集合串行完成重负载验收。基线阶段独立只读调研可并行，产品修复依赖实际失败证据。优先现有 pnpm scripts、Volar API 和 TNB harness，只补实际缺失的 GamingTS 场景适配。

Worker 交接包含生成的任务文件、精确 revision／diff、依赖产物来源、复现命令、原始日志和 runner 回执，以及未完成项。不得复制正在变化的 node_modules／dist；本地联调包使用固定 pack／override，交付时提供可复现来源，不能假装未发布的修复已在 npm 可用。协调者集成后执行最终验收，只有 `finish RUN_DIRECTORY` 接受全部必需证据才能称迁移完成。

## 7. 仍待实验确认的事实

- 用户确认见过约 4 GiB JS OOM 和 panic，未保留 panic 堆栈；当前 pin 下的触发输入与根因尚未证明，由我们复现。
- 已发布 TNB 是否足够兼容当前 GTS、PR #14 哪些修改必要、虚拟源码和 extraFileExtensions 是否完整覆盖、是否存在合理 TS7 诊断变化，均需实验。
- 根依赖替换对声明构建、Vitest、浏览器 bundle 和各 SDK 解析路径的影响未知；网页当前从 CDN 加载 TypeScript，根 override 不会自动更换该 Worker 的引擎。
- 团队实际扩展版本、真实 Electron 加载、可用 Linux 环境、编辑会话稳定性和全量内存收益尚未验收。
- 需要区分桥接问题与 tsgo 自身行为时，使用同 pin、未打补丁的 pristine tsgo；已应用 TNB patch 的子模块不是 pristine 参照。

本文件规定目标和执行约束。实际自测结果见 REVIEW 与 runner 回执；未执行的产品 gates 不得由文档、计划、fixture 或探测成功升级为 PASS。
