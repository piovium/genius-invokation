# 对局状态、实体、技能

本项目很重要的一点设计是——对局状态是**不可变数据结构**。任何对对局状态的修改，都会产生一个新的不可变数据结构，而非在原有数据结构上做修改。这对事件引发的技能使用提供了很大便利。`@gi-tcg/core` 的 [`src/base/state.ts`](/packages/core/src/base/state.ts) 给出了这些数据结构定义，你可以看到大量的 `readonly`。

对局状态需要通过一些事先规定好的 mutations 修改。`applyMutation(oldState, mutation)` 会返回新的对局状态。Mutations 有很多种，囊括了所有可能的修改对局状态的方法；比如 `modifyEntityVar` 类型的 mutation 可以修改一个给定的实体的变量。

对局状态是 `GameState` 类型，包含一些通用状态如当前游戏阶段和回合数，主要的 `players` 属性有两个 `PlayerState` 对象，分别指代 0 号玩家和 1 号玩家阵营的状态。每个 `PlayerState` 包含如下属性：
- `characters` 角色及角色附属的实体；
- `combatStatuses` 出战状态区实体；
- `summons` 召唤物区实体；
- `supports` 支援区实体。

这里提到的每个“实体”都是 `EntityState` 类型的对象；我来解释一下这里提到的“实体”的含义。

## 实体

所谓的实体，在本项目的实现中，特指能对某些**事件**进行**响应**的个体。比如召唤物“奥兹”对“结束阶段”事件进行“造成伤害”响应，奥兹就是一个召唤物类型的实体。本项目的实体分为如下几类：角色、装备、角色状态、出战状态、召唤物、支援区实体（官方称“支援牌”）。

每个实体都有唯一的 `id`。这与实体的定义 `id` 是两回事；通常实体的 `id` 就是 `EntityState` 的 `id` 属性，而定义 `id` 则是 `EntityState` 的 `.definition.id` 属性。此项目为示区别，所有的实体 `id` 都是负数，而官方给出的定义 `id` 都是正数。

通常用 `id` 来指代某一实体。由于对局状态是不可变的，我们不可能持有一个对象，它能“响应式”地跟踪到最新的对局状态变化。我们需要通过查找最新的 `GameState` 对象中对应 `id` 的 `EntityState`。工具函数 `getEntityById` 函数会实现这一操作（它的使用很频繁！）。

实体有它所在的**区域**。区域是指实体所在的阵营（也就是位域哪方玩家一侧），以及它在棋盘上出现的“位置”。有如下实体区域：
- 场上区域（双方各有）：
  - 角色区：每个角色都是一个实体区域；角色本身位于这一实体区域，角色的装备和角色状态也位于这一实体区域；
  - 出战状态区：存放此阵营的出战状态；
  - 召唤物区：存放此阵营的召唤物；
  - 支援区：存放“支援牌”。
- 场下区域（双方各有）：
  - 手牌区：每张牌都是一个实体区域，包含卡牌本身和牌上附着的卡牌附着状态；
  - 牌堆区：同上。
- 墓碑区：被弃置但仍然可以响应部分事件的临时区域。

在代码中，使用 `EntityArea` 类型表示实体区域。工具函数 `getEntityArea` 函数会实现这一操作。实体区域的作用最常见的作用在于实现卡牌描述中“所附着的角色、所装备的角色”的查找。

所有实体（`EntityState` 以及表示角色的 `CharacterState` 、表示卡牌附着状态的 `AttachmentState`）包含如下属性：

- `id`；
- `definition` 实体定义或角色定义，它通常不会改变。稍后展开。
- `variables` 实体的变量。这些变量只能是 `number` 类型，可以通过 `modifyEntityVar` mutation 修改。变量的初始值来自于 `definition`。

角色既是实体又是实体区域。角色作为实体区域时，其 `entities` 属性存放了属于该角色实体区域的实体。所有的装备和角色状态都位于这一区域，装备和角色状态按照入场顺序先后排列，这是符合官方规则的顺序。

## 实体定义

`CharacterState` 、`EntityState` 、`AttachmentState` 分别具有对应的 `definition` 属性： `CharacterDefinition` 、`EntityDefinition` 和 `AttachmentDefinition` 类型。这些类型给出了角色/实体/卡牌附着状态的静态属性和行为。官方定义的具体值由 `@gi-tcg/data` 导出，并由其中的 GTS 数据定义编译、注册，参阅 [data](./data/README.md)。

