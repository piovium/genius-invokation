# 定义行动牌

行动牌使用 `define card`。未指定子类型时为事件牌；`cost`、`tags`、`legend`、`addTarget` 和 `filter` 等语句定义打出条件与效果。需要从 `@gi-tcg/core/data` 导入 `DamageType`、`DiceType` 等运行时常量。

```gts
/** 下落斩 */
define card {
  id 332017 as PlungingStrike;
  cost DiceType.Aligned, 3;
  tags action;
  addTarget $.my.character.exclude($.has($.typeStatus.tag("disableSkill")));
  :switchActive(:e.targets[0]);
  :useSkill("normal");
};
```

`addTarget` 可以接受查询表达式或一个以技能上下文为参数的 TypeScript 函数；所选目标按顺序位于 `:e.targets`。行动牌或主动技能可用 `filter :(条件);` 补充打出条件；事件响应使用 `when :(条件);`。事件牌的语句和 `:操作(...)` 在打出时执行。

## 事件牌

普通事件牌直接在块内写效果。`on selfHandCardInserted, only` 描述牌进入手牌时立即结算的效果；`only` 会使该牌只在自身进入手牌时触发并自动弃置。

```gts
define card {
  id 112133 as SmallBolsteringBubblebalm;
  undiscoverable;
  on selfHandCardInserted, only {
    :heal(1, "all my characters");
    :combatStatus(SourcewaterDroplet);
  };
};
```

`eventTalent <角色>[, action | actionSkill | none]` 用于作为事件牌的天赋牌。默认值为 `action`；`actionSkill` 还要求目标出战角色未被禁用技能；`none` 不要求角色出战。

## 料理牌

`food` 自动添加料理标签、选择未饱腹的我方角色，并在结算后附着饱腹状态。可在块内给出选项：

```gts
define card {
  id 333006 as MondstadtHashBrown;
  cost DiceType.Aligned, 1;
  food { injuredOnly; };
  :heal(2, :e.targets[0]);
};
```

`injuredOnly` 要求目标未满生命；`noSatiated` 不附着饱腹状态。对全队生效的料理使用 `food combat { ... };`，可用 `satiatedFilter "allNot";` 要求所有角色都未饱腹。

## 装备牌与支援牌

`weapon`、`artifact`、`talent`、`technique` 和 `support` 都接收一个嵌套定义块。嵌套块描述装备或支援实体本身；打出、装备、移动到支援区和默认目标由关键字处理。

```gts
define card {
  id 212091 as TurnControl;
  cost DiceType.Hydro, 3;
  talent Yelan {
    on staged {
      :useSkill(LingeringLifeline);
    };
    on roll {
      :e.fixDice(DiceType.Omni, 1);
    };
  };
};

define card {
  id 321006 as FavoniusCathedral;
  support place {
    on endPhase {
      usage 2;
      :heal(2, $.my.active);
    };
  };
};
```

支援和装备的打出时效果使用 `on staged { ... };`。该操作会在牌移动到支援区或装备到角色后立即执行，并可通过 `:e` 访问本次出牌的目标。它只随打出该牌执行；通过其他效果直接创建支援或装备时不会执行。支援和装备不能定义 `on selfEnter`，其他实体仍可使用 `on selfEnter` 响应入场事件。

- `weapon <武器标签> { ... }`：装备给对应武器类型的角色；
- `artifact { ... }`：装备给我方角色；
- `talent <角色>[, action | actionSkill | none] { ... }`：装备给指定角色；
- `technique { skill { ... }; ... }`：定义特技装备及其可使用的特技；
- `support <ally | item | place> { ... }`：打出后进入支援区。

嵌套实体中的事件、变量和操作与独立 `status`、`summon` 定义相同，见[实体](./entity.md)。
