<center>

![logo](./docs/images/logo.png)

</center>

# 七圣召唤模拟器

![GitHub Actions Workflow Status](https://img.shields.io/github/actions/workflow/status/piovium/genius-invokation/main.yml)
![NPM Version](https://img.shields.io/npm/v/%40gi-tcg%2Fcore)
![PyPI - Version](https://img.shields.io/pypi/v/gitcg)
[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/piovium/genius-invokation)

[中文版](./README.md)  | [English Version](./README.en.md) | [日本語版](./README.jp.md)

可访问 https://standalone.piovium.org 试用。

## 本项目特点

- 完全开源（主体使用 AGPLv3.0 or later）
- 核心实现了目前最接近官方的结算规则
- 截止 ![原神版本](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fplay.piovium.org%2Fapi%2Fversion&query=%24.currentGameVersion&label=%E5%8E%9F%E7%A5%9E
) 为止的全部卡牌定义
  - 定义格式简洁明了、清晰易读
  - 易于维护
- 全部旧版本卡牌（平衡性调整前）的定义
  - 支持自选游戏版本开始对局
- 前端功能：
  - 牌局可视化和本地模拟
  - 历史回溯（复盘）和中途继续
  - 对局导入导出
  - 查看结算细节日志
- [对战平台](https://play.piovium.org)（公开测试中）
- 跨编程语言支持
  - [C/C++](./packages/cbinding/)
  - [Python](./packages/pybinding/)
  - [C#](./packages/csbinding/)
  - 更多编程语言敬请期待……
- ~测试服卡牌抢先看~
- 目前**仍有很多 bug**，需要更多测试

## [关于开发](./docs/development/README.md)

上述链接可查看（可能是过时的）开发文档和注记。
