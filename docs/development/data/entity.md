# 定义状态、出战状态和召唤物

角色状态、出战状态和召唤物分别使用 `define status`、`define combatStatus` 和 `define summon`。它们共享事件、变量、可用次数与持续回合等语法；装备和支援牌的嵌套实体块也使用同一套语法。

```gts
define summon {
  id 303211 as CryoHilichurlShooter;
  hint DamageType.Cryo, 1;
  on endPhase {
    usage 2;
    :damage(DamageType.Cryo, 1);
  };
};
```

## 事件与条件

`on <细分事件> { ... };` 声明一个响应技能；`once <细分事件> { ... };` 是带一次隐藏可用次数的简写。细分事件名及其条件见 [events](./events.md)。触发条件写成 `when :(表达式);`，表达式读取的是事件发生时刻的状态，因此应把“冒号之前”的限制写在这里，以正确扣除可用次数；不要在效果执行内用 if 判断。

```gts
define combatStatus {
  id 117032 as ShrineOfMaya;
  on increaseDamage {
    when :( :e.getReaction() );
    :e.increaseDamage(1);
  };
};
```

在事件块中，`:e` 是该事件的参数，`:self` 是响应者。`on` 默认只监听与实体所在角色或阵营相关的事件；用 `listenTo samePlayer;` 监听我方阵营，用 `listenTo all;` 监听场上所有来源。更多表达式和操作见[操作](./operations.md)。

## 可用次数与变量

`usage <数量>;` 为该事件响应添加可用次数：条件满足并执行后自动扣除，默认扣至 0 时弃置实体。使用嵌套选项可关闭自动弃置，或指定重复入场时叠加：

```gts
define summon {
  id 122014 as OceanicMimicFrog;
  on decreaseDamaged {
    when :( :e.target.isActive() );
    usage 1 { autoDispose false; };
    :e.decreaseDamage(1);
  };
  on endPhase {
    when :( :getVariable("usage") <= 0 );
    :damage(DamageType.Hydro, 2);
    :dispose();
  };
};
```

`usage perRound, <数量>;` 限制每回合次数；默认同样在执行后扣除并在回合开始时重置。需要为多个每回合次数命名时，在选项块内使用 `name "usagePerRound1";`。

普通变量使用 `variable <名称>, <初值>;`。重复创建时，`{ append; }` 允许累加，`{ append <上限>; }` 指定叠加上限；`{ forceOverwrite; }` 则指定重新入场时需重置为初始值。

```gts
define status {
  id 112091 as BreakthroughStatus;
  variable "break", 1 { append 3; };
  on endPhase {
    :addVariableWithMax("break", 1, 3);
  };
};
```

## 护盾、持续回合与冲突

- `shield <初值>[, <上限>];` 建立护盾变量并自动添加减伤逻辑；
- `duration <回合数>;` 和 `oneDuration;` 分别建立持续回合变量和一回合持续变量，系统会在行动阶段开始时递减，归零时弃置；
- `conflictWith [crossCharacter,] <实体 id>...;` 在入场时弃置同区域的冲突定义；`crossCharacter` 允许角色状态跨角色冲突；
- `tags <标签>...;` 添加实体标签；`hint <图标>[, <提示文本>];` 设置界面提示；
- `associateExtension <扩展点>;` 使该实体可读取、写入指定扩展点。

```gts
define combatStatus {
  id 112021 as RainSword;
  conflictWith 112023;
  shield 1, 3;
};
```

## 可复用片段与准备技能

`defineSnippet` 定义可复用操作，` :callSnippet()` 或 `:callSnippet.<名称>()` 调用它。片段仍运行在当前的技能上下文中。

```gts
define status {
  id 127011 as RadicalVitalityStatus;
  variable vitality, 0;
  defineSnippet addVitality {
    :addVariableWithMax("vitality", 1, 3);
  };
  on dealDamage {
    :callSnippet.addVitality();
  };
  on damaged {
    :callSnippet.addVitality();
  };
};
```

角色状态可用 `prepare <技能>;` 声明准备技能。状态存在时，行动前会请求使用该技能并随后弃置自身；若角色被切出，准备状态也会被弃置。`prepare` 只适用于角色状态。
