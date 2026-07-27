# 定义角色和角色技能

角色、角色主动技能和被动技能是独立的 GTS 定义。先定义技能并使用 `as` 命名，再在角色的 `skills` 中引用它们。

```gts
define skill {
  id 11011 as LiutianArchery;
  skillType normal;
  cost DiceType.Cryo, 1;
  cost DiceType.Void, 2;
  :damage(DamageType.Physical, 2);
};

define skill {
  id 11012 as TrailOfTheQilin;
  skillType elemental;
  cost DiceType.Cryo, 3;
  :damage(DamageType.Cryo, 1);
  :combatStatus(IceLotus);
};

define character {
  id 1101 as Ganyu;
  since "v3.3.0";
  tags cryo, bow, liyue;
  health 12;
  energy 3;
  skills LiutianArchery, TrailOfTheQilin, FrostflakeArrow, CelestialShower;
};
```

`skillType` 为 `normal`、`elemental`、`burst` 或 `technique`。`cost <骰子类型>, <数量>` 可重复书写，使用 `DiceType.Energy` 表示能量消耗。主动技能默认在使用后获得 1 点充能；使用 `noEnergy;` 关闭这一行为，`prepared;` 表示只能由准备状态触发的隐藏技能。

## 被动技能

角色被动技能使用 `skillType passive`，其内部写一个或多个事件块。它们在角色存活时以该角色为 `self` 响应事件。

```gts
define skill {
  id 12094 as Breakthrough;
  skillType passive {
    on battleBegin {
      :characterStatus(BreakthroughStatus);
    };
    on revive {
      :characterStatus(BreakthroughStatus);
    };
  };
};
```

角色特性还可使用：

- `associateNightsoul <状态>`：关联夜魂加持状态；
- `enabledLunarReactions <反应>...`：声明该角色启用的月反应；
- `specialEnergy <变量名>, <槽位数>`：声明不使用标准能量槽的特殊能量。

事件、条件与操作的写法见[实体](./entity.md)和[操作](./operations.md)。
