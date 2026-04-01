# 扩展点

部分卡牌需要依赖某些“全局”变量或者跟踪它们。扩展点机制为这些卡牌提供了无需关联核心既可实现的办法。

以“捷德”为例。“捷德”需要记录整场牌局中的弃置支援牌数量（即便全场没有入场的捷德）。为此，使用 `extension` 来定义一个扩展点：

```ts
import { extension } from "@gi-tcg/core/builder";

const DisposedSupportCountExtension = extension(322022, { disposedSupportCount: "pair<number>" })
  .initialState({ disposedSupportCount: [0, 0] })
  .mutateWhen("onDispose", (st, e) => {
    if (e.entity.definition.type === "support") {
      st.disposedSupportCount[e.who]++;
    }
  })
  .done();
```

其含义为：对局状态将额外存储一个 `Pair<number>`，初始值为 `[0, 0]`，代表双方弃置的支援牌数量。在每次 `onDispose` 事件引发后，若被弃置的是支援牌，则修改对应玩家的值。

一个实体、技能、手牌可最多关联一个扩展点，以使用或修改其中的状态数据。如“捷德”在入场时，将读取此扩展点状态中的数据：

```ts
export const Jeht = card(322022)
  .costVoid(2)
  .support("ally")
  .associateExtension(DisposedSupportCountExtension) // <-- 此实体将与该扩展点关联…
  .variable("experience", 0)
  .on("enter")
  .do((c) => {
    // …从而通过 c.getExtensionState() 来获取扩展点中的数据
    const count = c.getExtensionState().disposedSupportCount[c.self.who];
    c.setVariable("experience", Math.min(count, 6));
  })
  // [...]
```

## 具体语法

- `extension(idHint, type)`：开始一个扩展点的定义。`idHint` 为扩展点的 id 提示，通常与使用该扩展点的实体/技能/手牌相关联；全局的所有扩展点的 `idHint` 不能重复。`type` 为该扩展点所扩展的状态变量的结构，以 ArkType 语法的类型说明。与实体不同，此结构可使用任意的对象、数组等可 JSON 序列化的结构。
- `.initialState(state)` （必需）该扩展点的初始状态。
- `.mutateWhen(event, callback)` 设置该扩展点的自动修改行为。与被动技能定义不同，`event` 是核心事件名称而非细分事件名称（因为扩展点是**全局的，不分敌我**，因此也不可设置 `listenTo`）。`callback` 将传入如下三个参数：
  - `extensionState` 一份可修改的扩展点状态的草稿，对其的改动将在回调执行完毕后作为一次对对局状态的 mutation；
  - `eventArg`，和 `event` 对应的事件参数；
  - `currentGameState` 当前的对局状态（只读，不可写）。
- `.done()` 完成扩展点定义，可传入实体/技能/手牌 builder chain 的 `.associateExtension` 方法中。

在关联了扩展点的 `SkillContext` 内，使用 `getExtensionState()` 获取扩展点状态，使用 `setExensionState(setter)` 设置扩展点状态。`setter` 是一个接受 `draft` 的修改描述函数。
