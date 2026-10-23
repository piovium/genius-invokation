# Server Room Profile RFC 草草稿

## Profile

Server 的房间配置，由选择版本改为以 Profile 为单位的配置。一个 Profile 是指一套固定的房间配置，目前包括如下内容：

- Game Config
- 对局基础版本
- Version Behavior
- 精细卡牌版本控制
- Custom Mods
- Static Data Overrides

Profile 可以导出 CreateInitialStateConfig 和 AssetsManagerOptions。

创建房间时，需要使用导出的 CreateInitialStateConfig 创建对局，然后向客户端派发 AssetsManagerOptions。

若 Custom Mods 不引入新卡，则 defaultDeckCompatible；否则反之。对于 defaultDeckCompatible 的 AssetsManager，用户可以直接使用标准 Deck ID/数据接入。

首期禁止 defaultDeckCompatible=false。

Profile 是 Self-Contained 的，为了简化 Profile 的编写方式，引入 Preset 概念：

## Preset

Preset 是存在于文件系统中的一种组织结构，期望格式如下：

```
- foo.preset.ts / foo.preset.yaml
- configs
  - mod.gts
  - versions.jsonc
  - overrides.yaml
  - ...
```

其中 `foo.preset.yaml` 的格式大概是：

```yaml
$schema_version: 1
name: foo
version: latest
version_behavior:
  base: latest
  discardMaxCostHandsAbortPreview: false
config:
  maxPileCount: 256
plugins:
  - name: default
    mods:
      - ./configs/mod.gts
    static_data_overrides:
      - ./configs/overrides.yaml
    version_maps:
      - ./versions.jsonc
  - '@other-orgs/other-plugin'
  - file:///path/to/local-plugin.yaml
```

每个 Preset 可以动态或静态地指定：
- Game Config
- 对局基础版本
- Version Behavior

并通过 Plugins 的方式指定如下内容：
- 精细卡牌版本控制
- Custom Mods
- Static Data Overrides

Plugins 可以用 URL / Node.js Resolution 的方式引用，也可以内联写出

## Plugin

Plugin 提供一组 精细卡牌版本控制、Custom Mods 和/或 Static Data Overrides。三者都可以直接写 URL / Node.js Resolution。

对于 Custom Mods，可以用 `{ fileUri?: string, content: string }` 的方式内联给出；对于其他两者，可以直接内联给出。

## 基于 URL / Node.js Resolution 的引用解析

Preset loader、Plugin loader 和最底层的三个配置 loader 都使用一套类似 c12 的方式加载，支持：
- TOML
- YAML
- JSON(C/5)
- JS/TS 动态生成
- 对于 GamingTS，可以解析成刚刚说的 `{ fileUri, content }` 结构

