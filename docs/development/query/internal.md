# 查询系统实现细节

本文档介绍新版查询系统（`packages/core/src/query/`）的主要内部设计与实现细节，供希望深入了解或维护该模块的开发者参考。

---

## 整体架构

查询系统分为以下几个层次：

1. **S-Expr 数据结构**（`expr_schema.ts`）：定义查询表达式的文法（非终结符），通过 TypeScript 类型系统自动推导出 S-Expr 的类型。
2. **Fluent API**（`dollar.ts`、`primary_methods.ts`、`binary_methods.ts`、`relation_methods.ts`、`make_ordered.ts`）：提供 `$` 对象，通过链式调用构建 S-Expr 查询。
3. **运行时**（`runtime.ts`）：接受 `GameState` 和 S-Expr 查询，返回匹配的实体状态数组。
4. **S-Expr 解析/序列化**（`s_expr.ts`）：提供 `parseSExpr`、`stringifySExpr`、`prettyStringifySExpr` 函数，用于字符串与 S-Expr 数据结构之间的转换。

---

## `expr_schema.ts`：文法定义与类型推导

`NonTerminalsConfig` 类以声明式方式定义了查询语言的全部文法规则，每个属性对应一个非终结符。每条规则通过 `Rule` 接口描述，支持以下形式：

- `use`：引用另一个非终结符（递归委托）；
- `leading` + `args` + `restArgs`：S-Expr 列表形式（关键字 + 固定参数 + 变长参数）；
- `enum`：枚举值；
- `arbitrary`：任意数字或字符串；
- `list`：元素类型为某 `Rule` 的列表。

`InferRule`、`InferNonTerminal` 等类型工具从 `NonTerminalsConfig` 中自动推导出各非终结符对应的 TypeScript 类型（即 `SExprSchema.Query` 等），避免手动维护类型定义与文法的同步。

---

## `primary_query.ts`：PrimaryQuery 构建

`PrimaryMethodsInternal` 类持有当前查询链中积累的所有约束（`SExprSchema.UnorderedQuery[]`）和 defeated 配置。每次调用主要方法时，调用 `addConstraint` 将对应的 S-Expr 约束追加到列表。

最终调用 `toExpressionUnordered()` 时：

- 若只有一个约束，直接返回；
- 若有多个约束，自动用 `intersection` 合并（并扁平化嵌套的 `intersection`）；
- 始终在最前方插入 defeated 过滤（默认为 `(defeated ignore)`，即排除倒下角色）。

`PrimaryQueryImpl` 通过 `mixins` 工具混入 `PrimaryMethods`、`RelationMethods`、`BinaryMethods`、`MakeOrderedMethods` 四个 mixin 类，这些 mixin 通过访问 `this._internal`（`PrimaryMethodsInternal`）修改内部状态。

---

## Fluent API 的 mixin 机制

`PrimaryQuery` 和 `CompositeQuery` 都使用了 `mixins`（`packages/core/src/utils.ts`）实现多继承：

```ts
const PrimaryQuery = mixins(PrimaryQueryImpl, [
  PrimaryMethods,
  RelationMethods,
  BinaryMethods,
  MakeOrderedMethods,
]);
```

`mixins` 通过将 mixin 类的原型属性复制到目标类原型上实现。这样 `PrimaryQuery` 的实例同时具备所有 mixin 的方法。

---

## `dollar.ts`：`$` 对象与一元操作符

`Dollar` 类在其静态初始化块（`static {}`）中动态地将主要方法和一元操作符方法挂载到 `Dollar.prototype`：

- 主要方法：遍历 `PRIMARY_METHODS`（`PrimaryMethodsImpl.prototype` 的所有属性描述符），对 getter 和普通方法分别创建委托到 `createPrimaryQuery({leadingUnaryOp: null})[method]` 的代理。
- 一元操作符（`UNARY_OPERATORS`：`has`、`at`、`with`、`on`、`not`、`recentOppFrom`）：每个操作符对应一个 getter，返回一个**兼具函数调用能力与 PrimaryQuery 链式方法**的对象：
  - 作为函数调用时（call-notation）：接收一个 `IUnorderedQuery` 参数，创建 `(op <arg>)` 形式的 S-Expr；
  - 作为链式方法时（dot-notation）：直接使用其 `PrimaryQuery` 原型上的链式方法。

这是通过将 `callingForm`（函数）的原型设置为 `createPrimaryQuery({ leadingUnaryOp: name })` 实例来实现的：

```ts
const callingForm = (q: IUnorderedQuery) => { /* ... */ };
Object.setPrototypeOf(callingForm, returns); // returns 是 PrimaryQuery 实例
```

因此 `$.has` 既可以作为 `$.has($.typeEquipment)` 调用，也可以作为 `$.has.typeEquipment` 链式使用。

