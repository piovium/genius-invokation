# 卡牌数据定义

官方卡牌数据均定义于 `@gi-tcg/data` 包；定义方法使用 **GTS**（GamingTS）DSL——一种 TypeScript 的领域特定语言扩展。

GTS 定义文件后缀为 `.gts`，使用 `define` 关键字声明卡牌数据。一个典型的 GTS 文件结构如下：

```gts
import { status, combatStatus, summon, DamageType, attachment, DiceType, $ } from "@gi-tcg/core/builder";

define status {
  id 100 as ResistantForm;
  tags immuneControl;
}

define combatStatus {
  id 111 as Crystallize;
  shield 1, 2;
}

define summon {
  id 115 as BurningFlame;
  hint DamageType.Pyro, 1;
  on endPhase {
    usage 1 {
      append 2;
    };
    :damage(DamageType.Pyro, 1);
  }
}
```

`@gi-tcg/data` 在全局作用域中给出官方卡牌的数据定义，通过有序的 `import` 将 `.gts` 文件插入到注册范围内。所有注册入口在 `@gi-tcg/data` 包的 `begin.ts` 和 `end.ts` 中管理。

## 定义方法

GTS 支持以下定义类型：
- `define character` 定义角色牌
- `define card` 定义行动牌
- `define skill` 定义角色技能
- `define status` 定义角色状态
- `define combatStatus` 定义出战状态
- `define summon` 定义召唤物
- `define attachment` 定义卡牌附着状态（手牌上的状态）

每个定义使用 `define <type> { ... }` 块语法，在块内使用声明式语句描述卡牌属性。

## 句柄（Handle）

每个定义块中的 `id` 配合 `as` 关键字可以创建一个具名类型句柄（如 `define status { id 100 as ResistantForm; }`），该句柄可在后续定义中引用，实现类型安全的交叉引用。句柄在 TypeScript 中约束为特别的具名类型（如 `character` 的句柄为 `CharacterHandle`，而 `.talent` 等方法只接受 `CharacterHandle` 而非 `number`）。如果一个方法期望句柄，但是你只持有 `number` 类型的 `id`（比如是来自[对局状态结构](../state.md)的数据），那么你需要一个 `as` 显式转换，即你自己保证这个 `id` 存在一个合法的定义。

具体每种数据的定义方式参考一下条目：
- [角色牌与角色技能](./character.md)
- [行动牌](./card.md)
- [状态、出战状态和召唤物](./entity.md)

## 官方卡牌数据自动化维护

`@gi-tcg/data` 的数据维护工作基于自动化工作流，参考 [generator](./generator.md)。

## 版本解析

允许注册范围内存在相同 id 的定义，以表示该 id 的不同版本。版本信息是指一个命名空间外加该命名空间下的版本类型，对于官方版本命名空间 `official` 而言是

```ts
interface OfficialVersionInfo {
  predicate: "since" | "until";
  version: Version;
}
```

未来将支持自定义卡、实体牌等不同命名空间。所有命名空间的版本类型通过 `@gi-tcg/core` 的 `GiTcg.VersionMetadata` 接口给出，如支持自定义卡版本信息：

```ts
declare module "@gi-tcg/core" {
  namespace GiTcg {
    interface VersionMetadata {
      official: OfficialVersionInfo;
      customData: { /* 自定义卡的版本信息类型结构 */ }
    }
  }
}
```

在 GTS 定义块中使用 `since` 或 `until` 语句设置版本信息：

```gts
define card {
  id 332004 as Strategize;
  costSame 1;
  drawCards 2;
  since "v3.3.0";
}
```

`since` 和 `until` 是官方版本的快捷方式，具体用法可参考 [游戏版本](./version.md)。

为了选中某个 id 的确切版本，`@gi-tcg/data` 的 `end.ts` 中调用 `registry.resolve` 并传入版本解析函数，它直接传入了 `@gi-tcg/core` 定义的 `resolveOfficialVersion`，其解析流程在 [游戏版本](./version.md) 中描述。
