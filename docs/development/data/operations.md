# 操作描述

## 综述

有两种方式描述操作：
1. **声明域描述**，直接在 builder chain 中指定操作方法
2. **脚本域描述**，在 `.do` 方法内执行任意 JavaScript 语句

以下是两种描述方式的例子：

```ts
/** 优菈：冷酷之心 */

// 声明域描述方式：
const Grimheart = status(111061)
  .on("modifyDamage", /** [...] */)
  .increaseDamage(3)
  .dispose()
  .done();

// 脚本域描述方式：
const Grimheart = status(111061)
  .on("modifyDamage", (c) => /** [...] */)
  .do((c) => {
    c.increaseDamage(3);
    c.dispose();
  })
  .done();
```

对于简单的操作描述，可以直接在 builder chain 中指明，这就是声明域的工作方式。对于复杂的操作，比如需要读取已有的对局状态数据、分支循环等控制流等，就需要通过 `.do` 引入脚本域，然后在其中进行操作。

传入 `.do` 的参数是一个函数，函数的参数 `c` 是 `SkillContext` 类型的对象，调用 `c` 上的一些方法就可以完成对游戏状态的读取和更改。当技能被使用时，核心库会生成好 `c` 实参，然后传入 `do` 的函数参数，从而执行这个实体所定义的操作。在声明域的调用会自动转换为 `.do` 和对其中 `c` 的调用。

本文随后的 TypeScript 代码中，`target` 参数可接受“实体查询字符串”或者“角色或实体状态对象”。

## `SkillContext`

### `self`

每个技能都有技能的发起者（Caller）：对于实体的相应操作，实体就是发起者；对于角色技能（主动或被动），角色就是发起者；对于使用卡牌的操作，使用卡牌玩家的当前出战角色是发起者。在技能描述中，使用 `c.self` 或者 `@self` 查询访问发起者。比如若角色技能描述称“为自身增加一点充能”，则描述为 `.gainEnergy(1, "@self")`。若实体想要访问自身的变量，使用 `c.self.getVariable`。

`c.self` 会返回用于操作 `CharacterState` 或 `EntityState` 的便捷类。它不仅给出了一些常用的查询状态的函数，还提供一些修改对局状态的方法（但都来自于 `SkillContext`），称为 `CharacterContext` 或 `EntityContext`。比如刚才的 `getVariable` 函数会访问 `.state.variables`，而类似的 `setVariable` 则会调用 `SkillContext` 的 `setVariable(...)`，即作为技能定义操作的一部分。

### 常用操作列表

以下操作定义于 `SkillContext` 中，它们也同时暴露到声明域中供直接调用：

