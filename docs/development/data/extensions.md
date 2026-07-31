# 扩展点

扩展点为整局游戏保存独立状态，适合记录“即使相关实体尚未入场也要持续统计”的信息。它们使用 `define extension` 定义：

```gts
define extension {
  idHint 322022 as DisposedSupportCountExtension;
  schema ({ disposedSupportCount: "pair<number>" });
  initialState ({ disposedSupportCount: [0, 0] });
  description "记录本场对局中双方支援区弃置卡牌的数量";
  mutateWhen onDispose,
    ((st, e) => {
      if (!e.isDiscardOrTuning() && e.entity.definition.type === "support") {
        st.disposedSupportCount[e.who]++;
      }
    });
};
```

- `idHint` 是唯一的 id 提示，通常使用相关卡牌或技能的 id；运行时会加上扩展点 id 偏移。
- `schema` 是状态结构的 ArkType 描述，支持对象、数组和 `pair<T>` 等 JSON 可序列化类型。
- `initialState` 是必填的初始状态，必须符合 `schema`。
- `mutateWhen <核心事件>, <回调>;` 在每次核心事件发生时更新状态。回调参数依次是可写草稿、事件参数和当时的只读游戏状态。
- `description` 可选，用于描述该全局状态。

扩展点没有阵营和监听范围；`mutateWhen` 使用的是核心事件名（例如 `onDispose`、`onDamageOrHeal`），而不是 `dealDamage` 等细分事件名。需要只统计特定情况时，在回调中检查事件参数。

## 在数据定义中使用

为角色、技能、实体或行动牌写 `associateExtension <扩展点>;`，之后其效果可使用 `:getExtensionState()` 和 `:setExtensionState(...)`：

```gts
define card {
  id 322022 as Jeht;
  associateExtension DisposedSupportCountExtension;
  support ally {
    associateExtension DisposedSupportCountExtension;
    variable experience, 0;
    on staged,
      :{
        :setVariable(
          "experience",
          Math.min(:getExtensionState().disposedSupportCount[:self.who], 6),
        );
      };
  };
};
```

`associateExtension` 只提供对该扩展点的上下文访问权限；它不会自动同步实体变量。需要同步时，在 `on staged`、相关事件或操作中显式读取并写入。
