# 实体查询语法（旧版字符串 DSL）

> **注意**：本文档描述的是旧版字符串 DSL 查询语法，对应实现位于 `packages/core/src/query-legacy`。该语法已被迁移至 `query-legacy`，新的查询系统使用 S-Expr 与 Fluent API，详见 [query/](./query/) 目录下的文档。

实体查询语法用以查询一个对局状态场上的实体。你可以通过 `game.query` 以此语法查询实体来调试。该语法被设计为和英语自然语言类似，并倾向于要求松散。

实体查询需要给定一个[对局状态](./state.md)，以及一个“当前阵营” `0` 或 `1`；查询结果即为查询到的实体状态的数组。“当前阵营”是用于指定查询语法中的 `my` 或 `opp` 的含义；比如“当前阵营”是 0 号玩家的时候，`my characters` 返回的是 0 号玩家的全部未倒下角色。

## 主要语法

<pre>[my | opp | all] [<em>type-spec</em>] [<em>with-spec</em>]
</pre>

其中 *`type-spec`* 可以为以下实体类别关键字：
```
characters
summons
equipments
[combat] statuses
supports
[hand | pile] cards
any
```

例如：

```
my characters       # 我方角色（不含倒下，见下文）
opp combat statuses # 敌方所有出战状态
all summons         # 场上全部召唤物，不分敌我
```

- 如果不指定前面的阵营部分，则默认为 `all`。指定了 `my` 或者 `opp` 时可同时指定 `all`，后者无效果；如 `all my characters` 等价于 `my characters`。
- 所有的 `s` `es` 后缀是可省略的。
- 使用 `any` 查询所有类型的实体，如 `all any` `my any` 等（这通常和稍后的集合操作同时使用）。若给出了 with-说明符，则可省略 `any` 关键字，如 `opp with tags (hydro)`。
- 当指定 `characters` 时，默认**不包含倒下角色**。如果想要包含倒下角色，则使用 `characters include defeated`。如果仅查询倒下角色，则使用 `defeated characters`（如提瓦特煎蛋的目标为 `my defeated characters`）。
- 角色查询可使用以下位置说明符；当指定位置说明符时，`character` 关键字可省略：
  - `active` 出战角色
  - `standby` 后台角色
  - `next` 下一个（后台）角色
  - `prev` 上一个（后台）角色

## with-说明符

*`with-spec`* 是 with-说明符，用来限定实体的常量、变量、定义 id、实体 id 以及定义标签等。其语法包括：

```
with <var> = <expr>           # 限定变量
with <var> <op> <expr>        # 限定变量，但是使用比较运算符
with id <int_val>             # 限定实体 id
with definition id <int_val>  # 限定定义 id
with tags (<tag>, ...)        # 限定定义标签
```

例如：

```
characters with health < 6    # 查询生命值小于 6 的角色
status with definition id 106 # 冻结状态（冻结的定义 id 是 106）
characters include defeated with tags (pyro) # 查询我方火系角色
```

- 等于运算符是 `=` 而非 `==`。
- `tags` 要求该实体带有**全部的**标签。如果需要查询“其中一个”，请使用[集合操作查询](#集合操作查询)。
- 一个特殊的标签查询具有语法 `tag <qual> of (<query>)`；其中 `qual` 为 `weapon` `element` 或 `nation`。其查询限定 `<query>` 返回的实体（必须是单个角色）中的武器、元素或国籍标签。比如 `my characters with tag element of (my active)` 返回我方角色中，与出战角色同一元素属性的角色。
- 如果变量名和关键字冲突，使用字符串字面量语法括起，如 `"health"`。
- 查询不满足 with-说明符 的实体，可使用[联合查询](#联合查询)，如 `my characters and not with tags (...)`。

## 关系查询

有两种关系查询运算符 `has` 和 `at`。`<a> has <b>` 查询带有满足 `<b>` 的状态、装备的角色，`<a> at <b>` 查询附着于角色身上的装备或状态。

```
# 我方带有饱腹（定义 id 303300）状态的角色
characters has status with definition id 303300
# 敌方角色上的坍毁（特瓦林，定义 id 125021）状态
status with definition id 125021 at opp characters
```

`has` 和 `at` 的左侧查询可以省略，默认为 `all any`。如：

```
# 所有带装备的角色
has equipment
```

> 此时 `has` 和 `at` 为一元前缀运算符，可与 `not` 无歧义、无括号地使用。

## 集合操作查询

`not` 用于取反，只查询不满足后续条件的实体。`not` 的优先级高于**二元**关系查询，如同时使用需要加括号。

```
# 所有不满足“附属饱腹状态的角色”的实体
not has status with definition id 303300
not (characters has status with definition id 303300)
```

`and` 查询用于限定同时满足两个查询条件的实体。

```
# 所有我方不附属饱腹状态的角色
my characters and not has status with definition id 303300
```

`or` 查询用于限定满足两个查询条件之一的实体，不常用。

## 子句

`order by` 子句用来限定查询返回结果的顺序。角色默认的排序顺序为结算顺序；否则按照子句指定的表达式结果稳定**升序**排列。

```
# 我方角色，按照受伤程度由多至少排序
my characters order by health - maxHealth
```

`limit` 子句用来限定查询返回的角色个数。

```
# 我方首个充能未满的角色
my characters with energy != maxEnergy limit 1
```

## 特殊（外部）查询

在查询语句中以 `@` 开头的点分标识符是外部查询。在技能描述的语境下，它们有如下含义：

| 查询                 | 语义                                                    |
| -------------------- | ------------------------------------------------------- |
| `@self`              | [`c.self`](./data/operations.md#self)                   |
| `@master`            | [`c.self.master`](./data/operations.md#entitycontext) |
| `@event.skillCaller` | `c.eventArg.caller` `skill` 事件的技能发起者            |
| `@event.switchTo`    | `c.eventArg.to` `switchActive` 事件的目标               |
| `@damage.target`     | `c.eventArg.damage.target` `beforeDamage` 事件的目标    |
| `@targets.N`         | `c.targets[N]` 卡牌目标                                 |
