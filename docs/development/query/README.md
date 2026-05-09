# 实体查询系统

实体查询系统用于在对局状态中查询实体。新版查询系统基于 S-Expr（符号表达式）数据结构和 Fluent API（`$` 对象）构建，提供完整的 TypeScript 类型支持。

## 文档目录

- [S-Expr 语法基础](./s_expr_syntax.md)：介绍 S-Expr 的基本语法规则、列表结构、注释等。
- [S-Expr 非终结符参考](./s_expr_schema.md)：从源码自动生成的完整文法参考，包含所有非终结符的产生式规则。
- [Fluent API（`$` 对象）](./fluent_api.md)：介绍 TypeScript Fluent API 的所有方法，包括主要方法、二元方法、关系方法、排序与限制方法及内置宏。
- [实现细节](./internal.md)：介绍查询系统内部架构、mixin 机制、运行时编译策略等实现细节。

## 旧版字符串 DSL

旧版字符串 DSL 查询（如 `"my characters"`）已迁移至 `query-legacy`，文档见 [query-legacy.md](../query-legacy.md)。
