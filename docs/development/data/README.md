# 卡牌数据定义

官方卡牌数据位于 `@gi-tcg/data`，以 [GTS](https://github.com/piovium/gts) 文件（`.gts`）编写。GTS 在 TypeScript 中加入了面向数据定义的声明块：每个 `define` 块声明一个角色、技能、实体、行动牌或扩展点；普通 TypeScript 的 `import`、变量、函数、分支和循环仍可直接使用。

```gts
import { DamageType, DiceType } from "@gi-tcg/core/builder";

/**
 * @id 11011
 * @name 流天射术
 * @description
 * 造成2点物理伤害。
 */
define skill {
  id 11011 as LiutianArchery;
  skillType normal;
  cost DiceType.Cryo, 1;
  cost DiceType.Void, 2;
  :damage(DamageType.Physical, 2);
};
```

`define` 的类型为 `character`、`skill`、`status`、`combatStatus`、`summon`、`card`、`attachment` 或 `extension`。块内以分号结束语句；带 `:` 的表达式会在结算时以技能上下文执行，例如 `:damage(...)`、`:self` 和 `:e`。不带 `:` 的 TypeScript 代码在定义的技能执行时按原样运行；可用它组织局部变量、条件和循环。

## 定义与引用

每个可被引用的定义都应给出官方 id，并通常使用 `as` 导出一个同文件、后续导入可用的句柄：

```gts
define summon {
  id 111011 as SacredCryoPearl;
  on endPhase {
    usage 2;
    :damage(DamageType.Cryo, 1);
  };
};

define skill {
  id 11014 as CelestialShower;
  skillType burst;
  cost DiceType.Cryo, 3;
  cost DiceType.Energy, 3;
  :summon(SacredCryoPearl);
};
```

同一文件中的 `as` 名称直接可用；跨文件使用普通的 ESM 导入，例如 `import { SacredCryoPearl } from "./ganyu.gts"`。官方 id 应与静态数据一致；保留但不参与游戏的数据使用 `reserved;`，而不是删除其定义。

`@gi-tcg/data/src/index.ts` 由生成脚本维护，按确定顺序导入所有 `.gts` 文件。文件加载期间，GTS 运行时会把各个 `define` 块注册到数据注册表；`end.ts` 冻结注册表并导出按游戏版本解析后的 `GameData`。维护卡牌时不需要手动创建注册表或管理注册作用域。

## 常用结构

- [角色与角色技能](./character.md)
- [行动牌](./card.md)
- [状态、出战状态和召唤物](./entity.md)
- [操作与上下文表达式](./operations.md)
- [事件](./events.md)
- [扩展点](./extensions.md)
- [游戏版本](./version.md)

## 版本解析

同一 id 可在不同版本下拥有多个定义。`since` 与 `until` 写在对应定义块内：

```gts
define card {
  id 330005 as InEveryHouseAStove;
  until "v4.6.1";
  legend;
};
```

`@gi-tcg/data` 的默认导出为 `(version?) => GameData`。省略参数时取得最新版本；传入版本号则由 `resolveOfficialVersion` 选中在该版本有效的定义。详见[游戏版本](./version.md)。

## 官方卡牌数据自动化维护

数据维护脚本和生成规则参见 [generator](./generator.md)。
