# 事件列表

## 核心事件列表

对局过程中所有可能引发技能的时间点和附带参数称为**核心事件**。核心事件有常规事件、有副作用事件和特殊事件。

### 常规事件列表

| 事件名                  | 含义                             |
| ----------------------- | -------------------------------- |
| `onBattleBegin`         | 战斗开始后                       |
| `onRoundEnd`            | 每回合结束后                     |
| `onActionPhase`         | 行动阶段开始后                   |
| `onEndPhase`            | 结束阶段时                       |
|                         |                                  |
| `onBeforeAction`        | 玩家行动前                       |
| `onAction`              | 玩家行动后                       |
|                         |                                  |
| `onBeforeUseSkill`      | （使用技能前）                   |
| `onUseSkill`            | 使用技能后                       |
| `onBeforePlayCard`      | （打出手牌前）                   |
| `onPlayCard`            | 打出手牌后                       |
| `onDisposeOrTuneCard`   | 舍弃牌或元素调和后               |
| `onSwitchActive`        | 切换出战角色后                   |
|                         |                                  |
| `onDamageOrHeal`        | 造成/受到伤害/治疗后；角色倒下后 |
| `onReaction`            | 发生元素反应后                   |
| `onHandCardInserted`    | 获取手牌后                       |
| `onTransformDefinition` | 角色/实体定义被替换后            |
| `onGenerateDice`        | 生成骰子后                       |
| `onChangeVariable`      | 实体变量修改后（仅可用、夜魂等） |
|                         |                                  |
| `onEnter`               | 实体入场后                       |
| `onDispose`             | 实体弃置后                       |
| `onRevive`              | 角色复苏后                       |

### 有副作用事件列表

| 事件名                 | 含义                                         |
| ---------------------- | -------------------------------------------- |
| `modifyRoll`           | 掷骰阶段时（修改掷骰属性）                   |
|                        |                                              |
| `modifyAction0`        | 修改玩家行动属性（第一次，增骰、减无色骰）   |
| `modifyAction1`        | 修改玩家行动属性（第二次，减基础元素骰）     |
| `modifyAction2`        | 修改玩家行动属性（第三次，减任意元素骰）     |
| `modifyAction3`        | 修改玩家行动属性（第四次，尝试免费使用行动） |
| `modifyAction4`        | 修改玩家行动属性（第五次，快速行动）         |
|                        |                                              |
| `modifyDamage0`        | 修改伤害（第一次，修改伤害类型）             |
| `modifyDamage1`        | 修改伤害（第二次，增伤）                     |
| `modifyDamage2`        | 修改伤害（第三次，乘除伤）                   |
| `modifyDamage3`        | 修改伤害（第四次，减伤）                     |
|                        |                                              |
| `modifyHeal0`          | 修改治疗（第一次，取消，克洛琳德）           |
| `modifyHeal1`          | 修改治疗（第二次，减，生命之契）             |
|                        |                                              |
| `modifyChangeVariable` | 取消实体变量修改（仅可用、夜魂等）           |
|                        |                                              |
| `modifyZeroHealth`     | 角色击倒前（免于被击倒）                     |

有副作用事件会在所有实体的响应过程中记录一些信息（如修改的伤害值），供调用方（技能或者游戏流程）使用。

#### 内联技能

监听 `modifyDamage0` 和 `modifyDamage1` 的技能是**内联技能**，它们是在另一个技能（造成伤害）的计算过程中引发。内联技能在执行过程中所引发的所有事件，都算在“上级”技能的引发事件列表中。内联技能执行完毕后没有暂停点；程序也**不会**暂停“上级技能”的执行转而先去处理内联技能引发的那些事件。

### 特殊事件

| 事件名          | 含义                                                                   |
| --------------- | ---------------------------------------------------------------------- |
| `replaceAction` | 该事件不会被“引发”，而是在玩家行动前检查，若有则执行技能并跳过玩家行动 |

## 细分事件列表

为方便编写卡牌数据，不直接根据核心事件编写技能，而是根据筛选和细分后的细分事件名来编写；传入 `.on` builder chain 方法的是响应细分事件名。响应细分事件=响应核心事件+满足条件。

