# Harness 约束审查

## 2.1.1 子模块边界修复与 CLI 采集器登记

网页 worker 独立复核并批准此增量。职责、基线、gate、数量、平台、超时与原有断言均未更改；contract 仅更新版本并登记 data/checks 采集器。

真实 TNB 续接误将 Git 报告的子模块根 `typescript` 判为职责 `typescript/` 之外。匹配现在同时检查 base/current 索引的 160000 gitlink 模式及 lstat：只接受目录或删除项，现存普通文件和坏链接替换拒绝。新增真实 Git 用例进一步发现 Git 会漏报坏 junction，现将已知 gitlink 的非法替换明确列入 changed，再按原职责拒绝；保留该负例，没有放宽断言。任务源码快照仅在 includeRuntime:false 下递归子模块源码、HEAD、status、diff；正式 includeRuntime:true 的完整 treeDigest 保持原样。新增用例证明 ignored SDK/native/dist 的变化仍改变正式验收指纹。两项定向测试最终 2 PASS、0 FAIL、0 skipped；完整封存自测仍需执行。

CLI 采集器复用原 gtsc/tsc 的 noEmit 检查，固定原十包、三次独立 data 与精确 195 路径。被动记录实际进程、编译入口、SDK 与平台 addon，原生语义调用从真实 profile 读取。独立复核要求补齐原始子进程文件集合比对及 compiler→parent→addon 身份链，均已加入；Volar 虚拟 readFileSync 与原始磁盘哈希分开观测。复核后的四文件与登记版本字节一致。实际 f535c22 data 三次退出 0，开发 validator PASS；十二项真实证据及篡改测试全部 PASS，涵盖丢运行、改命令、漏进程、缺原生调用、错误 addon、失败子进程、重放 nonce 和少一个 GTS 文件。开发结果不是最终回执，登记路径下必须重新执行，其余缺失采集器继续 BLOCKED。

本文件审查的是验收执行器，不是迁移通过报告。初轮范围仅为 harness；用户随后明确允许协调者在核心 harness 就绪后自行启动迁移。是否可分派产品任务由经审查并 seal 的 contract phase 及实际 harness 自测结果控制，不由任务模板存在与否推断。产品最终范围仍包含全部 GTS 相关开发路径使用 TNB/tsgo，以及网页本地／后台两条路线。

## 执行与证据边界

执行器从固定 contract 取得 gate、命令、工作目录和断言，实际运行命令并收集原始 stdout/stderr、退出码及机器证据。worker 只能提交修改与证据位置；不能用自行填写的 `PASS`、退出 0 的汇总脚本或缺项的结果数组替代执行。

完整验收必须按 contract 枚举全部 gate，并对每一项进行检查。筛选运行只产生局部结果。条件 gate 由源码／依赖差异计算，不由 worker 的 `tnbChanged: false` 声明决定。不存在、未运行、格式不符、超时、证据缺失和未知状态均不能满足完成条件。

本地 seal 保护可审查的输入和结果一致性：gate 定义、运行器、断言、场景、源文件、锁文件、依赖来源及实际使用的编译产物变化，应使旧证据失效。**它不是对同权限文件系统修改者的安全边界**：能够同时改写运行器、seal、日志和 Git 历史的人也能伪造整套本地证据。最终依靠独立审查、固定 Git revision、受保护的 CI 重新执行和产物来源核验；不得宣称本地哈希提供不可伪造证明。

## 必须执行的反绕过检查

以下均应使用临时 fixture 和 harness 自身测试运行，不改产品仓库，不触碰用户的 memory 脚本。某项尚未实现时应明确记录缺口，不将本表当作已执行结果。

