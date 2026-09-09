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
