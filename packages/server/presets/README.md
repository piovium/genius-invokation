# 内置赛事配置

这些配置随服务发布，启动时不依赖赛事配置站点。引用路径均相对于各自的 `preset.json`。

- `moyu-s7` 来源：[摸鱼杯 S7 最终分支](https://github.com/piovium/genius-invokation-moyu-s7/tree/3ed193a9ac20fc98f932afb8f18601206af075ab)。基础版本与结算行为为 `v5.8.0`。保留赛事实际使用的完整版本表（包括后续对行秋、妮露、罗莎莉亚的修订），由当前构建的依赖分析继续展开依赖。GTS 移植该分支相对 `ebcebb1` 的六项定义改动：甘雨生命与爆发伤害、便携动力锯、船坞长剑、万家灶火、绝缘之旗印；静态数据同步反映这些改动。
- `lianyu-s1` 来源：[恋雨杯 S1 配置仓库](https://github.com/piovium/lianyu-s1-data-config)，使用其 [发布配置](https://piovium.github.io/lianyu-s1-data-config/config.json) `1.0.20260821` 中的版本映射、Mod 源码和静态覆盖。基础版本固定为导入时本地恋雨杯服务的 `v7.1.0`；结算行为保留其 `discardMaxCostHandsAbortPreview: false` 设置。本地服务参考提交为 `4b1e3a24947b59d75035df51454d287c5134be3b`。

修改赛事规则后应运行 server 的 Profile 测试，并更新此处的来源信息。