| ID | 改动或失败场景 | 必须出现的结果 |
| --- | --- | --- |
| H01 | 只执行一个成功 gate，再请求完整验收；删去结果数组中一个必需 gate | 完整验收失败，并逐项列出缺失项；不能按已有结果的 `every(PASS)` 判全绿 |
| H02 | seal 后删掉 gate、替换命令为 `node -e "process.exit(0)"`、删掉关键断言 | seal 验证失败；seal 覆盖命令的实际引用文件，不能只覆盖 contract 自身 |
| H03 | 成功后修改源码、锁文件、tsconfig、测试 fixture 或未跟踪的新源码；保持 HEAD 不变 | 旧结果不能通过当前树的验收；仅检查 HEAD 不足以识别 dirty tree |
| H04 | 不改源码，只替换被实际加载的 ignored `lib/typescript.js`、`bridge.node`、`dist` 或依赖包；保留锁文件 | 产物身份／依赖证据不匹配，或者要求在干净 checkout 中重建重跑；不得以 Git clean 冒充构建产物未变化 |
| H05 | 手写 `PASS` JSON、复制另一 run 的成功 JSON、删 stdout/stderr、改 exitCode、保留日志路径但替换内容 | 验收拒绝；状态需由运行器产生并与 run、gate、命令、源码和日志哈希绑定。简单可篡改 JSON 不得被描述成可信命令执行证明 |
| H06 | Windows 成功后缺 Linux CI 结果；仅跑 Node LSP 而缺真实扩展宿主／UI 手工项 | 所需平台和手工项保持 `NOT_RUN`／`BLOCKED`，完整验收失败；平台不能从结果中的任意字符串冒充 |
| H07 | 测试框架因 filter 未匹配而退出 0、全部 skipped、仅 discovery/list 模式、异步测试未 await | 对需要实际测试的 gate 核验执行数量／场景证据；零个执行不能通过 |
| H08 | worker 在原 checkout、其他 agent 的 worktree 或不同 repo 中运行正确命令 | 校验真实 cwd、Git 根目录、base/head、源集和依赖身份；不同 worktree 的结果不能错误地绑定当前树 |
| H09 | TNB 保持 pin 和源内容完全不变；随后只改 TNB overlay、patch、子模块工作区或消费的包产物 | 第一种可按 contract 的条件不要求 TNB 全量开发 gates，集成行为验收仍必需；第二种必须触发对应 TNB gates，不能只看 TNB HEAD |
| H10 | 命令挂起或 spawn 持有句柄的子进程；stderr 输出 panic 而包装进程返回 0；运行器被取消 | 有界结束并记录失败，清理整个由本次运行创建的进程树和锁；不得杀其他 agent／用户进程，不得以空日志判成功 |
| H11 | 同时启动两个重负载 gate；活锁、死锁、损坏锁文件；退出时另一个进程已接管锁 | 活锁拒绝／排队按统一约定执行，死锁仅在确认 owner 已退出时回收；释放时核验 owner；禁止无条件删除活锁 |
| H12 | 只计数 195 文件，但用另一文件替掉历史文件；CLI 成功却未覆盖无人 import 的 GTS | 比较实际 program 源集与固定清单，并运行独立文件负例；数量相同不能通过覆盖验证 |
| H13 | 根目录解析 TNB，但 data/tsserver/backend 实际加载 stock；只打印 TNB 横幅 | 每条实际执行路径需有解析位置、精确版本和原生运行证据；横幅仅为辅助 |
| H14 | 会话 trace 混用 LSP UTF-16 position、tsserver 1-based line/offset、绝对 offset；缺请求 ID／文档版本／session | 先按明确 schema 和协议规范化，再验证 request-response 对应关系；不猜单位或以存在非空对象当语义正确 |
| H15 | 无诊断通知就写 `diagnostics: []`；从旧 session 复制 hover；编辑后返回旧文档版本；100 个空事件冒充 100 轮 | 真实完成请求／通知、语义断言、版本链和场景顺序缺一均失败；轮数必须由完整编辑→诊断→查询→恢复周期计算 |
| H16 | 网页后台断开后静默切回本地；切换源码变更；重复创建 Worker／客户端而未释放 | 两条路线及断开／重连／切换场景均需证据；引擎、文档内容和会话清理断言必须成立 |
| H17 | stock 在大堆运行、TNB 仅记录 JS heap；候选 RSS 更高但报告“内存降低”；测量期间并行重负载 | 记录不可比／缺指标，不给内存改进结论；区分 V8、进程总量、进程树和采样口径。4 GiB 不是人为补设的最终硬门槛 |

## TNB 原有设施的精确含义

- `tools/ci-witness-groups.mjs` 是见证集合的唯一来源，应解析该固定版本的集合并复用其 CI 入口，不另抄一份容易漂移的清单。
- `node tools/ci-witness-groups.mjs all` **只验证并输出 wiring，不执行见证**。它通过后，见证仍未运行。`matrix` 同样不是测试结果。
- TNB 行为改动需运行该版本 `AGENTS.md` 规定的 `check:lib`、`check:enums`、`check:sourcefile-guard`、`check:go-as-guards`，实际见证，以及适用的 `check:sim-nav`、Volar suite。local-only 见证按明确影响范围执行，不能伪装为 matrix 已涵盖。
- sim-nav baseline、checker differential、Volar suite 和真正 GamingTS 的 CLI／LSP 验收有不同覆盖；Vue／Glint 的成功不能替代 GamingTS。Node 成功不能替代 Electron native ABI 验收。
- pristine tsgo 归因必须使用精确 pin 的未打补丁引擎。TNB 子模块已应用 patch 时不满足此条件。

## 文档与执行器需保持一致

旧 HARNESS v1.0 的“开始实施”“启动多 agent”曾与暂停迁移的阶段冲突，需要以最新用户授权和 contract phase 统一当前状态。§6 曾同时有“先完成 B0 后分派”与“基线期间并行实现”的表述，应统一为：harness 验证完成之前只做 harness；实施时独立只读调研可并行，产品修复依赖具体故障证据。

完成定义还需避免将暂未明确的性能改善阈值自动补成固定百分比；当前可执行的要求是完整记录可比指标、不得掩盖内存转移，并保留不能证明改善时的非完成状态。

## 实现审查记录

本文件初稿时运行器尚未落盘，以上为待执行审查项。实现出现后，应补充实际命令、退出码、最小复现和 P1/P2 缺陷；不能用“设计已覆盖”替代行为验证。

2026-09-10 独立复核已执行：

- `node --test harness/tests/probes.test.mjs`：14 tests PASS，0 skipped，退出 0。包含错误引擎、缺 native 证据、伪诊断、子进程 crash/hang、删除历史文件、同数量替换文件、缺 program 观测等反例。使用临时 fixture，无产品检查或依赖安装。
- `node harness/probes/session-evidence.mjs --case desktop`：输出 `BLOCKED`，Node 退出 2；没有 input 不会产生 PASS。

