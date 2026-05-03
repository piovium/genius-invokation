# S-Expr 查询语法：非终结符参考

本文档由 `packages/core/scripts/gen_s_expr_schema.ts` 从 `NonTerminalsConfig`（位于 `packages/core/src/query/expr_schema.ts`）自动生成。

查询表达式的顶层非终结符为 [_Query_](#query)。每个非终结符的产生式规则均以 S-Expr 列表形式给出，第一个元素为关键字（`leading`），其余元素为参数。

## 非终结符列表

- [Query](#query)
- [UnorderedQuery](#unorderedquery)
- [OrderedQuery](#orderedquery)
- [PrimaryQuery](#primaryquery)
- [CompositeQuery](#compositequery)
- [VariableSpec](#variablespec)
- [OrderBySpec](#orderbyspec)
- [BooleanExpression](#booleanexpression)
- [NumericalExpression](#numericalexpression)

## 非终结符详细说明

### Query

**产生式规则：**

- 委托给 [_UnorderedQuery_](#unorderedquery)
- 委托给 [_OrderedQuery_](#orderedquery)

### UnorderedQuery

**产生式规则：**

- 委托给 [_PrimaryQuery_](#primaryquery)
- 委托给 [_CompositeQuery_](#compositequery)

### OrderedQuery

**产生式规则：**

- `(` `orderBy` <targetQuery: [_UnorderedQuery_](#unorderedquery)> <orderBySpec: (_...[_OrderBySpec_](#orderbyspec)_)> <limit: _number_> `)`

### PrimaryQuery

**产生式规则：**

- `(` `who` <whoSpec: `my` \| `opp`> `)`
- `(` `type` <typeSpec: `character` \| `equipment` \| `status` \| `combatStatus` \| `summon` \| `support` \| `eventCard` \| `attachment`> `)`
- `(` `area` <areaSpec: `characters` \| `combatStatuses` \| `summons` \| `supports` \| `hands` \| `pile`> <byPath: `true` \| `false`> `)`
  - **byPath**：Whether use the `path` semantics to filter the area, which means the equipments/statuses attached to characters and attachments attached on hand/pile cards are not considered when byPath is true
- `(` `onStage` `)`
- `(` `offStage` `)`
- `(` `position` <positionSpec: `active` \| `standby` \| `prev` \| `next`> `)`
- `(` `defeated` <defeatedSpec: `only` \| `ignore`> `)`
- `(` `variables` <variableSpec: [_VariableSpec_](#variablespec)> `)`
- `(` `id` <idValue: _number_> `)`
- `(` `definition` <definitionId: _number_> `)`
- `(` `tag` <tagValue: _string_> `)`
- `(` `tagOf` <tagType: `element` \| `weapon`> <referencedQuery: [_UnorderedQuery_](#unorderedquery)> `)`

### CompositeQuery

**产生式规则：**

- `(` `intersection` <...operands: [_UnorderedQuery_](#unorderedquery)> `)`
  > Note: When no arguments are provided, i.e. (intersection), the expression matches all entities.
- `(` `union` <...operands: [_UnorderedQuery_](#unorderedquery)> `)`
- `(` `orElse` <lhs: [_UnorderedQuery_](#unorderedquery)> <rhs: [_UnorderedQuery_](#unorderedquery)> `)`
- `(` `exclude` <lhs: [_UnorderedQuery_](#unorderedquery)> <rhs: [_UnorderedQuery_](#unorderedquery)> `)`
- `(` `not` <operand: [_UnorderedQuery_](#unorderedquery)> `)`
- `(` `has` <operand: [_UnorderedQuery_](#unorderedquery)> `)`
- `(` `at` <operand: [_UnorderedQuery_](#unorderedquery)> `)`
- `(` `with` <operand: [_UnorderedQuery_](#unorderedquery)> `)`
- `(` `on` <operand: [_UnorderedQuery_](#unorderedquery)> `)`
- `(` `recentOppFrom` <operand: [_UnorderedQuery_](#unorderedquery)> `)`

### VariableSpec

**产生式规则：**

- `(` `expr` <expression: [_BooleanExpression_](#booleanexpression)> `)`
- `(` `fn` <fnCode: _string_> `)`
  - **fnCode**：JS Function body, receives a object containing variable values, returns boolean

### OrderBySpec

**产生式规则：**

- `(` `expr` <expression: [_NumericalExpression_](#numericalexpression)> `)`
- `(` `fn` <fnCode: _string_> `)`
  - **fnCode**：JS Function body, receives a object containing variable values, returns number

### BooleanExpression

**产生式规则：**

- `(` `not` <operand: [_BooleanExpression_](#booleanexpression)> `)`
- `(` `and` <...operands: [_BooleanExpression_](#booleanexpression)> `)`
- `(` `or` <...operands: [_BooleanExpression_](#booleanexpression)> `)`
- `(` `>` <lhs: [_NumericalExpression_](#numericalexpression)> <rhs: [_NumericalExpression_](#numericalexpression)> `)`
- `(` `>=` <lhs: [_NumericalExpression_](#numericalexpression)> <rhs: [_NumericalExpression_](#numericalexpression)> `)`
- `(` `=` <lhs: [_NumericalExpression_](#numericalexpression)> <rhs: [_NumericalExpression_](#numericalexpression)> `)`
- `(` `<=` <lhs: [_NumericalExpression_](#numericalexpression)> <rhs: [_NumericalExpression_](#numericalexpression)> `)`
- `(` `<` <lhs: [_NumericalExpression_](#numericalexpression)> <rhs: [_NumericalExpression_](#numericalexpression)> `)`
- `(` `!=` <lhs: [_NumericalExpression_](#numericalexpression)> <rhs: [_NumericalExpression_](#numericalexpression)> `)`

### NumericalExpression

**产生式规则：**

- 字符串字面量
  > Use the value read from a variable name
- 数字字面量
  > Arbitrary constant number
- `(` `special:diceCost` `)`
  > Returns the dice cost of this card.
- `(` `special:inInitialPile` `)`
  > Returns 1 if the card is in player's initial pile, otherwise 0.
- `(` `+` <...operands: [_NumericalExpression_](#numericalexpression)> `)`
- `(` `*` <...operands: [_NumericalExpression_](#numericalexpression)> `)`
- `(` `-` <rhs: [_NumericalExpression_](#numericalexpression)> `)`
- `(` `-` <lhs: [_NumericalExpression_](#numericalexpression)> <rhs: [_NumericalExpression_](#numericalexpression)> `)`
- `(` `/` <rhs: [_NumericalExpression_](#numericalexpression)> `)`
- `(` `/` <lhs: [_NumericalExpression_](#numericalexpression)> <rhs: [_NumericalExpression_](#numericalexpression)> `)`
- `(` `%` <lhs: [_NumericalExpression_](#numericalexpression)> <rhs: [_NumericalExpression_](#numericalexpression)> `)`
- `(` `min` <...operands: [_NumericalExpression_](#numericalexpression)> `)`
- `(` `max` <...operands: [_NumericalExpression_](#numericalexpression)> `)`
