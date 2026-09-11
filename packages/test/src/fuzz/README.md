# 核心引擎 Fuzz 测试

对 `@gi-tcg/core` 做随机化整局测试：随机牌组、随机版本、随机合法行动，从 `initHands` 打到 `gameEnd`，
用引擎异常与状态不变量做 oracle，把每个失败用例连同可导入 standalone 的对局日志一起落盘。

组织方式参考 Pokémon Showdown 的 `sim/tools/`（随机玩家 + runner 与模拟器同包）和 cargo-fuzz 的 `fuzz/` 目录
（失败产物落盘、按种子复现）：代码放在测试框架包 `@gi-tcg/test` 内，仅通过命令行运行，**不**参与
`pnpm -r test`，也不接 CI。

## 快速开始

需要先构建依赖的包（fuzz 通过 `gnx` 运行，`@gi-tcg/core`/`@gi-tcg/data` 走 `dist`）：

```sh
pnpm install
pnpm build "typings...,core...,data..."
pnpm --filter @gi-tcg/test fuzz -- run --count 200 --jobs 4
```

结束后会打印按错误键去重的汇总，并在产物目录（默认 `packages/test/temp/fuzz/<seed>-<time>/`）留下：

```
campaign.json      本次运行的全部参数（含种子）
results.jsonl      每个用例一行
summary.json/.md   按规范化错误键去重分组：计数、涉及版本、代表用例、复现命令
<index>-<outcome>/ 每个非 ok 用例一个目录（见下文）
```

有失败时退出码为 1。

## 命令与选项

```
fuzz run [选项]            运行一轮 campaign
fuzz repro <case.json>     按 case.json 里的 (种子, 序号, 选项) 重跑单个用例并完整落盘

--seed <n>          campaign 种子（默认 Date.now()，会打印）；同一种子 + 同一选项 = 同一批对局
--count <n>         用例数（默认 100）
--jobs <n>          并行子进程数（默认 CPU 数 - 1；1 为进程内运行，便于 --inspect）
--mode <m>          game | scenario | protocol | all（默认 game；all 按序号轮换三种模式）
--version <v>       current | random | v6.7.0 等（默认 current；random 在全部官方版本间抽取）
--strategy <s>      weighted | random（默认 weighted：技能 6 / 打牌 4 / 切人 2 / 调和 1 / 结束 0.3）
--dice <d>          random | omni | real（默认 random：每局随机决定是否 alwaysOmni）
--deck-shape <s>    official | small | chaos（默认 official：3 角色 + 30 张，≤2 张同名，秘传/祝福 ≤1）
--max-rounds <n>    每局最大回合数（默认 15）
--timeout-ms <n>    单局超时（默认 120000）
--max-rpcs <n>      单局 rpc 上限，超过则 giveUp（默认 2000）
--strict-dice       unexpectedInsufficientDice = "throw"（把骰子被级联消耗的软警告变成硬错误）
--malice-p <p>      协议模式每次 rpc 注入非法响应的概率（默认 0.15）
--relatedness <p>   场景模式抽取"角色相关"实体的概率（默认 0.7）
--out <dir>         产物目录
--start-index <n>   从第 n 个用例开始
--stop-on-failure   首个失败后停止
```

## 三种模式

| 模式 | 初始状态 | 玩家 | 主要抓什么 |
|---|---|---|---|
| `game` | `Game.createInitialState` + 随机牌组 | 双方合法随机 | 完整流程、卡牌交互、preview 崩溃 |
| `scenario` | 随机生成的中局状态树（复用 `src/dsl.ts` 的 `buildState`） | 双方合法随机 | 直接命中特定状态/召唤物/装备的代码路径 |
| `protocol` | 同 `game` | 一方被包装为"恶意玩家"，以概率注入非法 rpc 响应 | 引擎是否总以 `GiTcgIoError` 判负，而非崩溃或接受非法输入 |

合法随机玩家只在引擎标记为 `VALID` 的候选行动中选择，并原样使用 `autoSelectedDice` 支付，
因此合法策略下出现的 `GiTcgIoError` 意味着"引擎宣称合法却又拒绝"，同样记为失败（`io-error`）。

牌组合法性离线从 `GameData` 推导：可入牌组的卡 = type ∈ {eventCard, equipment, support} 且
（`obtainable` 或带 talent/adventureSpot/blessing/technique 标签）；天赋牌按 id 约定
（`2` + 角色 id + 序号）绑定角色。

### 结果分类

| outcome | 含义 |
|---|---|
| `ok` | 正常结束 |
| `engine-error` | `start()` reject：`GiTcgCoreInternalError`、`GiTcgDataError` 或任意非 GiTcg 异常 |
| `io-error` | 合法策略下引擎抛出 `GiTcgIoError` |
| `invariant-violation` | 某次 `onPause` 时状态不变量（硬规则）被破坏 |
| `protocol-accepted` | 协议模式：非法响应未被以 `GiTcgIoError` 判负 |
| `timeout` / `hang` | 单局超时被 terminate / 主线程陷入同步死循环（见下文） |
| `crash` | 子进程非正常退出（如 OOM） |
| `budget-exhausted` | rpc 次数超过上限，主动 giveUp |
| `soft-warning` | 对局正常结束但捕获到 `console.warn`（如骰子被级联消耗） |
| `known` | 错误键命中 `known-issues.json`（原 outcome 记录在 `originalOutcome`） |