实施中的审查关注点已交回协调者：desktop 的 route 集合不能替代 root/data 两种工作区、各类负例及真实扩展宿主；coverage 的外部 files JSON 需要真实 collector 绑定；会话期望值和引擎 pin 需要独立于观察值的 contract 约束。当前关注点尚不是所有门禁已通过的声明。

### 核心执行器攻击复现与修复复核

以下攻击均在临时 Git fixture 中通过实际 Node 子进程执行，不修改产品仓库。发现时保留的关键输出列在表中；协调者修复后按同一输入独立复测。

| 问题 | 失败前的最小操作与实测输出 | 修复后的独立结果 |
| --- | --- | --- |
| P1：内置 engine/env 命令未绑定 | 实际仅执行 `node -e 'console.log(JSON.stringify({status:"PASS"}))'`，把其日志与退出码放入 engine receipt，正确更新 receipt 哈希；`verifyReceipt` 返回 `accepted: "PASS"`，没有执行引擎 probe | 同一替换现在拒绝：`Executed command does not match approved collector/probe`。内置 gate 同样核验 argv/cwd/log 名称；engine 重新核对 native RPC、诊断正反例、实际 SDK 与 addon 哈希 |
| P1：外部工具链仅 hash 入口 | runtime 指向工具包 `entry.mjs`，其导入 `helper.mjs`；只修改 helper，前后 snapshot `unchangedSnapshot: true` | 同样修改产生不同 snapshot。包管理器入口所属包树进入 hash，Node 绑定可执行文件及相邻 native 依赖；不扫描 Linux 整个 `/usr/bin` |
| P1：handoff 信任可改的 task base | 任务仅允许 `allowed.txt`，实际 commit `forbidden.txt` 后 handoff 为 FAIL；只改 task JSON 的 `before.base` 为新 HEAD 后变为 PASS、`changed: []` | 同时伪改 task base/head 现在拒绝：`Task baseline differs from sealed contract`。diff 起点由 sealed contract 提供 |
| P2：Windows 短路径被误认其他仓库 | 临时目录为 `C:\Users\ADMINI~1\...`，Git 返回 `C:/Users/Administrator/...`；普通 `realpathSync` 仍保留短路径，snapshot 抛 `Wrong Git root` | 对同一短路径运行 snapshot 现在 PASS；双方使用 native realpath |

Windows 作业控制还完成两项实际检查：

- 参数往返：空格、引号、尾反斜杠、中文路径、字面 `$()` 和空字符串，经 `windows-job.ps1` 后与原 argv 完全一致，退出 0。
- 后代清理：实际子进程创建 detached 后代并退出，执行器返回 `FAIL`、`child-process-leak` 和 `HARNESS_CHILD_LEAK`；检查该后代 PID 已终止。临时目录清理前再次确认只清理本次创建的进程。

本轮没有发现仍未处理的上述 P1/P2。此结论只覆盖这些复现，不等于整个迁移、所有平台或未来新增 collector 已通过。未登记的 collector 必须继续 BLOCKED；新增 collector、validator、expectations 和 contract 改动需审查、重新 seal 并重跑相应自测。

在协调者仍增补 evidence manifest 的过程中，独立运行 `node --test harness/tests/runner.test.mjs harness/tests/core.test.mjs` 得到 36 tests：34 PASS、2 FAIL、0 skipped，退出 1。通过项包括 subset 不可完成、缺 collector 不执行同名脚本、raw PASS 不能满足语义观察、篡改 nonce、phase 阻挡、源码／锁／未跟踪文件／ignored addon／构建产物变化使证据失效、foreign platform 阻挡，以及子进程超时收尾。两处失败是新增 manifest 先拒绝了输入，使旧测试预期的 `ENOENT`／`current assertions` 路径未被命中。已要求协调者修正测试；观察值重新校验测试必须同步更新 manifest 和 receipt hash，真正触达 validator，不能只放宽成“任意错误即通过”。最后 seal 应使用修正后的自测结果，本次中间运行不能作为 PASS 证据。

最后对包管理器版本预检的 cwd 修复做了独立代码复核：`environmentContext` 将 pnpmMain 留在 contract 指定的 main、pnpmGts 指向 gts、npm 指向 tnb；`environmentGate` 使用该上下文执行，并先验证对应 checkout 可用；`verifyReceipt` 使用同一个函数核对实际 cwd，因此不能把在错误仓库执行的 `--version` 输出作为正确环境证据。新增 `preflight probes each package manager in its own repository` 用例让临时工具在错误目录退出 9，并断言四个命令及 GTS/TNB 的记录目录，覆盖了本次误触发包管理器自动切换的问题。此次复核没有发现缺陷，只检查代码和该回归用例，未重复运行全套测试或产品预检；最终执行结果以协调者重新 seal 后的原始 selftest receipt 为准。
## 2.0.1 的真实运行修正

发布包原生实验发现 probe 错误调用了非标准 `Program.dispose`。GTS worker 已从 stock TypeScript 的 Program 接口只读复核无该方法，协调者删除调用；不为探针要求 TNB 添加假 API。删除后原生负例能报告 TS2322，但恢复源码仍得到旧诊断；stock 对照会清除。这是待修的真实 TNB 状态刷新问题，恢复断言保持不变。

