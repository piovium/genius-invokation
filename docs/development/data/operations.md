# 操作与上下文表达式

GTS 的事件块与主动技能块在结算时都会获得 `SkillContext`。在 GTS 中，以 `:` 开头的表达式会在这个上下文中执行：`:` 后的名字可以是上下文操作、`self`、事件参数 `e`，或普通 TypeScript 表达式。

```gts
define status {
  id 111061 as Grimheart;
  on increaseDamage {
    when :( :e.viaSkillType("elemental") );
    :e.increaseDamage(3);
    :dispose();
  };
};
```

任意 ECMAScript 关键字都可开启描述操作的上下文。

```gts
define skill {
  id 22012 as OceanidMimicSummoning;
  skillType elemental;
  cost DiceType.Hydro, 3;
  // 下方 const 关键字开启对卡牌行为的描述
  const candidates = :$$($.my.summon).map((s) => s.definition.id);
  const target = :random(candidates);
  :summon(target as SummonHandle);
};
```

## 上下文与查询

- `:self`：当前技能的发起者。角色技能的发起者是角色；实体响应的发起者是该实体；打出卡牌时是该卡牌。
- `:e`：当前事件或主动技能的参数。例如 `:e.targets` 是打牌/使用技能时的目标，`:e.increaseDamage(1)` 修改伤害事件。
- `:state`、`:player`、`:oppPlayer`：当前状态、我方玩家和对方玩家。
- `:query(查询)` 或 `:queryAll(查询)`：查询一个或全部实体。优先使用新的 `$` 查询表达式，如 `$.my.active`、`$.opp.summon`。
- `:getVariable(name[, target])`、`:setVariable(name, value[, target])`、`:addVariable(...)`、`:addVariableWithMax(...)`：读写状态变量。
- `:getExtensionState()` 与 `:setExtensionState((draft) => { ... })`：读写关联的扩展点状态。

`self` 和查询结果是便捷上下文对象。常用属性包括 `.who`、`.definition`、`.variables`、`.area`；角色还可使用 `.isActive()`、`.hasEquipment(...)`、`.element()`，状态、装备也可用 `.master` 取得附属角色。状态随每次操作更新，跨多步逻辑时应重新读取需要的字段。

## 常用操作

下列操作均以 `:` 前缀调用；目标通常可以是查询、状态对象或兼容字符串。

| 用途             | GTS 调用示例                                                                                                        |
| ---------------- | ------------------------------------------------------------------------------------------------------------------- |
| 伤害、治疗、附着 | `:damage(DamageType.Pyro, 2);`、`:heal(2, $.my.active);`、`:apply(DamageType.Hydro, $.opp.active);`                 |
| 切人、充能       | `:switchActive(:e.targets[0]);`、`:gainEnergy(1, :self);`                                                         |
| 创建实体         | `:summon(Summon);`、`:characterStatus(Status, :self);`、`:combatStatus(Status, "opp");`                           |
| 变量与可用次数   | `:addVariable("usage", 1);`、`:consumeUsage(1);`、`:consumeNightsoul(:self.master);`                                   |
| 牌与骰子         | `:drawCards(2);`、`:createHandCard(Card);`、`:createPileCards(Card, 1, "top");`、`:generateDice(DiceType.Omni, 1);` |
| 移除或转换       | `:dispose();`、`:disposeCard(card);`、`:transformDefinition(:self, NewDefinition);`                               |
| 请求后续操作     | `:useSkill(Skill);`、`:rerollDice(1);`、`:switchCards();`、`:selectAndSummon([A, B]);`                              |

治疗倒下角色时必须显式给出种类，例如 `:heal(1, "@targets.0", { kind: "revive" });`。仅在 `on beforeDefeated` 中，使用 `:immune(生命值);` 使当前角色免于本次击倒。

## 修改事件参数

伤害、治疗、行动和掷骰等事件会提供可修改的 `:e`。例如：

```gts
define status {
  id 112061 as TakimeguriKanka;
  on modifySkillDamageType {
    when :( :e.type === DamageType.Physical );
    :e.changeDamageType(DamageType.Hydro);
  };
  on increaseSkillDamage {
    when :( :e.viaSkillType("normal") );
    usage 3;
    :e.increaseDamage(1);
  };
};
```

`modifyDamage0` 至 `modifyDamage3`、`modifyHeal0`、`modifyHeal1`、`modifyReaction`、`modifyChangeVariable` 与 `modifyZeroHealth` 是内联事件：它们在产生原始效果的计算过程中同步执行。它们引发的后续事件会由外层技能统一处理，不能在中间插入玩家操作。事件阶段和细分事件名见[事件](./events.md)。

## 自定义事件与片段

用 `customEvent` 创建事件对象后，可在任意操作中发出，或直接作为 `on` 的事件名监听：

```gts
const marked = customEvent<number>("marked");

define status {
  id 100001 as Marker;
  on damaged {
    :emitCustomEvent(marked, 1);
  };
  on marked {
    when :( :e.arg === 1 );
    :drawCards(1);
  };
};
```

重复的操作可用 `defineSnippet` 和 `:callSnippet` 抽取，详见[实体](./entity.md)。
