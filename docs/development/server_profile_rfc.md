# RFC：Server Room Profile

## 背景与目标

目前，对战平台以 `gameVersion` 选择一套官方卡牌数据，并使用同一版本的核心结算行为。希望进一步支持混合卡牌版本、规则调整和自定义 Mod，同时保证服务端结算与客户端展示使用同一套配置。

本 RFC 提议将房间的规则选择单位从“版本”改为 **Profile**：

- Profile 是解析、校验完成后的一套固定配置，供房间直接使用。
- Preset 是 Profile 的编写入口，可以引用外部文件和动态生成配置。
- Plugin 将卡牌版本映射、Mod 和静态数据覆盖组织为可复用的配置片段。

首期目标是由服务器维护者发布 Profile，玩家选择 Profile 后继续使用已有牌组记录、官方分享码或标准牌组 ID 数据创建和加入房间。

## Profile 的边界与产物

### 固定的规则配置

一个 Profile 包括：

| 内容                  | 含义                                 |
| --------------------- | ------------------------------------ |
| Game Config           | 手牌上限、骰子数量等核心规则参数     |
| 基础版本              | 未被单独指定的官方定义采用的版本     |
| Version Behavior      | 核心结算行为的基础版本及逐字段覆盖   |
| 精细卡牌版本控制      | 按定义 ID 指定官方版本，并展开其依赖 |
| Custom Mods           | 按确定顺序加载的 GTS 源码            |
| Static Data Overrides | 名称、描述等客户端静态数据的覆盖     |

“卡牌版本映射”的 ID 可以指向角色、技能、实体等官方定义。

### 编译与运行时表示

Profile 必须是自包含且可序列化的；拟定类型如下：

```ts
type RoomOwnedConfig = "randomSeed" | "hostWho" | "hostRelatedExecution";
type ProfileGameConfig = Omit<GameConfig, RoomOwnedConfig>;

interface Profile {
  id: string;
  name: string;
  baseVersion: Version;
  officialDeckCompatible: boolean;
  gameConfig: ProfileGameConfig;
  versionBehavior: VersionBehavior;
  versionMap: Record<number, Version>;
  mods: ModSource[];
  assets: Pick<
    AssetsManagerOption,
    "version" | "customData" | "overrideData" | "officialDeckCompatible" // renamed, see below
  >;
}
```

## Preset 格式

Preset 是文件系统中的编写入口。具体文件结构没有规定；入口点规定为 `preset.ext`。

```text
preset.yaml
configs/
  mod.gts
  versions.jsonc
  overrides.yaml
plugins/
  local-plugin.yaml
```

静态 Preset 示例：

```yaml
$schema_version: 1
id: piovium/foo
name: Foo 规则
version: latest
version_behavior:
  base: latest
  discardMaxCostHandsAbortPreview: false
config:
  maxPileCount: 256
plugins:
  - name: local-rules
    mods:
      - ./configs/mod.gts
    static_data_overrides:
      - ./configs/overrides.yaml
    version_maps:
      - ./configs/versions.jsonc
  - "@other-orgs/other-plugin"
  - ./plugins/local-plugin.yaml
```

`@other-orgs/other-plugin` 代表部署时已安装、默认导出 Plugin 配置的包；也可以使用 `file:///path/to/local-plugin.yaml` 引用绝对文件 URL。

| 字段               | 类型与默认值                      | 语义                                                 |
| ------------------ | --------------------------------- | ---------------------------------------------------- |
| `$schema_version`  | 必填，首期为 `1`                  |                                                      |
| `id`               | 必填，格式要求为 `namespace/name` |                                                      |
| `name`             | 可选，默认同 `id`                 | 展示名称                                             |
| `version`          | 可选，默认 `latest`               | 官方定义的基础版本                                   |
| `version_behavior` | 可选，默认 `{ base: version }`    | 基础结算行为及字段覆盖                               |
| `config`           | 可选，默认 `{}`                   | `Partial<ProfileGameConfig>`；缺省值取当前核心默认值 |
| `plugins`          | 可选，默认 `[]`                   | 有序的 Plugin 引用或内联 Plugin                      |