GTS worker 已独立只读复核 task revision：当前 seal 的自测、相同职责与原始 base/head、越界拒绝、新记录链接原记录均存在；handoff 仍从 sealed base 计算差异，不能通过续接缩小检查范围。新增临时仓库测试验证旧任务过期、未自测的新 seal 不能续接、保留已有范围内改动和基线、越界不能续接。任务只采所属仓库源码身份以避免扫描其他 worker 正在安装的依赖；正式 run/finish 的完整指纹不变。

GTS tests 命令对齐已有 manifest 的 `pnpm test`（递归执行各包配置）；原来直接从根运行 Vitest 会误用样例配置。integration 角色增加 `.gitattributes`，用于实际复现的 Windows patch CRLF 解析问题；不允许删除 patch 或关闭安装脚本。此版本最后全量自测结果见 artifacts/selftest.json 指向的执行记录，不将旧版自测当新 seal 的通行证。

## 2.1.0 integration reassignment and runtime/coverage review

网页 worker 对本轮控制差异进行了独立只读复核并批准，未修改控制文件。复核确认：scopeTransitions 同时绑定旧任务 ID、seal、原始任务文件哈希以及 from/to 角色；扩大职责前仍按旧角色从固定 base 检查 committed/untracked 改动，不能追认已发生的越界；仓库与基线不变。明确扩展只用于主树的 `patches/` 和 `packages/custom-data-loader/` 集成。

递归运行时入口通过 ASCII 命令文件和固定环境变量调用已指纹记录的 Node/包管理器，不关闭依赖状态检查。真实中文带空格路径测试确认 pnpm 使用指定入口；篡改生成入口被拒绝。覆盖探测跟随内部链接并保留别名路径，内部链接下新增 GTS 会改变清单；越界、循环、损坏链接仍 BLOCKED。validator 的 directory 来自本次 runner context，不接受 observation 自报路径。

协调者在封存前运行 `node --test --test-reporter=tap harness/tests/probes.test.mjs harness/tests/runner.test.mjs`：43 PASS、0 FAIL、0 skipped，100723 ms；包括精确扩展授权缺失/原范围越界/旧任务不可变、真实 Unicode pnpm 调用和链接负例。独立复核只检查代码与新增测试，未重复执行此测试集。新 seal 仍须通过全部 selftest；分项产品实验不构成最终验收，未登记的 collectors 继续 BLOCKED。

## 2.1.2 exact compiler compatibility ownership

Browser worker independently compared the proposed contract against 2.1.1: only the version, two exact integration paths, and one bound scope transition changed. The previous task is 43db8d15-0537-471c-be04-236ec391da7b, control digest 28ce8be4b84b71f2872f26ec1a4f5c9f41763a802e202569bb751b393f9f5b90, and its actual task-file SHA256 is ea7de7436b9885ac09ff873fc15f65cacff8c844d0b6adb708b2a390cc2f3d24. From matches that original role exactly; to adds only vitest.setup.ts and packages/detail-log-viewer/src/DetailLogViewer.tsx. Repository, baseline, existing paths, gates, policy and adapters remain unchanged. Both product files were unchanged when reviewed.

GTS worker independently reviewed the concrete compatibility patch: the DetailLogEntry import alias preserves the exported component and runtime behavior. Vitest Assertion already inherits jest.Matchers<void, T>; removing its conflicting redundant parent preserves all matcher keys. The two overlapping asymmetric names remain available through Vitest CustomMatcher. Stock and pinned native/TNB overlay checks retain valid calls and reject invalid calls. No suppression, broad any, reduced test coverage or business-rule change is involved.

Sealed 2.1.1 selftests completed with 86 passed, zero failures/skips at artifacts/selftests/38dc1398-37e6-4959-aaff-29a9a6e1d3ae/receipt.json. The new seal must pass its own unchanged selftests before reassignment. Product acceptance remains incomplete.

The first contract draft mistakenly retained the superseded 2.1.0 transition, whose target role no longer matched the current role; the unchanged validator rejected it before selftests. The corrected active contract contains only the transition from task 43db8d15. The old authorization remains in Git history and its immutable task record; it is not broadened to the new paths. No runner validation was changed.

## 2.1.3 command and web collectors with exact documentation scope

本增量登记真实采集器，不声明迁移通过。全部既有 gate、基线、源码覆盖、平台、次数、超时和语义断言保持不变。版本、adapter 登记及 GTS 的 8 个精确文档路径构成 contract 差异。

GTS 原构建在修正 Nitro 的实际 IPv4／端口处理后能预渲染 31 页，但文档旧 URL 仍产生 404 和 `unhandledRejection`。原始开发证据保留在 `artifacts/harness-drafts/browser/gts-build-draft-eM55SK`，命令退出 0 仍被构建 validator 判为 FAIL。独立检查逐一确认链接目标存在；prospective transition 绑定任务 a40063cd-c453-4091-8ea8-ceb62837323a、原 seal 和任务文件哈希，只增加合同列出的 8 个文件。文档补丁保持页面、标题和代码示例，不通过移除页面获取成功。旧草案缺少 transition 必填的 reason/review 字段，组装检查已发现并补齐，原草案字节保留；不改变 scope 校验器。

