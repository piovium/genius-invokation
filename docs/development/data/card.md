# 定义行动牌

行动牌以 `card(<id>)` 开头。默认的行动牌类型为事件牌，但也可以通过 `.type` 链方法修改（不常见）。

## 通用方法

- `.since("v3.3.0")` 引入次卡时的[游戏版本](./version.md)
- `.costXxx` 可指定卡牌所消耗的骰子。
- `.legend()` 秘传牌。
- `.tags` 指定标签，如 `action` 为战斗行动。
- `.addTarget` 增加一个卡牌使用目标，可行目标由[实体查询语法](../query-legacy.md)给出。
- `.filter` 设置打出条件；只有条件满足时才能打出。
- `.associateExtension`：参见[扩展点](./extensions.md)。

## 事件牌

随后紧跟[操作描述](./operations.md)即可。例：

```ts
/** 下落斩 */
const PlungingStrike = card(332017)
  .costSame(3)
  .tags("action")
  .addTarget("my characters")
  .switchActive("@targets.0")
  .useSkill("normal")
  .done();
```

### `.toStatus` 生成角色状态

在 builder chain 中指定 `.toStatus` 后，即表明该牌打出后将产生角色状态。该链方法的参数为角色状态的附属目标的[实体查询](../query-legacy.md)字符串，随后的描述均为该[角色状态](./entity.md)的定义。例：

```ts
/** 元素共鸣：粉碎之冰 */
const ElementalResonanceShatteringIce = card(331102)
  .costCryo(1)
  .tags("resonance")
  .toStatus("my active")
  .duration(1)
  .once("increaseSkillDamage")
  .increaseDamage(2)
  .done();

```

### `.toCombatStatus` 生成出战状态

和 `.toStatus` 类似，只是改为生成出战状态。参数为 `"my"` （默认值）或 `"opp"` 指定出战角色的阵营。随后的描述，改为对生成的出战状态的定义。例：

```ts
/** 交给我吧！ */
const LeaveItToMe = card(332006)
  .toCombatStatus()
  .once("beforeFastSwitch")
  .setFastAction()
  .done();
```

### `.descriptionOnDraw` 抓到时描述

指示本牌的行动描述并非打出时而是抓到时。

```ts
/* 激愈水球·小 */
const SmallBolsteringBubblebalm = card(112133)
  .descriptionOnDraw()
  .heal(1, "all my characters")
  .combatStatus(SourcewaterDroplet)
  .done();
```

### 料理牌

通常情况下，使用 `.food()` 方法就够了。该方法会指定 `.tags("food")`，然后调用 `.addTarget` 为不带饱腹状态的角色，并在所有行动的结尾添加 `.characterStatus` 增加目标角色的饱腹状态。例：

```ts
/** 绝云锅巴 */
const JueyunGuoba = card(333001)
  .food()
  .toStatus("@targets.0")
  // [...]
  .done();
```

若打出的目标有额外限制，如治疗牌要求目标生命值未满，则可使用 `.food({ extraTargetRestraint: "with health < maxHealth" })`：

```ts
/** 蒙德土豆饼 */
const MondstadtHashBrown = card(333006)
  .costSame(1)
  .food({ extraTargetRestraint: "with health < maxHealth" })
  .heal(2, "@targets.0")
  .done();
```

对于类似唐杜尔烤鸡的，对所有角色生效且对所有角色添加饱腹状态的，使用 `.food({ satiatedTarget: "all my characters" })`。

```ts
/** 唐杜尔烤鸡 */
const TandooriRoastChicken = card(333011)
  .costVoid(2)
  .food({ satiatedTarget: "all my characters" })
  .toStatus("all my characters")
  .oneDuration()
  .once("modifySkillDamage", (c, e) => e.viaSkillType("elemental"))
  .increaseDamage(2)
  .done();
```

### `.eventTalent` 天赋牌（事件）

诸如“无相之雷”等角色的天赋牌“汲能棱晶”是事件牌。通过 `.eventTalent(ch)` 来指定这一行为；`ch` 是角色句柄。该方法会调用 `.tags("talent")`、增加卡组限定，并自动指定 `.tags("action")`。如果该天赋牌不是战斗行动，则显式指明第二参数，见[后文](#talent-天赋牌装备)。

## 装备牌

### `.artifact()` 圣遗物牌

在 builder chain 中调用 `.artifact()` 方法即可声明该牌为圣遗物装备牌，随后的描述转换为对圣遗物实体的定义。该方法会调用卡牌和圣遗物实体的 `.tags("artifact")` `.type("equipment")` 和 `.addTarget("my characters")`。

### `.weapon` 武器牌

在 builder chain 中调用 `.weapon(type)` 方法可声明该牌为武器牌，武器类型为 `type`。随后的描述转换为对武器实体的定义。该方法会调用卡牌和圣遗物实体的 `.tags("artifact")` `.type("equipment")` 和 `.addTarget("my characters with tag (type)")`。

### `.talent` 天赋牌（装备）

大部分天赋牌是装备牌。调用 `.talent(ch)` 方法可声明该牌为 `ch` 的天赋装备牌。该方法会调用卡牌和实体的 `.tags("talent")` 和 `.type("equipment")` ，并添加 `.addTarget` 为对应的 `character`。

默认情况下该方法会调用 `.tags("action")` 表明使用此牌是战斗行动。如果这不满足，则显式指明 `.talent(ch, "active")` 或 `.talent(ch, "none")`。`"active"` 指该牌不是战斗行动，但仍然要求天赋角色是出战角色；`"none"` 则和普通装备牌无异，（除限定的使用目标外）没有打出时机的额外要求。

### `.technique()` 特技牌

调用 `.technique()` 声明该牌为特技牌，随后的描述转换为对特技牌实体的定义。使用 `.provideSkill(id)` 表明该特技牌可提供的特技；使用 `.endProvide()` 结束特技描述。

特技描述和[主动技能描述](./character.md#主动技能)拥有类似的结构。特技还可提供如下链方法：
- `.usage` 和 `.usagePerRound`：限制该特技的使用次数和每回合使用次数。前者再消耗完毕后，特技装备会被弃置。

例：

```ts
/**
 * 异色猎刀鳐
 * 特技：原海水刃：造成2点物理伤害。
 */
const XenochromaticHuntersRay = card(313001) // 特技手牌和装备的 id
//.costOmni(0)                               // 声明打出手牌所需的骰子
  .technique()                               // 声明此牌为特技牌
  .provideSkill(3130011)                     // 特技所提供技能的 id
  .costVoid(2)                     // 声明打出该技能所需的骰子
  .usage(2)                        // 声明特技技能的可用次数；耗尽时弃置特技装备
  .damage(DamageType.Physical, 2)  // 下为正常的主动技能定义
  .done();
```

### 其它装备牌？

目前还没有，但可以直接调用 `.equipment(target)` 表明该牌打出后可以选择 `target` 作为目标，并为目标装备实体，随后的 builder chain 转换到该装备的定义。

## `.support` 支援牌

调用 `.support(type)` 指明该牌是支援牌，打出后将在支援区添加实体，随后的描述转为对实体的定义。其中 `type` 是 `"ally"` `"item"` 或 `"place"`。

