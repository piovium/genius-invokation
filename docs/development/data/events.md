# 事件

核心会在游戏流程和技能执行时发出少量**核心事件**；卡牌数据通常在 GTS 中使用经过范围筛选的**细分事件**：

```gts
define combatStatus {
  id 112092 as ExquisiteThrow;
  on useSkill {
    when :( :e.isSkillType("normal") );
    :damage(DamageType.Hydro, 1);
  };
};
```

这里的 `useSkill` 对应核心事件 `onUseSkill`，并默认限制为本实体所在阵营或角色的主动技能。`when` 还能进一步读取 `:e` 过滤。监听范围可用 `listenTo samePlayer;` 或 `listenTo all;` 放宽，详见[实体](./entity.md)。

## 核心事件

| 分类             | 事件                                                                                                                                                                             |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 阶段             | `onBattleBegin`、`onRoundBegin`、`onRoundEnd`、`onActionPhase`、`onEndPhase`                                                                                                     |
| 行动             | `replaceAction`、`onBeforeAction`、`onAction`、`onBeforeUseSkill`、`onUseSkill`、`onBeforePlayCard`、`onPlayCard`、`onSwitchActive`                                              |
| 牌与实体         | `onHandCardInserted`、`onEnter`、`onDispose`、`onSelectCard`、`onAdventure`、`onTransformDefinition`、`onGenerateDice`                                                           |
| 伤害、治疗与反应 | `onDamageOrHeal`、`onReaction`、`onRevive`                                                                                                                                       |
| 可修改的效果     | `modifyRoll`、`modifyAction0` 至 `modifyAction4`、`modifyDamage0` 至 `modifyDamage3`、`modifyHeal0`、`modifyHeal1`、`modifyReaction`、`modifyChangeVariable`、`modifyZeroHealth` |
| 自定义           | `onCustomEvent`                                                                                                                                                                  |

其中 `modifyDamage0` 至 `modifyDamage3` 分别处理伤害类型、加算、乘除和减算；`modifyHeal0`、`modifyHeal1` 分别用于取消和减少治疗。所有 `modify*` 事件以及 `modifyZeroHealth` 都是[内联事件](#内联事件)。

## 细分事件

下表为 GTS `on` / `once` 可直接使用的内置事件名；右列是其对应核心事件。

| 细分事件                                                                                                         | 核心事件                       | 用途                       |
| ---------------------------------------------------------------------------------------------------------------- | ------------------------------ | -------------------------- |
| `roll`                                                                                                           | `modifyRoll`                   | 我方掷骰                   |
| `addDice`、`deductVoidDiceSkill`                                                                                 | `modifyAction0`                | 增骰、减角色技能无色骰     |
| `deductElementDice`、`deductElementDiceSkill`                                                                    | `modifyAction1`                | 减基础元素骰               |
| `deductOmniDice`、`deductOmniDiceSwitch`、`deductOmniDiceCard`、`deductOmniDiceSkill`、`deductOmniDiceTechnique` | `modifyAction2`                | 减任意元素骰               |
| `deductAllDiceCard`                                                                                              | `modifyAction3`                | 免费打出行动牌             |
| `beforeFastSwitch`                                                                                               | `modifyAction4`                | 令切换成为快速行动         |
| `modifySkillDamageType`                                                                                          | `modifyDamage0`                | 改变角色技能伤害类型       |
| `increaseDamage`、`increaseSkillDamage`、`increaseTechniqueDamage`、`increaseDamaged`                            | `modifyDamage1`                | 增伤或受伤增加             |
| `multiplySkillDamage`、`multiplyDamaged`                                                                         | `modifyDamage2`                | 乘除伤害                   |
| `decreaseDamaged`                                                                                                | `modifyDamage3`                | 减伤                       |
| `cancelHealed`、`decreaseHealed`                                                                                 | `modifyHeal0`、`modifyHeal1`   | 取消或减少治疗             |
| `beforeDefeated`                                                                                                 | `modifyZeroHealth`             | 免于被击倒                 |
| `battleBegin`、`roundBegin`、`roundEnd`、`actionPhase`、`endPhase`                                               | 同名阶段事件                   | 阶段响应                   |
| `beforeAction`、`action`、`declareEnd`、`replaceActionBySkill`                                                   | 行动事件                       | 玩家行动与准备技能         |
| `beforeSkill`、`beforeTechnique`、`useSkill`、`useTechnique`、`useSkillOrTechnique`                              | 使用技能前后                   | 角色技能或特技             |
| `playCard`、`switchActive`                                                                                       | 打牌、切人后                   | 行动后的响应               |
| `drawCard`、`handCardInserted`、`selfHandCardInserted`                                                           | `onHandCardInserted`           | 抓牌、入手牌或自身入手牌   |
| `disposeCard`、`disposeOrTuneCard`、`selfDiscard`、`dispose`、`selfDispose`                                      | `onDispose`                    | 弃牌、调和、实体离场       |
| `dealDamage`、`skillDamage`、`damaged`、`healed`、`damagedOrHealed`、`defeated`                                  | `onDamageOrHeal`               | 伤害、治疗和倒下           |
| `reaction`、`dealReaction`、`modifyReaction`                                                                     | `onReaction`、`modifyReaction` | 元素反应                   |
| `selfEnter`、`enter`                                                                                         | `onEnter`                      | 自身或相关实体入场         |
| `adventure`                                                                                                      | `onAdventure`                  | 自身进行冒险               |
| `revive`、`transformDefinition`、`generateDice`、`selectCard`                                                    | 对应同名核心事件               | 复苏、变身、生成骰子、选牌 |
| `cancelConsumeNightsoul`、`consumeNightsoul`、`gainNightsoul`、`gainUsage`                                       | 变量修改事件                   | 夜魂值或可用次数           |

## 内联事件

内联事件的响应在产生该效果时立即结算，不能插入玩家选择或暂停。它们包括所有伤害、治疗、反应与变量的 `modify*` 事件，以及 `beforeDefeated`。

技能上下文会先处理每次可能击倒的伤害：同步执行 `modifyZeroHealth`；若未被 `:immune(...)` 拦截，立即标记角色倒下、清空相应能量和元素附着。随后才把非伤害事件、入手牌事件、未致命伤害事件和致命伤害事件依次交给事件执行器。完整顺序见[结算流程](../process.md)。
