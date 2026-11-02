---
name: update-official-data
description: 更新正式服 data：刷新 assets-manager、推进正式版本、生成卡牌骨架，参考测试服实现补全新卡，并按人工确认的平衡调整保留 old_versions。用户要求更新正式服数据、迁移 beta 新卡或落实版本平衡改动时使用。
---

# 更新正式服数据

在正式服仓库执行更新。遵守仓库的 `AGENTS.md`，保留用户已有的工作区及暂存区修改。完成数据实现、历史版本归档与验证；提交、推送、发布按当前用户的授权范围处理。

## 必需输入与来源约束

用户必须提供：

- 测试服仓库路径。
- 经人工确认的本次平衡性调整文案或图片；无平衡调整时，也需用户明确说明。

缺少输入时先询问，可同时进行不依赖缺失信息的只读核对。不要从相邻仓库名推断用户授权的 beta 路径，也不要用 beta diff、搜索结果或推测替代人工确认的调整说明。图片需实际查看。

不同来源分别负责：

| 内容 | 来源 |
| --- | --- |
| 新卡实现、关联衍生状态及通用能力 | 同步并校验版本后的用户指定 beta 仓库实现代码 |
| 平衡调整范围、行为及归档顺序 | 用户提供的人工确认文案或图片；遇到行为冲突询问用户 |
| 新卡及平衡调整后的名称、描述和卡面元数据 | 本次正式服 `assets-manager` 构建取得的 data JSON |
| 历史版本实现及旧描述 | 更新前的正式服实现与注释，或已由生成器归档的对应内容 |

**未由 `regenerate_data` 自动生成的新卡描述、平衡调整描述，只能取自正式服 assets-manager 的 data JSON。不得复制 beta 仓库 JSDoc，也不得把人工确认的调整文案自行改写为卡面描述。** beta 的实现解释可作为行为核对证据；它不是卡面描述来源。JSON 缺少对应 ID、描述不明或与人工确认说明冲突时，询问用户，不编造或静默回退。

任何不确定的修改事项都要询问用户。问题应指出具体 ID/卡牌、冲突来源和行为差异；等待时继续确定项。用户确认的实际行为与卡面字面不同，可保留 JSON 描述，并在实现旁添加简短注释说明实际行为。

## 1. 确定更新前版本并刷新正式服数据

1. 读取正式服 `packages/core/src/base/version.ts`、`packages/data/package.json`、`packages/config/src/index.ts` 及当前 diff，记录更新前正式版本“ `CURRENT_VERSION` ”为 `OLD`。正式服配置应为 `IS_BETA = false`。
2. 若用户已经推进版本或运行过生成器（通常表现为存在大量 `@outdated`、标记为`since CURRENT_VERSION` 的 `// TODO` 以及存在错误的 `old_versions/OLD_VERSION.ts`），则取最新版本的上一版本为 `OLD`；不能确定时询问。
3. 在 `packages/assets-manager` 执行：

   ```sh
   pnpm build
   ```

   此脚本包含 `build:data` 和 `build:ts`，刷新 `src/data` 并将 JSON 复制到 `dist/data`；只运行 TypeScript 构建不能刷新数据。
4. 从同一静态数据服务取得最新正式版本 `NEW`：读取 `src/constants.ts` 中实际生效的 API 基址和 `src/manager.ts` 中的 API 前缀，查询该前缀下 `/metadata` 的 `latestVersion`，并核对生成 JSON 中的 `sinceVersion`。
5. 若 `NEW` 尚不在正式服 `VERSIONS` 数组，严格按此顺序执行：

   - 将 `NEW` 加入 `packages/core/src/base/version.ts` 的正式版本列表，位于 `...BETA_VERSIONS` 之前；在 `packages/core` 执行 `pnpm build`，使生成器引用的 core 构建包含新版本。
   - 更新 `packages/data/package.json` 的游戏版本 build 标记，保留原库版本及其余格式。例如 `0.21.0+gi-7-1-0` 更新到 `0.21.0+gi-7-2-0`。
   - 在 `packages/data` 执行 `pnpm regenerate_data`。
6. 若 `NEW` 已存在，检查 core 构建、data 版本后缀和生成结果是否一致，续做尚未完成的阶段。若只加了版本但未生成，先补齐构建与后缀再生成；不要重复追加版本或重复生成历史代码。

生成器注意事项：`scripts/generators/config.ts` 通过构建后的 core 得到 `NEW_VERSION` 和前一个版本 `OLD_VERSION`，并校验 data 后缀。默认旧版归档已存在时会报 `Old version already exists!`。不要删除该文件或盲目设置 `SAVE_OLD_CODES=0` 来重跑；先判断是否是已执行过生成步骤的任务。生成器只在描述变化时自动归档旧实现，生命值、费用等元数据变化可能不会自动归档。

