<center>

![logo](./docs/images/logo.png)

</center>

# 七圣召唤模拟器

![GitHub Actions Workflow Status](https://img.shields.io/github/actions/workflow/status/piovium/genius-invokation/main.yml)
![NPM Version](https://img.shields.io/npm/v/%40gi-tcg%2Fcore)
![PyPI - Version](https://img.shields.io/pypi/v/gitcg)

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

## ⚠️ Note for AI Researchers: You Might Be in the Wrong Place

If you are looking to use this project as a high-throughput environment for AI training (e.g., Reinforcement Learning), please be aware of the following architectural limitations before proceeding:

* **Non-Standard Interaction Model**: Our callback-based interaction model differs significantly from standard RL environments. You will likely need to implement a custom adapter layer to bridge the gap.
* **Performance Bottlenecks**: This project is written in TypeScript. Its single-threaded nature and heap memory model will severely bottleneck your training speed. Although we provide ultra-fast, V8-based cross-language bindings, they cannot bypass these fundamental runtime limitations.
* **Recommended Workaround**: If your research strictly depends on this project, we recommend using an LLM Agent to port the codebase to a high-performance language, e.g. C++, Rust, or Go. [A provided testcase](http://github.com/ValentineChuu/gitcg-engine-cpp) shows that a ported native version achieves a **5x+ speedup** and unlocks true multi-threaded parallelism.

> [!IMPORTANT]
> **Licensing & Attribution**
> 1. **AGPLv3 Compliance**: Code translated or rewritten using LLMs is still considered a derivative work and remains strictly bound by the **AGPLv3 license**. When distributing the ported project, you must open-source it and retain the original attribution to **Piovium Labs**.
> 2. **Citation**: Even if you do not directly use our codebase, if your research references or builds upon our work, please adhere to standard attribution norms and credit **Piovium Labs** prominently in your publications and/or documentation.

## [关于开发](./docs/development/README.md)

上述链接可查看（可能是过时的）开发文档和注记。

If you are interested in our project or want to have more information, welcome to join our [Discord server](https://discord.gg/vGjh6XAKqk).
