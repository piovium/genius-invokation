# 更新日志

**仅记录破坏性改动。** 自 v0.21.0 起，改动内容将由 AI 生成。

## 0.21.0

### 资源与卡牌展示 API

- `@gi-tcg/assets-manager` 升级至 static-data v5：`AssetsManagerOption.apiEndpoint` 改为 `apiBaseUrl`；传入服务根地址（例如 `https://static-data.piovium.org/`），不再包含 `/api/v4`，管理器会自动追加 `/api/v5`。导出常量和环境变量 `DEFAULT_ASSETS_API_ENDPOINT` 均改名为 `DEFAULT_STATIC_DATA_API_BASE_URL`。
- 行动牌数据合入 `EntityRawData`，`ALL_CATEGORIES` 不再包含 `action_cards`，行动牌的 `category` 变为 `entities`。`ActionCardRawData` 仍保留为 `EntityRawData` 的弃用别名，`getCategory("action_cards")` 仍兼容，但返回新结构；按旧 category 分流的代码需调整。
- 静态数据中的可空字段从可选属性改为必填的 `T | null`，包括 `shareId`、`sinceVersion`、描述、图标等；`CharacterRawData` 和行动牌数据移除 `obtainable`，改用 `shareId !== null` 判断。行动牌的 `cardFace` 也可能为 `null`；手工构造数据或只检查 `undefined` 的代码需更新。
- 移除 `CustomActionCard` 和 `CustomData.actionCards`，自定义行动牌统一放入 `CustomData.entities`；图片字段从 `cardFaceUrl` 改为 `cardFaceOrBuffIconUrl`。`CustomEntity` 新增必填字段 `obtainable`、`tags`、`playCost`；`CustomDataLoader` 输出也采用此结构。
- `@gi-tcg/card-data-viewer` 的 `RegisterResult` 移除 `showSkill(id, opt)`。展示角色技能改用 `showState("character", state, combatStatuses, { ...opt, skillOnly: skillId })`，需要同时提供角色状态和阵营状态。

### Core 查询与数据定义 API

- `$.macros.myEnergyNotFull` 改为 `$.macros.myFirstEnergyNotFull`，并且只返回第一个符合条件的角色；需要全部结果时使用 `$.my.character.var("energy", "<", "maxEnergy")`。
- 查询回调中的未确认存在的变量改为 `number | undefined`，影响 `var(fn)`、`orderByFn(fn)` 等；`var(name, "!=", value)` 和 `var(fn)` 不再保证相关变量存在。需先收窄或提供默认值；`var(name, predicate)` 对缺失变量不再调用 predicate，而是直接排除该实体。
- 定义句柄（`CharacterHandle`、`SummonHandle`、`HandleT` 等）增加 `_meta` 类型信息，`SummonHandle` 的品牌字段从 `sm` 改为 `_summon`；手工声明旧句柄类型的代码需更新，GTS 定义应重新生成类型。查询结果按实体类型和所在区域收窄，只有已确定在角色区的状态、装备才暴露 `.master`；查询时需限定所在区域。
- 移除技能上下文及 reactive state 的 `addVariableWithMax`。固定上限改在 GTS 变量声明中设置 `range` 并使用 `addVariable`；动态上限需自行计算后调用 `setVariable`。`append` 上限仍仅限制重复创建，不替代 `range`。
- 移除 `maxCostHands` 选项中的 `useTieBreak`，同费用时保留手牌顺序；`discardMaxCostHands` 改为逐张从当前最高费用候选中随机舍弃，会推进随机数状态。
- `ModifyReactionEventArg` 移除 `cancelEffects()`、`reApplyTo()`、`increasePiercingOtherDamage()`；`ReactionInfo` 移除 `cancelEffects`、`postApply`、`piercingOtherDamage`。修改反应效果需通过 `cancelCoreEffects()` 取消核心效果，再在技能中显式实现所需附着或伤害。
- GTS 的 `hint swirled;` 改为 `hint DamageType.Anemo { dynamicPreset swirled; };`；原先用 `shield <初值>, Infinity;` 表示无叠加上限的定义改用 `shield <初值>, open;`，其上限为 int32 最大值。
- 自定义底层技能描述返回的 `SkillResult` 新增必填 `error`（成功时为 `null`）；`SkillInfo` 新增必填 `finalizeMode`；行动详情新增必填 `originalCost`、`originalFast`，`PlayCardEventArg` 构造参数改为带完整行动详情的打牌信息。手工构造这些对象的数据提供者需补齐字段。
- `@gi-tcg/core/gts/vm` 导出的模型将 `wrapData` 改为 `contextOptions`，其中 `snippets` 改为 `gtsSnippets`；`EntityVMMeta` 等元信息增加 `id`。自定义 VM 扩展需同步调整。

### IO、Mutation 与服务器协议