## 2. 同步并校验 beta 实现来源

确认用户指定路径是独立的测试服仓库，不是正式服仓库或其同一工作目录。查看其 `git status`、当前分支、`origin` 和本地独有提交。

本流程包含将该测试服工作副本重置到远端 beta。若重置会丢弃用户修改或本地独有提交，且当前会话未明确授权丢弃，先说明具体影响并询问；已有明确授权则不重复确认。同步只作用于指定 beta 仓库，不对正式服仓库执行 reset，也不额外执行 `git clean`。

在测试服仓库执行，fetch 成功后才允许 reset：

```sh
git fetch origin && git reset --hard origin/beta
```

执行后核对 `HEAD` 与 `origin/beta` 一致，并读取该仓库 `packages/config/src/index.ts` 的 `IS_BETA`、`BETA_VERSION`；不要以 data 的正式服 package 版本后缀代替 beta 版本。

beta 最新版本必须符合 `vX.Y.Z-beta`，且：

- `Z >= 50`。
- `X.Y` 等于 **更新前 `OLD` 的 major.minor**，不是目标 `NEW` 的 major.minor。
- 测试服配置启用 beta。

例如正式服从 `v7.1.0` 更新到 `v7.2.0`，匹配的是 `v7.1.52-beta` 一类版本，而不是 `v7.2.52-beta`。不匹配时暂停依赖 beta 的迁移并询问用户；不要改写 beta 配置来使校验通过，也不要自行选取旧提交继续。

## 3. 完成生成结果和关联定义

检查生成前后 diff、`packages/data/src` 下的 `// TODO`、`@outdated`、JSDoc 元数据变化及 `old_versions`；同时按人工确认说明逐项列出平衡调整，不以搜索标记代替完整核对。

### 新卡

- 每个生成的 `// TODO` 必须按 ID 查阅 beta 实现。迁移实现时使用正式版 `NEW`，不使用 beta `since`。
- 保留正式服 JSON/生成结果的描述、费用、标签及不可发现性等元数据。不要整段覆盖生成的 JSDoc；对差异先核实，行为不确定时询问。
- 追踪并补齐实际引用的衍生卡、状态、技能、附魔/增伤通用定义和 imports。生成器可能遗漏这些内容。重名标识符可按语义消歧，保留真实 ID；不要凭编号规律修改看似异常的 ID。
- 描述查找位置：`packages/assets-manager/src/data/CHS/characters.json`（角色及其 `skills`）、`CHS/entities.json`（卡牌和衍生实体）、必要时阅读 `CHS/keywords.json`。按 ID 匹配，使用 JSON 的 `description` 等对应字段；注释格式沿用 `scripts/generators/source.ts` 的处理规则。
- beta 实现的 FIXME、说明和实际逻辑与卡面冲突时，提交具体问题给用户；不要静默修成自己认为更合理的行为，也不要未经确认把 beta 的例外推广到其它卡牌。

### 平衡调整与历史版本

- 修改前保存更新前正式服的完整实现。将受影响的角色、技能、卡牌或状态放入 `packages/data/src/old_versions/<OLD>.gts`，使用 `until "<OLD>"`，补齐 imports；生成器已归档的条目不重复添加。
- 按人工确认说明的章节和条目顺序整理旧版定义，不按 ID 或源码位置排序。生命值等修改、费用修改等同样需要旧版角色/行动牌定义。
- 原文件写入新实现，更新描述后移除 `@outdated` 及其旧描述段落。当前定义的 `since` 表示**首次实装版本**，既有定义保留原值或原来的省略方式，与本次平衡调整版本无关。
- 元数据注释变化要对照当前实现：若已与新注释一致且不存在行为变化，无需为了注释同步复制历史定义。
- 核对 `src/index.ts` 已导入新角色文件及 `<OLD>.gts`。当前定义和旧版定义的同一 ID 必须能按版本正确解析。

## 4. 验证与交付

- 在 data 包执行 `pnpm check`；若出现旧构建导致的类型错配，先更新相应构建。
- 除非用户明确要求、或 beta 仓库新增了关于新卡的测试，**不要为新卡引入额外的单元测试**。
- 从仓库根目录执行 `pnpm -r check` 和 `pnpm test`，检查 diff 中是否仍有本次生成的 TODO、过期注释、错误 beta 版本或遗漏导入。
- 汇报完成的版本、归档位置、用户确认过的行为例外和检查结果。若仍有待确认事项，明确哪些实现未完成。
