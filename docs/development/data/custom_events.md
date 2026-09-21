# 用户自定义事件

从 `@gi-tcg/core/data` 导入 `customEvent` 创建一个具名的事件对象。事件对象可以带 TypeScript 参数类型：

```gts
import { customEvent } from "@gi-tcg/core/data";

const marked = customEvent<number>("example/marked");
```

在 GTS 事件块中，有两种方式来发出事件：
1. `:emitCustomEvent(事件[, 参数]);` 按常规流程发出事件；
2. `:handleCustomEventInline(事件[, 参数]);` 按内联方式发出并直接处理事件。

同一实体或其他实体可以使用 `on <事件变量> { ... };` 监听它。监听回调的 `:e.arg` 即发出时传入的参数。

```gts
define status {
  id 100001 as Marker;
  on damaged {
    :emitCustomEvent(marked, 1);
  };
};

define status {
  id 100002 as Receiver;
  on marked {
    when :( :e.arg === 1 );
    :drawCards(1);
  };
};
```

自定义事件沿用实体事件的默认监听范围。需要让响应者接收同阵营或全场实体发出的事件时，分别写 `listenTo samePlayer;` 或 `listenTo all;`。事件对象本身用于区分事件，建议使用稳定且具命名空间的名称。

## 注意事项

不能直接将 reactive state 作为事件参数传入（应使用 `.latest()`）。
