# 定义状态、出战状态和召唤物

## 触发时机

所有实体（以及被动技能）的操作会在某一时机触发。在这些实体的 GTS 定义块中，使用 `on <event> { ... }` 块来描述响应的事件及操作：

```gts
define combatStatus {
  id 321006 as FavoniusCathedral;
  on endPhase {
    usage 2;
    :heal(2, "my active");
  }
}
```

可用于 `on` 的事件包括 [events](./events.md) 列出的标准事件，也可包含[用户自定义事件](./custom_events.md)。

## 触发条件

卡牌描述中，`when` 之后的部分都是触发的条件：**它们基于事件发生时刻的对局情况进行条件计算，而非后续操作引发的时间点计算**。使用 `when :( ... )` 来设置条件：

```gts
define combatStatus {
  id 117032 as ShrineOfMaya;
  on modifyDamage {
    when :( :e.getReaction() );
    :e.increaseDamage(1);
  }
}
```

所有的触发事件都提供了额外的信息，比如"使用技能后"事件的额外信息通过 `:e` 访问，是一个包含 `SkillInfo` 的对象。所有事件的具体参数请参考 [events](./events.md)。

条件中 `:e` 可直接访问事件的额外信息，如 `:( :e.foo() )`。

## 可用次数

通过 `on` 块内的 `usage` 语句设置响应操作的可用次数。只有当触发条件满足时，可用次数才会扣除；当某次触发事件执行完毕，扣除可用次数到 0 之后，实体会自动弃置。每个 `on` 块内各有一份 `usage`：

```gts
define combatStatus {
  id 115031 as Stormzone;
  on deductDiceSwitch {
    usage 2;
    :deductCost(DiceType.Omni, 1);
  }
}
```

如果不希望可用次数到 0 时自动弃置，则设置 `autoDecrease false`：

```gts
define summon {
  id 112031 as Reflection;
  on beforeDamaged {
    when :( :e.target.isActive() );
    usage 1 {
      autoDecrease false;
    };
    :e.decreaseDamage(1);
  }
}
```

“每回合可用次数”使用 `usage perRound`：

```gts
define card {
  id 312101 as BrokenRimesEcho;
  cost DiceType.Void, 2;
  artifact;
  on deductDice {
    usage perRound, 1;
    :deductCost(DiceType.Cryo, 1);
  }
}
```

如果卡牌描述为“下一次……”，其实际等价于可用次数为 1，此时可以用快捷方法 `once`，如：

```gts
define card {
  id 331802 as StoneAndContracts;
  cost DiceType.Void, 3;
  :combatStatus(StoneAndContractsInEffect);
}

define combatStatus {
  id 300802 as private StoneAndContractsInEffect;
  once actionPhase {
    :generateDice(DiceType.Omni, 3);
    :drawCards(1);
  }
}
```

## 变量

使用 `variable` 语句为该实体添加一个变量定义，指定变量名和初始值；可选地传入最大值。在同一位置重新创建时，若最大值大于初始值，则会累加。`variable` 必须设置在所有 `on` 块之前。

```gts
define card {
  id 322007 as Timmie;
  support "ally";
  variable pigeon, 1;
  on actionPhase {
    // [...]
  }
}
```

> `usage` 默认创建名为 `usage` 的变量；`shield` 默认创建名为 `shield` 的变量。

## 小片段（Snippets）

诸如白术护盾、基尼奇状态等实体，经常在多个事件下执行同一套（比较复杂的）操作，为此提供了 Snippets 写法。在 GTS 定义块中使用 `defineSnippet` 引入一段小程序，可选地，起一个名字（默认为 `"default"`）：

```gts
define status {
  id xxx as MyStatus;
  variable a, 3;
  defineSnippet {
    :damage(DamageType.Piercing, :getVariable("a"));
    :setVariable("a", 0);
  }
  // 可以给 snippet 起一个名字
  defineSnippet "default" {
    // [...]
  }
}
```

然后在不同的 `on` 块内使用 `:callSnippet()` 调用：