CLI 采集器的真实 10 包试跑被 Windows PID 合法复用误拒绝，原失败证据不改写。修复按 PID 的起止生命周期识别独立运行，严格不相交时允许复用；非法 PID／父 PID／时间、重叠、相接和重放均拒绝。实际旧记录及 9 个可移植生命周期回归用例验证该边界，native 身份、原命令、覆盖与运行数验证保持不变。

command collector 执行原有 main/GTS build 和递归 Vitest 命令，通过被动 preload 核验真实工具入口、包脚本、测试数量、类型检查子进程、SDK 和原生语义调用。测试源文件和配置与固定 Git 基线比对；变更的原测试仅接受独立审查后的精确 before/after 哈希。transpile 测试的 Windows skip 移除与 CRLF 规范化保留原快照断言，后续 Prettier 格式补丁经独立完整 AST 对比，更新 after 哈希为 839c1a650e49fe31a941a98d7fe91e385de52878acfa73a5078b00c2b4ad349d，before 仍为固定原始基线。额外 public declaration consumer 验证公开导出可消费及非 any；它不能替代原检查或整份声明的有效性。

Vitest 实跑会改变默认 results.json 中耗时／结果元数据，不能靠忽略整个 .vite 目录绕过完整运行时指纹。本实现从独立测试源码清单确定缓存键，仅对既有默认路径的 version/results/duration/failed schema 保存原始字节和本次生成字节，再恢复原始字节。键丢失、额外字段、备份损坏、链接替换和并发写入均拒绝覆盖，同时尽可能恢复其它已登记缓存。校验器只读验证，不在校验时修复证据。转换缓存、执行文件和其它生成物继续参与原完整快照。

独立 supervisor 使用已有 core.execute 收回子进程树，在原 gate 总预算内预留 5000 ms 恢复缓存。命令、nonce、原始日志哈希、child observation、child lifetime 和内外时间包含关系均核验。真实独立 child 超时、退出 23 和成功三种用例证明父进程能从持久元数据恢复缓存，同时保留各自失败／成功结果。无论缓存恢复是否成功，失败命令都不能通过。

web collector 复用既有三项 Chrome 测试和 raw 会话观测，核验两条路线实际 SDK、后台 native addon/RPC、诊断与源码版本、功能请求、卡牌载入、切换、释放、断连／重连和选择持久化。collector/validator/expectations/fixture 均进入 seal；可移植 parser fixture 只用于自测，不是当前产品证据。网页采集器使用同一缓存恢复 helper 和有界 supervisor。最近真实 main 试跑因 GTS 属性声明依赖不可解析导致漏诊断，维持 FAIL 并继续修复；登记采集器不追认旧试跑为通过。

协调者独立审阅 TNB agent 编写的缓存和 supervisor，网页 agent 独立审阅 command／CLI 修改、contract 范围和格式补丁；协调者独立审阅网页 agent 的采集器。整个组装候选仍需独立核对文件清单后才能 seal，并以新 seal 下的完整 selftest 结果决定任务续接。正式集成验收仍必须重新运行 run all 和 finish，缺采集器／平台／真实产品证据继续拒绝完成。

## 2.1.3 checkout bytes and declaration dependency scope

首次 2.1.3 组装和超时自测原样保留：artifacts/harness-drafts/assembled-2.1.3 和 artifacts/selftests/e3295cf2-dac4-44b3-90b9-7767e50a4751。该次在并行 TNB 构建期间达到原 120 秒上限，不能作为 PASS。新候选不延长超时、不减少测试。提交前发现 5 个文本控制文件含 CRLF，Git 的既定 LF 规则会改变其字节；仅统一这些实际有差异的文本行尾，gzip fixture 保留二进制原样。新增自测在临时 Git 仓库对全部 sealed controls 实际 add/checkout-index，逐文件比较检出字节与 seal，防止本机通过而干净检出失败。

网页真实错误仍保持 FAIL。stock/native 单文件与 bundled declaration 字节一致，均留下 gts-runtime 和 arktype/@ark/schema 的 4 条无法解析的声明依赖。精确映射至现有真实 .d.ts 的 artifact 实验 provider-resolver-OTBWt6 将这 4 条归零；provider-consumer-YuTC7c 的完整 usage number/string 负例恢复，未改 skipLibCheck 或断言。原 bundled declarations 的其它 102 条全图问题在 stock/native 的 code/file/start 完全相同，不能宣称整图无错。custom-loader 直接依赖在现有职责中；core 的独立声明从 core 目录解析，还需其 package.json 显式声明已使用的依赖。因此仅前瞻增加 packages/core/package.json，绑定原 integration task 的 ID、seal、文件哈希和原角色；原产品文件在授权前未改。旧 integration transition 留在历史中，新 contract 仅保留与当前目标角色一致的精确 transition。

本候选必须独立 review、重新 seal 并通过完整自测，之后才能 revise 任务并实施该依赖修复。既有 gate、平台、基线、次数、预算、源码覆盖和语义断言不变。

## 2.1.4 bounded file reads

Windows 上 TNB 任务源快照的完整读取耗时较长。候选仅替换 core.hashFile 为一个固定 64 KiB 缓冲区的 SHA256 读循环，保持原 Promise API，在 open 之前分配缓冲区，finally 关闭文件，每 MiB 及每文件完成让出事件循环。root 与 browser 独立比较确认该函数前后的代码逐字节一致；sourcePaths、Git 调用、子模块、untracked 与 ignored 规则、遍历顺序、快照字段均未改变，不引入内容缓存。