所有的实体定义类型包括如下属性：
- `id` 定义 id，和官方基本保持一致；
- `type` 实体类型，可为 `character` `status` `equipment` `combatStatus` `support` `summon`；
- `tags` 实体标签（部分有特殊含义，详情参阅源码）；
- `varConfigs` 指定实体状态对象的 `variables` 如何初始化和更新；
- `skills` 实体的技能列表。

关于 `varConfigs` 的进一步解释：其具有 `Record<string, VariableConfig>` 类型，其中 `VariableConfig` 包含：
- `initialValue` 创建实体时该变量的初始值；
- `recreateBehavior` 重复创建实体时该变量的行为。

`recreateBehavior` 可为：
- `overwrite` 直接写入初始值，不管已存在实体的变量值为何；
- `takeMax` 取初始值和已存在实体的变量值的最大值；
- `append` 将当前已存在实体的变量值和一个指定的数值 `appendValue` 相加作为新的值，还可指定该加和的上限。

关于 `skills` 中的技能：技能是指：
- 主动触发，或者通过某一事件触发的……
- ……一系列对游戏对局状态的 mutation。
- 这组 mutation 是具有原子性的（除了引发[内联技能](./data/events.md#内联技能)外，不能被“插入结算”）。

`initialValues` 可在创建实体时通过 `overrideVariables` 选项重新指定。

除非特别说明，在文档或源码注释中提到的“实体”的“技能”，都是指因为事件引发的“被动”技能。通常游戏说明中的角色技能，这里会显式称为**主动技能**。主动技能除了角色的主动技能还包括卡牌描述。技能，也就是被动技能包括角色的被动技能（即“角色”类型实体的事件响应）和各种类型的实体的事件响应。

## 技能定义

技能由 `SkillDefinition` 类型给出，包括如下属性：
- `type` 固定为 `"skill"`；
- `initiativeSkillConfig`：
  - 对于角色主动技能、卡牌描述等，将其 `type` 指定为 `"normal"` `"elemental"` `"burst"` `"card"`，并指定默认的骰子需求、是否获得充能、是否默认快速、视为下落攻击等。
  - 否则（全部被动技能），为 `null`。
- `triggerOn`：该技能要响应的事件名，主动技能为 `null`；
- `filter`：函数，检查该技能是否可以执行，由卡牌描述给出；
- `action`：技能描述。格式见下。

技能描述 `SkillDescription` 具有如下调用签名：

```ts
type SkillDescription<Arg> = (
  state: GameState,         // 使用技能前的对局状态
  skillInfo: SkillInfo,     // 本次技能调用的相关信息
  arg: Arg,                 // 传递给本次技能调用的额外信息
) => readonly [
  GameState,                // 使用技能后的对局状态
  EventAndRequest[]         // 本次技能引发的额外信息
];
```

总体来说是接受旧 `GameState` 返回新 `GameState` 的流程。额外地，`SkillInfo` 提供了如下内容：

```ts
interface SkillInfo {
  // 此技能的“发起者”实体。
  // 对于实体的技能，就是实体本身；
  // 角色技能，就是角色；
  // 卡牌描述，则是该阵营的出战角色。
  readonly caller: CharacterState | EntityState;

  // 若此技能是卡牌描述，则指向卡牌状态
  readonly fromCard: EntityState | null;

  // 此技能的定义
  readonly definition: SkillDefinition;
 
  // 此技能如果是被另一个技能描述请求而发起的，则给出“原始”的 SkillInfo
  readonly requestBy: SkillInfo | null;
}
```

而技能额外返回的 `DeferrredAction[]`，则包括两类信息：
- `reroll` 等需要玩家异步操作的请求。由于技能描述是同步的，异步操作必须在技能结束后通过 `Game` 来发起。
  - 这也包括了 `useSkill`，请求另一个技能使用。此时后者的 `SkillInfo` 就会带有 `requestBy` 属性。这通常用于天赋牌、“下落斩”等事件牌以及准备技能。
- `onSwitchActive` 等，引发了新一步的事件。`Game` 需要将技能中引发的事件广播给所有实体，然后继续调用它们的技能响应。

至于 `Arg`，通常包含了事件的具体信息，比如 `onSwitchActive` 中是从哪个角色切换到了哪个角色。对于卡牌描述，`Arg` 包含了卡牌的使用目标（也包括支援牌在支援区已满时“踢出”的实体）。
