# 结算流程设计

本文描述当前 `@gi-tcg/core` 的实现，主要对应 `game.ts`、`skill_executor.ts`、`runtime/context/skill.ts` 和 `mutator.ts`。实现以不可变 `GameState` 和 `Mutation` 为基础：技能在私有的 `SkillContext` 中收集状态变更与事件，随后由 `SkillExecutor` 递归结算事件和请求。

```text
Game 阶段 / 玩家行动
        │
        ▼
SkillExecutor.finalizeSkill
  ├─ 执行技能定义，提交状态变更
  ├─ 处理技能产生的事件和请求（递归）
  └─ 若本次技能确实造成倒下，处理双方强制切人
        │
        ▼
StateMutator 通知前端、请求 Player IO、记录 Mutation 与详细日志
```

`Game` 不直接修改状态；它通过 `StateMutator` 应用 mutation。`StateMutator` 在普通通知时调用 `onNotify`，只在阶段切换、初始换牌等明确暂停点调用 `onPause`。技能与事件结算过程中不会因为每次 mutation 自动暂停。

## 游戏阶段

`Game.start()` 首先强制通知并暂停一次，之后循环执行当前阶段；每次阶段函数结束后变更 `phase`、清理已移除实体和阶段日志，再通知并暂停。

| 阶段          | 当前实现                                                                                                      |
| ------------- | ------------------------------------------------------------------------------------------------------------- |
| `initHands`   | 双方依次抓初始手牌并处理入手牌事件；暂停后双方并行选择换牌，再处理产生的事件。                                |
| `initActives` | 双方并行选择初始出战角色；依次执行切换及其事件，触发 `onBattleBegin`，随后回合数加一。                        |
| `roll`        | 触发 `onRoundBegin`；双方依次处理 `modifyRoll`，随后并行生成骰子并重投。                                      |
| `action`      | 首次进入时触发 `onActionPhase`。当前玩家处理准备技能或选择行动，直到双方都宣布结束。                          |
| `end`         | 触发 `onEndPhase`；按当前行动方、另一方的顺序各抓 2 张牌；触发 `onRoundEnd`，清理轮次状态并进入下一掷骰阶段。 |
| `gameEnd`     | 结束对局，解析胜者或平局。                                                                                    |

行动阶段中，核心先处理 `onBeforeAction`，再检查首个可用的 `replaceAction` 技能；若存在便执行它并跳过玩家操作。否则，核心生成可用的技能、打牌、切人、元素调和和宣布结束行动，预计算修改与预览后请求玩家选择。选定后依次处理 `modifyAction0` 至 `modifyAction4`，校验并支付骰子和能量，执行实际行动，触发 `onAction`；非快速行动再切换行动方。

## 执行一个技能

`SkillExecutor.finalizeSkill(skillInfo, arg)` 的顺序如下：

1. `executeSkill` 调用技能定义的 `action`。对于角色主动技能，先清除本回合的下落攻击资格。
2. 技能在 `SkillContext` 内产生新状态、事件列表和前端 mutation 通知；执行器提交这些结果，并记录 `skillUsed` 日志事件。
3. 若为角色主动技能，记录本回合技能使用次数；在角色仍存活且技能允许时，获得 1 点充能，并在此处执行一次暂停回调。
4. 按技能上下文排好的顺序递归处理其事件列表。
5. 仅当**该次**技能的结果标记为造成了未被免除的倒下时，处理强制切换出战角色。

技能可以嵌套地通过 `requestUseSkill` 或其他请求发起新的技能；每一层都独立执行上述流程。若任何步骤把游戏阶段改为 `gameEnd`，`Game` 会中断当前阶段调用栈并结束对局。

## 技能返回事件的预处理

事件默认加入当前队列；`eventBoundary()` 会立即预处理当前队列，然后开启新队列；技能结束时，`SkillContext.terminate()` 会调用一次 `eventBoundary()` 处理最后一个队列。每个队列的 `EventList` 会先合并同一目标的伤害事件；然后按以下规则分类：

1. 对每个伤害事件，若其 `causeDefeated` 为真，立即以内联方式广播 `modifyZeroHealth`。
2. 若没有技能调用 `immune(...)`，立即将目标标记为倒下、清空其能量和元素附着、清除该角色的本回合技能记录，并设置玩家的 `hasDefeated` 标志。若一方已无存活角色，立即切换到 `gameEnd` 并设置胜者；双方同时无存活角色则为平局。
3. 被 `immune(...)` 拦截的伤害，以及其他未致命伤害，归入“安全伤害”列表；真正致命的伤害归入“致命伤害”列表。
4. `onHandCardInserted` （HCI 事件）会单独归类；若卡牌已因后续操作移入其它区域且并未爆牌，该 HCI 事件会被丢弃。
5. 每个队列内的最终事件顺序固定为：其他事件 → HCI 事件 → 安全伤害事件 → 致命伤害事件；随后按队列顺序串接。

## 事件与请求

`SkillExecutor.handleEvent(...events)` 按列表顺序逐个处理，子事件会在当前位置递归完成后才继续后续事件。

- 对普通核心事件：先收集该事件的所有监听技能，再按 `allSkills` 的当前实体顺序逐一检查 filter 并结算。`onDispose` 会额外让刚被弃置的实体自身响应。
- 对 `requestReroll`、`requestSwitchHands`、`requestSelectCard`：调用相应 Player IO，再立即递归处理操作产生的事件；选牌完成后额外触发 `onSelectCard`。
- 对 `requestUseSkill`、`requestPlayCard`、`requestTriggerEndPhaseSkill`：验证当前可用对象后执行相应技能或实体操作，再递归处理其事件。
- 对 `requestAdventure`：若已有冒险地点则增加其 `exp`，否则在有空位时请求选择冒险地点；随后触发该地点的 `onAdventure`，若发生过选牌则最后触发 `onSelectCard`。

监听技能的收集包括扩展点和当前场上的实体，不包括 `removedEntities`。扩展点以当前行动方的出战角色作为 caller；实体的默认监听范围和细分事件过滤由数据定义层完成，参见[事件](./data/events.md)。

## 击倒出站角色后的选人

在递归处理完技能事件后，若该技能造成某方角色倒下：

1. 对双方当前出战角色分别检查；需要切人的玩家并行通过 IO 选择存活角色，并临时设置 `defeatedSwitching` 标志。
2. 通知双方选择结果。
3. 按当前行动方、另一方的顺序实际切换出战角色；每次切换都会触发并结算 `onSwitchActive`。
4. 恢复原先的 `defeatedSwitching` 标志。

`StateMutator.switchActive` 还会设置新出战角色的下落攻击资格，并把切人 mutation 通知给前端。若本次结算已经结束游戏，则不会进入此流程。