---

## `make_ordered.ts`：MakeOrderedMethods 的延迟构造

`MakeOrderedMethods` 既是 `PrimaryQuery` 的 mixin，也是最终有序查询 `IQuery` 的实现。当 `MakeOrderedMethods` 的方法（`.orderBy()`、`.limit()`）在 `PrimaryQuery` 链中调用时，通过 `_makeThisOrdered()` 方法检测当前 `this` 是 `MakeOrderedMethods` 实例还是 `IUnorderedQuery` 实例：

- 若为 `IUnorderedQuery`，则用其 `toExpressionUnordered()` 的结果构造一个新的 `MakeOrderedMethods` 实例，并在其上设置排序/限制参数；
- 若已经是 `MakeOrderedMethods`，则直接修改并返回自身。

这保证了链式调用的自然衔接，例如 `$.my.character.orderBy("health").limit(1)` 中：
- `$.my.character` 是 `PrimaryQuery`（其上混入了 `MakeOrderedMethods`）；
- `.orderBy("health")` 触发 `_makeThisOrdered()`，将 `PrimaryQuery` 转化为 `MakeOrderedMethods`；
- `.limit(1)` 在新的 `MakeOrderedMethods` 上继续调用。

---

## `runtime.ts`：查询执行

`QueryRunner` 类接受 `GameState` 构造，预先建立全部实体的索引（按类型、区域分类）。`runQuery(state, who, query)` 方法：

1. 用 `GameState` 创建或获取（缓存）`QueryRunner`；
2. 调用 `runner.run(query)` 执行查询；
3. 返回 `EntityState[]`。

`QueryRunner.run(query)` 是一个递归函数，根据 S-Expr 的第一个元素（关键字）分派到对应的处理逻辑，在每个实体集上进行过滤/组合操作。

### 数值表达式的编译与解释策略

对于 `variables` 过滤和 `orderBy` 排序中的数值/布尔表达式，`QueryRunner` 采用两种求值策略：

1. **解释（Interpret）**：直接递归求值 S-Expr，简单但每次调用有函数调用开销。
2. **编译（Compile）**：将 S-Expr 转为 JavaScript 代码字符串，包装为 `new Function(...)` 并缓存，触发 JS 引擎 JIT，适合大量实体时使用。

基于基准测试，系统根据表达式树的深度（`depth`）与预期运行次数（`runCountHint`）动态选择策略：

- `depth` = 1 时，`runCountHint` > 15 才编译；
- `2 ≤ depth ≤ 3` 时，`runCountHint` > 5 才编译；
- `depth` > 3 时，始终编译。

详见 [Benchmark Gist](https://gist.github.com/guyutongxue/d55be95c3a171c1f3fcd2b4093cf5820)。

### 特殊变量

对于行动牌（`equipment`、`support`、`eventCard`），`QueryRunner` 通过 `Proxy` 为变量对象附加两个虚拟属性（`diceCostKey`、`inInitialPileKey`），这些属性的值在首次访问时惰性计算并缓存（`variableParamCache`）。

---

## `s_expr.ts`：S-Expr 解析与序列化

`parseSExpr(input)` 实现了一个简单的手写递归下降解析器，支持：
- `()`/`[]`/`{}` 三种括号列表；
- JSON 格式字符串字面量；
- 数字字面量（JSON-like）；
- 标识符（不含空白、括号、分号的非数字前缀字符串）；
- `;` 行注释。

`stringifySExpr(expr)` 将 S-Expr 序列化为单行字符串；`prettyStringifySExpr(expr)` 会根据表达式结构自动换行缩进，保持可读性。

---

## 类型系统设计

Fluent API 的类型系统由一套"元数据（Meta）"类型参数驱动：

- `MetaBase`：包含 `type`、`areaType`、`who`、`definition`、`position`、`defeated`、`id`、`variables` 等字段，初始为各字段的联合全集；
- 每次调用主要方法，`Meta` 的对应字段被缩窄（`Assign<Meta, Patch>` 类型操作）；
- `PrimaryMethodsOmit<Meta>` 计算出在当前 `Meta` 下无意义的方法，通过 `Omit` 从类型中去除，避免错误提示。

`HeterogeneousMetaBase` 在 `MetaBase` 基础上增加了 `returns` 字段，用于追踪关系方法（`has`/`at` 等）对返回类型的影响：调用关系方法后，返回类型被设为宾体类型（如 `has(...)` 返回 `CharacterReq`）。

`TypingInfoBase`（包含 `type`、`areaType`、`variables`）是对外暴露的查询结果类型，由 `ReturnOfMeta<Meta>` 从 `Meta` 导出，用于运行时结果类型的类型安全保证。
