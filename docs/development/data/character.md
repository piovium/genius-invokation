# 定义角色和角色技能

## `define character` 角色

角色定义使用 `define character { ... }` 块语法：

```gts
define character {
  id 1101 as Ganyu;               // 角色 ID，as 后为角色句柄
  since "v3.3.0";                 // 引入游戏版本（见 version.md）
  tags cryo, bow, liyue;          // 角色标签，通常必须包含元素、武器、国籍
  health 10;                      // 最大生命值
  energy 3;                       // 最大能量值
  skills StrikeOfFortune, PassionOverload, FantasticVoyage;  // 主动和被动技能
}
```

`skills` 中填入由 `define skill` 定义的主动技能和被动技能句柄，不填入仅能由准备状态触发的技能。

## `define skill` 角色技能

### 主动技能

主动技能使用 `define skill { ... }` 块语法：

```gts
define skill {
  id 13031 as StrikeOfFortune;
  skillType normal;               // normal / elemental / burst
  cost DiceType.Pyro, 1;          // 消耗骰子
  cost DiceType.Void, 2;
  :damage(DamageType.Physical, 2); // 效果
}
```

技能类型用 `skillType` 语句指定，可为 `normal`、`elemental` 或 `burst`。

骰子消耗使用多个 `cost` 语句指定。

夜魂性质技能使用 `enterNightsoul` 语句：

```gts
define skill {
  id xxxx as SomeSkill;
  skillType elemental;
  cost DiceType.Pyro, 3;
  enterNightsoul techEquipment, nightsoulStatus, nightsoulValue;
  :damage(DamageType.Pyro, 2);
}
```

效果部分参见[操作描述](./operations.md)，在块内以 `:` 开头的脚本域代码书写。

### 被动技能

被动技能是角色作为实体的表现，使用 `skillType passive` 声明：

```gts
define skill {
  id 15054 as ChihayaburuPassive;
  skillType passive;
  on useSkill {
    when :( :e.action.skill.definition.id === Chihayaburu );
    :switchActive("my next");
  }
}
```
