# Fluent API（`$` 对象）

Fluent API 是实体查询系统的 TypeScript 接口，以 `$` 对象为入口，通过链式调用构建查询表达式。相比直接编写 S-Expr，Fluent API 提供了完整的 TypeScript 类型检查与 IDE 自动补全支持。

`$` 对象从 `@gi-tcg/core` 导入，也可从 `packages/core/src/query/index.ts` 获取。在技能/卡牌定义的上下文中，通常以 `QueryFn` 的形式传入，即 `($: IDollar) => IQuery` 的函数。

```ts
import { $ } from "@gi-tcg/core";
// 或在技能定义中：
skill.query(($) => $.my.active);
```

---

## 主要方法（Primary Methods）

主要方法附加在链式构造器上，用于限定查询条件。多次调用主要方法相当于取**交集**（intersection）。

### 阵营方法

| 方法   | 说明           |
| ------ | -------------- |
| `.my`  | 限定为我方实体 |
| `.opp` | 限定为敌方实体 |

### 区域/类型方法（按路径）

下列方法通过"路径语义"限定实体的区域——即只匹配该区域的"顶层"实体，不包含附属于其下的嵌套实体（如角色身上的状态/装备不会被视为角色区的结果）。

| 方法            | 类型                                    | 区域             |
| --------------- | --------------------------------------- | ---------------- |
| `.character`    | `character`                             | `characters`     |
| `.combatStatus` | `combatStatus`                          | `combatStatuses` |
| `.summon`       | `summon`                                | `summons`        |
| `.support`      | `support`                               | `supports`       |
| `.hand`         | `equipment` \| `support` \| `eventCard` | `hands`          |
| `.pile`         | `equipment` \| `support` \| `eventCard` | `pile`           |

### 类型方法（不限区域）

下列方法仅限定实体类型，不限定区域：

| 方法             | 类型         | 可能的区域                    |
| ---------------- | ------------ | ----------------------------- |
| `.typeEquipment` | `equipment`  | `characters`、`hands`、`pile` |
| `.typeSupport`   | `support`    | `supports`、`hands`、`pile`   |
| `.typeStatus`    | `status`     | `characters`                  |
| `.typeEventCard` | `eventCard`  | `hands`、`pile`               |
| `.attachment`    | `attachment` | `hands`、`pile`               |

> **注意**：`.equipment`、`.status`、`.eventCard` 是对应 `type*` 方法的别名，但建议使用 `type` 前缀版本以与区域方法（`.hand`/`.support` 等）区分。

### 区域方法（非路径语义）

下列方法不使用路径语义，会包含该区域内的所有嵌套实体（如角色身上的状态/装备也会被 `.vCharacter` 匹配）：

| 方法          | 类型                                              | 区域         |
| ------------- | ------------------------------------------------- | ------------ |
| `.vCharacter` | `character`、`status`、`equipment`                | `characters` |
| `.vHand`      | `equipment`、`support`、`eventCard`、`attachment` | `hands`      |
| `.vPile`      | `equipment`、`support`、`eventCard`、`attachment` | `pile`       |

### 场上/场下方法

| 方法        | 说明                                                                    |
| ----------- | ----------------------------------------------------------------------- |
| `.onStage`  | 限定为场上实体（`characters`、`combatStatuses`、`summons`、`supports`） |
| `.offStage` | 限定为场下实体（`hands`、`pile` 和 `attachment`）                       |

### 位置方法（角色位置）

| 方法       | 说明                 |
| ---------- | -------------------- |
| `.active`  | 出战角色             |
| `.standby` | 后台角色（所有后台） |
| `.next`    | 下一个后台角色       |
| `.prev`    | 上一个后台角色       |

### 倒下方法

| 方法                | 说明                                     |
| ------------------- | ---------------------------------------- |
| `.onlyDefeated`     | 只查询已倒下的角色                       |
| `.includesDefeated` | 查询包括已倒下的角色（默认不含倒下角色） |