`version_behavior.base` 缺省时沿用 Preset 的 `version` ，计算 `getVersionBehavior(resolvedBase)` 后与显式字段覆盖的浅合并。所有 `latest` 在本次编译开始时统一解析为该构建的 `CURRENT_VERSION`。

动态 Preset 的 `.js` / `.ts` 默认导出同一结构的对象，或返回该对象的同步 / 异步函数（后期拓展参数）。

## Plugin 格式

Plugin 仅组合以下三类输入：

```ts
type Reference = string;

interface ModSource {
  fileUri?: string;
  content: string;
}

interface PluginConfig {
  $schema_version?: 1;
  name?: string;
  version_maps?: Array<Reference | Record<number, Version | "latest">>;
  mods?: Array<Reference | ModSource>;
  static_data_overrides?: Array<Reference | OverrideData | OverrideData[]>;
}
```

独立 Plugin 文件必须声明 `$schema_version: 1`；内联 Plugin 可省略并继承所在 Preset 的 schema 版本。

### 精细卡牌版本控制

`versions.jsonc` 示例：

```jsonc
{
  "1707": "v4.5.0",
  "330005": "v4.6.1",
}
```

每个文件是“定义 ID → 官方版本”的映射，不含 `$base`（应取 `baseVersion`） 或 `$category`（应始终置空）。

生成 Game Data 时调用 `createOfficialVersionResolver(baseVersion, versions, dependencies)` 展开依赖。`dependencies` 使用与官方数据同一构建的 `@gi-tcg/data-code-analyzer` 产物。

### Custom Mods

`mods` 中的字符串引用必须最终得到 GTS 源码，或由结构化配置导出 `ModSource`。也可以直接内联：

```yaml
mods:
  - fileUri: file:///presets/foo/patch.gts
    content: |
      // 在这里编写完整的 GTS 定义。
```

`fileUri` 仅供诊断输出使用；缺省时分配稳定的虚拟 URI。直接引用 `.gts` 文件时，loader 将其读取为 `{ fileUri, content }`。

### Static Data Overrides

每项引用或内联值得到单项 `OverrideData` 或其数组，例如：

```yaml
static_data_overrides:
  - id: 330005
    name: 自定义显示名称
    rawDescription: 自定义显示描述
```

## 引用解析与加载

Preset loader、Plugin loader 和三类底层 loader 共用引用解析机制；它们共用路径和格式处理，但分别验证各自的输出结构。

| 输入                 | 依赖本地FS | 解析方式                                                      |
| -------------------- | ---------- | ------------------------------------------------------------- |
| `./x`、`../x`        | Y          | 相对于声明该引用的文件所在目录解析                            |
| `file:` URL          | Y          | 转换为规范化文件 URL，支持各类 Windows 路径                   |
| 包名、包子路径       | Y          | 相对于声明文件按 Node.js 模块解析规则解析，遵守包的 `exports` |
| 内联对象             |            | 继承声明它的文件来源，作为其相对引用的解析基准                |
| `http:` `https:` URL |            | 获取静态配置或 GTS 文本；其中的相对引用按 URL 规则解析        |

入口 Preset 的相对路径以服务器配置目录为基准；嵌套引用不得回退到进程工作目录。Remote 配置中不支持二次引入依赖本地 FS 的解析

支持的文件格式借鉴 c12 的多格式加载体验，可支持 TOML、YAML、JSON(C/5)、(C/M)JS、(C/M)TS；`.gts` 仅用于 Mod 源码。

## Profile 生成

### 合并规则

遍历顺序为 `plugins` 数组顺序，再按每个 Plugin 内对应数组的顺序处理。