```ts
interface SkillContext {
  // 切换出战角色。target 只能为一个角色；若该角色为我方则切换我方出战角色，反之同理
  switchActive(target): void;

  // 让 target 角色获得能量
  gainEnergy(value: number, target): void;

  // 治疗 target 角色
  heal(value: number, target): void;

  // 对 target 角色造成伤害
  damage(type: DamageType, value: number, target = "opp active"): void;

  // 对 target 角色附着元素
  apply(type: DamageType, target): void;

  // 在 where 阵营召唤召唤物
  summon(id: SummonHandle, where: "my" | "opp" = "my"): void;

  // 为 target 角色附着角色状态
  characterStatus(id: StatusHandle, target = "@self"): void;

  // 在 where 阵营生成出战状态
  combatStatus(id: StatusHandle, where: "my" | "opp" = "my"): void;

  // 将 target 实体转移到 area（即先弃置后生成）
  transferEntity(target, area: EntityArea): void;

  // 弃置 target
  dispose(target = "@self"): void;

  // 设置 target 的变量值
  setVariable(prop: string, value: number, target = "@self"): void;

  // 累加 target 的变量值
  addVariable(prop: string, value: number, target = "@self"): void;

  // 累加 target 的变量值，但是不超过上限 maxLimit
  addVariableWithMax(prop: string, value: number, maxLimit: number, target = "@self"): void;
  
  // 修改关联的扩展点的状态
  setExtensionState(setter: (draft: Draft<...>) => void): void;

  // 替换 target 的定义
  transformDefinition(target, newDef: number): void;

  // 消耗 target 的 count 点夜魂值
  consumeNightsoul(target, count = 1): void;

  // 为我方生成 count 个 type 类型骰子。
  // randomElemnt 用以生成不同的基础类型元素骰子
  generateDice(type: DiceType | "randomElement", count: number): void;

  // 转换部分或全部骰子为 targetType 类型
  convertDice(targetType: DiceType, count: number | "all"): void;

  // 为我方生成手牌（不是从牌堆抽取）
  createHandCard(card: CardHandle): void;

  // 在我方牌堆生成 count 张定义为 card 的行动牌
  // strategy 指示插入位置
  createPileCards(card: CardHandle, count: number, strategy: InsertPileStrategy): void;

  // 弃置行动牌
  disposeCard(...cards: CardState[]): void;

  // 从牌堆抽取手牌
  // opt.who 决定哪一方抽牌
  // opt.withTag 要求抽出的手牌必须带有的标签
  drawCards(count: number, opt: DrawCardsOpt): void;
  drawCards(...cards: CardState[]): void;

  // 将牌从手牌放回牌堆
  undrawCards(cards: CardState[], strategy: InsertPileStrategy): void;

  // 从对手的手牌中窃取一张牌到我方手牌
  stealHandCard(card: CardState): void;

  // 终止预览。当此行动在预览语境下时，终止后续的预览计算。
  // 在非预览语境下是空操作。
  abortPreview(): void;

  // 请求执行“选择任意张手牌切换”
  switchCards(): void;

  // 请求执行“重投骰子”
  rerollDice(times: number): void;

  // 请求执行“挑选一张召唤物以召唤”
  selectAndSummon(summons: (SummonHandle | EntityDefinition)[]): void;

  // 请求执行“挑选一张卡牌加入手牌”
  selectAndCreateHandCard(cards: (CardHandle | CardDefinition)[]): void;

  // 请求执行“执行另一条技能”
  useSkill(skill: SkillHandle | "normal"): void;

  // 请求“触发 `target` 的回合结束时效果”
  triggerEndPhaseSkill(target: EntityState): void;
}

type InsertPileStrategy =
  "top" | "bottom" | "random" | "spaceAround" | `topRange${number}`;

interface DrawCardsOpt {
  who?: "my" | "opp";
  withTag?: CardTag | null;
}
```

所有返回 `void` 的函数都被自动添加到声明域以方便编写。

### 其它修改对局状态的方法

```ts
interface SkillContext {
  // 回收骰子。
  // seq 策略指按顺序回收；
  // diff 策略只回收不同颜色的骰子。
  absorbDice(strategy: "seq" | "diff", count: number): DiceType[];

  // 弃置我方原本元素骰费用最多的 count 张牌
  disposeMaxCostHands(count = 1, opt = {}): CardState[];
}
```

由于 `absorbDice` 返回值有意义（为被回收的骰子值），因此不能在声明域使用。

### 不修改对局状态的方法

```ts
interface SkillContext {
  // 当前最新的对局状态
  state: GameState;

  // 当前最新的我方玩家状态
  player: PlayerState;

  // 当前最新的对方玩家状态
  oppPlayer: PlayerState;

  // 引发此技能的相关信息，如 .caller、.fromCard 或 .requestBy。
  skillInfo: SkillInfo;

  // 获取执行此技能的发起者 self 的便利对象
  self: Context-of-CallerType;

  // 获取发起者的状态变量
  getVariable(prop: string): number;

  // 进行实体查询。只返回查询的首个实体，若没有返回 null
  $(arg): AnyContext | null;

  // 进行实体查询。返回所有查询到的实体的数组
  $$(arg): AnyContext[];

  // 对角色状态或实体状态进行包装，返回其便利对象
  of(st: EntityState | CharacterState): EntityContext | CharacterContext;

  // 是否为我方（执行此技能的发起者的阵营）的回合
  isMyTurn(): boolean;

  // 本回合内，第几次执行本技能（同一发起者）
  countOfThisSkill(): number;

  // 步进游戏状态的随机数发生器以进行随机操作
  random<T>(items: T[]): T;
  shuffle<T>(items: readonly T[]): T[];
  randomSubset<T>(items: readonly T[], count: number): T[];

  // 获取我方或对方原本元素骰费用最多的手牌列表
  getMaxCostHands(who: "my" | "opp" = "my"): CardState[];

  // 是否是我方初始牌组的卡牌
  isInInitialPile(card: CardState): boolean;
}
```


## `CharacterContext`

在一个给定的技能描述语境下，对 `CharacterState` 提供一些便利方法。