复核的 core 候选 SHA256 为 8114c50e6ce7d92ec8b57cdfe74ecf4089076ab5f2538f3718edce7696adf7e5。artifact 证明 hash-performance-proof-xfDaT2/results.json 绑定该精确版本，覆盖空文件、Unicode/CRLF/NUL、块边界、大文件尾部、ENOENT、并发调用、同 size/mtime 内容重写及事件循环让出。完整 source snapshot trial hash-performance-full-trial-GmvgUH 单独保留；其 includeRuntime:false 仅用于任务源快照，不是最终 runtime 指纹证明。早期旧候选的 cold/warm 数据不能归为本候选的速度提升。新增 sealed tests 在真实临时文件验证上述外部行为；原完整 selftest 的 120 秒限制保持不变。

补充前版声明实验的证据范围：后续在实际 rolldown-plugin-dts 调用中发现 config-less createProgram 没有进入原生。此前“stock/native 声明字节一致”只能说明加载对应包的输出一致，不能据此证明 native emitter 已执行。真实 web 负例现已检出并清除，但原 GTS build 原生断言仍 FAIL；应修复 TNB，不能删除断言。Linux nested detached 命令清理边界正在独立评估，本版不声称已修复或已完成 desktop / Linux 验收。

## 2.2.0 GTS-owned editor acceptance and web withdrawal

用户确认目标只覆盖 GTS 与 TNB：`@gi-tcg/gts-language-server` 与 GamingTS 扩展接入 TNB 后在真实编辑器可用，并把主仓库里的语言服务实现与网页双路线撤出（不画蛇添足）。本版因此把 `desktop`（L1-L4/E1）从主仓库改绑到 `worktrees/gts`，并新增同仓库的 `gts-engine`；`web` gate、`browser` 角色、`repositories.web` 与 `harness/collectors/web/` 全部移除，`harness/tests/collectors.test.mjs` 去掉对应 import（web 采集器测试随文件删除，自测总数 152→130，没有 skipped／todo）。桌面场景把 `data-workspace` 换成 `examples-workspace`，并新增 `packed-vsix-install`。

承载约束与实现：scope transition 要求 `from.gates ⊆ to.gates`，因此 gts 角色保留 `engine` 并新增 `gts-engine`，不删除既有 gate；对应 transition 绑定活跃 gts 任务 `dc0fb908-8d11-444a-b4b5-5d8f9559dc8e`、seal `019dfeb2…` 与任务文件哈希 `9b27bb16…`。`runner.engineGate` 与 `verifyReceipt` 改为按 `gate.repository` 读取 `harness/baselines/<repo>.json`；新增的 `harness/baselines/gts.json` 以 LF 写入，否则 Git 检出字节检查失败（首次草稿即因 CRLF 被自测拒绝）。

本版仍是候选：草稿 `artifacts/harness-drafts/batch-1` 先通过 verify 与完整自测，再升格到 root 并重新 seal、重跑 selftest；升格后旧回执（含 4 次 preflight）全部失效。**尚未登记**：desktop collector（该门仍为 BLOCKED，草稿在 `artifacts/harness-drafts/desktop` 且 blocked on Linux 进程清理与 packed VSIX 模式）、LSP 粒度门、按产物身份判定的 TNB 触发规则、平台能力门、validateContract 的角色／仓库交叉检查。

## 2.3.0 sealed gaps, wiring invariants and a first-class delivery gate

用户要求"先改 harness、最后一次改完做记录再开干"，并再次确认唯一交付面是 GTS 与 TNB：`@gi-tcg/gts-language-server` 与 GamingTS 扩展接入 TNB 后在真实编辑器可用；迁移期间在主仓库新增的实现与容器打包都属于必须删除的赘余。本版只改定义层，超时、次数、平台、路径、基线与既有断言全部保持原值，不放宽任何阈值。