| 输入                    | 合并规则                                          |
| ----------------------- | ------------------------------------------------- |
| `config`                | 核心规则默认值 → Preset 显式字段                  |
| `version_behavior`      | `getVersionBehavior(base)` → 显式字段             |
| `version_maps`          | 同 ID、不同版本报错                               |
| `mods`                  | 按顺序加载；同 ID 多个自定义定义报错              |
| `static_data_overrides` | 按 ID、再按字段浅合并，后项优先；数组字段整体替换 |

版本选择冲突直接导致 Profile 生成失败

### 生成流程

1. 获取 `latest` 的含义；加载并验证 Preset、Plugin 和底层配置。
2. 补齐规则默认值，汇总显式版本映射，检查冲突。
3. 设置版本解析器，依次加载 Mod，取得 `GameData` 与 Mod 资源元数据。
4. 应用 `static_data` 覆盖，生成 `AssetsManagerOption`。
5. 计算 `officialDeckCompatible`（见下文）， `false` 时生成失败。

生成失败会阻塞服务启动。

## `officialDeckCompatible` 的设置

重命名自原 `defaultDeckCompatible`。

### 含义

该标志表示 Profile 的可组牌角色和行动牌仍使用官方 ID 及标准分享码映射，可以继续读取已有牌组记录和标准牌组数据。

目前实现为：当且仅当 Custom Mod 加载了未指定 id 的牌（即自定义新卡）时才 toggle 为 false。

### 牌组校验与 requiredVersion

由于本期 officialDeckCompatible 期望 true，预期校验方式和 requiredVersion 计算方式与现状相同。

> versionMap 不会影响 requiredVersion 逻辑：官方牌组下 versionMap 不可能取到高于牌本身 requiredVersion 的版本。

## 通信协议

| 操作               | 行为                                                                                       |
| ------------------ | ------------------------------------------------------------------------------------------ |
| `GET /profiles`    | 返回可用于新房间的 `id`、`name`、`profileHash`、`baseVersion`、兼容性标志和默认 Profile ID |
| `GET /profiles/:id` | 返回对应 Profile 具体信息，至少应包括 `profileHash` `assets`                               |
| `POST /rooms`      | 增加 `profileId` ；省略 ID 时使用默认 Profile                                              |
| 房间信息           | 增加 `{ id, name, baseVersion, profileHash }` 的 Profile 摘要                              |
| SSE `initialized`  | 为玩家及观战者提供固定的 Profile 摘要                                                      |

开局代码类似：

```ts
const loader = new CustomDataLoader().setVersion(
  createOfficialVersionResolver(profile.baseVersion, profile.versionMap),
);
for (const { content } of profile.mods) {
  await loader.loadMod(content);
}
const [data, assets] = loader.done();

const initialState = Game.createInitialState({
  ...profile.gameConfig,
  data,
  versionBehavior: profile.versionBehavior,
  decks: [deck0, deck1],
  randomSeed: room.randomSeed,
  hostWho: room.hostWho,
  hostRelatedExecution: true,
});
```

`profileHash` 直接从序列化 Profile 结构后计算 SHA-256 得出，无业务层语义，仅用于客户端缓存：客户端获取 `assets` 作为创建参数并以 `(profileHash, language)` 缓存 `AssetsManager`。

客户端只受 `assets` 影响，不考虑 `baseVersion` / `versionMap` 字段。

## 杂项

### 本期提供的 Profiles

- `VERSIONS` 各项直接转换为对应 Profile（不通过 Preset 生成，后期再做），ID 值 `official/vX.Y.Z`。
- 新增 `official/latest` 作为最新版本 Profile 的别名，并作为默认值。
- `piovium/moyu-s7` 摸鱼杯 S7 配置。
- `piovium/lianyu-s1` 恋雨杯 S1 配置。

实体版本下期再做。

### 无需保证兼容性

项目整体未声明 API 未公开或版本化，只需保证 `web-client` 的同步更新即可。

### 归档入库 & 复盘支持

新增设 profile 字段/列，存储序列化结构。

原日志 `gv` 和数据库 `gameVersion` 列改存 Profile ID。

`standalone` 回放增加对 `official/vX.Y.Z` ID 的支持。
