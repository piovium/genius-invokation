# 开发文档

本项目使用 monorepo 管理以下包和配套工程：

- **核心与数据**
  - `@gi-tcg/core` 核心规则、游戏流程与查询系统
  - `@gi-tcg/data` 使用 GTS 编写的官方卡牌数据
  - `@gi-tcg/typings` 基础数据类型、前后端通信格式与 Protocol Buffer 代码
  - `@gi-tcg/utils` 通用工具与类型工具
  - `@gi-tcg/assets-manager` 获取和管理官方静态资源
- **界面与调试工具**
  - `@gi-tcg/web-ui-core` 基于 Solid 的用户界面组件
  - `@gi-tcg/web-ui` 基于 Web Component 的用户界面封装
  - `@gi-tcg/deck-builder` Web 端组牌器组件
  - `@gi-tcg/card-data-viewer` Solid 卡牌信息查看组件
  - `@gi-tcg/detail-log-viewer` 核心结算细节日志查看组件
  - `@gi-tcg/state-editor` 对局状态编辑器
  - `@gi-tcg/standalone` 集成调试 Web 界面
- **对战平台**
  - `@gi-tcg/server` 对战平台服务端
  - `@gi-tcg/web-client` 对战平台 Web 客户端
- **数据与开发工具**
  - `@gi-tcg/custom-data-loader` 自定义 GTS 数据加载器及示例页面
  - `@gi-tcg/data-code-analyzer` 卡牌数据代码分析工具
  - `@gi-tcg/config` 私有构建与开发配置
  - `@gi-tcg/test` 核心和卡牌数据测试框架
- **跨语言绑定**
  - `@gi-tcg/cbinding` 提供核心模拟器和官方卡牌数据的 C 接口
  - `@gi-tcg/pybinding` 基于 C 接口的 Python 包
  - `packages/csbinding` C# 绑定工程
  - `packages/csbinding-gen` 用于生成 C# P/Invoke 声明的 Rust 工具

下一步……
- 如果你需要在你的程序中**使用这些项目组件**，请参阅下方[使用接口](#使用接口)以及对应包的 `README.md`了解使用方式；
- 如果你需要**参与本项目的开发**，请参阅下方[参与开发](#参与开发)，其中的例子可供参考；如有疑问可邮件联系或在 [Discussion](https://github.com/piovium/genius-invokation/discussions) 中发起讨论。

## 使用接口

核心库暴露了 `Game` 类代表对局。其构造参数大致为：

```ts
import getData from "@gi-tcg/data";
import { Game } from "@gi-tcg/core";

// 1. 从双方牌组构建初始状态
// ==========================
// - data() 从 @gi-tcg/data 包获取官方的卡牌代码
// - decks 为双方的初始牌组 id 列表，格式为 { characters: number[], cards: number[] }
//   deck0，即 0 号玩家总是先手
const state = Game.createInitialState({
  data: getData(),
  decks: [deck0, deck1],
});

// 2. 构造 Game 实例，并设置 IO 方式
// =================================
// - 游戏会在部分结算完成节点执行 onPause，设置此钩子函数以进行调试
// - 通过 players[x].io 设置双方玩家如何与核心交互（参见下文）
const game = new Game(state);
game.onPause = async () => { /* ... */ },
game.players[0].io = /* ... */;
game.players[1].io = /* ... */;

// 3. 开始游戏！
// ============
// Promise 返回 0 | 1 | null 表明本场游戏的胜利方。
const winner = await game.start();
```

### 玩家 IO

```ts
interface PlayerIO {
  notify: (notification: NotificationMessage) => void;
  rpc: (request: RpcRequest) => Promise<RpcResponse>;
}
```

玩家的交互行为在 `io.players` 中定义。其中：
- 在合理的时机游戏会调用玩家的 `notify` 函数以通知玩家有某些牌局的变化；
- 在需要玩家操作（指重投骰子、切换手牌、选择出战角色、选择行动）的时刻，会调用 `rpc` 获取玩家的选择。也可通过实现此接口接入 AI 智能体。

详细说明请参见 [io](./io.md)。

### 示例程序

[Stackblitz](https://stackblitz.com/edit/gi-tcg-example?file=src%2Fmain.js)

## 参与开发

配置开发环境。安装 Node.js v26+，随后在仓库根目录下执行下述命令既可：

```sh
corepack enable
pnpm build
```

随后即可调试修改数据定义包、核心包或者其它代码。

### 关于运行时

由于项目使用 TypeScript 和 GTS 编写，且包含历史代码、生成代码等，许多源码不能直接作为普通 JavaScript 执行（如 `enum`、构造函数自动参数、不带扩展名的 `import`、legacy 装饰器与 `.gts` 文件）。`@gi-tcg/config` 的 `gnx`（auGmented Node eXecution）包装 `node`，提供 TypeScript 模块解析和转译；GTS 文件则由对应的构建与类型检查工具处理。

- 在 `scripts` 中，使用 `gnx` 来替代 `node`，如: `gnx scripts/foo.ts`；
- 在命令行中，使用 `pnpm gnx`。

### 例：启动 `@gi-tcg/standalone` 项目的开发服务器

```
cd packages/standalone
pnpm dev
```

### 例：修改卡牌定义

定义卡牌数据被设计为“应当”非常简单的操作。请查阅 `@gi-tcg/data` 包的代码。参考文档位于 [data](./data/README.md)。

编辑完成后，可使用 `@gi-tcg/web-ui-core` 库测试修改。具体来说，可以修改 `web-ui-core` 库的 `src/dev.tsx` 的 `PlayerConfig` 以包含需要测试的卡牌，并使用 Vite 预览对局。

```sh
cd packages/web-ui-core
# 编辑 src/dev.tsx
pnpm dev # 查看效果
```

### 例：参与游戏核心设计细节

在阅读 `@gi-tcg/core` 的源码之前，可以先参阅下述文档：
- **[一份全面但过时的 slides](https://kdocs.cn/l/chWGWwQNLHGo)**
- [核心数据结构](./state.md)
- [结算流程设计](./process.md)

同样地，可以使用 `@gi-tcg/web-ui-core` 来测试核心的修改情况，流程与上节相同。

### 例：修改前后端通信数据格式

修改 `@gi-tcg/typings` 中定义的数据结构后，请使用 `pnpm build` 生成对应的 JSON Schema 文件。（否则核心可能会校验失败，切记！）

核心库中的 `src/io.ts` 中存在翻译 `GameState` 到对应数据格式的代码，你可能也要一并修改。