```gts
define status {
  id xxx as MyStatus;
  defineSnippet {
    // [...]
  }
  defineSnippet "mySnippet" {
    // [...]
  }
  on actionPhase {
    :callSnippet();           // 调用小片段 default
  }
  on endPhase {
    :callSnippet();           // 调用小片段 default
    :callSnippet("mySnippet"); // 调用小片段 mySnippet
  }
}
```

### 小片段的入参

`defineSnippet` 可以接受一个命名参数（可选地带类型），在 `:callSnippet()` 时提供参数：

```gts
define status {
  id xxx as MyStatus;
  defineSnippet "mySnippet", (e: number) {
    if (e === 1) { /* called on actionPhase */ }
    if (e === 2) { /* called on endPhase */ }
  }
  on actionPhase {
    :callSnippet("mySnippet", () => 1);
  }
  on endPhase {
    :callSnippet("mySnippet", () => 2);
  }
}
```

## 护盾

使用 `shield` 语句表明该实体是一个护盾状态，这会创建一个名为 `shield` 的变量，并自动添加合适的 `onDamage` 处理函数根据盾量免伤或弃置。

```gts
define combatStatus {
  id 111 as Crystallize;
  shield 1, 2;  // 初始盾量 1，最大叠加到 2
}
```

## 持续回合

使用 `duration` 设置持续回合数。这会创建一个名为 `duration` 的变量并自动在 `onActionPhase` 事件时扣除变量（并在为 0 时弃置）。`duration` 和 `variable` 一样必须设置在所有 `on` 块之前。

## 监听范围

几乎所有的事件都只会传播给"局部"的实体；比如对 `onDealDamage` 事件有响应的角色状态，只会在该角色造成伤害时执行。如果希望修改这一行为，在 `on` 块内使用 `listenTo`：
- 默认情形：只监听实体所在角色或阵营的事件；
- `listenTo player`：会响应我方阵营的所有同名事件；
- `listenTo all`：会响应场上的所有同名事件。

## 召唤物结束阶段操作快捷方法

如果一个召唤物在结束回合造成伤害或治疗，建议使用 `hint` 语句配合 `on endPhase`：

```gts
define summon {
  id 303211 as CryoHilichurlShooter;
  hint DamageType.Cryo, 1;
  on endPhase {
    usage 2;
    :damage(DamageType.Cryo, 1);
  }
}
```

`hint` 设置了 `hintText` 属性和 `hintIcon` 变量。`hintText` 是字符串，展示于召唤物图标左下角显示结束阶段造成的伤害值；`hintIcon` 则是该字符串的背景图标（伤害类型）。

对于"光降之剑"这种特殊显示则需要手动通过 `hintText` 语句和 `variable` 指明。

`hint` 还支持传入 `"swirledAnemo"`，即"染色"机制，初始结束阶段伤害为风元素伤害，若我方造成了扩散反应则修改 `hintIcon` 和结束阶段的伤害类型。

## 同名异构实体

很多角色的实体会因为天赋牌存在与否产生差异，如班尼特、可莉、砂糖等。当带有天赋的角色试图产生实体，而场上已经有不带天赋的实体时，虽然两个实体的定义 id 不同，但是仍然新实体会把旧实体"冲掉"。使用 `conflictWith` 语句实现：

```gts
// 带天赋版：持续回合 3
define combatStatus {
  id 117033 as ShrineOfMaya01;
  conflictWith 117032;
  duration 3;
  // [...]
}

// 不带天赋版：持续回合 2
define combatStatus {
  id 117032 as ShrineOfMaya;
  conflictWith 117033;
  duration 2;
  // [...]
}
```

## 准备技能

使用 `prepare` 语句来表示准备技能。`prepare SkillHandle` 的含义是，如果在需要玩家行动的时机，该实体存在，则直接执行对应技能并弃置自身。

事实上，准备技能被挂在 `replaceAction` 事件上，该事件不会被"引发"，而是在玩家行动前检查，如果存在监听它的技能则直接执行。

> 由于被触发的"准备中"技能使用 `useSkill` 执行，故可以通过 `skillInfo.requestBy.caller` 来获取触发该"准备中"技能的实体状态。