### 变量过滤方法

`.var(name, value)` / `.var(name, op, value)` / `.var(name, op, refName)` / `.var(pred)` 等重载形式，用于按实体变量的值过滤：

```ts
$.my.character.var("health", "<", 6); // 生命值 < 6
$.my.character.var("energy", "=", "maxEnergy"); // 充能已满（与另一变量比较）
$.my.character.var((v) => v["health"] > 3); // 使用函数谓词
```

特化的变量方法：

- `.cost(value)` / `.cost(op, value)` / `.cost(pred)`：按骰子费用过滤行动牌（等价于 `.var($.keys.diceCost, ...)`）；
- `.notInitial`：过滤出**不在**初始牌堆中的行动牌。

### 定义/ID 方法

| 方法                  | 说明                                       |
| --------------------- | ------------------------------------------ |
| `.id(id)`             | 按实体 ID（运行时唯一标识）过滤            |
| `.def(id)`            | 按定义 ID（卡牌/角色的定义标识）过滤       |
| `.tag(...tags)`       | 按定义标签过滤（必须同时带有所有指定标签） |
| `.tagOf(type, query)` | 按指定角色的武器/元素标签过滤              |

---

## 二元方法（Binary Methods）

二元方法在已有查询上调用，以"Lisp 风格"或"Java 风格"创建组合查询：

### Lisp 风格

通过 `$` 的顶层方法直接创建：

```ts
$.intersection(q1, q2, q3); // 多个查询取交集
$.union(q1, q2); // 多个查询取并集
```

### Java 风格

在已有查询对象上调用：

```ts
q1.orElse(q2); // q1 的结果，若为空则使用 q2（类似 SQL COALESCE）
q1.exclude(q2); // 从 q1 中排除 q2 的结果
q1.union(q2); // q1 与 q2 的并集
q1.intersection(q2); // q1 与 q2 的交集
```

示例：

```ts
// 我方所有未附饱腹状态的角色
$.my.character.exclude($.my.character.has($.typeStatus.def(303300)));
```

---

## 关系方法（Relation Methods）

关系方法用于表达实体间的归属关系：

| 方法       | 说明                           | 主体类型                | 宾体类型                |
| ---------- | ------------------------------ | ----------------------- | ----------------------- |
| `.has(q)`  | 角色拥有满足 `q` 的状态/装备   | `character`             | `status` \| `equipment` |
| `.at(q)`   | 状态/装备附属于满足 `q` 的角色 | `status` \| `equipment` | `character`             |
| `.with(q)` | 行动牌拥有满足 `q` 的附着      | 行动牌                  | `attachment`            |
| `.on(q)`   | 附着附属于满足 `q` 的行动牌    | `attachment`            | 行动牌                  |

关系方法有两种使用形式：

### 链式调用形式（主方法链调用）

直接在已有查询链后追加，用于限定当前查询的主体：

```ts
// 带有饱腹状态（定义 id 303300）的我方角色
$.my.character.has($.typeStatus.def(303300));
```

### 一元操作符

当 `<op>` 作为首个方法时（也即 `$.<op>` ）除了原始的调用形式外，还可以省略括号直接用 dot-notation 传入参数：

**dot-notation** —— 先访问属性，再传入宾体：

```ts
// 所有拥有任意装备的角色
$.has($.typeEquipment);
// 也可写作
$.has.typeEquipment;
// 两者完全等价
```

此类方法称作一元操作符。所有的关系方法同时也是一元操作符；此外还有如下操作符：

| 操作符                       | 说明                                        |
| ---------------------------- | ------------------------------------------- |
| `$.not(q)` / `$.not.<chain>` | 取反：查询不满足 `q` 的实体                 |
| `$.recentOppFrom(q)`         | 最近倒下的敌方角色（从 `q` 角色的对立阵营） |

---