### 不修改对局状态的方法

```ts
interface CharacterContext {
  who: 0 | 1;            // 阵营
  id: number;            // 实体 id
  state: CharacterState; // 当前角色状态对象
  health: number;        // 角色生命值
  energy: number;        // 角色能量值
  aura: Aura;            // 角色当前附着元素

  // 角色位于第几个（0-起始）
  positionIndex(): number;

  // 角色是否满足某一位置
  // type CharacterPosition = "active" | "next" | "prev" | "standby";
  satisftyPosition(pos: CharacterPosition): boolean;

  // 角色是否是出战角色
  isActive(): boolean;

  // 角色是否是我方（技能发起者的阵营）角色
  isMine(): boolean;

  // 角色是否满充能
  fullEnergy(): boolean;

  // 角色的元素类型
  element(): DiceType;

  // 角色是否装备了圣遗物。若装备，返回其实体状态对象；否则返回 null
  hasArtifact(): EntityState | null;

  // 角色是否装备了武器。若装备，返回其实体状态对象；否则返回 null
  hasWeapon(): EntityState | null;

  // 角色是否附着了对应定义 id 的角色状态。若有则返回实体状态对象；否则返回 null
  hasStatus(id: StatusHandle): EntityState | null;

  // 查询该角色作为实体区域下的实体
  $$(arg): EntityContext[];

  // 获取角色的状态变量
  getVariable(prop: string): number;

  // 获取关联的扩展点的状态
  getExtensionState(): <...>;
}
```

### 修改对局状态的方法

```ts
interface CharacterContext {
  // c.gainEnergy(value, this)
  gainEnergy(value: number = 1): void;

  // c.heal(value, this);
  // 例如 ch.heal(3) 是治疗 ch 3 点不是治疗别人
  heal(value: number): void;

  // c.damage(type, value, this);
  // 例如 ch.damage(0, 3) 是对 ch 造成 3 点物理伤害不是别人
  damage(type: DamageType, value: number): void;

  // c.apply(type, this);
  apply(type: DamageType): void;

  // c.characterStatus(status, this);
  addStatus(status: StatusHandle): void;

  // 为此角色装备实体
  equip(equipment: EquipmentHandle): void;

  // 若有，移除此角色的圣遗物
  removeArtifact(): EntityState | null;

  // 若有，移除此角色的武器
  removeWeapon(): EntityState | null;

  // 移除角色的 value 点能量；返回实际被移除的能量值
  loseEnergy(value: number = 1): number;

  // 设置角色的状态变量值
  setVariable(prop: string, value: number): void;
  addVariable(prop: string, value: number): void;
  addVariableWithMax(prop: string, value: number, maxLimit: number): void;
}
```

## `EntityContext`

在一个给定的技能描述语境下，对 `EntityState` 提供一些便利方法。

### 不修改对局状态的方法

```ts
interface EntityContext {
  area: EntityArea;           // 实体所在区域
  who: 0 | 1;                 // 阵营
  id: number;                 // 实体 id
  state: EntityState          // 当前的实体状态对象
  master: CharacterContext; // 若实体位于角色区域，返回角色的便利对象

  // 获取实体状态变量
  getVariable(prop: string): number;
}
```

### 修改对局状态的方法

```ts
interface EntityContext {
  // 设置实体的状态变量值
  setVariable(prop: string, value: number): void;
  addVariable(prop: string, value: number): void;
  addVariableWithMax(prop: string, value: number, maxLimit: number): void;

  // c.dispose(this);
  // 弃置此牌
  dispose(): void;
}
```

## 声明域的流程控制

声明域提供了 `.if` 和 `.else` 用来处理简单的流程控制。`.if` 接受一个条件；仅当条件满足时才会执行**下一条**声明域 builder 方法。`.else` 则是仅当上一次出现的 `.if` 不成立时，执行**下一条**声明域 builder 方法。

```ts
/** 班尼特：美妙旅程 */
const FantasticVoyage = skill(13033)
  .type("burst")
  // [...]
  .if((c) => c.self.hasEquipment(GrandExpectation))
  .combatStatus(InspirationField01)
  .else()
  .combatStatus(InspirationField)
  .done();
```

无法用 `.if` `.else` 控制多条 builder 方法（可以使用 `.do` “括起”；但是这样不如直接在脚本域中使用 `if` 语句）。
