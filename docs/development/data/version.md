# 游戏版本管理

卡牌、角色、技能和实体在 GTS 块内使用 `since` 或 `until` 标注其官方版本范围：

```gts
define character {
  id 1707 as Kirara;
  since "v4.5.0";
  // ...
};

define card {
  id 330005 as private InEveryHouseAStove;
  until "v4.6.1";
  legend;
};
```

当前定义通常位于 `src/characters`、`src/cards` 等目录；平衡调整前的定义位于 `src/old_versions/<版本>.gts`，并以 `until` 标记其最后有效版本。相同 id 的多个定义会由数据注册表按版本解析，使用早期版本开局时会选中对应的旧定义。

`@gi-tcg/data` 的默认导出为 `(version?) => GameData`。不传版本号时取得最新数据：

```ts
import getData from "@gi-tcg/data";

const state = Game.createInitialState({
  data: getData(),
  // ...
});
```

显式传入版本可创建历史版本对局：

```ts
const state = Game.createInitialState({
  data: getData("v3.3.0"),
  // ...
});
```
