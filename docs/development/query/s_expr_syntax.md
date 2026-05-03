# S-Expr 查询语法

本文档介绍实体查询系统使用的 S-Expr（符号表达式）语法基础。S-Expr 是一种轻量的树形数据格式，广泛应用于 Lisp 系列语言中。查询系统在此基础上定义了一套特定的查询语言。

查询的非终结符参考（产生式规则）请见 [s_expr_schema.md](./s_expr_schema.md)。

## S-Expr 基本语法

一个 S-Expr 可以是以下几种形式之一：

### 1. 原子（Atom）

- **数字字面量**：符合 JSON 数字格式的数值，如 `42`、`3.14`、`-1`。
- **字符串字面量**：以双引号括起的 JSON 格式字符串，如 `"hello"`、`"my-var"`。支持标准 JSON 转义序列（如 `\n`、`\"`）。
- **标识符（Identifier）**：不含空白字符、括号、分号的非数字开头字符串，如 `who`、`my`、`special:diceCost`。

### 2. 列表（List）

列表是由括号括起的若干 S-Expr，中间以空白分隔：

```
( expr1 expr2 expr3 ... )
```

列表支持三种括号形式：`()`、`[]`、`{}`，互相之间可以嵌套，但配对括号必须一致。

### 3. 注释

以 `;` 开始到行末为止的内容为行注释，解析时被视为空白。

```lisp
; 这是注释
(who my)  ; 我方
```

## 查询表达式结构

在查询系统中，S-Expr 的列表第一个元素通常是**关键字**（`leading`），其后跟若干**参数**。例如：

```lisp
(who my)             ; 限定阵营为我方
(type character)     ; 限定类型为角色
(area characters true) ; 限定区域为角色区（使用 path 语义）
(position active)    ; 限定位置为出战角色
(intersection        ; 取多个子查询的交集
  (who my)
  (type character))
```

顶层查询由 `Query` 非终结符派生，通常为 `UnorderedQuery`（无序查询）或 `OrderedQuery`（有序查询）。

## UnorderedQuery（无序查询）

无序查询为 `PrimaryQuery`（基本查询）或 `CompositeQuery`（组合查询）之一。

- **PrimaryQuery**：直接表达一项过滤条件，如 `(who my)`、`(type character)` 等。
- **CompositeQuery**：将多个子查询组合，如 `(intersection ...)` 取交集、`(union ...)` 取并集、`(not ...)` 取反等。

多个基本查询通过 `intersection` 组合实现"同时满足多项条件"的语义。实际上，Fluent API 的链式调用就是在内部构建 `intersection` 表达式。

## OrderedQuery（有序查询）

有序查询使用 `orderBy` 关键字，格式为：

```lisp
(orderBy <targetQuery> <orderBySpecList> [limit])
```

- `targetQuery`：被排序的无序查询；
- `orderBySpecList`：排序规则列表（`OrderBySpec` 的列表），每项是 `(expr ...)` 或 `(fn "...")` 形式；
- `limit`：最多返回的实体数，不提供则不限制数量。

示例：

```lisp
(orderBy
  (intersection (who my) (area characters true) (defeated ignore))
  [(expr health)]
  1)
; 我方生命值最少的角色（最多取 1 个）
```

## 变量访问与布尔/数值表达式

在 `variables` 过滤条件中，可以通过变量名（字符串）访问实体的变量值。数值表达式（`NumericalExpression`）和布尔表达式（`BooleanExpression`）支持：

- 直接使用变量名（字符串），如 `"health"`、`"energy"` 等；
- 数字常量；
- 算术运算：`+`、`-`（一元取反或二元减法）、`*`、`/`（一元倒数或二元除法）、`%`（取模）；
- 聚合：`(min ...)`、`(max ...)`；
- 比较：`>`、`>=`、`=`、`<=`、`<`、`!=`；
- 逻辑：`(not ...)`、`(and ...)`、`(or ...)`；
- 特殊变量：`(special:diceCost)`（行动牌的骰子费用）、`(special:inInitialPile)`（是否在初始牌堆中，返回 0 或 1）。

示例：

```lisp
; 查询我方生命值小于 6 的角色
(intersection
  (who my)
  (area characters true)
  (variables (expr (< "health" 6))))
```

## 关系查询

`has`、`at`、`with`、`on` 等关键字用于表达实体间的关系：

- `(has <subQuery>)`：拥有满足 `subQuery` 的附属实体（如角色拥有某状态/装备）；
- `(at <subQuery>)`：附属于满足 `subQuery` 的角色（如某状态附属于某角色）；
- `(with <subQuery>)`：拥有满足 `subQuery` 的附着（attachment）的行动牌；
- `(on <subQuery>)`：附着于满足 `subQuery` 的行动牌的附着实体。

示例：

```lisp
; 我方带有饱腹（定义 id 303300）状态的角色
(intersection
  (who my)
  (area characters true)
  (has (intersection (type status) (definition 303300))))
```

## 字符串与标识符的区别

在 S-Expr 中，**标识符**（如 `my`、`character`）和**字符串字面量**（如 `"health"`）有区别：

- 用于查询关键字位置的值（如 `whoSpec`、`typeSpec`）总是**标识符**；
- 用于变量名的值（如 `variableSpec` 中的变量名）总是**字符串字面量**。

例如：`(who my)` 中 `my` 是标识符；`(variables (expr "health"))` 中 `"health"` 是字符串字面量（指变量名 `health`）。
