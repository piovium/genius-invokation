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


