# 官方卡牌定义的维护

`@gi-tcg/data` 的生成脚本会读取官方静态数据、比对现有 `.gts` 文件中的 JSDoc 元数据，并生成新增定义或平衡性调整提示。在仓库根目录运行：

```sh
pnpm --filter @gi-tcg/data regenerate_data
```

每个定义都保留如下元数据注释：

```gts
/**
 * @id 11011
 * @name 流天射术
 * @description
 * 造成2点物理伤害。
 */
define skill {
  id 11011 as LiutianArchery;
  // ...
};
```

- `@id` 是官方 id；
- `@name` 是官方中文名称；
- `@description` 是官方描述。

当官方描述变化时，脚本会加上 `@outdated` 标记；出现未定义的新 id 时，会在合适的 `.gts` 文件末尾生成含 `TODO` 的模板。模板可能需要手动补全或修正。若官方残留定义不应参与游戏，使用 GTS 的 `reserved;` 保留 id，而不要直接删除该定义。

描述差异无法可靠检测骰子费用、生命值上限等数值变化；版本更新时仍需人工核对这些字段。生成后至少运行 `pnpm --filter @gi-tcg/data check`，并按需要更新 `src/old_versions` 中的历史定义。