不变量（`invariants.ts`）：所有变量为整数且在 `varConfigs` 的 `[lowerBound, upperBound]` 内、实体 id 全局唯一且为负、
出战角色属于本方、手牌/牌堆/召唤物/支援/骰子数量不超上限、各区实体类型与区域匹配、`winner` 与 `phase` 一致、
定义对象与 `GameData` 中注册的同一引用等；软规则（如出战角色已倒下、变量不在 varConfigs 中）只写入报告。

## 如何定位一个失败

每个失败目录里：

- **`report.md`** —— 先看这个。包含：
  - 错误类、消息与 **结算链**（`GiTcgError` 自带的 `when 技能 → when 事件`，相当于游戏层调用栈）、栈与 cause 链；
  - **涉及的定义**：报告中出现的每个定义 id 都标注了名称与 `.gts` 定义位置（`文件:行`），索引来自扫描 `packages/data/src`；
  - 对局设定（版本、骰子模式、种子、双方牌组或场景摘要、协议注入信息）；
  - 崩溃前最后 20 次玩家决策、上一暂停点以来的 mutation 摘要、软规则提示、`console.warn`；
  - 复现命令。
- **`gameLog.json`** —— 与 standalone 导入格式一致：`pnpm --filter @gi-tcg/standalone dev`，导入后可逐暂停点回看棋盘、
  查看结算细节日志，并从最后一个可恢复点续跑。
- `final-state.json` —— 出错时的最终状态（同格式，单条）。
- `detail-log.txt` —— 完整结算细节日志，树形缩进，`/preview`、`/precalculate` 标记推演环境。
- `case.json` —— 机器可读的全部信息：种子、选项、牌组/场景、完整决策记录、错误、违规、warn。
- `repro.sh` / 复现命令 —— `pnpm --filter @gi-tcg/test fuzz -- repro <dir>/case.json`，
  输出 `REPRODUCED` / `DIFFERENT FAILURE` / `NOT REPRODUCED`（后者提示存在未受控的随机源）。

产物里的所有路径（复现命令、`artifactDir`、`campaign.json` 的 `outDir`、栈帧、hang 调用栈）都是**相对仓库根目录**的，
不含本机绝对路径，可直接随 MR 附件分享。报告里的复现命令请在仓库根目录执行；每个用例目录下的 `repro.sh`
会自行定位 `case.json`，在仓库内任意目录执行都行（产物目录放在仓库外也可以，或用 `GI_TCG_ROOT` 指定仓库）。

### 死循环（hang）的诊断

同步死循环会让 `setTimeout` 与 `game.terminate()` 都无法触发。每个 fuzz 进程内有一个 watchdog 工作线程
（`hang.ts`）：主线程每开始一个用例、每次 rpc 都上报心跳，超过 `timeout + 10s` 没有任何心跳时，工作线程通过
`inspector.Session.connectToMainThread()` 暂停主线程、把它的调用栈写到 `hang-<index>.json`，然后结束进程；
父进程据此写出 `<index>-hang/report.md`（含调用栈与复现命令）并从下一个用例重启该分片。`repro` 同样带 watchdog。
因此 `hang` 表示"连一次 rpc 都没有推进"（阶段循环空转，或单次结算内的死循环）；只是慢的对局会被 `--timeout-ms` 记为 `timeout`。
（合法玩家每 8 次 rpc 让出一次宏任务队列，否则整局都在微任务里跑，`setTimeout` 永远触发不了。）

## 确定性

所有随机性来自 `prng.ts`（mulberry32），每个用例的种子由 `(campaignSeed, index)` 派生；牌组由 fuzzer 自行洗好后以
`noShuffle: true` 传入（引擎的 `shuffle()` 使用 `Math.random`），`randomSeed` 显式指定。同一 `case.json` 重跑得到同一局。

## known-issues.json

已知且暂不处理的问题按规范化错误键前缀登记：

```json
[{ "key": "GiTcgDataError: 某个前缀", "note": "issue #123" }]
```

命中的用例记为 `known`，仍会落盘但不计入失败退出码。

## 注意

- `availableActions()` 会对每个候选行动做 preview（推演），是主要耗时；用 `--max-rounds`、`--jobs` 调节吞吐。
- 场景模式会把实体放到"不可能"的位置（如把某角色专属状态挂在别的角色上），初期会有一批数据层假设被打破的
  `GiTcgDataError`/`TypeError`，请按报告中的定义位置判断是否值得修，或登记到 `known-issues.json`。
- 需先 `pnpm build`；`NODE_ENV=development` 走源码的方式在 Node 26 下会被 `ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING` 拒绝，暂不支持。