- `ModifyEntityVarEM` 新增 `oldValue`（Protobuf 字段 `old_value = 7`），裸 `modifyEntityVar` mutation 也新增必填 `oldValue`。`ExposedMutation` 新增 `resetVariables` 分支（字段号 30），用于通知实体每回合次数重置。Protobuf 编码本身向后兼容，但手工构造 TypeScript 消息及穷尽匹配 mutation 的消费者需更新。
- `PlayerIO.notify` 同步抛错或返回 rejected Promise 不再中断对局；`Game.onPause` 抛错或 reject 会终止对局并使 `Game.start()` reject。依赖回调异常控制流程的调用方需调整。
- 服务器 SSE 的 `notification.data` 和 `rpc.data.request` 从 JSON 对象改为 Protobuf 二进制的 Base64 字符串，分别按 `Notification`、`RpcRequest` 解码；提交行动的 `response` 也改为完整 `RpcResponse` 消息编码后的 Base64 字符串，不能再提交原先的 RPC payload 对象。客户端与服务器需同步升级。

## 0.20.0
- 迁移 Bun 至 Node.js。

## 0.19.0
- 移除了不再使用的 `GITCG_ENTITY_TYPE_EVENT_CARD`。
- `core` 不再 pollute `Array.prototype`。

## 0.18.0
- 支持 Attachments
- 完成手牌的 Entity 化，导致 ExposedMutation 重构：
  - CreateCard 合入 CreateEntity；
  - MoveCard 合入 MoveEntity；
  - RemoveCard 等整合为 MoveEntity（打出支援或装备）/ RemoveEntity（其它）。

## 0.17.0
- 修改了 Protobuf TypeScript 的生成方式，现在使用 Tagged Union ADT。
- 修改了大量 `ExposedMutation` 的结构，主要包括：
  - 部分 mutation 使用详细状态消息来替换原先 `id` `definition_id` 对；
  - 使用 `SkillUsedEM` 提换掉 `TriggerEM`，移除了 `ActionDoneEM`。

## 0.16.0
- 修改了 `RerollResponse` protobuf 的格式。

## 0.15.0
- 修改了 `ActionRequest` protobuf 的格式。

## 0.14.0
- IO 接口完全重写：现使用 Protocol Buffer 兼容的 IO 数据类型。详细变化请参考最新文档。

## 0.13.0
- 重要接口重构：重新设计了构造 `Game` 实例的方式。请参考最新开发文档。
  - 构造 `Game` 时：使用牌组和配置创建 `GameState`，并用 `GameState` 构造 `Game`
  - 使用 `game.onPause` `game.onIoError` `game.players[x].io` 来设置 IO 行为
  - `GiTcgIOError` 重命名为 `GiTcgIoError`
  - `PlayerState` 的 `initialPiles` 和 `piles` 重命名为 `initialPile` 和 `pile`；相关的 mutation 中的 `piles` 也都重命名为 `pile`

## 0.12.0
- 移除了 `PlayerIO.giveUp` 字段。使用 `Game` 的 `giveUp(who)` 方法以更高效地实现弹射。

## 0.11.0
- 接口更新：`RemoveCardEM` 使用了 `reason` 字段替换 `used` 以显示更精确的行动牌移除信息。

## 0.10.0
- 接口更新：`useSkill` 现支持选中对象。核心数据结构为此也进行了相应的调整。

## 0.9.0
- 重要接口更新：`@gi-tcg/data` 现导出函数以传入版本信息。

## 0.8.0
- 重构：`GameState` 中部分全局状态值改为由数据提供的可自定义 `extensions`
- Mutation `replaceCharacterDefinition` 重命名为 `transformDefinition`
- 移除了 `GameLog` 相关接口；在 `pause` 中增加了 `canResume` 第三参数
- 移除了 `PlayCardAction` 的 `hints` 字段

## 0.7.0
- 恢复了 0.4.x 版本的暂停点密度（通知密度无变化）
- `pause` 现在返回自上次 `pause` 起的所有裸 `Mutation`s，不再包含 `ExposedMutation`s，
  - `pause` 自此无法获取伤害、元素反应等上层信息（请使用 `notify` 接口接取）
- 调整了 `Mutation`s 的部分结构

## 0.6.0

- 暂时移除了 `mutationLog` 字段
- 将 `NotificationMessage` 中的 `events` 改名为`mutations`
- 修改了包发布流程，类型信息可能有所变化

## 0.5.0

- 暂时移除了 `pushDamageLog` 类型的 mutation
- 重构了结算流程；在技能结算中可能引发更多的暂停点

## 0.4.0

- 修改了 `IteratorState` 的结构（不再依赖于 `@stdlib/minstd*`）

## 0.3.0

- `DamageType` 增加了 `DamageType.Revive`，复苏时的治疗改用此类型指代
- `CharacterState.damageLog` 的类型修改为 `readonly (DamageInfo | HealInfo)[]`
  - `DamageInfo.type` 现不包含 `DamageType.Heal` 和 `DamageType.Revive`

## 0.2.0

- `GameOption` 增加了更多 `readonly` 修饰。
- `initHands` 阶段在切换手牌前增加了一个暂停点。

## 0.1.?

- `GameOption` 增加了一系列 `readonly` 修饰。