- **gate wiring 必须显式。** 每个 gate 要么由内置 kind（environment／inventory／engine）或已登记采集器执行，要么在 contract 中写明 `blocked` 理由；两者互斥，已登记却声明缺口同样拒绝。9 个尚未实现的采集器因此各自带上封存的缺口说明，`status` 与运行期 BLOCKED 都直接引用该理由；缺理由的 gate 现在让 `verify` 失败，而不是默默变成 BLOCKED。
- **角色 gate 与仓库绑定。** 角色的 gate 必须在该角色自己的仓库执行。跨仓库 gate 只能由 contract 中显式声明的 `inheritedGates` 继承——目前只有 gts 角色继承 main 的 `engine`，这是 scope transition 的 `from.gates ⊆ to.gates` 约束留下的唯一合法例外，按声明接受、不存在隐含许可。
- **scope transition 逐字节复核。** 除原有自洽检查外，被绑定的旧任务记录仍在本地时必须复核其 SHA256、controlDigest、角色与 `from` 角色规格。`artifacts/` 不封存，所以全新 checkout 跳过该复核而不失败。代价与收益都记在这里：把 `scopeTransitions[0].previousRecordSha256` 改成 `0…0` 之后，是控制核验本身在 `revise` 之前就拒绝，而不是留下一个可以事后追认的绑定。
- **交付面成为一等 gate。** 新增 `gts-lsp`（repository gts，requires `gts-engine`、`gts-build`，covers L1／E1），不经编辑器、以 stdio 直连 `@gi-tcg/gts-language-server` 核验 LSP 语义与 TNB 产物身份。当前为 BLOCKED；编辑器证据不能替代语言服务自身的原生身份。
- **HARNESS.md 新增 §8**，把仍未交付的验收工具和推进批次写进契约文本：先 desktop 与 platforms，再 coverage、memory、clean-install，最后 TNB 四件。采集器期望值要对接近最终的产品状态生成，因此与产品修复并行推进，而不是提前冻结。
- **Git 辅助超时分成两条有界边界。** tnb 任务续接原先确定性失败：`snapshotRepository` 对 pin 的两个子模块做源码指纹时，`git ls-files --others` 在 `typescript-go` 上要遍历约 14 万个文件（`_submodules` 81371、`testdata` 49636）。实测 `ls-files --others --exclude-standard` 87.9 秒、`git ls-files` 0.2 秒、`typescript` 子模块 81500 个跟踪文件；30 秒的单一 Git 超时因此必然 ETIMEDOUT。现在索引查询仍用 `gitTimeoutMs = 30000`，只有枚举工作树（`--others`／`--untracked-files`）改用 `gitEnumerationTimeoutMs = 300000`，两者都仍有界，新增自测固定该分类；gate 超时与所有验收阈值不变。这是实测出的工具边界，不是因为验收失败而放宽上限。
- **未做**（2.2.0 列出的其余缺口）：desktop 采集器改绑与登记、platforms 能力门、按产物身份判定的 TNB 触发规则。TNB 触发仍保守恒为必需；HARNESS.md §5 已规定只有证明没有 TNB 行为或产物改动之后才可审查放宽，本版不放宽。

自测：本版新增 3 项负例（未声明缺口的 gate、wiring 与缺口并存、角色 gate 跨仓库）与 1 项 scope transition 记录复核，必须随全部封存自测通过后才允许派发；升格后旧 seal 与旧回执全部失效。回执见 artifacts/selftests/ 下本版记录，不把文档或草案当作通过证据。

## 2.4.0 registered stdio language-server evidence

用户要求"最后一次改完 harness，做记录再开干"。本版只登记交付面自己的采集器：`gts-lsp` 从 BLOCKED 变为可执行。gate 列表、依赖、repository、`timeoutMs` 900000、角色边界、三处基线、既有断言与其他 9 个仍 BLOCKED 的 gate 全部保持原值；contract 只新增一个 adapter 条目、删掉该 gate 的 `blocked` 理由并把版本改为 2.4.0。这一对字段互斥由 2.3.0 的 wiring 不变式强制，登记后仍声明缺口会让 `verify` 失败。

**采集与判定分离。** `gts-lsp-collector.mjs` 只记录事实：它在 `HARNESS_RUN_DIRECTORY` 下建一次性工作区（故意不放产品树，避免运行期改动源码指纹），用 gate 的仓库解析 tsdk 与 `@volar/language-server`，以 stdio 启动 `packages/language-server/bin/gts-language-server.js`，按 expectations 的 23 步脚本打开 `current.gts`／`old_versions.gts`／`consumer.ts`，写原始 transcript、`TNB_TRACE_RPC` 轨迹、服务器日志与解析出的身份；它不写状态字段，只在服务器崩溃、超时或返回错误时以非零码退出。`gts-lsp-validator.mjs` 从这些原始记录和磁盘文件重新推导一切，`evaluate` 是纯函数：`initialize` 能力必须给出 `textDocumentSync=2` 与所需 provider；每个 didOpen／didChange 的版本必须严格递增（增量同步而非重放）；诊断必须逐项匹配 code／severity／source／精确 span／消息，且修复后重新为空；hover 必须含 `CharacterHandle<never>`；definition 必须落回客户端打开过的文档并匹配起始位置；completion 必须给出 fixture 属性；signature help 必须给出 `max(...values: number[]): number`；解析到的包必须是 `typescript-native-bridge@6.0.3-bridge.16.tsgo.7.0.2` 且入口哈希与磁盘一致；原生 addon 路径必须在 checkout 内、包名符合 `@typescript-native-bridge/<platform>-<arch>`、版本同 pin、哈希与 `BRIDGE_LOAD` 的 `lib=` 一致；tsgo build info 必须是 7.0.2；RPC 轨迹必须 `ENTER`／`EXIT` 平衡、不少于 20 次且包含 `updateSnapshot`、`getSemanticDiagnostics`、`quickinfo`、`definitionAndBoundSpan`、`getCompletionsAtPosition`、`signatureHelp`；stderr 必须含 `TNB ACTIVE` 与 `[tsgo-profile]`，且证据中不得出现 `__gts_` 或致命输出。`validate` 另外复核三份证据文件的 SHA256、重新解析 checkout 并在缺 checkout 时返回 BLOCKED，而不是 FAIL。

**试运行发现并修正的一处断言。** 第一次 trial 把 definition 的落点约束在仓库内，实际（也是正确）落点是运行目录里的一次性工作区文档。校验器因此改为要求 definition 命中"客户端已打开过的文档"，这比原来的仓库内约束更强：它证明映射回到真实文档，而不是虚拟源码。工作区放在运行目录同时也让 `artifacts/` 外的源码指纹在运行期间保持稳定。