## `orderBy` 与 `limit` 方法

这两个方法用于对查询结果排序和限制数量，生成 `OrderedQuery`。

### `.orderBy(variable)` / `.orderBy(lhs, op, rhs)`

按变量值升序排列结果。可指定单个变量，或两个操作数之间的算术运算：

```ts
$.my.character.orderBy("health"); // 按生命值升序
$.my.character.orderBy("health", "-", "maxHealth"); // 按伤害量升序
$.my.character.orderBy(0, "-", "health"); // 按生命值降序（0 - health）
```

也可使用 `.orderByFn(fn)` 传入函数：

```ts
$.my.character.orderByFn((v) => v["health"] - v["maxHealth"]);
```

### `.limit(count)`

限制返回的实体数量（默认无限制）：

```ts
$.my.character.orderBy("health").limit(1); // 生命值最少的角色（至多 1 个）
```

`orderBy` 和 `limit` 可以链式组合：

```ts
$.my.character.orderBy("health", "-", "maxHealth").limit(1); // 受伤最重的我方角色
```

---

## 内置宏（`$.macros`）

`$.macros` 提供常用查询的快捷方式，避免重复编写常见查询：

| 宏名                            | 说明                        |
| ------------------------------- | --------------------------- |
| `$.macros.myActive`             | 我方出战角色                |
| `$.macros.oppActive`            | 敌方出战角色                |
| `$.macros.myEnergyNotFull`      | 我方充能未满的角色          |
| `$.macros.oppActivePrioritized` | “优先”敌方出战角色          |
| `$.macros.myMinHealth`          | 我方生命值最少的角色        |
| `$.macros.oppMinHealth`         | 敌方生命值最少的角色        |
| `$.macros.myMaxHealth`          | 我方生命值最多的角色        |
| `$.macros.oppMaxHealth`         | 敌方生命值最多的角色        |
| `$.macros.myMostInjured`        | 我方受伤最多的角色          |
| `$.macros.oppMostInjured`       | 敌方受伤最多的角色          |
| `$.macros.myLeastInjured`       | 我方受伤最少的角色          |
| `$.macros.oppLeastInjured`      | 敌方受伤最少的角色          |
| `$.macros.myHandsOrderByCost`   | 我方手牌，按费用降序排列    |
| `$.macros.oppHandsOrderByCost`  | 敌方手牌，按费用降序排列    |
| `$.macros.myHandsNotFree`       | 我方费用不为 0 的手牌       |
| `$.macros.oppHandsNotFree`      | 敌方费用不为 0 的手牌       |
| `$.macros.myPileNotFree`        | 我方费用不为 0 的牌堆行动牌 |
| `$.macros.oppPileNotFree`       | 敌方费用不为 0 的牌堆行动牌 |

---

## `$.keys`

`$.keys` 提供两个特殊变量的符号键，用于与 `.var()` / `.orderBy()` 等方法配合：

- `$.keys.diceCost`：行动牌的骰子费用（`Symbol.for("GiTcgCore/query/varKey/diceCost")`）；
- `$.keys.inInitialPile`：是否在初始牌堆中（`Symbol.for("GiTcgCore/query/varKey/inInitialPile")`）。

示例：

```ts
$.my.hand.orderBy(0, "-", $.keys.diceCost); // 我方手牌，按费用降序
$.my.pile.var($.keys.inInitialPile, 0); // 我方牌堆中不在初始牌堆的牌
```

---

## 类型系统

Fluent API 通过 TypeScript 泛型提供完整类型推断：

- 每次方法调用返回携带元数据的 `PrimaryQuery<Meta>` 或 `CompositeQuery<Ty>`；
- TypeScript 会根据已添加的约束，自动隐藏不适用的方法（如已确定为 `character` 类型后，`combatStatus` 等方法消失）；
- `.orderBy()`、`.limit()` 等方法的参数类型根据已知变量名自动提示。
