# 定义行动牌

行动牌使用 `define card { ... }` 块语法定义。

## 通用语句

- `since "v3.3.0"` 引入此卡时的[游戏版本](./version.md)
- `costSame 1` / `cost DiceType.Pyro, 1` 等指定卡牌所消耗的骰子。
- `legend` 秘传牌。
- `tags` 指定标签，如 `action` 为战斗行动。
- `addTarget "my characters"` 增加卡牌使用目标，可行目标由[实体查询语法](../query-legacy.md)给出。
- `filter :( ... )` 设置打出条件；只有条件满足时才能打出。

## 事件牌

在块内直接书写[操作描述](./operations.md)中的脚本域代码（以 `:` 开头）。例：

```gts
define card {
  id 332017 as PlungingStrike;
  costSame 3;
  tags action;
  addTarget "my characters";
  :switchActive("@targets.0");
  :useSkill("normal");
}
```

### 生成角色状态

使用 `food` 或直接通过 `:characterStatus()` 在打出后产生[角色状态](./entity.md)。例：

```gts
define card {
  id 331102 as ElementalResonanceShatteringIce;
  cost DiceType.Cryo, 1;
  tags resonance;
  duration 1;
  once increaseSkillDamage {
    :e.increaseDamage(2);
  }
}
```

### 生成出战状态

在打出后调用 `:combatStatus()` 生成出战状态。例：

```gts
define card {
  id 332006 as LeaveItToMe;
  :combatStatus(LeaveItToMeInEffect);
}

define combatStatus {
  id 300006 as private LeaveItToMeInEffect;
  once beforeFastSwitch {
    :e.setFastAction();
  }
}
```

### 抓到时描述

在 `define card` 块中使用 `onDraw` 声明该牌的效果在抓到时而非打出时触发：

```gts
define card {
  id 112133 as SmallBolsteringBubblebalm;
  onDraw;
  :heal(1, "all my characters");
  :combatStatus(SourcewaterDroplet);
}
```

### 料理牌

使用 `food` 语句。它会自动添加 `tags food`、将目标限制为不带饱腹状态的角色，并在效果执行后添加饱腹状态：

```gts
define card {
  id 333001 as JueyunGuoba;
  food;
  :characterStatus(JueyunGuobaInEffect, "@targets.0");
}
```

若打出的目标有额外限制（如治疗牌要求目标生命值未满），可使用 `foodRestraint`：

```gts
define card {
  id 333006 as MondstadtHashBrown;
  costSame 1;
  food;
  foodRestraint "with health < maxHealth";
  :heal(2, "@targets.0");
}
```

### 天赋牌

天赋牌在对应角色文件的 `.gts` 中定义。使用 `talent` 语句声明该牌为角色的天赋牌：

- `talent ch` 声明该牌为 `ch` 的天赋装备牌（战斗行动）
- `talent ch, "active"` 非战斗行动，但要求天赋角色是出战角色
- `talent ch, "none"` 和普通装备牌无异

## 装备牌

### 圣遗物牌

使用 `artifact` 语句声明该牌为圣遗物装备牌：

```gts
define card {
  id 312101 as BrokenRimesEcho;
  cost DiceType.Void, 2;
  artifact;
  // 后续为圣遗物实体的定义
}
```

### 武器牌

使用 `weapon(type)` 语句声明该牌为武器牌：

```gts
define card {
  id 311101 as AquilaFavonia;
  costSame 3;
  weapon "sword";
}
```

### 特技牌

使用 `technique` 语句声明该牌为特技牌。在块内定义特技技能：

```gts
define card {
  id 313001 as XenochromaticHuntersRay;
  technique;
  provideSkill 3130011 {
    cost DiceType.Void, 2;
    usage 2;
    :damage(DamageType.Physical, 2);
  }
}
```

### 支援牌

使用 `support(type)` 指明该牌是支援牌，其中 `type` 是 `"ally"` `"item"` 或 `"place"`：

```gts
define card {
  id 322007 as Timmie;
  support "ally";
  variable pigeon, 1;
  on actionPhase {
    // ...
  }
}
```