**自测。** `harness/tests/gts-lsp.test.mjs` 共 25 项：1 项正例、23 项反绕过负例，外加一项对封存 expectations 形状的互锁（步数、文档数、`--stdio`、增量同步、RPC 下限与必需原生方法、两条诊断码与 span 仍在），这样"有人悄悄掏空 expectations"会先让自测失败，而不是让 gate 变空通过。负例覆盖：删除诊断、位移 span、definition 越出客户端文档、记录文本与封存 fixture 不符（open 与 change 各一条）、RPC 失衡、缺原生方法、`BRIDGE_LOAD` 指向别处或缺进程身份、addon 哈希变化、编译器版本不符、超时与错误、步骤缺失／乱序／重复、文档版本回退、服务器失败或未报告退出码、缺少增量同步或能力、capabilities／已打开文档／tsdk 与记录不符、启动参数不是封存的 `--stdio`、cwd 不在运行目录、可执行文件不是 Node、泄漏 `__gts_`、`panic:` 致命输出、证据引用缺少哈希、证据引用越出运行目录（相对与绝对各一条）、证据文件被改写、证据属于别的 gate。IO 层的哈希校验、运行目录约束、"缺 checkout 返回 BLOCKED"单独覆盖，因此这套测试不依赖本机是否存在 gts worktree。真实产品证据只能来自 runner：本版 trial（`artifacts/harness-drafts/lsp-trial.mjs`，非验收）以 runner 相同的环境跑出 25 步、服务器 exit 0、`ENTER`／`EXIT` 平衡且远高于 20 次下限、validator PASS。

**独立复核（三轮，记录在此）。** 本版在升格前由独立 agent 只读复核采集器、校验器、expectations、wiring 变更与 HARNESS 文本；三轮都各自重跑了轻量自测并在当轮的文件版本上复核证据，第三轮另外独立重跑了真实 trial（`artifacts/harness-drafts/lsp-trial.mjs`：25 步、exit 0、`ENTER`／`EXIT` 各 69、validator PASS），并逐字节确认工作区里的三份 fixture 与封存文本相同。三轮均未修改任何控制文件。第四轮为确认轮：仅复核最终字节与新增用例（25/25 通过），未发现新问题、未修改文件。

第一轮结论"有保留"：未发现可用产品证据伪造的绕过（诊断码与 span、修复后消失、hover／definition／completion／signature help、文档版本单调、RPC 平衡、`BRIDGE_LOAD` 与磁盘 addon、tsgo 版本全部从原始记录与磁盘重推；空期望也不能用不匹配的垃圾或全 skipped 蒙混），但指出 4 处自证面与 3 处过度声明：capabilities、客户端打开过的文档、tsdk 三项取自采集器写在 observation 里的摘要；`readEvidence` 未用 `inside()` 约束且哈希缺失时会静默跳过；`BRIDGE_LOAD` 的条数与必需片段写死在 validator 而非可复查的 expectations；本文档自称"复核记录见下"却尚未写下，负例计数与实际不符，三个测试标题超出其覆盖。

第二轮针对修改后的文件复核，结论"有保留但已接近可交付"，并发现一个第一轮漏掉的真实缺陷：采集团里的 fixture 从不落盘。`Object.entries(expectations.texts)` 产出的是 `[key, value]`，与 `entry.textId` 比较恒为 false，因此 `current.gts`／`old_versions.gts`／`consumer.ts` 从未写入一次性工作区；工程的 include 匹配不到任何文件，definition 指向一个现实中不存在的文档。已按文档条目逐个写入（若只修解构仍遍历 `texts`，`current.gts` 会被后续错误态文本覆盖），并新增"记录文本必须等于封存 fixture"的校验。

三轮之后收紧的不变式：capabilities、已打开文档集合与 tsdk 只取自已记录的交换与已解析的 checkout，采集器摘要必须与之逐字段一致；证据引用必须带 64 位哈希，路径必须落在运行目录内，哈希不匹配即拒绝；启动命令必须恰好是 `<checkout>/packages/language-server/bin/gts-language-server.js --stdio`，cwd 必须在运行目录内，可执行文件必须是 Node；磁盘侧的原生包名也参与比对；每次 didOpen／didChange 的文本必须等于封存 fixture。相对第一轮没有任何断言被放松（expectations 逐字段比对：23 步、两条诊断、hover／completion／signature／definition 期望、`minimumRpcCalls=20`、六个必需 RPC 方法、stderr 与 forbidden 片段、`--stdio`、`documentSyncKind=2`、五个必需能力，全部未变）。

**派发与已知残余。** 本 seal 仍须通过全部封存自测，升格后 2.3.0 的 seal 与回执全部失效。已知残余（都在复核记录里写清，不是隐藏项）：`rpcTrace` 的计数与重新计数来自同一份 trace 文件，属漂移检测而非独立证据；`evaluate` 自身没有代码级步数下限，gate 强度依赖 expectations 的封存与复查，已用自测互锁缓解；steps 覆盖列表取自 observation（内容来自 transcript），不构成绕过但仍是自报；首次真实 `run gts-lsp` 才第一次承受 runner 的 before/after 源码指纹不变式（语言服务若往 checkout 写东西会 FAIL，方向是安全的）。仍未做（与 2.3.0 相同）：desktop 采集器改绑与登记、platforms 能力门、按产物身份判定的 TNB 触发规则。
