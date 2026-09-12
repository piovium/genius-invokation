# 核心引擎 Fuzz 测试

对 `@gi-tcg/core` 做随机化整局测试：随机牌组、随机版本、随机合法行动，从 `initHands` 打到 `gameEnd`

## 快速开始

```sh
pnpm build "test..."
cd packages/test
pnpm fuzz run --count 200 --jobs 4
```

结束后会打印按错误键去重的汇总，并在产物目录（默认 `packages/test/temp/fuzz/<seed>-<time>/`）留下：

```
campaign.json      本次运行的全部参数（含种子）
results.jsonl      每个用例一行
summary.json/.md   按规范化错误键去重分组：计数、涉及版本、代表用例、复现命令
<index>-<outcome>/ 每个非 ok 用例一个目录（见下文）
```

## 两种模式

| 模式 | 初始状态 | 玩家 | 主要抓什么 |
|---|---|---|---|
| `game` | `Game.createInitialState` + 随机牌组 | 双方合法随机 | 完整流程、卡牌交互、preview 崩溃 |
| `protocol` | 同 `game` | 一方被包装为"恶意玩家"，以概率注入非法 rpc 响应 | 引擎是否总以 `GiTcgIoError` 判负，而非崩溃或接受非法输入 |

`--mode all` 按用例索引交替运行 `game` 和 `protocol`。

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

不变量（`invariants.ts`）：所有变量为整数且在 `varConfigs` 的 `[lowerBound, upperBound]` 内、实体 id 全局唯一且为负、
出战角色属于本方、手牌/牌堆/召唤物/支援/骰子数量不超上限、各区实体类型与区域匹配、`winner` 与 `phase` 一致、
定义对象与 `GameData` 中注册的同一引用等；软规则（如出战角色已倒下、变量不在 varConfigs 中）只写入报告。

### 死循环（hang）的诊断

同步死循环会让 `setTimeout` 与 `game.terminate()` 都无法触发。每个 fuzz 进程内有一个 watchdog 工作线程
（`hang.ts`）：主线程每开始一个用例、每次 rpc 都上报心跳，超过 `timeout + 10s` 没有任何心跳时，工作线程通过
`inspector.Session.connectToMainThread()` 暂停主线程、把它的调用栈写到 `hang-<index>.json`，然后结束进程；
父进程据此写出 `<index>-hang/report.md`（含调用栈与复现命令）并从下一个用例重启该分片。`repro` 同样带 watchdog。
因此 `hang` 表示"连一次 rpc 都没有推进"（阶段循环空转，或单次结算内的死循环）；只是慢的对局会被 `--timeout-ms` 记为 `timeout`。
（合法玩家每 8 次 rpc 让出一次宏任务队列，否则整局都在微任务里跑，`setTimeout` 永远触发不了。）