| 事件名                   | 对应核心事件             | 条件                                        |
| ------------------------ | ------------------------ | ------------------------------------------- |
| `roll`                   | `modifyRoll`             | **我方**掷骰时                              |
| `addDice`                | `modifyAction0`          | 我方增骰时                                  |
| `deductVoidDiceSkill`    | `modifyAction0`          | 我方/所附着角色尝试减少角色技能的无色骰子时 |
| `deductElementDice`      | `modifyAction1`          | 我方尝试减少行动的基础元素骰子时            |
| `deductElementDiceSkill` | `modifyAction1`          | 我方/所附着角色尝试减少角色技能的基础骰子时 |
| `deductOmniDice`         | `modifyAction2`          | 我方尝试减少行动的骰子时                    |
| `deductOmniDiceSkill`    | `modifyAction2`          | 我方/所附着角色尝试减少角色技能的骰子时     |
| `deductOmniDiceSwitch`   | `modifyAction2`          | 我方尝试减少切换角色行动的骰子时            |
| `deductOmniDiceCard`     | `modifyAction2`          | 我方尝试减少打出手牌的骰子时                |
| `deductAllDiceCard`      | `modifyAction3`          | 我方尝试免费打出手牌时                      |
| `beforeFastSwitch`       | `modifyAction4`          | 我方尝试设置切换角色行动为快速行动时        |
| `modifyDamageType`       | `modifyDamage0`          | 修改我方/所附着角色造成伤害类型             |
| `modifySkillDamageType`  | `modifyDamage0`          | 修改我方/所附着角色技能造成伤害类型         |
| `increaseDamage`         | `modifyDamage1`          | 增加我方/所附着角色造成伤害                 |
| `increaseSkillDamage`    | `modifyDamage1`          | 增加我方/所附着角色技能造成伤害             |
| `increaseDamaged`        | `modifyDamage1`          | 增加我方/所附着角色技能受到的伤害           |
| `multiplySkillDamage`    | `modifyDamage2`          | 对我方/所附着角色技能造成伤害做乘除法       |
| `decreaseDamaged`        | `modifyDamage3`          | 减少我方/所附着角色受到的伤害               |
| `cancelHeal`             | `modifyHeal0`            | 取消对我方/所附着角色的治疗                 |
| `decreaseHeal`           | `modifyHeal1`            | 减少对我方/所附着角色的治疗量               |
| `beforeDefeated`         | `modifyZeroHealth`       | 我方/所附着角色免于被击倒                   |
| `battleBegin`            | `onBattleBegin`          | 等价                                        |
| `roundEnd`               | `onRoundEnd`             | 等价                                        |
| `actionPhase`            | `onActionPhase`          | 等价                                        |
| `endPhase`               | `onEndPhase`             | 等价                                        |
| `beforeAction`           | `onBeforeAction`         | **我方**玩家行动前                          |
| `replaceAction`          | `replaceAction`          | 等价                                        |
| `action`                 | `onAction`               | **我方**玩家行动后                          |
| `playCard`               | `onPlayCard`             | 我方玩家打出手牌后                          |
| `useSkill`               | `onUseSkill`             | 我方/所附着**角色使用主动技能**后           |
| `useTechnique`           | `onUseSkill`             | 我方/所附着角色使用特技后                   |
| `useSkillOrTechnique`    | `onUseSkill`             | 我方/所附着角色使用主动技能**或特技**后     |
| `declareEnd`             | `onAction`               | 我方玩家宣布回合结束后                      |
| `switchActive`           | `onSwitchActive`         | 我方/所附着角色被切出/切入后                |
| `dealDamage`             | `onDamageOrHeal`         | 我方/所附着角色造成伤害后                   |
| `damaged`                | `onDamageOrHeal`         | 我方/所附着角色受到伤害后                   |
| `damagedOrHealed`        | `onDamageOrHeal`         | 我方/所附着角色受到伤害或治疗后             |
| `defeated`               | `onDamageOrHeal`         | 我方/所附着角色倒下时                       |
| `reaction`               | `onReaction`             | 我方/所附着**角色上发生**元素反应后         |
| `enter`                  | `onEnter`                | 实体**自身**入场时                          |
| `enterRelative`          | `onEnter`                | **我方**实体入场时                          |
| `dispose`                | `onDispose`              | **我方**实体弃置时                          |
| `selfDispose`            | `onDispose`              | 实体**自身**弃置时                          |
| `revive`                 | `onRevive`               | **我方**角色复苏时                          |
| `drawCard`               | `onHandCardInserted`     | **我方**抓牌时                              |
| `handCardInserted`       | `onHandCardInserted`     | **我方**获取手牌时                          |
| `disposeCard`            | `onDisposeOrTuneCard`    | **我方**舍弃牌时                            |
| `disposeOrTuneCard`      | `onDisposeOrTuneCard`    | **我方**舍弃牌或元素调和时                  |
| `transformDefinition`    | `transformDefinition`    | 我方/所附着实体定义被转换时                 |
| `onGenerateDice`         | `generateDice`           | **我方**生成骰子后                          |
| `modifyChangeVariable`   | `cancelConsumeNightsoul` | 我方消耗夜魂值时                            |
| `onChangeVariable`       | `gainNightsoul`          | 我方获得夜魂值后                            |
| `onChangeVariable`       | `consumeNightsoul`       | 我方消耗夜魂值后                            |
| `onChangeVariable`       | `gainUsage`              | 我方实体获得可用次数时                      |

上表所述“我方”，是指实体技能发起者的阵营，“我方所附着角色”是指若实体区域是角色的所在角色。该描述仅适用于默认的 [`.listenToXxx` 选项](./entity.md#监听范围)，对于 `.listenToPlayer`，会响应所有“我方”事件，对于 `.listenToAll`，会响应场上所有来源的事件。

> 其中 `enter` 和 `dispose` 不对称是历史遗留问题，可能在后续版本改正。
