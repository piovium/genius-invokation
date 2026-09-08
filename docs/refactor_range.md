# REMOVE ME BEFORE MERGE

# 实体变量取值范围重构

**核心目标** 将“可叠加，上限为 X”的语义从重新入场的叠加上限，扩大到变量本身的取值范围限定为 [0, X]。该限制约束在 setVariable 内，从而移除 addVariableWithMax 方法。

## Stage 1 修改变量上限数据结构

VariableConfig 增加 lowerBound、upperBound 字段（默认值为正负 Infinity）； 移除 VariableRecreateBehavior 的 appendLimit。

## Stage 2 重新入场叠加与 setVariable 共用限制逻辑

重新入场的叠加后数值、手动指定数值等，与 setVariable 共用一套上下限 clamping 逻辑。

## Stage 3 迁移 GTS VM

- `append X` / `append { limit X }` 迁移为 `append; range X;`
- `append { value Y }` 保持不变。

## Stage 4 迁移 `addVariableWithMax`

根据卡牌语义为使用处补充声明 `range X`，并将 `addVariableWithMax` 迁移至 `addVariable`。
