实体牌 profile 数据附录（2026-11-10）

配合 [研究报告](shining-soul-physical-profile.md) 使用。这是报告数据，不是已实现 package 或可直接加载的 preset。

**会话裁定（2026-11-10）**

以下是用户在本会话中的答复，优先于原研究处置；原研究判定、原文字段与来源文件保持不变。

| 编号 | 已确认结论 | 对报告的影响 |
| --- | --- | --- |
| Q01 | 采用 327 张实体牌池 | 排除 322023，补入 322003，保留 322004、2205；H 白名单已符合 |
| Q02 | QA 逐条决定是否采用 | G 的 86 条证据均已有裁定；重复规则注明引用依据，不存在待答复 QA |
| Q03 | 月桂 T063、雷罚恶曜之眼 T088、杀生樱 T090、阿丑 T094、大将威仪 T098 | 来源歧义解除；基础和天赋强化分别复核；F 保留历史候选以供溯源 |
| Q04 | 妮露七域舞步为 3 水，源 1 水错误 | 12082 不因该错误字段手写；212081 共用正确技能；C 原始快照不改写 |
| Q05a | 纳西妲所闻遍计·真如为元素战技 | 17033 的源类型 3 是编码错误，不做爆发覆盖 |
| Q05b | 特瓦林风龙涤流为元素战技 | 25023 的源类型 3 是编码错误，不做爆发覆盖 |
| Q06 | 焚落踢沿用线上准备型元素爆发，不额外获得充能 | 13095 的源类型缺失不构成手写理由；准备技能通用 QA 另行裁定 |
| Q07 | 雷萤术士爆发费用为 3 雷 + 3 充能，最大充能为 3 | 2404 与 24043 的执行及展示定义同步适配 |
| Q08a | 立本累计最多 3 骰 | 已有 2 个时本次最多再放 1 个；selectOption 候选受剩余容量约束 |
| Q08b | 每种最多 1 个仅限制本次放入 | 跨回合可再次放入火骰等已有骰种；历史骰种不用于排除本次候选 |
| Q08c | 万能为独立骰种 | 与七种基础元素分别计数；本次最多放入 1 个万能骰 |
| Q09 | 先使用与线上一致的 randomElement 基础元素随机，后期加配置统一允许八面骰 | 适用于 322005、323001、330002、332019、321022；当前默认不含万能、同次调用不重复，后续统一配置单独实现 |
| QA-01 | 不采纳我界问答 | 不据此新增 GTS，也不推导相反的装备顺序限制 |
| QA-02 | 不采纳护盾通则，沿用线上顺序 | 不实现玩家选择护盾消耗顺序；其他来源独有的分类或绑定规则另行裁定 |
| QA-03 | 采纳西风大教堂满血时自主触发 | selectOption 选择触发则消耗次数，不触发则保留次数；列为确定的手写任务 |
| QA-04 | 所有定向检索牌库使用线上方案，不使用实体检索法 | 322005、321015、323002、322016 转为 v7.2.0 复用候选；移除公开展示/洗牌机制要求；适用于所有同类检索 |
| QA-05 | 采纳卯师傅整局一次按每张牌分别记录 | 线上按支援实例记录 usage 1 已提供实现起点 |
| QA-06 | N/A | 实体检索流程已排除，不实现省略重复展示的特殊记忆机制 |
| QA-07 | 不采纳田铁嘴自选，沿用线上自动选择 | 撤销 322011 的自选后台充能手写任务 |
| QA-08～QA-11 | 冰、火、岩、草元素共鸣保持线上结算 | 不按这些 QA 新增覆盖或实体弃牌动作 |
| QA-12 | 换班时间保持线上结算与卡牌移除方式 | 不新增“事件卡留在状态区、触发后才弃置”的实体卡身份迁移 |
| QA-13 / QA-15 | 莫娜与交给我吧、重复烤蘑菇披萨均保持线上结算 | 不因两条 QA 新增优先级或重建覆盖 |
| QA-14 | 白垩之术保持线上自动转移 | 撤销 332009 的角色子集选择候选；保留线上可打出条件与充能处理 |
| QA-16 / QA-17 | 两组效果均保持线上结算顺序 | 不新增旋火轮/赤冕祝祷选序或一触即发/雷兽之盾优先级覆盖 |
| QA-18 | 苇海信标保留实体共用每回合 2 次 | 311306 为确定手写任务，重复受伤两次或连续战技两次可触发两次 |
| QA-19 / Q11d | 最终采用“本方存在任意终末”判定 | 保留线上共享状态 301102 及持续/刷新规则，仅加增伤条件；不绑定来源，不因无武器删除状态 |
| QA-20 | 贯虹之槊保持线上自动选择 | 撤销自选目标覆盖，保留与钟剑独立护盾的查询兼容要求 |
| QA-21 | 采纳钟剑独立绑定护盾 | 每把武器各自叠加上限 2；装备者倒下或换装时移除对应护盾；消耗顺序沿用线上 |
| Q11a～c 历史答复 | 曾选择换装失效、共享增伤且后触发者接管来源；随后明确只加存在判定 | 具体来源解释已被 Q11d 覆盖，不再作为实现要求 |
| QA-22 | 由 QA-02、QA-21 覆盖 | 不采纳自选顺序；叛逆的守护仍属于出战护盾 |
| QA-23 / QA-24 | 千岩长枪、将帅兜鍪保持线上分类与结算 | 不新增护盾类型或顺序覆盖 |
| QA-25～QA-27 | 群玉阁相关效果、双望舒客栈均保持线上结算 | 先打出先结算是线上已有规则，不视为实体改动，不新增排序覆盖 |
| QA-28 | 望舒客栈满血时保持线上自动不触发 | 撤销 321005 手写选择候选；西风大教堂的 QA-03 不受影响 |
| QA-29～QA-32 | 减费、快速切换、红羽团扇均保留线上结算 | 红羽团扇仍使用所选 v6.5.0 历史版本，不按 QA 改为支援区专用效果 |
| QA-33 | 重复来源，由 QA-30 及支援顺序裁定覆盖 | 保持线上结算，不新增优先级覆盖 |
| QA-34 | 海祇之冠保留实体泡沫规则 | 伤害时清空全部泡沫，包含不足 3 的余数 |
| QA-35 | 海染砗磲两项均保留实体改动 | 伤害时清空全部泡沫，装备时治疗 3 点 |
| QA-36 | 砗磲按实际治疗量累计，计入我方所有角色 | 缺 1 血时治疗 3 仅累计 1 泡沫；后台治疗也计入 |
| QA-37 | 花海甘露之光保持线上结算 | 不新增与对方召唤物的结束阶段顺序覆盖 |
| QA-38 | 珊瑚宫满血时保持线上自动不触发 | 不新增满血选择；与西风大教堂分别处理 |
| QA-39 | 旧时庭园沿用线上减费结算 | 不新增与大梦的曲调自选减费顺序 |
| QA-40 | 深渊的呼唤保留实体双边选择流程 | 我方选两元素、对方二选一，均使用 selectOption |
| QA-42 | 与 QA-02 相同的护盾通则，沿用既有裁定 | 不采纳玩家自选护盾顺序 |
| QA-41 | 大梦的曲调沿用线上减费结算 | 不增加与藏锋何处、旧时庭园的自选顺序 |
| Q10 / QA-43 | 婕德整体沿用线上计数及弃置/生成状态方式 | 撤销实体弃牌区改动；322022 转为 v7.2.0 复用候选，关联独立状态 302205 |
| QA-44 | 四叶印保留线上结算顺序 | 不增加按状态附属先后排序的适配 |
| QA-45 / QA-47 / QA-49 / QA-53 | 保留线上附魔结算 | 不新增角色状态与出战状态之间的附魔优先级覆盖 |
| QA-46 | 虚影保留线上分类与减伤顺序 | 不按 QA 新增同级分类或自选顺序 |
| QA-48 | 用户确认弃牌区与移出游戏区域在此是同一含义，与线上一致 | 雷楔沿用线上手牌操作及移除方式；撤回此前区域差异及新区域能力缺口判断 |
| QA-50～QA-52 / QA-57 | 砂糖触发时序及重建、诺艾尔及行秋伤害计算均沿用线上 | 撤销大型风灵强制重置候选，不新增伤害计算流程 |
| QA-54 / QA-60 / QA-77 | 蛙、兔兔伯爵保留线上分类与减伤顺序 | 不新增与出战状态同级的特殊分类或选序 |
| QA-55 / QA-56 / QA-78 / QA-79 / QA-85 / QA-86 | 护盾通则重复来源，引用 QA-02 | 不采纳自选顺序，沿用线上 |
| QA-58 / QA-62 / QA-69 / QA-70 | 四组协同效果均沿用线上结算顺序 | 不增加 selectOption 选序 |
| QA-59 / QA-61 / QA-63 | 附魔、血梅香/披萨顺序、温迪减费均沿用线上 | 不新增同步伤害暂停或减费选序重算要求；换班时间仍按线上移除 |
| QA-64 | 温迪保留线上重建行为 | 撤销暴风之眼强制重置次数；1503 转为 v5.4.0 复用候选 |
| QA-65 / QA-80 | 整体保留线上伤害及免于击倒时序 | 不新增雷晶核心结算阶段 |
| QA-66 / QA-81 | 岩盔直接应用线上行为，不做调整 | 不合并运行状态或强制合并展示；2601 的 8 HP 修改独立保留 |
| QA-67 / QA-68 / QA-74 / QA-82 | 七七相关治疗对象和触发顺序均保持线上 | 不新增选序或治疗新出战角色覆盖 |
| QA-71 / QA-83 | 雷狼与虹剑势保留线上结算，不新增覆盖 | 来源矛盾已解决，不采纳两种实体特殊排序 |
| QA-72 / QA-73 / QA-75 | 万叶快速切换、流风秋野及阿丑重建均沿用所选线上版本 | 不新增优先级或强制重置覆盖 |
| QA-76 / QA-84 | 整体沿用线上准备技能行为 | 不新增准备轮次、打断、充能或全局触发语义覆盖 |
| Q13 | 固定 v7.2.0 全局基底及当前默认对局配置 | 8 初始骰、5 初始手牌、10 手牌上限、16 骰子上限、15 回合、支援/召唤区各 4；逐卡使用所选历史版本 |
| Q21a | 钟剑外部补盾可超过 2 | 各池上限 2 仅约束钟剑自身生成/叠加，外部补盾沿用线上规则 |

**快照与核验**

最终处置计数：A 的 284 项去掉无实体来源的 322023 后，4 项保留手写适配、279 项保留线上复用候选；B 的 44 项中，12 项为 M、32 项为 R、0 项为 D。合计 327 项＝16 个手写/数值适配顶层 ID＋311 个复用候选。G 的 86 条 QA 均已有最终裁定或明确引用同规则裁定；复用候选中的技术核验仍需后续完成。

| 仓库 | HEAD |
| --- | --- |
| genius-invokation | 6c395a0ac29bc5d8a8accf15dbe5cdc3ce18ec40 |
| static-data | c7631187c2086e8dec25a2e0a728b2a1b9c62dd8 |
| physical-static-data | 2f80d9d19318d9f0d4be075f79c7894970b987e7 |

| 输入 | SHA-256 |
| --- | --- |
| ../static-data/.temp/comparison-data.json | da5e3783d653e72b99e3073df6429ace3ae1c6111dd66557294374066d735804 |
| ../static-data/.temp/resolved-physical-baselines.json | 21df0439e47b63d6e0e46128704dd70ed91091f57e8d94c172546df4e55fda1b |
| ../static-data/.temp/physical-baselines.json | 43aa10be89fb5506aeb5b0a731cee3f54205a1ecb82806664e2c105c0778f2b7 |
| ../static-data/.temp/physical-id-mapping.json | 7c2c6ed1ef3221fd173dcd4ace66ce1258178b79c905364ede691d94db049eea |
| ../static-data/.temp/expanded-physical-versions.json | 048a1f7f2295b68b8d5412dfd7fac7873aece4c1dae7091996b671db6f084f57 |
| packages/data-code-analyzer/src/physical_version.ts | e23481c4365d42a684017c0221aec778e8547435aafa20d55124affddce7bf94 |
| packages/data-code-analyzer/src/result.json | bed12c0f224ddd902da82cf1eafc2d221d70a828dee2da3335f7920dde9dbf38 |

108/108 线上文件、493/493 所选实体源文件匹配研究记录。研究 scopeHash：`c5ba5e3d1a10b48724620cab530b64619c0e6c954edde3ab813b485a5b07e586`；当前清单已移除 2205、322004、322023，没有新增或其余版本变更。32 个人工发行选择保持不变。

研究生成时间 `2026-11-05T03:08:11.898Z`；版本参数：`{"parser": "1.1.0", "normalization": "2.0.0", "prompt": "3.0.0", "solver": "1.2.0", "decisionPolicy": "argmax-v1"}`。Decision 使用 argmax 二分类，缺描述通配；校验记录 humanCalibrated=false，不是人工准确率保证。

**A. 原始完整推荐版本：284 项**

exact/near 是原研究判定；M 是报告追加手写任务或候选，是否确认以会话裁定及逐行说明为准（西风大教堂已由 QA-03 确认）；G 是通用调度/重召核对。缺描述通配不证明存在实体版本。发布时还需应用主报告的排除、覆盖与依赖统一。

| ID | 名称 | 推荐版本 | 自身 | code | 发行记录 | 来源 | 处理 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1101 | 甘雨 | v5.4.0 | exact | C001 | GCG05S-C001 | [C001/13.json](../../../physical-static-data/data/C001/13.json) | 保留原研究候选 |
| 1102 | 迪奥娜 | v5.8.0 | exact | C019 | GCG12S-C019 | [C019/474.json](../../../physical-static-data/data/C019/474.json) | 保留原研究候选 |
| 1103 | 凯亚 | v7.2.0 | exact | C020 | GCG11S-C020 | [C020/471.json](../../../physical-static-data/data/C020/471.json) | 保留原研究候选 |
| 1104 | 重云 | v7.2.0 | exact | C002 | GCG06S-C002 | [C002/16.json](../../../physical-static-data/data/C002/16.json) | 保留原研究候选 |
| 1105 | 神里绫华 | v5.8.0 | near | C003 | GCG07S-C003 | [C003/20.json](../../../physical-static-data/data/C003/20.json) | 保留原研究候选 |
| 1106 | 优菈 | v6.4.0 | exact | C021 | GCG15S-C021 | [C021/483.json](../../../physical-static-data/data/C021/483.json) | 保留原研究候选 |
| 1107 | 申鹤 | v7.2.0 | exact | C055 | GCG27S-C055 | [C055/2245.json](../../../physical-static-data/data/C055/2245.json) | 保留原研究候选 |
| 1109 | 莱依拉 | v7.2.0 | exact | C056 | GCG28S-C056 | [C056/2249.json](../../../physical-static-data/data/C056/2249.json) | 保留原研究候选 |
| 1110 | 夏洛蒂 | v6.2.0 | exact | C057 | GCG27S-C057 | [C057/2246.json](../../../physical-static-data/data/C057/2246.json) | 保留原研究候选 |
| 1201 | 芭芭拉 | v6.4.0 | exact | C004 | GCG05S-C004 | [C004/14.json](../../../physical-static-data/data/C004/14.json) | 保留原研究候选 |
| 1202 | 行秋 | v7.2.0 | exact | C022 | GCG11S-C022 | [C022/472.json](../../../physical-static-data/data/C022/472.json) | 保留原研究候选 |
| 1203 | 莫娜 | v7.2.0 | near | C005 | GCG04S-C005 | [C005/10.json](../../../physical-static-data/data/C005/10.json) | 保留原研究候选 |
| 1205 | 珊瑚宫心海 | v5.4.0 | near | C023 | GCG10S-C023 | [C023/468.json](../../../physical-static-data/data/C023/468.json) | 保留原研究候选 |
| 1206 | 神里绫人 | v6.2.0 | exact | C039 | GCG17S-C039 | [C039/1789.json](../../../physical-static-data/data/C039/1789.json) | 保留原研究候选 |
| 1207 | 坎蒂丝 | v4.5.0 | exact | C024 | GCG09S-C024 | [C024/466.json](../../../physical-static-data/data/C024/466.json) | 保留原研究候选 |
| 1209 | 夜兰 | v6.3.0 | near | C059 | GCG26S-C059 | [C059/2244.json](../../../physical-static-data/data/C059/2244.json) | 保留原研究候选 |
| 1301 | 迪卢克 | v7.2.0 | near | C006 | GCG04S-C006 | [C006/11.json](../../../physical-static-data/data/C006/11.json) | 保留原研究候选 |
| 1302 | 香菱 | v7.2.0 | exact | C007 | GCG01S-C007 | [C007/1.json](../../../physical-static-data/data/C007/1.json) | 保留原研究候选 |
| 1303 | 班尼特 | v7.2.0 | exact | C060 | GCG32S-C060 | [C060/2261.json](../../../physical-static-data/data/C060/2261.json) | 保留原研究候选 |
| 1304 | 安柏 | v5.8.0 | exact | C025 | GCG09S-C025 | [C025/467.json](../../../physical-static-data/data/C025/467.json) | 保留原研究候选 |
| 1305 | 宵宫 | v7.2.0 | exact | C040 | GCG24S-C040 | [C040/1809.json](../../../physical-static-data/data/C040/1809.json) | 保留原研究候选 |
| 1307 | 胡桃 | v5.4.0 | exact | C026 | GCG16S-C026 | [C026/486.json](../../../physical-static-data/data/C026/486.json) | 保留原研究候选 |
| 1308 | 烟绯 | v6.2.0 | exact | C041 | GCG20S-C041 | [C041/1799.json](../../../physical-static-data/data/C041/1799.json) | 保留原研究候选 |
| 1311 | 托马 | v6.2.0 | exact | C042 | GCG17S-C042 | [C042/1790.json](../../../physical-static-data/data/C042/1790.json) | 保留原研究候选 |
| 1401 | 菲谢尔 | v7.2.0 | exact | C062 | GCG25S-C062 | [C062/2241.json](../../../physical-static-data/data/C062/2241.json) | 保留原研究候选 |
| 1402 | 雷泽 | v7.2.0 | exact | C043 | GCG22S-C043 | [C043/1804.json](../../../physical-static-data/data/C043/1804.json) | 保留原研究候选 |
| 1403 | 刻晴 | v7.2.0 | exact | C008 | GCG06S-C008 | [C008/17.json](../../../physical-static-data/data/C008/17.json) | 保留原研究候选 |
| 1404 | 赛诺 | v7.2.0 | near | C063 | GCG25S-C063 | [C063/2240.json](../../../physical-static-data/data/C063/2240.json) | 保留原研究候选 |
| 1405 | 北斗 | v4.5.0 | exact | C027 | GCG13S-C027 | [C027/478.json](../../../physical-static-data/data/C027/478.json) | 保留原研究候选 |
| 1406 | 九条裟罗 | v6.5.0 | exact | C009 | GCG03S-C009 | [C009/7.json](../../../physical-static-data/data/C009/7.json) | 保留原研究候选 |
| 1409 | 丽莎 | v5.0.0 | exact | C010 | GCG02S-C010 | [C010/4.json](../../../physical-static-data/data/C010/4.json) | 保留原研究候选 |
| 1501 | 砂糖 | v7.2.0 | exact | C011 | GCG01S-C011 | [C011/2.json](../../../physical-static-data/data/C011/2.json) | QA-50/51 保留线上触发时序及重建；不新增强制重置 |
| 1502 | 琴 | v5.2.0 | exact | C012 | GCG01S-C012 | [C012/3.json](../../../physical-static-data/data/C012/3.json) | 保留原研究候选 |
| 1504 | 魈 | v7.2.0 | exact | C029 | GCG12S-C029 | [C029/476.json](../../../physical-static-data/data/C029/476.json) | 保留原研究候选 |
| 1506 | 流浪者 | v7.2.0 | exact | C064 | GCG28S-C064 | [C064/2248.json](../../../physical-static-data/data/C064/2248.json) | 保留原研究候选 |
| 1510 | 闲云 | v5.3.0 | exact | C065 | GCG30S-C065 | [C065/2255.json](../../../physical-static-data/data/C065/2255.json) | 保留原研究候选 |
| 1601 | 凝光 | v7.2.0 | exact | C013 | GCG03S-C013 | [C013/8.json](../../../physical-static-data/data/C013/8.json) | 保留原研究候选 |
| 1602 | 诺艾尔 | v5.4.0 | exact | C014 | GCG03S-C014 | [C014/9.json](../../../physical-static-data/data/C014/9.json) | 保留原研究候选 |
| 1603 | 钟离 | v5.4.0 | exact | C030 | GCG10S-C030 | [C030/469.json](../../../physical-static-data/data/C030/469.json) | 保留原研究候选 |
| 1604 | 阿贝多 | v5.6.0 | exact | C031 | GCG10S-C031 | [C031/470.json](../../../physical-static-data/data/C031/470.json) | 保留原研究候选 |
| 1701 | 柯莱 | v6.2.0 | exact | C015 | GCG02S-C015 | [C015/5.json](../../../physical-static-data/data/C015/5.json) | 保留原研究候选 |
| 1702 | 提纳里 | v7.2.0 | exact | C049 | GCG22S-C049 | [C049/1803.json](../../../physical-static-data/data/C049/1803.json) | 保留原研究候选 |
| 1705 | 白术 | v5.6.0 | exact | C033 | GCG14S-C033 | [C033/480.json](../../../physical-static-data/data/C033/480.json) | 保留原研究候选 |
| 1707 | 绮良良 | v6.5.0 | exact | C050 | GCG22S-C050 | [C050/1805.json](../../../physical-static-data/data/C050/1805.json) | 保留原研究候选 |
| 2101 | 愚人众·冰萤术士 | v7.2.0 | exact | C051 | GCG18S-C051 | [C051/1792.json](../../../physical-static-data/data/C051/1792.json) | 保留原研究候选 |
| 2201 | 纯水精灵·洛蒂娅 | v5.8.0 | exact | C016 | GCG05S-C016 | [C016/15.json](../../../physical-static-data/data/C016/15.json) | 保留原研究候选；子树含通配 |
| 2202 | 愚人众·藏镜仕女 | v7.2.0 | exact | C052 | GCG18S-C052 | [C052/1793.json](../../../physical-static-data/data/C052/1793.json) | 保留原研究候选 |
| 2301 | 愚人众·火之债务处理人 | v6.3.0 | near | C034 | GCG14S-C034 | [C034/482.json](../../../physical-static-data/data/C034/482.json) | 保留原研究候选 |
| 2302 | 深渊咏者·渊火 | v7.2.0 | near | C017 | GCG07S-C017 | [C017/21.json](../../../physical-static-data/data/C017/21.json) | 保留原研究候选 |
| 2303 | 镀金旅团·炽沙叙事人 | v7.2.0 | near | C069 | GCG32S-C069 | [C069/2262.json](../../../physical-static-data/data/C069/2262.json) | 保留原研究候选 |
| 2401 | 无相之雷 | v7.2.0 | near | C035 | GCG15S-C035 | [C035/485.json](../../../physical-static-data/data/C035/485.json) | 保留原研究候选 |
| 2403 | 千年珍珠骏麟 | v7.2.0 | near | C053 | GCG21S-C053 | [C053/1801.json](../../../physical-static-data/data/C053/1801.json) | 保留原研究候选 |
| 2501 | 魔偶剑鬼 | v7.0.0 | near | C054 | GCG21S-C054 | [C054/1802.json](../../../physical-static-data/data/C054/1802.json) | 保留原研究候选 |
| 2701 | 翠翎恐蕈 | v6.3.0 | near | C018 | GCG02S-C018 | [C018/6.json](../../../physical-static-data/data/C018/6.json) | 保留原研究候选 |
| 2703 | 镀金旅团·叶轮舞者 | v7.2.0 | near | C072 | GCG29S-C072 | [C072/2253.json](../../../physical-static-data/data/C072/2253.json) | 保留原研究候选 |
| 211011 | 唯此一心 | v7.2.0 | exact | A001 | GCG05S-A001 | [A001/91.json](../../../physical-static-data/data/A001/91.json) | 保留原研究候选 |
| 211021 | 猫爪冰摇 | v7.2.0 | exact | A092 | GCG12S-A092 | [A092/648.json](../../../physical-static-data/data/A092/648.json) | 保留原研究候选 |
| 211031 | 冷血之剑 | v5.8.0 | exact | A093 | GCG11S-A093 | [A093/611.json](../../../physical-static-data/data/A093/611.json) | 保留原研究候选 |
| 211041 | 吐纳真定 | v7.2.0 | exact | A002 | GCG06S-A002 | [A002/128.json](../../../physical-static-data/data/A002/128.json) | 保留原研究候选 |
| 211051 | 寒天宣命祝词 | v7.2.0 | exact | A003 | GCG07S-A003 | [A003/287.json](../../../physical-static-data/data/A003/287.json) | 保留原研究候选 |
| 211061 | 战欲涌现 | v6.4.0 | near | A094 | GCG15S-A094 | [A094/759.json](../../../physical-static-data/data/A094/759.json) | 保留原研究候选 |
| 211071 | 忘玄 | v7.2.0 | exact | A208 | GCG31S-A208 | [A208/2373.json](../../../physical-static-data/data/A208/2373.json) | 保留原研究候选 |
| 211091 | 归芒携信 | v7.2.0 | exact | A209 | GCG28S-A209 | [A209/2368.json](../../../physical-static-data/data/A209/2368.json) | 保留原研究候选 |
| 211101 | 以有趣相关为要义 | v7.2.0 | exact | A210 | GCG27S-A210 | [A210/2603.json](../../../physical-static-data/data/A210/2603.json) | 保留原研究候选 |
| 212011 | 光辉的季节 | v7.2.0 | exact | A004 | GCG05S-A004 | [A004/92.json](../../../physical-static-data/data/A004/92.json) | 保留原研究候选 |
| 212021 | 重帘留香 | v7.2.0 | exact | A095 | GCG11S-A095 | [A095/612.json](../../../physical-static-data/data/A095/612.json) | 保留原研究候选 |
| 212031 | 沉没的预言 | v7.2.0 | exact | A005 | GCG04S-A005 | [A005/54.json](../../../physical-static-data/data/A005/54.json) | 保留原研究候选 |
| 212051 | 匣中玉栉 | v7.2.0 | exact | A096 | GCG10S-A096 | [A096/574.json](../../../physical-static-data/data/A096/574.json) | 保留原研究候选 |
| 212061 | 镜华风姿 | v6.2.0 | exact | A159 | GCG17S-A159 | [A159/1843.json](../../../physical-static-data/data/A159/1843.json) | 保留原研究候选 |
| 212071 | 衍溢的汐潮 | v7.2.0 | exact | A097 | GCG09S-A097 | [A097/537.json](../../../physical-static-data/data/A097/537.json) | 保留原研究候选 |
| 212091 | 猜先有方 | v7.2.0 | near | A212 | GCG04B-A212 | [A212/2330.json](../../../physical-static-data/data/A212/2330.json) | 保留原研究候选 |
| 213011 | 流火焦灼 | v7.2.0 | near | A006 | GCG04S-A006 | [A006/55.json](../../../physical-static-data/data/A006/55.json) | 保留原研究候选 |
| 213021 | 交叉火力 | v7.2.0 | exact | A007 | GCG01S-A007 | [A007/143.json](../../../physical-static-data/data/A007/143.json) | 保留原研究候选 |
| 213031 | 冒险憧憬 | v7.2.0 | exact | A213 | GCG04B-A213 | [A213/2335.json](../../../physical-static-data/data/A213/2335.json) | 保留原研究候选 |
| 213041 | 一触即发 | v7.2.0 | near | A098 | GCG09S-A098 | [A098/539.json](../../../physical-static-data/data/A098/539.json) | 保留原研究候选 |
| 213051 | 长野原龙势流星群 | v7.2.0 | exact | A160 | GCG24S-A160 | [A160/2077.json](../../../physical-static-data/data/A160/2077.json) | 保留原研究候选 |
| 213071 | 血之灶火 | v7.2.0 | exact | A099 | GCG16S-A099 | [A099/796.json](../../../physical-static-data/data/A099/796.json) | 保留原研究候选 |
| 213081 | 最终解释权 | v7.2.0 | exact | A161 | GCG03B-A161 | [A161/1842.json](../../../physical-static-data/data/A161/1842.json) | 保留原研究候选 |
| 213091 | 崇诚之真 | v7.2.0 | exact | A214 | GCG04B-A214 | [A214/2339.json](../../../physical-static-data/data/A214/2339.json) | 保留原研究候选 |
| 213111 | 僚佐的才巧 | v7.2.0 | exact | A162 | GCG17S-A162 | [A162/1844.json](../../../physical-static-data/data/A162/1844.json) | 保留原研究候选 |
| 214011 | 噬星魔鸦 | v7.2.0 | exact | A215 | GCG25S-A215 | [A215/2316.json](../../../physical-static-data/data/A215/2316.json) | 保留原研究候选 |
| 214021 | 觉醒 | v7.2.0 | exact | A163 | GCG03B-A163 | [A163/1850.json](../../../physical-static-data/data/A163/1850.json) | 保留原研究候选 |
| 214031 | 抵天雷罚 | v7.2.0 | exact | A008 | GCG06S-A008 | [A008/129.json](../../../physical-static-data/data/A008/129.json) | 保留原研究候选 |
| 214041 | 落羽的裁择 | v7.2.0 | exact | A216 | GCG25S-A216 | [A216/2313.json](../../../physical-static-data/data/A216/2313.json) | 保留原研究候选 |
| 214051 | 霹雳连霄 | v4.5.0 | near | A100 | GCG13S-A100 | [A100/686.json](../../../physical-static-data/data/A100/686.json) | 保留原研究候选 |
| 214061 | 我界 | v6.5.0 | exact | A009 | GCG06S-A009 | [A009/130.json](../../../physical-static-data/data/A009/130.json) | 保留原研究候选 |
| 214071 | 万千的愿望 | v7.2.0 | exact | A164 | GCG17S-A164 | [A164/1839.json](../../../physical-static-data/data/A164/1839.json) | 保留原研究候选 |
| 214091 | 脉冲的魔女 | v5.0.0 | exact | A010 | GCG02S-A010 | [A010/180.json](../../../physical-static-data/data/A010/180.json) | 保留原研究候选 |
| 215011 | 混元熵增论 | v7.2.0 | exact | A011 | GCG04S-A011 | [A011/56.json](../../../physical-static-data/data/A011/56.json) | 保留原研究候选 |
| 215021 | 蒲公英的国土 | v5.2.0 | exact | A012 | GCG01S-A012 | [A012/145.json](../../../physical-static-data/data/A012/145.json) | 保留原研究候选 |
| 215031 | 绪风之拥 | v7.2.0 | near | A101 | GCG09S-A101 | [A101/538.json](../../../physical-static-data/data/A101/538.json) | 保留原研究候选 |
| 215041 | 降魔·护法夜叉 | v7.2.0 | near | A102 | GCG12S-A102 | [A102/650.json](../../../physical-static-data/data/A102/650.json) | 保留原研究候选 |
| 215061 | 梦迹一风 | v7.2.0 | near | A217 | GCG04B-A217 | [A217/2354.json](../../../physical-static-data/data/A217/2354.json) | 静态覆盖：线上 REALNAME 模板残留，按 A217 实体正文展示 |
| 215101 | 知是留云僊 | v5.3.0 | exact | A218 | GCG04B-A218 | [A218/2357.json](../../../physical-static-data/data/A218/2357.json) | 保留原研究候选 |
| 216011 | 储之千日，用之一刻 | v5.8.0 | exact | A013 | GCG03S-A013 | [A013/218.json](../../../physical-static-data/data/A013/218.json) | 保留原研究候选 |
| 216021 | 支援就交给我吧 | v7.2.0 | exact | A014 | GCG03S-A014 | [A014/219.json](../../../physical-static-data/data/A014/219.json) | 保留原研究候选 |
| 216031 | 炊金馔玉 | v5.6.0 | exact | A103 | GCG10S-A103 | [A103/576.json](../../../physical-static-data/data/A103/576.json) | 保留原研究候选 |
| 216041 | 神性之陨 | v7.2.0 | near | A104 | GCG10S-A104 | [A104/575.json](../../../physical-static-data/data/A104/575.json) | 保留原研究候选 |
| 216051 | 荒泷第一 | v7.2.0 | exact | A167 | GCG19S-A167 | [A167/2139.json](../../../physical-static-data/data/A167/2139.json) | 保留原研究候选 |
| 216071 | 庄谐并举 | v7.2.0 | exact | A219 | GCG04B-A219 | [A219/2361.json](../../../physical-static-data/data/A219/2361.json) | 保留原研究候选 |
| 217011 | 飞叶迴斜 | v6.2.0 | exact | A015 | GCG02S-A015 | [A015/181.json](../../../physical-static-data/data/A015/181.json) | 保留原研究候选 |
| 217021 | 眼识殊明 | v6.6.0 | near | A169 | GCG03B-A169 | [A169/1872.json](../../../physical-static-data/data/A169/1872.json) | 保留原研究候选 |
| 217031 | 心识蕴藏之种 | v7.2.0 | exact | A220 | GCG25S-A220 | [A220/2311.json](../../../physical-static-data/data/A220/2311.json) | 保留原研究候选 |
| 217051 | 在地为化 | v7.2.0 | exact | A106 | GCG14S-A106 | [A106/722.json](../../../physical-static-data/data/A106/722.json) | 保留原研究候选 |
| 217071 | 沿途百景会心 | v6.5.0 | exact | A170 | GCG03B-A170 | [A170/1876.json](../../../physical-static-data/data/A170/1876.json) | 保留原研究候选 |
| 221011 | 冰萤寒光 | v7.2.0 | exact | A171 | GCG03B-A171 | [A171/1880.json](../../../physical-static-data/data/A171/1880.json) | 保留原研究候选 |
| 222011 | 百川奔流 | v7.2.0 | exact | A016 | GCG05S-A016 | [A016/93.json](../../../physical-static-data/data/A016/93.json) | 保留原研究候选 |
| 222021 | 镜锢之笼 | v7.2.0 | exact | A172 | GCG03B-A172 | [A172/1884.json](../../../physical-static-data/data/A172/1884.json) | 保留原研究候选 |
| 222051 | 轻盈水沫 | v7.2.0 | exact | A221 | GCG04B-A221 | [A221/2369.json](../../../physical-static-data/data/A221/2369.json) | 保留原研究候选 |
| 223021 | 烬火重燃 | v7.2.0 | exact | A017 | GCG07S-A017 | [A017/288.json](../../../physical-static-data/data/A017/288.json) | 保留原研究候选 |
| 223031 | 魔蝎烈祸 | v7.2.0 | exact | A222 | GCG04B-A222 | [A222/2371.json](../../../physical-static-data/data/A222/2371.json) | 保留原研究候选 |
| 224011 | 汲能棱晶 | v7.2.0 | exact | A108 | GCG15S-A108 | [A108/761.json](../../../physical-static-data/data/A108/761.json) | 保留原研究候选 |
| 224031 | 明珠固化 | v7.2.0 | exact | A173 | GCG03B-A173 | [A173/1889.json](../../../physical-static-data/data/A173/1889.json) | 保留原研究候选 |
| 224041 | 雷萤浮闪 | v7.2.0 | exact | A223 | GCG28S-A223 | [A223/2372.json](../../../physical-static-data/data/A223/2372.json) | 保留原研究候选 |
| 225011 | 机巧神通 | v7.0.0 | exact | A174 | GCG03B-A174 | [A174/1894.json](../../../physical-static-data/data/A174/1894.json) | 保留原研究候选 |
| 225021 | 毁裂风涡 | v7.2.0 | exact | A224 | GCG31S-A224 | [A224/2377.json](../../../physical-static-data/data/A224/2377.json) | 保留原研究候选 |
| 227031 | 灵蛇旋嘶 | v7.2.0 | exact | A225 | GCG04B-A225 | [A225/2383.json](../../../physical-static-data/data/A225/2383.json) | 保留原研究候选 |
| 311101 | 魔导绪论 | v7.2.0 | exact | A019 | GCG04S-A019 | [A019/57.json](../../../physical-static-data/data/A019/57.json) | 保留原研究候选 |
| 311102 | 祭礼残章 | v7.2.0 | exact | A020 | GCG02S-A020 | [A020/183.json](../../../physical-static-data/data/A020/183.json) | 保留原研究候选 |
| 311103 | 天空之卷 | v7.2.0 | exact | A111 | GCG11S-A111 | [A111/616.json](../../../physical-static-data/data/A111/616.json) | 保留原研究候选 |
| 311104 | 千夜浮梦 | v7.2.0 | exact | A226 | GCG25S-A226 | [A226/2318.json](../../../physical-static-data/data/A226/2318.json) | 保留原研究候选 |
| 311105 | 盈满之实 | v7.2.0 | exact | A175 | GCG20S-A175 | [A175/1897.json](../../../physical-static-data/data/A175/1897.json) | 保留原研究候选 |
| 311106 | 四风原典 | v6.5.0 | exact | A114 | GCG10S-A114 | [A114/577.json](../../../physical-static-data/data/A114/577.json) | 保留原研究候选 |
| 311107 | 图莱杜拉的回忆 | v7.2.0 | near | A227 | GCG28S-A227 | [A227/2384.json](../../../physical-static-data/data/A227/2384.json) | 保留原研究候选 |
| 311201 | 鸦羽弓 | v7.2.0 | exact | A021 | GCG05S-A021 | [A021/95.json](../../../physical-static-data/data/A021/95.json) | 保留原研究候选 |
| 311202 | 祭礼弓 | v7.2.0 | exact | A022 | GCG03S-A022 | [A022/221.json](../../../physical-static-data/data/A022/221.json) | 保留原研究候选 |
| 311203 | 天空之翼 | v7.2.0 | exact | A176 | GCG20S-A176 | [A176/1901.json](../../../physical-static-data/data/A176/1901.json) | 保留原研究候选 |
| 311204 | 阿莫斯之弓 | v7.2.0 | exact | A023 | GCG05S-A023 | [A023/96.json](../../../physical-static-data/data/A023/96.json) | 保留原研究候选 |
| 311205 | 终末嗟叹之诗 | v7.2.0 | near | A113 | GCG09S-A113 | [A113/540.json](../../../physical-static-data/data/A113/540.json) | M：Q11d 仅为共享状态 301102 增伤加本方任意终末存在判定；无来源绑定 |
| 311206 | 王下近侍 | v7.2.0 | exact | A118 | GCG20S-A118 | [A118/1904.json](../../../physical-static-data/data/A118/1904.json) | 保留原研究候选 |
| 311301 | 白铁大剑 | v7.2.0 | exact | A024 | GCG03S-A024 | [A024/222.json](../../../physical-static-data/data/A024/222.json) | 保留原研究候选 |
| 311302 | 祭礼大剑 | v7.2.0 | exact | A025 | GCG04S-A025 | [A025/58.json](../../../physical-static-data/data/A025/58.json) | 保留原研究候选 |
| 311303 | 狼的末路 | v7.2.0 | exact | A026 | GCG03B-A026 | [A026/2028.json](../../../physical-static-data/data/A026/2028.json) | 保留原研究候选 |
| 311304 | 天空之傲 | v7.2.0 | exact | A177 | GCG03B-A177 | [A177/1905.json](../../../physical-static-data/data/A177/1905.json) | 保留原研究候选 |
| 311305 | 钟剑 | v7.2.0 | near | A117 | GCG13S-A117 | [A117/689.json](../../../physical-static-data/data/A117/689.json) | M：QA-21 已采纳独立绑定护盾；消耗顺序沿用线上 |
| 311306 | 苇海信标 | v7.2.0 | near | A112 | GCG15S-A112 | [A112/764.json](../../../physical-static-data/data/A112/764.json) | M：QA-18 已确认，两个触发条件共用每回合 2 次 |
| 311307 | 森林王器 | v7.2.0 | exact | A228 | GCG31S-A228 | [A228/2382.json](../../../physical-static-data/data/A228/2382.json) | 保留原研究候选 |
| 311401 | 白缨枪 | v7.2.0 | exact | A027 | GCG01S-A027 | [A027/147.json](../../../physical-static-data/data/A027/147.json) | 保留原研究候选 |
| 311402 | 千岩长枪 | v7.2.0 | near | A119 | GCG16S-A119 | [A119/800.json](../../../physical-static-data/data/A119/800.json) | 保留原研究候选 |
| 311404 | 贯虹之槊 | v7.2.0 | exact | A115 | GCG10S-A115 | [A115/578.json](../../../physical-static-data/data/A115/578.json) | QA-20 保持线上自动选择；撤销自选手写候选 |
| 311405 | 薙草之稻光 | v7.2.0 | exact | A178 | GCG17S-A178 | [A178/1857.json](../../../physical-static-data/data/A178/1857.json) | 保留原研究候选 |
| 311406 | 贯月矢 | v7.2.0 | exact | A028 | GCG17S-A028 | [A028/1861.json](../../../physical-static-data/data/A028/1861.json) | 保留原研究候选 |
| 311407 | 和璞鸢 | v7.2.0 | exact | A179 | GCG17S-A179 | [A179/1863.json](../../../physical-static-data/data/A179/1863.json) | 保留原研究候选 |
| 311501 | 旅行剑 | v7.2.0 | exact | A029 | GCG06S-A029 | [A029/132.json](../../../physical-static-data/data/A029/132.json) | 保留原研究候选 |
| 311502 | 祭礼剑 | v7.2.0 | exact | A030 | GCG06S-A030 | [A030/133.json](../../../physical-static-data/data/A030/133.json) | 保留原研究候选 |
| 311503 | 风鹰剑 | v7.2.0 | exact | A031 | GCG17S-A031 | [A031/1852.json](../../../physical-static-data/data/A031/1852.json) | 保留原研究候选 |
| 311504 | 天空之刃 | v7.2.0 | exact | A110 | GCG11S-A110 | [A110/614.json](../../../physical-static-data/data/A110/614.json) | 保留原研究候选 |
| 311505 | 西风剑 | v7.2.0 | exact | A116 | GCG11S-A116 | [A116/615.json](../../../physical-static-data/data/A116/615.json) | 保留原研究候选 |
| 311507 | 原木刀 | v7.2.0 | exact | A229 | GCG28S-A229 | [A229/2387.json](../../../physical-static-data/data/A229/2387.json) | 保留原研究候选 |
| 312001 | 冒险家头带 | v7.2.0 | exact | A132 | GCG10S-A132 | [A132/581.json](../../../physical-static-data/data/A132/581.json) | 保留原研究候选 |
| 312002 | 幸运儿银冠 | v7.2.0 | exact | A129 | GCG10S-A129 | [A129/580.json](../../../physical-static-data/data/A129/580.json) | 保留原研究候选 |
| 312003 | 游医的方巾 | v7.2.0 | exact | A130 | GCG11S-A130 | [A130/619.json](../../../physical-static-data/data/A130/619.json) | 保留原研究候选 |
| 312004 | 赌徒的耳环 | v3.7.0 | near | A180 | GCG25S-A180 | [A180/2333.json](../../../physical-static-data/data/A180/2333.json) | 保留原研究候选 |
| 312005 | 教官的帽子 | v7.2.0 | exact | A032 | GCG04S-A032 | [A032/59.json](../../../physical-static-data/data/A032/59.json) | 保留原研究候选 |
| 312006 | 流放者头冠 | v7.2.0 | exact | A131 | GCG12S-A131 | [A131/655.json](../../../physical-static-data/data/A131/655.json) | 保留原研究候选 |
| 312007 | 华饰之兜 | v7.2.0 | exact | A181 | GCG17S-A181 | [A181/1871.json](../../../physical-static-data/data/A181/1871.json) | 保留原研究候选 |
| 312008 | 绝缘之旗印 | v7.2.0 | exact | A182 | GCG17S-A182 | [A182/1874.json](../../../physical-static-data/data/A182/1874.json) | 保留原研究候选 |
| 312009 | 将帅兜鍪 | v7.2.0 | exact | A133 | GCG10S-A133 | [A133/582.json](../../../physical-static-data/data/A133/582.json) | 保留原研究候选；子树含通配 |
| 312010 | 千岩牢固 | v7.2.0 | exact | A230 | GCG31S-A230 | [A230/2395.json](../../../physical-static-data/data/A230/2395.json) | 保留原研究候选；子树含通配 |
| 312011 | 虺雷之姿 | v7.2.0 | exact | A127 | GCG12S-A127 | [A127/654.json](../../../physical-static-data/data/A127/654.json) | 保留原研究候选 |
| 312012 | 辰砂往生录 | v7.2.0 | exact | A128 | GCG13S-A128 | [A128/692.json](../../../physical-static-data/data/A128/692.json) | 保留原研究候选 |
| 312013 | 无常之面 | v7.2.0 | exact | A033 | GCG04S-A033 | [A033/60.json](../../../physical-static-data/data/A033/60.json) | 保留原研究候选 |
| 312014 | 追忆之注连 | v7.2.0 | near | A034 | GCG04S-A034 | [A034/61.json](../../../physical-static-data/data/A034/61.json) | 保留原研究候选 |
| 312017 | 沙王的投影 | v7.2.0 | exact | A035 | GCG04S-A035 | [A035/62.json](../../../physical-static-data/data/A035/62.json) | 保留原研究候选 |
| 312018 | 饰金之梦 | v7.2.0 | exact | A231 | GCG28S-A231 | [A231/2398.json](../../../physical-static-data/data/A231/2398.json) | 保留原研究候选 |
| 312019 | 浮溯之珏 | v7.2.0 | exact | A232 | GCG28S-A232 | [A232/2402.json](../../../physical-static-data/data/A232/2402.json) | 保留原研究候选 |
| 312020 | 来歆余响 | v7.2.0 | exact | A185 | GCG17S-A185 | [A185/1877.json](../../../physical-static-data/data/A185/1877.json) | 保留原研究候选 |
| 312021 | 灵光明烁之心 | v7.2.0 | exact | A036 | GCG04B-A036 | [A036/2529.json](../../../physical-static-data/data/A036/2529.json) | 保留原研究候选 |
| 312022 | 花海甘露之光 | v7.2.0 | exact | A186 | GCG17S-A186 | [A186/1881.json](../../../physical-static-data/data/A186/1881.json) | 保留原研究候选 |
| 312025 | 黄金剧团的奖赏 | v7.2.0 | exact | A233 | GCG25S-A233 | [A233/2340.json](../../../physical-static-data/data/A233/2340.json) | 保留原研究候选 |
| 312027 | 紫晶的花冠 | v7.2.0 | exact | A234 | GCG25S-A234 | [A234/2342.json](../../../physical-static-data/data/A234/2342.json) | 保留原研究候选 |
| 312028 | 乐园遗落之花 | v7.2.0 | near | A235 | GCG25S-A235 | [A235/2346.json](../../../physical-static-data/data/A235/2346.json) | 保留原研究候选 |
| 312101 | 破冰踏雪的回音 | v7.2.0 | near | A120 | GCG12S-A120 | [A120/653.json](../../../physical-static-data/data/A120/653.json) | 保留原研究候选 |
| 312102 | 冰风迷途的勇士 | v7.2.0 | near | A037 | GCG05S-A037 | [A037/97.json](../../../physical-static-data/data/A037/97.json) | 保留原研究候选 |
| 312201 | 酒渍船帽 | v7.2.0 | near | A121 | GCG11S-A121 | [A121/617.json](../../../physical-static-data/data/A121/617.json) | 保留原研究候选 |
| 312202 | 沉沦之心 | v7.2.0 | near | A038 | GCG05S-A038 | [A038/98.json](../../../physical-static-data/data/A038/98.json) | 保留原研究候选 |
| 312301 | 焦灼的魔女帽 | v7.2.0 | near | A122 | GCG09S-A122 | [A122/543.json](../../../physical-static-data/data/A122/543.json) | 保留原研究候选 |
| 312302 | 炽烈的炎之魔女 | v7.2.0 | near | A039 | GCG04S-A039 | [A039/64.json](../../../physical-static-data/data/A039/64.json) | 保留原研究候选 |
| 312401 | 唤雷的头冠 | v7.2.0 | near | A123 | GCG13S-A123 | [A123/691.json](../../../physical-static-data/data/A123/691.json) | 保留原研究候选 |
| 312402 | 如雷的盛怒 | v7.2.0 | near | A040 | GCG06S-A040 | [A040/135.json](../../../physical-static-data/data/A040/135.json) | 保留原研究候选 |
| 312501 | 翠绿的猎人之冠 | v7.2.0 | near | A124 | GCG09S-A124 | [A124/544.json](../../../physical-static-data/data/A124/544.json) | 保留原研究候选 |
| 312502 | 翠绿之影 | v7.2.0 | near | A041 | GCG01S-A041 | [A041/151.json](../../../physical-static-data/data/A041/151.json) | 保留原研究候选 |
| 312601 | 不动玄石之相 | v7.2.0 | near | A126 | GCG10S-A126 | [A126/579.json](../../../physical-static-data/data/A126/579.json) | 保留原研究候选 |
| 312602 | 悠古的磐岩 | v7.2.0 | near | A042 | GCG03S-A042 | [A042/225.json](../../../physical-static-data/data/A042/225.json) | 保留原研究候选 |
| 312701 | 月桂的宝冠 | v7.2.0 | near | A125 | GCG14S-A125 | [A125/730.json](../../../physical-static-data/data/A125/730.json) | 保留原研究候选 |
| 312702 | 深林的记忆 | v7.2.0 | near | A043 | GCG02S-A043 | [A043/186.json](../../../physical-static-data/data/A043/186.json) | 保留原研究候选 |
| 313001 | 异色猎刀鳐 | v7.2.0 | exact | A236 | GCG32S-A236 | [A236/2573.json](../../../physical-static-data/data/A236/2573.json) | 保留原研究候选 |
| 313003 | 鳍游龙 | v7.2.0 | exact | A237 | GCG25S-A237 | [A237/2350.json](../../../physical-static-data/data/A237/2350.json) | 保留原研究候选 |
| 313007 | 浪船 | v7.2.0 | exact | A238 | GCG04B-A238 | [A238/2436.json](../../../physical-static-data/data/A238/2436.json) | 保留原研究候选 |
| 321001 | 璃月港口 | v7.2.0 | exact | A044 | GCG04S-A044 | [A044/65.json](../../../physical-static-data/data/A044/65.json) | 保留原研究候选 |
| 321002 | 骑士团图书馆 | v7.2.0 | exact | A045 | GCG17S-A045 | [A045/1885.json](../../../physical-static-data/data/A045/1885.json) | 保留原研究候选 |
| 321003 | 群玉阁 | v7.2.0 | near | A135 | GCG09S-A135 | [A135/545.json](../../../physical-static-data/data/A135/545.json) | 保留原研究候选 |
| 321005 | 望舒客栈 | v7.2.0 | exact | A136 | GCG09S-A136 | [A136/553.json](../../../physical-static-data/data/A136/553.json) | QA-28 满血自动不触发；撤销手写候选 |
| 321006 | 西风大教堂 | v7.2.0 | exact | A046 | GCG02S-A046 | [A046/189.json](../../../physical-static-data/data/A046/189.json) | M：QA-03 已采纳，满血时用 selectOption 选择是否触发 |
| 321007 | 天守阁 | v7.2.0 | near | A187 | GCG17S-A187 | [A187/1888.json](../../../physical-static-data/data/A187/1888.json) | 保留原研究候选 |
| 321009 | 珊瑚宫 | v7.2.0 | exact | A189 | GCG03B-A189 | [A189/1955.json](../../../physical-static-data/data/A189/1955.json) | 保留原研究候选 |
| 321010 | 须弥城 | v7.2.0 | exact | A190 | GCG17S-A190 | [A190/1896.json](../../../physical-static-data/data/A190/1896.json) | 保留原研究候选 |
| 321011 | 桓那兰那 | v7.2.0 | exact | A047 | GCG22S-A047 | [A047/1841.json](../../../physical-static-data/data/A047/1841.json) | 保留原研究候选 |
| 321012 | 镇守之森 | v7.2.0 | near | A239 | GCG25S-A239 | [A239/2352.json](../../../physical-static-data/data/A239/2352.json) | 保留原研究候选 |
| 321013 | 黄金屋 | v6.3.0 | exact | A137 | GCG09S-A137 | [A137/546.json](../../../physical-static-data/data/A137/546.json) | 保留原研究候选 |
| 321014 | 化城郭 | v7.2.0 | near | A240 | GCG25S-A240 | [A240/2356.json](../../../physical-static-data/data/A240/2356.json) | 保留原研究候选 |
| 321016 | 湖中垂柳 | v7.2.0 | exact | A241 | GCG25S-A241 | [A241/2366.json](../../../physical-static-data/data/A241/2366.json) | 保留原研究候选 |
| 322001 | 派蒙 | v7.2.0 | near | A048 | GCG22S-A048 | [A048/1846.json](../../../physical-static-data/data/A048/1846.json) | 保留原研究候选 |
| 322002 | 凯瑟琳 | v7.2.0 | exact | A140 | GCG11S-A140 | [A140/626.json](../../../physical-static-data/data/A140/626.json) | 保留原研究候选 |
| 322006 | 阿圆 | v7.2.0 | exact | A143 | GCG10S-A143 | [A143/587.json](../../../physical-static-data/data/A143/587.json) | 保留原研究候选 |
| 322007 | 提米 | v7.2.0 | near | A052 | GCG04S-A052 | [A052/69.json](../../../physical-static-data/data/A052/69.json) | 保留原研究候选 |
| 322009 | 常九爷 | v7.2.0 | exact | A141 | GCG09S-A141 | [A141/548.json](../../../physical-static-data/data/A141/548.json) | 保留原研究候选 |
| 322010 | 艾琳 | v7.2.0 | exact | A138 | GCG10S-A138 | [A138/585.json](../../../physical-static-data/data/A138/585.json) | 保留原研究候选 |
| 322011 | 田铁嘴 | v7.2.0 | exact | A054 | GCG04S-A054 | [A054/71.json](../../../physical-static-data/data/A054/71.json) | QA-07 不采纳自选；保留线上自动选择，撤销手写候选 |
| 322012 | 刘苏 | v7.2.0 | exact | A142 | GCG09S-A142 | [A142/549.json](../../../physical-static-data/data/A142/549.json) | 保留原研究候选 |
| 322013 | 花散里 | v7.2.0 | near | A191 | GCG03B-A191 | [A191/1961.json](../../../physical-static-data/data/A191/1961.json) | 保留原研究候选 |
| 322014 | 鲸井小弟 | v7.2.0 | near | A192 | GCG22S-A192 | [A192/1858.json](../../../physical-static-data/data/A192/1858.json) | 保留原研究候选 |
| 322015 | 旭东 | v7.2.0 | exact | A055 | GCG06S-A055 | [A055/142.json](../../../physical-static-data/data/A055/142.json) | 保留原研究候选 |
| 322017 | 拉娜 | v7.2.0 | exact | A139 | GCG10S-A139 | [A139/586.json](../../../physical-static-data/data/A139/586.json) | 保留原研究候选 |
| 322018 | 老章 | v5.3.0 | exact | A056 | GCG05S-A056 | [A056/105.json](../../../physical-static-data/data/A056/105.json) | 保留原研究候选 |
| 322019 | 塞塔蕾 | v7.2.0 | exact | A243 | GCG30S-A243 | [A243/2308.json](../../../physical-static-data/data/A243/2308.json) | 保留原研究候选 |
| 322020 | 弥生七月 | v7.2.0 | exact | A057 | GCG04S-A057 | [A057/72.json](../../../physical-static-data/data/A057/72.json) | 保留原研究候选 |
| 322023 | 西尔弗和迈勒斯 | v7.2.0 | exact | — | — | — | 排除实体白名单：整个实体来源缺失；子树含通配 |
| 323003 | 红羽团扇 | v7.2.0 | near | A145 | GCG09S-A145 | [A145/551.json](../../../physical-static-data/data/A145/551.json) | 报告修正：改选 v6.5.0，补 302303 v6.5.0；见 D 后修正表 |
| 323004 | 寻宝仙灵 | v7.2.0 | exact | A059 | GCG04S-A059 | [A059/74.json](../../../physical-static-data/data/A059/74.json) | 保留原研究候选 |
| 323005 | 化种匣 | v6.3.0 | exact | A146 | GCG09S-A146 | [A146/552.json](../../../physical-static-data/data/A146/552.json) | 保留原研究候选 |
| 323006 | 留念镜 | v7.2.0 | near | A245 | GCG30S-A245 | [A245/2314.json](../../../physical-static-data/data/A245/2314.json) | 保留原研究候选 |
| 323007 | 流明石触媒 | v7.2.0 | near | A194 | GCG17S-A194 | [A194/1925.json](../../../physical-static-data/data/A194/1925.json) | 保留原研究候选 |
| 330001 | 旧时庭园 | v7.2.0 | exact | A195 | GCG22S-A195 | [A195/1867.json](../../../physical-static-data/data/A195/1867.json) | 保留原研究候选 |
| 330003 | 愉舞欢游 | v7.2.0 | exact | A197 | GCG20S-A197 | [A197/1968.json](../../../physical-static-data/data/A197/1968.json) | 保留原研究候选 |
| 330004 | 自由的新风 | v7.2.0 | exact | A246 | GCG28S-A246 | [A246/2454.json](../../../physical-static-data/data/A246/2454.json) | 保留原研究候选 |
| 330005 | 万家灶火 | v4.3.0 | exact | A247 | GCG25S-A247 | [A247/2386.json](../../../physical-static-data/data/A247/2386.json) | 保留原研究候选 |
| 330007 | 抗争之日·碎梦之时 | v7.2.0 | exact | A248 | GCG30S-A248 | [A248/2315.json](../../../physical-static-data/data/A248/2315.json) | 保留原研究候选 |
| 330008 | 旧日鏖战 | v7.2.0 | exact | A198 | GCG17S-A198 | [A198/1929.json](../../../physical-static-data/data/A198/1929.json) | 保留原研究候选 |
| 331101 | 元素共鸣：交织之冰 | v7.2.0 | exact | A060 | GCG07S-A060 | [A060/303.json](../../../physical-static-data/data/A060/303.json) | 保留原研究候选 |
| 331102 | 元素共鸣：粉碎之冰 | v7.2.0 | exact | A061 | GCG07S-A061 | [A061/304.json](../../../physical-static-data/data/A061/304.json) | 保留原研究候选 |
| 331201 | 元素共鸣：交织之水 | v7.2.0 | exact | A062 | GCG05S-A062 | [A062/107.json](../../../physical-static-data/data/A062/107.json) | 保留原研究候选 |
| 331202 | 元素共鸣：愈疗之水 | v7.2.0 | exact | A063 | GCG05S-A063 | [A063/108.json](../../../physical-static-data/data/A063/108.json) | 保留原研究候选 |
| 331301 | 元素共鸣：交织之火 | v7.2.0 | exact | A064 | GCG08S-A064 | [A064/340.json](../../../physical-static-data/data/A064/340.json) | 保留原研究候选 |
| 331302 | 元素共鸣：热诚之火 | v7.2.0 | exact | A065 | GCG08S-A065 | [A065/341.json](../../../physical-static-data/data/A065/341.json) | 保留原研究候选 |
| 331401 | 元素共鸣：交织之雷 | v7.2.0 | exact | A066 | GCG06S-A066 | [A066/266.json](../../../physical-static-data/data/A066/266.json) | 保留原研究候选 |
| 331402 | 元素共鸣：强能之雷 | v5.4.0 | exact | A067 | GCG06S-A067 | [A067/267.json](../../../physical-static-data/data/A067/267.json) | 保留原研究候选 |
| 331501 | 元素共鸣：交织之风 | v7.2.0 | exact | A068 | GCG01S-A068 | [A068/159.json](../../../physical-static-data/data/A068/159.json) | 保留原研究候选 |
| 331502 | 元素共鸣：迅捷之风 | v5.4.0 | near | A069 | GCG01S-A069 | [A069/160.json](../../../physical-static-data/data/A069/160.json) | 保留原研究候选 |
| 331601 | 元素共鸣：交织之岩 | v7.2.0 | exact | A070 | GCG03S-A070 | [A070/234.json](../../../physical-static-data/data/A070/234.json) | 保留原研究候选 |
| 331602 | 元素共鸣：坚定之岩 | v5.4.0 | exact | A071 | GCG03S-A071 | [A071/235.json](../../../physical-static-data/data/A071/235.json) | 保留原研究候选 |
| 331701 | 元素共鸣：交织之草 | v7.2.0 | exact | A072 | GCG02S-A072 | [A072/196.json](../../../physical-static-data/data/A072/196.json) | 保留原研究候选 |
| 331702 | 元素共鸣：蔓生之草 | v5.4.0 | exact | A073 | GCG02S-A073 | [A073/197.json](../../../physical-static-data/data/A073/197.json) | 保留原研究候选 |
| 331801 | 风与自由 | v7.2.0 | exact | A147 | GCG02B-A147 | [A147/895.json](../../../physical-static-data/data/A147/895.json) | 保留原研究候选 |
| 331802 | 岩与契约 | v7.2.0 | near | A148 | GCG12S-A148 | [A148/661.json](../../../physical-static-data/data/A148/661.json) | 保留原研究候选 |
| 331803 | 雷与永恒 | v7.2.0 | near | A199 | GCG17S-A199 | [A199/1932.json](../../../physical-static-data/data/A199/1932.json) | 保留原研究候选 |
| 331804 | 草与智慧 | v7.2.0 | exact | A249 | GCG25S-A249 | [A249/2390.json](../../../physical-static-data/data/A249/2390.json) | 保留原研究候选 |
| 332001 | 最好的伙伴！ | v4.7.0 | near | A074 | GCG04S-A074 | [A074/75.json](../../../physical-static-data/data/A074/75.json) | 保留原研究候选 |
| 332002 | 换班时间 | v7.2.0 | exact | A075 | GCG04S-A075 | [A075/76.json](../../../physical-static-data/data/A075/76.json) | 保留原研究候选 |
| 332003 | 一掷乾坤 | v7.2.0 | exact | A076 | GCG04S-A076 | [A076/77.json](../../../physical-static-data/data/A076/77.json) | 保留原研究候选 |
| 332004 | 运筹帷幄 | v7.2.0 | exact | A077 | GCG04S-A077 | [A077/78.json](../../../physical-static-data/data/A077/78.json) | 保留原研究候选 |
| 332005 | 本大爷还没有输！ | v7.2.0 | near | A078 | GCG09S-A078 | [A078/556.json](../../../physical-static-data/data/A078/556.json) | 保留原研究候选 |
| 332006 | 交给我吧！ | v7.2.0 | exact | A079 | GCG04S-A079 | [A079/80.json](../../../physical-static-data/data/A079/80.json) | 保留原研究候选 |
| 332007 | 鹤归之时 | v7.2.0 | exact | A080 | GCG05S-A080 | [A080/115.json](../../../physical-static-data/data/A080/115.json) | 保留原研究候选 |
| 332008 | 星天之兆 | v7.2.0 | exact | A081 | GCG03S-A081 | [A081/43.json](../../../physical-static-data/data/A081/43.json) | 保留原研究候选 |
| 332009 | 白垩之术 | v7.2.0 | exact | A082 | GCG03S-A082 | [A082/44.json](../../../physical-static-data/data/A082/44.json) | QA-14 保持线上自动转移；撤销手写候选 |
| 332010 | 诸武精通 | v7.2.0 | exact | A150 | GCG16S-A150 | [A150/821.json](../../../physical-static-data/data/A150/821.json) | 保留原研究候选 |
| 332011 | 神宝迁宫祝词 | v7.2.0 | exact | A083 | GCG04S-A083 | [A083/81.json](../../../physical-static-data/data/A083/81.json) | 保留原研究候选 |
| 332012 | 快快缝补术 | v7.2.0 | exact | A084 | GCG05S-A084 | [A084/118.json](../../../physical-static-data/data/A084/118.json) | 保留原研究候选 |
| 332013 | 送你一程 | v6.3.0 | exact | A085 | GCG02S-A085 | [A085/207.json](../../../physical-static-data/data/A085/207.json) | 保留原研究候选 |
| 332014 | 护法之誓 | v7.2.0 | exact | A149 | GCG10S-A149 | [A149/591.json](../../../physical-static-data/data/A149/591.json) | 保留原研究候选 |
| 332017 | 下落斩 | v7.2.0 | exact | A202 | GCG20S-A202 | [A202/1976.json](../../../physical-static-data/data/A202/1976.json) | 保留原研究候选 |
| 332018 | 重攻击 | v7.2.0 | exact | A151 | GCG10S-A151 | [A151/592.json](../../../physical-static-data/data/A151/592.json) | 保留原研究候选 |
| 332020 | 永远的友谊 | v7.2.0 | exact | A152 | GCG10S-A152 | [A152/593.json](../../../physical-static-data/data/A152/593.json) | 保留原研究候选 |
| 332021 | 大梦的曲调 | v7.2.0 | exact | A204 | GCG19S-A204 | [A204/1840.json](../../../physical-static-data/data/A204/1840.json) | 保留原研究候选 |
| 332022 | 藏锋何处 | v7.2.0 | exact | A205 | GCG20S-A205 | [A205/1985.json](../../../physical-static-data/data/A205/1985.json) | 保留原研究候选 |
| 332023 | 拳力斗技！ | v7.2.0 | exact | A153 | GCG10S-A153 | [A153/594.json](../../../physical-static-data/data/A153/594.json) | 保留原研究候选 |
| 332024 | 琴音之诗 | v7.2.0 | exact | A250 | GCG30S-A250 | [A250/2317.json](../../../physical-static-data/data/A250/2317.json) | 保留原研究候选 |
| 332026 | 坍陷与契机 | v7.2.0 | exact | A251 | GCG30S-A251 | [A251/2319.json](../../../physical-static-data/data/A251/2319.json) | 保留原研究候选 |
| 332027 | 浮烁的四叶印 | v7.2.0 | exact | A252 | GCG30S-A252 | [A252/2322.json](../../../physical-static-data/data/A252/2322.json) | 保留原研究候选；子树含通配 |
| 333001 | 绝云锅巴 | v7.2.0 | exact | A154 | GCG09S-A154 | [A154/562.json](../../../physical-static-data/data/A154/562.json) | 保留原研究候选 |
| 333002 | 仙跳墙 | v7.2.0 | exact | A086 | GCG19S-A086 | [A086/1845.json](../../../physical-static-data/data/A086/1845.json) | 保留原研究候选 |
| 333003 | 莲花酥 | v7.2.0 | near | A087 | GCG19S-A087 | [A087/1849.json](../../../physical-static-data/data/A087/1849.json) | 保留原研究候选 |
| 333004 | 北地烟熏鸡 | v7.2.0 | near | A155 | GCG09S-A155 | [A155/563.json](../../../physical-static-data/data/A155/563.json) | 保留原研究候选 |
| 333005 | 甜甜花酿鸡 | v7.2.0 | exact | A088 | GCG01S-A088 | [A088/169.json](../../../physical-static-data/data/A088/169.json) | 保留原研究候选 |
| 333006 | 蒙德土豆饼 | v7.2.0 | exact | A089 | GCG01S-A089 | [A089/170.json](../../../physical-static-data/data/A089/170.json) | 保留原研究候选 |
| 333007 | 烤蘑菇披萨 | v7.2.0 | near | A090 | GCG30S-A090 | [A090/2324.json](../../../physical-static-data/data/A090/2324.json) | 保留原研究候选 |
| 333008 | 兽肉薄荷卷 | v7.2.0 | near | A156 | GCG10S-A156 | [A156/600.json](../../../physical-static-data/data/A156/600.json) | 保留原研究候选 |
| 333009 | 提瓦特煎蛋 | v7.2.0 | exact | A091 | GCG01S-A091 | [A091/172.json](../../../physical-static-data/data/A091/172.json) | 保留原研究候选 |
| 333010 | 刺身拼盘 | v7.2.0 | exact | A206 | GCG19S-A206 | [A206/1851.json](../../../physical-static-data/data/A206/1851.json) | 保留原研究候选 |
| 333011 | 唐杜尔烤鸡 | v7.2.0 | exact | A207 | GCG27S-A207 | [A207/2321.json](../../../physical-static-data/data/A207/2321.json) | 保留原研究候选 |
| 333012 | 黄油蟹蟹 | v7.2.0 | exact | A253 | GCG27S-A253 | [A253/2325.json](../../../physical-static-data/data/A253/2325.json) | 保留原研究候选 |
| 333013 | 炸鱼薯条 | v7.2.0 | exact | A254 | GCG27S-A254 | [A254/2327.json](../../../physical-static-data/data/A254/2327.json) | 保留原研究候选 |
| 333016 | 龙龙饼干 | v7.2.0 | exact | A255 | GCG27S-A255 | [A255/2331.json](../../../physical-static-data/data/A255/2331.json) | 保留原研究候选 |

版本分布：v3.7.0 × 1；v4.3.0 × 1；v4.5.0 × 3；v4.7.0 × 1；v5.0.0 × 2；v5.2.0 × 2；v5.3.0 × 3；v5.4.0 × 9；v5.6.0 × 3；v5.8.0 × 6；v6.2.0 × 7；v6.3.0 × 6；v6.4.0 × 3；v6.5.0 × 5；v6.6.0 × 1；v7.0.0 × 2；v7.2.0 × 229。

**B. 无推荐 43 项与补入蒂玛乌斯**

M＝需手写或数值适配；R＝组合/代码证据支持复用但仍需整组验证；D＝资料/规则裁定（本会话结束时已无 D 项）。状态只是报告处置，不回写原研究。

| ID | 名称 | 研究自身/子树 | code / 发行记录 | 来源 | 处置 | 结论 |
| --- | --- | --- | --- | --- | --- | --- |
| 1108 | 七七 | exact/different | C037 / GCG20S-C037 | [C037/1797.json](../../../physical-static-data/data/C037/1797.json) | R | v7.0.0 本体；度厄真符标题粘连，QA 已保留线上治疗对象及时序 |
| 1204 | 达达利亚 | different/not_evaluated | C038 / GCG18S-C038 | [C038/1791.json](../../../physical-static-data/data/C038/1791.json) | R | v7.2.0 整组复核；近战结束恢复写在不同对象 |
| 1208 | 妮露 | different/not_evaluated | C058 / GCG26S-C058 | [C058/2242.json](../../../physical-static-data/data/C058/2242.json) | R | Q04 已确认 3 水，源 1 水错误；不因该字段手写，待重核版本 |
| 1309 | 迪希雅 | exact/unknown | C061 / GCG29S-C061 | [C061/2252.json](../../../physical-static-data/data/C061/2252.json) | R | Q06 已确认沿用线上准备型元素爆发、不额外充能；待整组版本技术复核 |
| 1407 | 雷电将军 | near/unknown | C044 / GCG17S-C044 | [C044/1788.json](../../../physical-static-data/data/C044/1788.json) | R | 来源已确认 T088；整组版本待技术复核 |
| 1408 | 八重神子 | exact/unknown | C045 / GCG21S-C045 | [C045/1800.json](../../../physical-static-data/data/C045/1800.json) | R | 来源已确认 T090；整组版本待技术复核 |
| 1503 | 温迪 | exact/different | C028 / GCG09S-C028 | [C028/465.json](../../../physical-static-data/data/C028/465.json) | R | v5.4.0 复用候选；QA-63/64 保留线上减费及重建，不新增覆盖 |
| 1505 | 枫原万叶 | different/not_evaluated | C046 / GCG23S-C046 | [C046/1806.json](../../../physical-static-data/data/C046/1806.json) | R | T092 含千早振扩散转换；QA-72/73 快速切换及重建均沿用线上 |
| 1605 | 荒泷一斗 | exact/unknown | C047 / GCG19S-C047 | [C047/1794.json](../../../physical-static-data/data/C047/1794.json) | R | T094 已确认；阿丑参考 v6.4.0，QA-75 保留该历史定义的重建行为 |
| 1606 | 五郎 | exact/unknown | C048 / GCG19S-C048 | [C048/1795.json](../../../physical-static-data/data/C048/1795.json) | R | 大将威仪已确认 T098；旗指物标题规范化及整组技术复核 |
| 1607 | 云堇 | exact/different | C066 / GCG32S-C066 | [C066/2260.json](../../../physical-static-data/data/C066/2260.json) | M | 16074 只统计调和，不统计舍弃 |
| 1703 | 纳西妲 | different/not_evaluated | C067 / GCG25S-C067 | [C067/2239.json](../../../physical-static-data/data/C067/2239.json) | R | Q05a 已确认 17033 为元素战技；源类型编码错误，不作爆发覆盖 |
| 1704 | 瑶瑶 | exact/unknown | C032 / GCG14S-C032 | [C032/481.json](../../../physical-static-data/data/C032/481.json) | R | 来源已确认 T063；基础/天赋强化与整组版本待技术复核 |
| 2205 | 丘丘水行游侠 | different/not_evaluated | C068 / GCG27S-C068 | [C068/2247.json](../../../physical-static-data/data/C068/2247.json) | M | 10 HP；v6.6.0 技能作为实现参考 |
| 2404 | 愚人众·雷萤术士 | different/not_evaluated | C070 / GCG28S-C070 | [C070/2250.json](../../../physical-static-data/data/C070/2250.json) | M | Q07 已确认 24043 三雷三充能、角色最大充能 3；执行与展示同步适配 |
| 2502 | 特瓦林 | different/not_evaluated | C071 / GCG31S-C071 | [C071/2259.json](../../../physical-static-data/data/C071/2259.json) | R | Q05b 已确认 25023 为元素战技；源类型编码错误，不作爆发覆盖 |
| 2601 | 丘丘岩盔王 | different/not_evaluated | C036 / GCG13S-C036 | [C036/477.json](../../../physical-static-data/data/C036/477.json) | M | 仅适配 8 HP；QA-66/81 岩盔直接用线上行为，不做合并 |
| 211081 | 起死回骸 | exact/different | A157 / GCG20S-A157 | [A157/1886.json](../../../physical-static-data/data/A157/1886.json) | R | 跟随七七整组；不是天赋自身不同 |
| 212041 | 深渊之灾·凝水盛放 | exact/different | A158 / GCG20S-A158 | [A158/1891.json](../../../physical-static-data/data/A158/1891.json) | R | 跟随达达利亚整组，不重复恢复远程 |
| 212081 | 星天的花雨 | exact/different | A211 / GCG26S-A211 | [A211/2448.json](../../../physical-static-data/data/A211/2448.json) | R | Q04 已确认 12082 为 3 水；天赋共用正确技能，待整组技术复核 |
| 214081 | 神篱之御荫 | exact/unknown | A165 / GCG03B-A165 | [A165/1856.json](../../../physical-static-data/data/A165/1856.json) | R | 杀生樱来源已确认 T090；整组技术复核 |
| 215051 | 风物之诗咏 | exact/different | A166 / GCG03B-A166 | [A166/1860.json](../../../physical-static-data/data/A166/1860.json) | R | 跟随万叶整组，不删除扩散转换 |
| 216061 | 犬奔·疾如风 | exact/different | A168 / GCG03B-A168 | [A168/1868.json](../../../physical-static-data/data/A168/1868.json) | R | 大将威仪已确认 T098；旗指物规范化与整组技术复核 |
| 217041 | 慈惠仁心 | exact/unknown | A105 / GCG02B-A105 | [A105/846.json](../../../physical-static-data/data/A105/846.json) | R | 月桂来源已确认 T063；复核天赋强化，非来源待定 |
| 223011 | 悉数讨回 | exact/different | A107 / GCG14S-A107 | [A107/724.json](../../../physical-static-data/data/A107/724.json) | R | 基础潜行+天赋一起比较，保留三次潜行与火附魔 |
| 226011 | 重铸：岩盔 | different/not_evaluated | A109 / GCG13S-A109 | [A109/685.json](../../../physical-static-data/data/A109/685.json) | R | QA-66/81 岩盔直接应用线上行为，不做调整 |
| 227011 | 孢子增殖 | different/not_evaluated | A018 / GCG02S-A018 | [A018/182.json](../../../physical-static-data/data/A018/182.json) | R | 现有实现就是上限 3→4，不立即加层 |
| 312015 | 海祇之冠 | different/not_evaluated | A183 / GCG03B-A183 | [A183/1928.json](../../../physical-static-data/data/A183/1928.json) | M | QA-34 已确认伤害时清空全部泡沫；见主报告手写表 |
| 312016 | 海染砗磲 | different/not_evaluated | A184 / GCG03B-A184 | [A184/1933.json](../../../physical-static-data/data/A184/1933.json) | M | QA-35/36 已确认清空泡沫、入场治疗 3、按我方所有角色实际治疗累计 |
| 321008 | 鸣神大社 | different/not_evaluated | A188 / GCG17S-A188 | [A188/1892.json](../../../physical-static-data/data/A188/1892.json) | M | 见主报告手写表与下列原文快照 |
| 321015 | 风龙废墟 | different/not_evaluated | A134 / GCG10S-A134 | [A134/583.json](../../../physical-static-data/data/A134/583.json) | R | QA-04 全局沿用线上定向检索；源码复核起点 v7.2.0，见主报告复用表 |
| 321022 | 圣火竞技场 | different/not_evaluated | A242 / GCG31S-A242 | [A242/2439.json](../../../physical-static-data/data/A242/2439.json) | R | Q09 已沿用 randomElement；v7.2.0 源码复用候选，不因随机方式手写 |
| 322003 | 蒂玛乌斯 | 未纳入/未纳入 | A049 / GCG04S-A049 | [A049/68.json](../../../physical-static-data/data/A049/68.json) | M | 原研究遗漏；补免费装备成功后整局一次抓牌 |
| 322004 | 瓦格纳 | different/not_evaluated | A050 / GCG05S-A050 | [A050/102.json](../../../physical-static-data/data/A050/102.json) | M | 见主报告手写表与下列原文快照 |
| 322005 | 卯师傅 | different/not_evaluated | A051 / GCG06S-A051 | [A051/139.json](../../../physical-static-data/data/A051/139.json) | R | QA-04 全局沿用线上定向检索；源码复核起点 v7.2.0，见主报告复用表 |
| 322008 | 立本 | different/not_evaluated | A053 / GCG22S-A053 | [A053/1854.json](../../../physical-static-data/data/A053/1854.json) | M | Q08 已确认累计上限 3，本次每种最多 1、跨回合可重复，万能独立；使用 selectOption |
| 322016 | 迪娜泽黛 | different/not_evaluated | A193 / GCG30S-A193 | [A193/2307.json](../../../physical-static-data/data/A193/2307.json) | R | QA-04 全局沿用线上定向检索；源码复核起点 v7.2.0，见主报告复用表 |
| 322022 | 婕德 | different/not_evaluated | A244 / GCG30S-A244 | [A244/2310.json](../../../physical-static-data/data/A244/2310.json) | R | Q10/QA-43 整体沿用线上计数及状态生成；复用候选 v7.2.0，不取 v4.5.0 |
| 323001 | 参量质变仪 | different/not_evaluated | A058 / GCG04S-A058 | [A058/73.json](../../../physical-static-data/data/A058/73.json) | R | Q09 已沿用 randomElement；v7.2.0 源码复用候选，不因随机方式手写 |
| 323002 | 便携营养袋 | different/not_evaluated | A144 / GCG09S-A144 | [A144/550.json](../../../physical-static-data/data/A144/550.json) | R | QA-04 全局沿用线上定向检索；源码复核起点 v7.2.0，见主报告复用表 |
| 330002 | 磐岩盟契 | different/not_evaluated | A196 / GCG03B-A196 | [A196/1982.json](../../../physical-static-data/data/A196/1982.json) | R | Q09 已沿用 randomElement；v7.2.0 源码复用候选，不因随机方式手写 |
| 332015 | 深渊的呼唤 | different/not_evaluated | A200 / GCG03B-A200 | [A200/1997.json](../../../physical-static-data/data/A200/1997.json) | M | 见主报告手写表与下列原文快照 |
| 332016 | 愚人众的阴谋 | different/not_evaluated | A201 / GCG03B-A201 | [A201/2001.json](../../../physical-static-data/data/A201/2001.json) | M | 见主报告手写表与下列原文快照 |
| 332019 | 温妮莎传奇 | different/not_evaluated | A203 / GCG22S-A203 | [A203/1882.json](../../../physical-static-data/data/A203/1882.json) | R | Q09 已沿用 randomElement；v7.2.0 源码复用候选，不因随机方式手写 |


**C. 手写与资料裁定的 52 项实体原文快照**

B 的 44 项加 A 中原列补充手写候选的 8 项。该集合保留研究历史，并非当前确定手写数量；QA 裁定已让部分项目改为线上复用或撤销。保留原费用和技能类型，不纠正源数据，实体检索原文也保留溯源，实际要求以 QA-04 为准。费用编码：0冰、1水、2火、3雷、4岩、5草、6风、7相同元素、8无色、9充能。技能类型：1普攻、2战技、3爆发、4被动。空费用字段不擅自等同于免费。

**1108 七七 — GCG20S-C037**

来源：[C037/1797.json](../../../physical-static-data/data/C037/1797.json)；现有定义入口：[src/old_versions/v7.0.0.gts](../../packages/data/src/old_versions/v7.0.0.gts)（analyzer 行 18）。

hp=10；打出骰费=[{"element": 0}]；充能费=None；每组上限=0。

| 技能 | 类型 | 原费用列表 | 描述 |
| --- | --- | --- | --- |
| 云来古剑法 | 1 | [{"code": 0, "codeDesc": "冰元素", "number": 1}, {"code": 8, "codeDesc": "无色元素", "number": 2}] | 造成2点{{物理伤害}}。 |
| 仙法·寒病鬼差 | 2 | [{"code": 0, "codeDesc": "冰元素", "number": 3}] | 召唤「寒病鬼差」。 |
| 仙法·救苦度厄 | 3 | [{"code": 0, "codeDesc": "冰元素", "number": 3}, {"code": 9, "codeDesc": "充能花费", "number": 3}] | 造成3点{{冰元素伤害}}，生成「度厄真符」。 |

**1204 达达利亚 — GCG18S-C038**

来源：[C038/1791.json](../../../physical-static-data/data/C038/1791.json)；现有定义入口：[src/characters/hydro/tartaglia.gts](../../packages/data/src/characters/hydro/tartaglia.gts)（analyzer 行 204）。

hp=10；打出骰费=[{"element": 1}]；充能费=None；每组上限=0。

| 技能 | 类型 | 原费用列表 | 描述 |
| --- | --- | --- | --- |
| 断雨 | 1 | [{"code": 1, "codeDesc": "水元素", "number": 1}, {"code": 8, "codeDesc": "无色元素", "number": 2}] | 造成2点{{物理伤害}}。 |
| 魔王武装·狂澜 | 2 | [{"code": 1, "codeDesc": "水元素", "number": 3}] | 切换为「近战状态」，然后造成2点{{水元素伤害}}，并使目标角色附属「断流」。 |
| 极恶技·尽灭闪 | 3 | [{"code": 1, "codeDesc": "水元素", "number": 3}, {"code": 9, "codeDesc": "充能花费", "number": 3}] | 远程状态·魔弹一闪：造成5点{{水元素伤害}}，返还2点充能，目标角色附属「断流」。<br>近战状态·尽灭水光：造成7点{{水元素伤害}}。 |
| 遏浪 | 4 | null | 战斗开始时，初始附属「远程状态」。 |

**1208 妮露 — GCG26S-C058**

来源：[C058/2242.json](../../../physical-static-data/data/C058/2242.json)；现有定义入口：[src/characters/hydro/nilou.gts](../../packages/data/src/characters/hydro/nilou.gts)（analyzer 行 144）。

hp=10；打出骰费=[{"element": 1}]；充能费=None；每组上限=0。

| 技能 | 类型 | 原费用列表 | 描述 |
| --- | --- | --- | --- |
| 弦月舞步 | 1 | [{"code": 1, "codeDesc": "水元素", "number": 1}, {"code": 8, "codeDesc": "无色元素", "number": 2}] | 造成2点{{物理伤害}}。 |
| 七域舞步 | 2 | [{"code": 1, "codeDesc": "水元素", "number": 1}] | 造成3点{{水元素伤害}}，如果队伍中包含水元素角色和草元素角色且不包含其他元素的角色，就生成「金杯的丰馈」。 |
| 浮莲舞步·远梦聆泉 | 3 | [{"code": 1, "codeDesc": "水元素", "number": 3}, {"code": 9, "codeDesc": "充能花费", "number": 2}] | 造成2点{{水元素伤害}}，目标及下一个角色附属「永世流沔」。 |

**1309 迪希雅 — GCG29S-C061**

来源：[C061/2252.json](../../../physical-static-data/data/C061/2252.json)；现有定义入口：[src/characters/pyro/dehya.gts](../../packages/data/src/characters/pyro/dehya.gts)（analyzer 行 178）。

hp=10；打出骰费=[{"element": 2}]；充能费=None；每组上限=0。

| 技能 | 类型 | 原费用列表 | 描述 |
| --- | --- | --- | --- |
| 拂金剑斗术 | 1 | [{"code": 2, "codeDesc": "火元素", "number": 1}, {"code": 8, "codeDesc": "无色元素", "number": 2}] | 造成2点{{物理伤害}}。 |
| 熔铁流狱 | 2 | [{"code": 2, "codeDesc": "火元素", "number": 3}] | 召唤「净焰剑狱领域」；如果已存在「净焰剑狱领域」，就先造成1点{{火元素伤害}}。 |
| 炎啸狮子咬 | 3 | [{"code": 2, "codeDesc": "火元素", "number": 4}, {"code": 9, "codeDesc": "充能花费", "number": 2}] | 造成3点{{火元素伤害}}，然后准备技能：「焚落踢」。 |

**1407 雷电将军 — GCG17S-C044**

来源：[C044/1788.json](../../../physical-static-data/data/C044/1788.json)；现有定义入口：[src/characters/electro/raiden_shogun.gts](../../packages/data/src/characters/electro/raiden_shogun.gts)（analyzer 行 138）。

hp=10；打出骰费=[{"element": 3}]；充能费=None；每组上限=0。

| 技能 | 类型 | 原费用列表 | 描述 |
| --- | --- | --- | --- |
| 源流 | 1 | [{"code": 3, "codeDesc": "雷元素", "number": 1}, {"code": 8, "codeDesc": "无色元素", "number": 2}] | 造成2点{{物理伤害}}。 |
| 神变·恶曜开眼 | 2 | [{"code": 3, "codeDesc": "雷元素", "number": 3}] | 召唤「雷罚恶曜之眼」。 |
| 奥义·梦想真说 | 3 | [{"code": 3, "codeDesc": "雷元素", "number": 3}, {"code": 9, "codeDesc": "充能花费", "number": 2}] | 造成3点{{雷元素伤害}}，其他我方角色获得2点充能。 |
| 诸愿百眼之轮 | 4 | null | 战斗开始时，初始附属「诸愿百眼之轮」。 |

**1408 八重神子 — GCG21S-C045**

来源：[C045/1800.json](../../../physical-static-data/data/C045/1800.json)；现有定义入口：[src/characters/electro/yae_miko.gts](../../packages/data/src/characters/electro/yae_miko.gts)（analyzer 行 137）。

hp=10；打出骰费=[{"element": 3}]；充能费=None；每组上限=0。

| 技能 | 类型 | 原费用列表 | 描述 |
| --- | --- | --- | --- |
| 狐灵食罪式 | 1 | [{"code": 3, "codeDesc": "雷元素", "number": 1}, {"code": 8, "codeDesc": "无色元素", "number": 2}] | 造成1点{{雷元素伤害}}。 |
| 野干役咒·杀生樱 | 2 | [{"code": 3, "codeDesc": "雷元素", "number": 3}] | 召唤「杀生樱」。如果场上原本已存在「杀生樱」，则额外使其造成的伤害+1。（最多+1） |
| 大密法·天狐显真 | 3 | [{"code": 3, "codeDesc": "雷元素", "number": 3}, {"code": 9, "codeDesc": "充能花费", "number": 2}] | 造成4点{{雷元素伤害}}；如果我方场上存在「杀生樱」，则将其消灭，然后生成「天狐霆雷」。 |

**1503 温迪 — GCG09S-C028**

来源：[C028/465.json](../../../physical-static-data/data/C028/465.json)；现有定义入口：[src/old_versions/v5.4.0.gts](../../packages/data/src/old_versions/v5.4.0.gts)（analyzer 行 163）。

hp=10；打出骰费=[{"element": 6}]；充能费=None；每组上限=0。

| 技能 | 类型 | 原费用列表 | 描述 |
| --- | --- | --- | --- |
| 神代射术 | 1 | [{"code": 6, "codeDesc": "风元素", "number": 1}, {"code": 8, "codeDesc": "无色元素", "number": 2}] | 造成2点{{物理伤害}}。 |
| 高天之歌 | 2 | [{"code": 6, "codeDesc": "风元素", "number": 3}] | 造成2点{{风元素伤害}}，生成「风域」。 |
| 风神之诗 | 3 | [{"code": 6, "codeDesc": "风元素", "number": 3}, {"code": 9, "codeDesc": "充能花费", "number": 2}] | 造成2点{{风元素伤害}}，召唤「暴风之眼」。 |

**1505 枫原万叶 — GCG23S-C046**

来源：[C046/1806.json](../../../physical-static-data/data/C046/1806.json)；现有定义入口：[src/characters/anemo/kaedehara_kazuha.gts](../../packages/data/src/characters/anemo/kaedehara_kazuha.gts)（analyzer 行 357）。

hp=10；打出骰费=[{"element": 6}]；充能费=None；每组上限=0。

| 技能 | 类型 | 原费用列表 | 描述 |
| --- | --- | --- | --- |
| 我流剑术 | 1 | [{"code": 6, "codeDesc": "风元素", "number": 1}, {"code": 8, "codeDesc": "无色元素", "number": 2}] | 造成2点{{物理伤害}}。 |
| 千早振 | 2 | [{"code": 6, "codeDesc": "风元素", "number": 3}] | 造成1点{{风元素伤害}}，本角色附属「乱岚拨止」。此技能结算后：我方切换到下一个角色。 |
| 万叶之一刀 | 3 | [{"code": 6, "codeDesc": "风元素", "number": 3}, {"code": 9, "codeDesc": "充能花费", "number": 2}] | 造成1点{{风元素伤害}}，召唤「流风秋野」。 |

**1605 荒泷一斗 — GCG19S-C047**

来源：[C047/1794.json](../../../physical-static-data/data/C047/1794.json)；现有定义入口：[src/characters/geo/arataki_itto.gts](../../packages/data/src/characters/geo/arataki_itto.gts)（analyzer 行 161）。

hp=10；打出骰费=[{"element": 4}]；充能费=None；每组上限=0。

| 技能 | 类型 | 原费用列表 | 描述 |
| --- | --- | --- | --- |
| 喧哗屋传说 | 1 | [{"code": 4, "codeDesc": "岩元素", "number": 1}, {"code": 8, "codeDesc": "无色元素", "number": 2}] | 造成2点{{物理伤害}}。 |
| 魔杀绝技·赤牛发破！ | 2 | [{"code": 4, "codeDesc": "岩元素", "number": 3}] | 造成1点{{岩元素伤害}}，召唤「阿丑」，本角色附属「乱神之怪力」。 |
| 最恶鬼王·一斗轰临！！ | 3 | [{"code": 4, "codeDesc": "岩元素", "number": 3}, {"code": 9, "codeDesc": "充能花费", "number": 3}] | 造成4点{{岩元素伤害}}，本角色附属「怒目鬼王」。 |

**1606 五郎 — GCG19S-C048**

来源：[C048/1795.json](../../../physical-static-data/data/C048/1795.json)；现有定义入口：[src/characters/geo/gorou.gts](../../packages/data/src/characters/geo/gorou.gts)（analyzer 行 111）。

hp=10；打出骰费=[{"element": 4}]；充能费=None；每组上限=0。

| 技能 | 类型 | 原费用列表 | 描述 |
| --- | --- | --- | --- |
| 呲牙裂扇箭 | 1 | [{"code": 4, "codeDesc": "岩元素", "number": 1}, {"code": 8, "codeDesc": "无色元素", "number": 2}] | 造成2点{{物理伤害}}。 |
| 犬坂吠吠方圆阵 | 2 | [{"code": 4, "codeDesc": "岩元素", "number": 3}] | 造成2点{{岩元素伤害}}，生成「大将旗指物」。 |
| 兽牙逐突形胜战法 | 3 | [{"code": 4, "codeDesc": "岩元素", "number": 3}, {"code": 9, "codeDesc": "充能花费", "number": 2}] | 造成2点{{岩元素伤害}}，生成「大将旗指物」，召唤「大将威仪」。 |

**1607 云堇 — GCG32S-C066**

来源：[C066/2260.json](../../../physical-static-data/data/C066/2260.json)；现有定义入口：[src/characters/geo/yun_jin.gts](../../packages/data/src/characters/geo/yun_jin.gts)（analyzer 行 167）。

hp=10；打出骰费=[{"element": 4}]；充能费=None；每组上限=0。

| 技能 | 类型 | 原费用列表 | 描述 |
| --- | --- | --- | --- |
| 拂云出手 | 1 | [{"code": 4, "codeDesc": "岩元素", "number": 1}, {"code": 8, "codeDesc": "无色元素", "number": 2}] | 造成2点{{物理伤害}}。 |
| 旋云开相 | 2 | [{"code": 4, "codeDesc": "岩元素", "number": 3}] | 生成「飞云旗阵」，本角色附属「旋云护盾」并准备技能：「长枪开相」。 |
| 破嶂见旌仪 | 3 | [{"code": 4, "codeDesc": "岩元素", "number": 3}, {"code": 9, "codeDesc": "充能花费", "number": 2}] | 造成3点{{岩元素伤害}}，生成3层「飞云旗阵」。 |

**1703 纳西妲 — GCG25S-C067**

来源：[C067/2239.json](../../../physical-static-data/data/C067/2239.json)；现有定义入口：[src/characters/dendro/nahida.gts](../../packages/data/src/characters/dendro/nahida.gts)（analyzer 行 203）。

hp=10；打出骰费=[{"element": 5}]；充能费=None；每组上限=0。

| 技能 | 类型 | 原费用列表 | 描述 |
| --- | --- | --- | --- |
| 行相 | 1 | [{"code": 5, "codeDesc": "草元素", "number": 1}, {"code": 8, "codeDesc": "无色元素", "number": 2}] | 造成1点{{草元素伤害}}。 |
| 所闻遍计 | 2 | [{"code": 5, "codeDesc": "草元素", "number": 3}] | 造成2点{{草元素伤害}}，目标角色附属「蕴种印」；如果在附属前目标角色已附属有「蕴种印」，就改为对所有敌方角色附属「蕴种印」。 |
| 所闻遍计·真如 | 3 | [{"code": 5, "codeDesc": "草元素", "number": 5}] | 造成3点{{草元素伤害}}，所有敌方角色附属「蕴种印」。 |
| 心景幻成 | 3 | [{"code": 5, "codeDesc": "草元素", "number": 3}, {"code": 9, "codeDesc": "充能花费", "number": 2}] | 造成4点{{草元素伤害}}，生成「摩耶之殿」。 |

**1704 瑶瑶 — GCG14S-C032**

来源：[C032/481.json](../../../physical-static-data/data/C032/481.json)；现有定义入口：[src/characters/dendro/yaoyao.gts](../../packages/data/src/characters/dendro/yaoyao.gts)（analyzer 行 132）。

hp=10；打出骰费=[{"element": 5}]；充能费=None；每组上限=0。

| 技能 | 类型 | 原费用列表 | 描述 |
| --- | --- | --- | --- |
| 颠扑连环枪 | 1 | [{"code": 5, "codeDesc": "草元素", "number": 1}, {"code": 8, "codeDesc": "无色元素", "number": 2}] | 造成2点{{物理伤害}}。 |
| 云台团团降芦菔 | 2 | [{"code": 5, "codeDesc": "草元素", "number": 3}] | 召唤「月桂·抛掷型」。 |
| 玉颗珊珊月中落 | 3 | [{"code": 5, "codeDesc": "草元素", "number": 4}, {"code": 9, "codeDesc": "充能花费", "number": 2}] | 造成1点{{草元素伤害}}，生成「桂子仙机」。 |

**2205 丘丘水行游侠 — GCG27S-C068**

来源：[C068/2247.json](../../../physical-static-data/data/C068/2247.json)；现有定义入口：[src/old_versions/v5.6.0.gts](../../packages/data/src/old_versions/v5.6.0.gts)（analyzer 行 228）。

hp=10；打出骰费=[{"element": 1}]；充能费=None；每组上限=0。

| 技能 | 类型 | 原费用列表 | 描述 |
| --- | --- | --- | --- |
| 镰刀旋斩 | 1 | [{"code": 1, "codeDesc": "水元素", "number": 1}, {"code": 8, "codeDesc": "无色元素", "number": 2}] | 造成2点{{物理伤害}}。 |
| 狂澜镰击 | 2 | [{"code": 1, "codeDesc": "水元素", "number": 3}] | 造成3点{{水元素伤害}}。<br>如果有敌方角色附属有「冻结」或「水泡围困」，则本角色获得1点充能。（每回合1次） |
| 浮泡攻势 | 3 | [{"code": 1, "codeDesc": "水元素", "number": 3}, {"code": 9, "codeDesc": "充能花费", "number": 2}] | 造成4点{{水元素伤害}}，生成手牌「水泡史莱姆」。<br>（装备有「水泡史莱姆」的角色可以使用特技：「水泡战法」） |

**2404 愚人众·雷萤术士 — GCG28S-C070**

来源：[C070/2250.json](../../../physical-static-data/data/C070/2250.json)；现有定义入口：[src/characters/electro/fatui_electro_cicin_mage.gts](../../packages/data/src/characters/electro/fatui_electro_cicin_mage.gts)（analyzer 行 174）。

hp=10；打出骰费=[{"element": 3}]；充能费=None；每组上限=0。

| 技能 | 类型 | 原费用列表 | 描述 |
| --- | --- | --- | --- |
| 轰闪落雷 | 1 | [{"code": 3, "codeDesc": "雷元素", "number": 1}, {"code": 8, "codeDesc": "无色元素", "number": 2}] | 造成1点{{雷元素伤害}}。 |
| 雾虚之召 | 2 | [{"code": 3, "codeDesc": "雷元素", "number": 3}] | 召唤「雷萤」。 |
| 霆雷之护 | 3 | [{"code": 3, "codeDesc": "雷元素", "number": 3}, {"code": 9, "codeDesc": "充能花费", "number": 3}] | 造成1点{{雷元素伤害}}，本角色附着雷元素，生成「雷萤护罩」并准备技能：「霆电迸发」。 |

**2502 特瓦林 — GCG31S-C071**

来源：[C071/2259.json](../../../physical-static-data/data/C071/2259.json)；现有定义入口：[src/characters/anemo/dvalin.gts](../../packages/data/src/characters/anemo/dvalin.gts)（analyzer 行 191）。

hp=10；打出骰费=[{"element": 6}]；充能费=None；每组上限=0。

| 技能 | 类型 | 原费用列表 | 描述 |
| --- | --- | --- | --- |
| 裂爪横击 | 1 | [{"code": 6, "codeDesc": "风元素", "number": 1}, {"code": 8, "codeDesc": "无色元素", "number": 2}] | 造成2点{{物理伤害}}。 |
| 暴风轰击 | 2 | [{"code": 6, "codeDesc": "风元素", "number": 3}] | 造成2点{{风元素伤害}}，目标角色附属「坍毁」。 |
| 风龙涤流 | 3 | [{"code": 6, "codeDesc": "风元素", "number": 5}] | 造成2点{{风元素伤害}}，然后分别准备技能：「长延涤流」和「终幕涤流」。 |
| 终天闭幕曲 | 3 | [{"code": 6, "codeDesc": "风元素", "number": 4}, {"code": 9, "codeDesc": "充能花费", "number": 2}] | 造成5点{{风元素伤害}}，所有敌方后台角色附属「坍毁」。 |

**2601 丘丘岩盔王 — GCG13S-C036**

来源：[C036/477.json](../../../physical-static-data/data/C036/477.json)；现有定义入口：[src/old_versions/v6.3.0.gts](../../packages/data/src/old_versions/v6.3.0.gts)（analyzer 行 131）。

hp=8；打出骰费=[{"element": 4}]；充能费=None；每组上限=0。

| 技能 | 类型 | 原费用列表 | 描述 |
| --- | --- | --- | --- |
| Plama Lawa | 1 | [{"code": 4, "codeDesc": "岩元素", "number": 1}, {"code": 8, "codeDesc": "无色元素", "number": 2}] | 造成2点{{物理伤害}}。 |
| Movo Lawa | 2 | [{"code": 4, "codeDesc": "岩元素", "number": 3}] | 造成3点{{物理伤害}}。 |
| Upa Shato | 3 | [{"code": 4, "codeDesc": "岩元素", "number": 3}, {"code": 9, "codeDesc": "充能花费", "number": 2}] | 造成5点{{物理伤害}}。 |
| 魔化：岩盔 | 4 | null | 战斗开始时，初始附属「岩盔」。 |

**211081 起死回骸 — GCG20S-A157**

来源：[A157/1886.json](../../../physical-static-data/data/A157/1886.json)；现有定义入口：[src/old_versions/v4.6.1.gts](../../packages/data/src/old_versions/v4.6.1.gts)（analyzer 行 153）。

hp=0；打出骰费=[{"cost": 4, "element": 0}]；充能费=3；每组上限=2。

> 战斗行动：我方出战角色为七七时，装备此牌。七七装备此牌后，立刻使用一次仙法·救苦度厄。装备有此牌的七七使用仙法·救苦度厄时：复苏我方所有倒下的角色，并治疗其2点。（整场牌局限制2次）（牌组中包含七七，才能加入牌组）

**212041 深渊之灾·凝水盛放 — GCG20S-A158**

来源：[A158/1891.json](../../../physical-static-data/data/A158/1891.json)；现有定义入口：[src/old_versions/v4.0.0.gts](../../packages/data/src/old_versions/v4.0.0.gts)（analyzer 行 101）。

hp=0；打出骰费=[{"cost": 3, "element": 1}]；充能费=None；每组上限=2。

> 战斗行动：我方出战角色为达达利亚时，装备此牌。达达利亚装备此牌后，立刻使用一次魔王武装·狂澜。结束阶段：装备有此牌的达达利亚在场时，如果敌方出战角色附属有「断流」，则对其造成1点穿透伤害。（牌组中包含达达利亚，才能加入牌组）

**212081 星天的花雨 — GCG26S-A211**

来源：[A211/2448.json](../../../physical-static-data/data/A211/2448.json)；现有定义入口：[src/characters/hydro/nilou.gts](../../packages/data/src/characters/hydro/nilou.gts)（analyzer 行 165）。

hp=0；打出骰费=[{"cost": 3, "element": 1}]；充能费=None；每组上限=2。

> 战斗行动：我方出战角色为妮露时，装备此牌。
> 妮露装备此牌后，立刻使用一次七域舞步。
> 装备有此牌的妮露在场时：我方「丰穰之核」造成的伤害+1。
> （牌组中包含妮露，才能加入牌组）

**214081 神篱之御荫 — GCG03B-A165**

来源：[A165/1856.json](../../../physical-static-data/data/A165/1856.json)；现有定义入口：[src/characters/electro/yae_miko.gts](../../packages/data/src/characters/electro/yae_miko.gts)（analyzer 行 158）。

hp=0；打出骰费=[{"cost": 3, "element": 3}]；充能费=2；每组上限=2。

> 战斗行动：我方出战角色为八重神子时，装备此牌。八重神子装备此牌后，立刻使用一次大密法·天狐显真。装备有此牌的八重神子通过大密法·天狐显真消灭了「杀生樱」后：本回合下次使用野干役咒·杀生樱时少花费2个元素骰。（牌组中包含八重神子，才能加入牌组）

**215051 风物之诗咏 — GCG03B-A166**

来源：[A166/1860.json](../../../physical-static-data/data/A166/1860.json)；现有定义入口：[src/characters/anemo/kaedehara_kazuha.gts](../../packages/data/src/characters/anemo/kaedehara_kazuha.gts)（analyzer 行 376）。

hp=0；打出骰费=[{"cost": 3, "element": 6}]；充能费=None；每组上限=2。

> 战斗行动：我方出战角色为枫原万叶时，装备此牌。枫原万叶装备此牌后，立刻使用一次千早振。装备有此牌的枫原万叶引发扩散反应后：使我方角色和召唤物接下来2次所造成的被扩散元素类型的伤害+1。（每种元素类型分别计算次数）（牌组中包含枫原万叶，才能加入牌组）

**216061 犬奔·疾如风 — GCG03B-A168**

来源：[A168/1868.json](../../../physical-static-data/data/A168/1868.json)；现有定义入口：[src/characters/geo/gorou.gts](../../packages/data/src/characters/geo/gorou.gts)（analyzer 行 130）。

hp=0；打出骰费=[{"cost": 3, "element": 4}]；充能费=None；每组上限=2。

> 战斗行动：我方出战角色为五郎时，装备此牌。五郎装备此牌后，立刻使用一次犬坂吠吠方圆阵。装备有此牌的五郎在场时，我方角色造成岩元素伤害后：如果场上存在「大将旗指物」，抓1张牌。（每回合1次）（牌组中包含五郎，才能加入牌组）

**217041 慈惠仁心 — GCG02B-A105**

来源：[A105/846.json](../../../physical-static-data/data/A105/846.json)；现有定义入口：[src/characters/dendro/yaoyao.gts](../../packages/data/src/characters/dendro/yaoyao.gts)（analyzer 行 151）。

hp=0；打出骰费=[{"cost": 3, "element": 5}]；充能费=None；每组上限=2。

> 战斗行动：我方出战角色为瑶瑶时，装备此牌。
> 瑶瑶装备此牌后，立刻使用一次云台团团降芦菔。
> 装备有此牌的瑶瑶生成的「月桂·抛掷型」，在可用次数仅剩余最后1次时造成的伤害和治疗各+1。
> （牌组中包含瑶瑶，才能加入牌组）

**223011 悉数讨回 — GCG14S-A107**

来源：[A107/724.json](../../../physical-static-data/data/A107/724.json)；现有定义入口：[src/characters/pyro/fatui_pyro_agent.gts](../../packages/data/src/characters/pyro/fatui_pyro_agent.gts)（analyzer 行 160）。

hp=0；打出骰费=[{"cost": 3, "element": 2}]；充能费=None；每组上限=2。

> 战斗行动：我方出战角色为愚人众·火之债务处理人时，装备此牌。
> 愚人众·火之债务处理人装备此牌后，立刻使用一次伺机而动。
> 装备有此牌的愚人众·火之债务处理人生成的「潜行」获得以下效果：
> 初始可用次数+1，并且使所附属角色造成的{{物理伤害}}变为{{火元素伤害}}。
> （牌组中包含愚人众·火之债务处理人，才能加入牌组）

**226011 重铸：岩盔 — GCG13S-A109**

来源：[A109/685.json](../../../physical-static-data/data/A109/685.json)；现有定义入口：[src/characters/geo/stonehide_lawachurl.gts](../../packages/data/src/characters/geo/stonehide_lawachurl.gts)（analyzer 行 150）。

hp=0；打出骰费=[{"cost": 4, "element": 4}]；充能费=2；每组上限=2。

> 战斗行动：我方出战角色为丘丘岩盔王时，装备此牌。
> 丘丘岩盔王装备此牌后，立刻使用一次Upa Shato。
> 装备有此牌的丘丘岩盔王击倒敌方角色后：丘丘岩盔王重新附属「岩盔」。
> （牌组中包含丘丘岩盔王，才能加入牌组）

**227011 孢子增殖 — GCG02S-A018**

来源：[A018/182.json](../../../physical-static-data/data/A018/182.json)；现有定义入口：[src/characters/dendro/jadeplume_terrorshroom.gts](../../packages/data/src/characters/dendro/jadeplume_terrorshroom.gts)（analyzer 行 158）。

hp=0；打出骰费=[{"cost": 3, "element": 5}]；充能费=None；每组上限=2。

> 战斗行动：我方出战角色为翠翎恐蕈时，装备此牌。
> 翠翎恐蕈装备此牌后，立刻使用一次不稳定孢子云。
> 装备有此牌的翠翎恐蕈，可累积的「{{活化激能}}」层数上限+1。
> （牌组中包含翠翎恐蕈，才能加入牌组）

**311205 终末嗟叹之诗 — GCG09S-A113**

来源：[A113/540.json](../../../physical-static-data/data/A113/540.json)；现有定义入口：[src/cards/equipment/weapon/bow.gts](../../packages/data/src/cards/equipment/weapon/bow.gts)（analyzer 行 138）。

hp=0；打出骰费=[{"cost": 3, "element": 7}]；充能费=None；每组上限=2。

> 角色造成的伤害+1。
> 角色使用「元素爆发」后：我方所有角色造成的伤害+1。
> 持续回合：2
> （「弓」角色才能装备。角色最多装备1件「武器」）

**311305 钟剑 — GCG13S-A117**

来源：[A117/689.json](../../../physical-static-data/data/A117/689.json)；现有定义入口：[src/cards/equipment/weapon/claymore.gts](../../packages/data/src/cards/equipment/weapon/claymore.gts)（analyzer 行 131）。

hp=0；打出骰费=[{"cost": 3, "element": 7}]；充能费=None；每组上限=2。

> 角色造成的伤害+1。
> 角色使用技能后：生成「叛逆的守护」。（提供1点「{{护盾}}」，每回合1次，可叠加到2点）
> （「双手剑」角色才能装备。角色最多装备1件「武器」）

**311306 苇海信标 — GCG15S-A112**

来源：[A112/764.json](../../../physical-static-data/data/A112/764.json)；现有定义入口：[src/cards/equipment/weapon/claymore.gts](../../packages/data/src/cards/equipment/weapon/claymore.gts)（analyzer 行 184）。

hp=0；打出骰费=[{"cost": 3, "element": 7}]；充能费=None；每组上限=2。

> 角色造成的伤害+1。
> 角色使用「元素战技」或受到伤害后：本回合内，角色下次造成的伤害额外+1。（每回合最多触发2次）
> （「双手剑」角色才能装备。角色最多装备1件「武器」）

**311404 贯虹之槊 — GCG10S-A115**

来源：[A115/578.json](../../../physical-static-data/data/A115/578.json)；现有定义入口：[src/cards/equipment/weapon/pole.gts](../../packages/data/src/cards/equipment/weapon/pole.gts)（analyzer 行 115）。

hp=0；打出骰费=[{"cost": 3, "element": 7}]；充能费=None；每组上限=2。

> 角色造成的伤害+1。
> 角色如果在「{{护盾}}」角色状态或「{{护盾}}」出战状态的保护下，则造成的伤害额外+1。
> 角色使用「元素战技」后：如果我方存在提供「{{护盾}}」的出战状态，则为一个此类出战状态补充1点「{{护盾}}」。（每回合1次）
> （「长柄武器」角色才能装备。角色最多装备1件「武器」）

**312015 海祇之冠 — GCG03B-A183**

来源：[A183/1928.json](../../../physical-static-data/data/A183/1928.json)；现有定义入口：[src/cards/equipment/artifacts.gts](../../packages/data/src/cards/equipment/artifacts.gts)（analyzer 行 746）。

hp=0；打出骰费=[{"cost": 1, "element": 7}]；充能费=None；每组上限=2。

> 我方角色每受到1点治疗，此牌就累积1个「海染泡沫」。（最多累积6个）角色造成伤害时：消耗所有「海染泡沫」，每消耗3个都使造成的伤害+1。（角色最多装备1件「圣遗物」）

**312016 海染砗磲 — GCG03B-A184**

来源：[A184/1933.json](../../../physical-static-data/data/A184/1933.json)；现有定义入口：[src/old_versions/v4.2.0.gts](../../packages/data/src/old_versions/v4.2.0.gts)（analyzer 行 190）。

hp=0；打出骰费=[{"cost": 3, "element": 8}]；充能费=None；每组上限=2。

> 入场时：治疗所附属角色3点。我方角色每受到1点治疗，此牌就累积1个「海染泡沫」。（最多累积6个）角色造成伤害时：消耗所有「海染泡沫」，每消耗3个都使造成的伤害+1。（角色最多装备1件「圣遗物」）

**321005 望舒客栈 — GCG09S-A136**

来源：[A136/553.json](../../../physical-static-data/data/A136/553.json)；现有定义入口：[src/cards/support/place.gts](../../packages/data/src/cards/support/place.gts)（analyzer 行 131）。

hp=0；打出骰费=[{"cost": 2, "element": 7}]；充能费=None；每组上限=2。

> 结束阶段：治疗受伤最多的我方后台角色2点。
> 可用次数：2

**321006 西风大教堂 — GCG02S-A046**

来源：[A046/189.json](../../../physical-static-data/data/A046/189.json)；现有定义入口：[src/cards/support/place.gts](../../packages/data/src/cards/support/place.gts)（analyzer 行 153）。

hp=0；打出骰费=[{"cost": 2, "element": 7}]；充能费=None；每组上限=2。

> 结束阶段：治疗我方「出战角色」2点。
> 可用次数：2

**321008 鸣神大社 — GCG17S-A188**

来源：[A188/1892.json](../../../physical-static-data/data/A188/1892.json)；现有定义入口：[src/old_versions/v5.8.0.gts](../../packages/data/src/old_versions/v5.8.0.gts)（analyzer 行 455）。

hp=0；打出骰费=[{"cost": 2, "element": 7}]；充能费=None；每组上限=2。

> 我方角色使用技能后：如果元素骰总数为奇数，则生成1个万能元素骰。（每回合2次）

**321015 风龙废墟 — GCG10S-A134**

来源：[A134/583.json](../../../physical-static-data/data/A134/583.json)；现有定义入口：[src/cards/support/place.gts](../../packages/data/src/cards/support/place.gts)（analyzer 行 378）。

hp=0；打出骰费=[{"cost": 2, "element": 7}]；充能费=None；每组上限=2。

> 入场时：从我方牌库底展示卡牌，直到出现1张「天赋」牌为止，将这张「天赋」牌加入手牌，然后将你的牌库洗牌。
> 我方打出「天赋」牌，或我方角色使用原本元素骰消耗至少为4的技能时：少花费1个元素骰。（每回合1次）
> 可用次数：3

**321022 圣火竞技场 — GCG31S-A242**

来源：[A242/2439.json](../../../physical-static-data/data/A242/2439.json)；现有定义入口：[src/cards/support/place.gts](../../packages/data/src/cards/support/place.gts)（analyzer 行 631）。

hp=0；打出骰费=[{"cost": 2, "element": 7}]；充能费=None；每组上限=2。

> 我方使用技能或特技后：此牌累积1点「角逐之焰」。
> 「角逐之焰」达到2时：投掷并获得1个元素骰。
> 达到4时：治疗我方出战角色2点。
> 达到6时：弃置此牌，使当前的我方出战角色在2回合内造成的伤害+1。

**322003 蒂玛乌斯 — GCG04S-A049**

来源：[A049/68.json](../../../physical-static-data/data/A049/68.json)；现有定义入口：[src/old_versions/v4.2.0.gts](../../packages/data/src/old_versions/v4.2.0.gts)（analyzer 行 227）。

hp=0；打出骰费=[{"cost": 2, "element": 7}]；充能费=None；每组上限=2。

> 入场时：此牌具有2个「合成材料」。
> 结束阶段：此牌增加1个「合成材料」。
> 打出「圣遗物」手牌时：如可能，则支付等同于「圣遗物」总费用数量的「合成材料」，以免费装备此「圣遗物」。（每回合1次）
> 触发上述效果后：抓1张牌。（整场牌局限制1次）

**322004 瓦格纳 — GCG05S-A050**

来源：[A050/102.json](../../../physical-static-data/data/A050/102.json)；现有定义入口：[src/old_versions/v4.2.0.gts](../../packages/data/src/old_versions/v4.2.0.gts)（analyzer 行 255）。

hp=0；打出骰费=[{"cost": 2, "element": 7}]；充能费=None；每组上限=2。

> 入场时：此牌具有2个「锻造原胚」。
> 结束阶段：此牌增加1个「锻造原胚」。
> 打出「武器」手牌时：如可能，则支付等同于「武器」总费用数量的「锻造原胚」，以免费装备此「武器」。（每回合1次）
> 触发上述效果后：抓1张牌。（整场牌局限制1次）

**322005 卯师傅 — GCG06S-A051**

来源：[A051/139.json](../../../physical-static-data/data/A051/139.json)；现有定义入口：[src/old_versions/v4.0.0.gts](../../packages/data/src/old_versions/v4.0.0.gts)（analyzer 行 320）。

hp=0；打出骰费=[{"cost": 1, "element": 7}]；充能费=None；每组上限=2。

> 打出「料理」事件牌后：投掷并获得1个元素骰。（每回合1次）
> 打出「料理」事件牌后：从我方牌库底展示卡牌，直到出现1张「料理」事件牌为止，将这张「料理」事件牌加入手牌，然后将你的牌库洗牌。（整场牌局限制1次）

**322008 立本 — GCG22S-A053**

来源：[A053/1854.json](../../../physical-static-data/data/A053/1854.json)；现有定义入口：[src/cards/support/ally.gts](../../packages/data/src/cards/support/ally.gts)（analyzer 行 244）。

hp=0；打出骰费=[{"cost": 0, "element": 7}]；充能费=None；每组上限=2。

> 结束阶段：从你元素骰区中选择最多3个元素骰放到此牌上。（每种最多1个）。行动阶段开始时：如果此牌上有3个以上的元素骰，则弃置此牌，抓2张牌，获得2个万能元素骰。

**322011 田铁嘴 — GCG04S-A054**

来源：[A054/71.json](../../../physical-static-data/data/A054/71.json)；现有定义入口：[src/cards/support/ally.gts](../../packages/data/src/cards/support/ally.gts)（analyzer 行 328）。

hp=0；打出骰费=[{"cost": 2, "element": 8}]；充能费=None；每组上限=2。

> 结束阶段：我方一名充能未满的角色获得1点充能。（出战角色优先）
> 可用次数：2

**322016 迪娜泽黛 — GCG30S-A193**

来源：[A193/2307.json](../../../physical-static-data/data/A193/2307.json)；现有定义入口：[src/old_versions/v4.0.0.gts](../../packages/data/src/old_versions/v4.0.0.gts)（analyzer 行 301）。

hp=0；打出骰费=[{"cost": 1, "element": 7}]；充能费=None；每组上限=2。

> 打出「伙伴」支援牌时：少花费1个元素骰。（每回合1次）
> 打出「伙伴」支援牌后：从我方牌库底展示卡牌，直到出现1张「伙伴」支援牌为止，将这张「伙伴」支援牌加入手牌，然后将你的牌库洗牌。（整场牌局限制1次）

**322022 婕德 — GCG30S-A244**

来源：[A244/2310.json](../../../physical-static-data/data/A244/2310.json)；现有定义入口：[src/old_versions/v4.5.0.gts](../../packages/data/src/old_versions/v4.5.0.gts)（analyzer 行 181）。

hp=0；打出骰费=[{"cost": 1, "element": 7}]；充能费=None；每组上限=2。

> 此牌会记录我方弃牌区中支援牌的数量，称为「阅历」。（最多6点）
> 我方角色使用「元素爆发」后：如果「阅历」至少为6，则弃置此牌，对我方出战角色附属「沙与梦」。
> （对角色打「天赋」或角色使用技能时：少花费3个元素骰。可用次数：1）

**323001 参量质变仪 — GCG04S-A058**

来源：[A058/73.json](../../../physical-static-data/data/A058/73.json)；现有定义入口：[src/cards/support/item.gts](../../packages/data/src/cards/support/item.gts)（analyzer 行 26）。

hp=0；打出骰费=[{"cost": 2, "element": 8}]；充能费=None；每组上限=2。

> 双方角色使用技能后：如果造成了元素伤害，此牌累积1个「质变进度」。如果此牌已累积3个「质变进度」，则弃置此牌，投掷并获得3个元素骰。

**323002 便携营养袋 — GCG09S-A144**

来源：[A144/550.json](../../../physical-static-data/data/A144/550.json)；现有定义入口：[src/old_versions/v4.0.0.gts](../../packages/data/src/old_versions/v4.0.0.gts)（analyzer 行 260）。

hp=0；打出骰费=[{"cost": 1, "element": 7}]；充能费=None；每组上限=2。

> 入场时：从我方牌库底展示卡牌，直到出现1张「料理」事件牌为止，将这张「料理」事件牌加入手牌，然后将你的牌库洗牌。
> 我方打出「料理」事件牌时：再次触发入场时效果。（每回合1次）

**330002 磐岩盟契 — GCG03B-A196**

来源：[A196/1982.json](../../../physical-static-data/data/A196/1982.json)；现有定义入口：[src/cards/event/legend.gts](../../packages/data/src/cards/event/legend.gts)（analyzer 行 66）。

hp=0；打出骰费=[{"cost": 0, "element": 7}]；充能费=None；每组上限=2。

> 我方剩余元素骰数量为0时，才能打出：投掷并获得2个元素骰。（整局游戏只能打出一张「秘传」卡牌；这张牌一定在你的起始手牌中）

**332009 白垩之术 — GCG03S-A082**

来源：[A082/44.json](../../../physical-static-data/data/A082/44.json)；现有定义入口：[src/cards/event/other.gts](../../packages/data/src/cards/event/other.gts)（analyzer 行 958）。

hp=0；打出骰费=[{"cost": 1, "element": 7}]；充能费=None；每组上限=2。

> 从最多2个我方后台角色身上，转移1点充能到我方出战角色。

**332015 深渊的呼唤 — GCG03B-A200**

来源：[A200/1997.json](../../../physical-static-data/data/A200/1997.json)；现有定义入口：[src/cards/event/other.gts](../../packages/data/src/cards/event/other.gts)（analyzer 行 1086）。

hp=0；打出骰费=[{"cost": 2, "element": 7}]；充能费=None；每组上限=2。

> 召唤一个「丘丘人」召唤物。丘丘人 召唤物从冰/水/火/雷中声明两种元素，由对方选择其中一种作为「丘丘人」的元素类型。结束阶段：造成1点对应元素伤害。可用次数：2将此牌视为配件牌放置于我方召唤物区。（牌组包含至少2个「魔物」角色，才能加入牌组）

**332016 愚人众的阴谋 — GCG03B-A201**

来源：[A201/2001.json](../../../physical-static-data/data/A201/2001.json)；现有定义入口：[src/cards/event/other.gts](../../packages/data/src/cards/event/other.gts)（analyzer 行 1114）。

hp=0；打出骰费=[{"cost": 2, "element": 7}]；充能费=None；每组上限=2。

> 在对方场上，生成1个「愚人众伏兵」。愚人众伏兵 出战状态从冰/水/火/雷中声明两种元素，由对方选择其中一种作为「愚人众伏兵」的元素类型。所在阵营的角色使用技能后：对所在阵营的出战角色造成1点对应元素伤害。（每回合一次）可用次数：2将此牌视为配件牌放置于对方出战状态区。（牌组包含至少2个「愚人众」角色，才能加入牌组）

**332019 温妮莎传奇 — GCG22S-A203**

来源：[A203/1882.json](../../../physical-static-data/data/A203/1882.json)；现有定义入口：[src/cards/event/other.gts](../../packages/data/src/cards/event/other.gts)（analyzer 行 1193）。

hp=0；打出骰费=[{"cost": 3, "element": 7}]；充能费=None；每组上限=2。

> 投掷并获得4个元素骰。

**D. 44 个共享依赖的显式版本候选**

基于原始 284 个推荐，不含后续会话裁定与新增覆盖的最终定义。采用所属角色的推荐版本，38 项有该版 exact/near 证据，6 项为无独立静态证据的内部节点。加入后调用现有已构建 core/data 的 resolver 与 registry.resolve(resolver)：328 个显式 ID、传播后 730 个 ID（不计 $base），284 个顶层定义无缺失。仅验证加载与传播，未验证游戏行为；实施时要使用重新构建的数据。

| 依赖 ID | 名称/绑定 | 冲突根 ID | 传播版本 | 显式版本候选 | 节点证据 |
| --- | --- | --- | --- | --- | --- |
| 11013 | 霜华矢 | 1101, 211011 | v5.4.0, v7.2.0 | v5.4.0 | exact |
| 11022 | 猫爪冻冻 | 1102, 211021 | v5.8.0, v7.2.0 | v5.8.0 | exact |
| 11032 | 霜袭 | 1103, 211031 | v5.8.0, v7.2.0 | v7.2.0 | exact |
| 11102 | 取景·冰点构图法 | 1110, 211101 | v6.2.0, v7.2.0 | v6.2.0 | exact |
| 12012 | 演唱，开始♪ | 1201, 212011 | v6.4.0, v7.2.0 | v6.4.0 | exact |
| 12053 | 海人化羽 | 1205, 212051 | v5.4.0, v7.2.0 | v5.4.0 | near |
| 12073 | 圣仪·灰鸰衒潮 | 1207, 212071 | v4.5.0, v7.2.0 | v4.5.0 | exact |
| 12092 | 萦络纵命索 | 1209, 212091 | v6.3.0, v7.2.0 | v6.3.0 | exact |
| 13042 | 爆弹玩偶 | 1304, 213041 | v5.8.0, v7.2.0 | v5.8.0 | exact |
| 13072 | 蝶引来生 | 1307, 213071 | v5.4.0, v7.2.0 | v5.4.0 | exact |
| 13081 | 火漆制印 | 1308, 213081 | v6.2.0, v7.2.0 | v6.2.0 | exact |
| 13113 | 真红炽火之大铠 | 1311, 213111 | v6.2.0, v7.2.0 | v6.2.0 | exact |
| 16012 | 璇玑屏 | 1601, 216011 | v5.8.0, v7.2.0 | v7.2.0 | exact |
| 16022 | 护心铠 | 1602, 216021 | v5.4.0, v7.2.0 | v5.4.0 | exact |
| 16033 | 地心·磐礴 | 1603, 216031 | v5.4.0, v5.6.0 | v5.4.0 | exact |
| 16042 | 创生法·拟造阳华 | 1604, 216041 | v5.6.0, v7.2.0 | v5.6.0 | exact |
| 17022 | 识果种雷 | 1702, 217021 | v6.6.0, v7.2.0 | v7.2.0 | exact |
| 17053 | 愈气全形论 | 1705, 217051 | v5.6.0, v7.2.0 | v5.6.0 | exact |
| 22014 | 潮涌与激流 | 2201, 222011 | v5.8.0, v7.2.0 | v5.8.0 | exact |
| 111021 | 猫爪护盾 | 1102, 211021 | v5.8.0, v7.2.0 | v5.8.0 | near |
| 111022 | CatclawShield01 | 1102, 211021 | v5.8.0, v7.2.0 | v5.8.0 | 无独立静态证据；随所属技能核对 |
| 111101 | 瞬时剪影 | 1110, 211101 | v6.2.0, v7.2.0 | v6.2.0 | exact |
| 112011 | 歌声之环 | 1201, 212011 | v6.4.0, v7.2.0 | v6.4.0 | exact |
| 112051 | 化海月 | 1205, 212051 | v5.4.0, v7.2.0 | v5.4.0 | exact |
| 112052 | 仪来羽衣 | 1205, 212051 | v5.4.0, v7.2.0 | v5.4.0 | exact |
| 112072 | 赤冕祝祷 | 1207, 212071 | v4.5.0, v7.2.0 | v4.5.0 | near |
| 112073 | PrayerOfTheCrimsonCrown01 | 1207, 212071 | v4.5.0, v7.2.0 | v4.5.0 | 无独立静态证据；随所属技能核对 |
| 112091 | 破局 | 1209, 212091 | v6.3.0, v7.2.0 | v6.3.0 | exact |
| 113041 | 兔兔伯爵 | 1304, 213041 | v5.8.0, v7.2.0 | v5.8.0 | exact |
| 113071 | 彼岸蝶舞 | 1307, 213071 | v5.4.0, v7.2.0 | v5.4.0 | exact |
| 113072 | BloodBlossom | 1307, 213071 | v5.4.0, v7.2.0 | v5.4.0 | 无独立静态证据；随所属技能核对 |
| 113111 | 烈烧佑命护盾 | 1311, 213111 | v6.2.0, v7.2.0 | v6.2.0 | near |
| 113112 | 炽火大铠 | 1311, 213111 | v6.2.0, v7.2.0 | v6.2.0 | near |
| 113113 | ScorchingOoyoroi01 | 1311, 213111 | v6.2.0, v7.2.0 | v6.2.0 | 无独立静态证据；随所属技能核对 |
| 116011 | 璇玑屏 | 1601, 216011 | v5.8.0, v7.2.0 | v7.2.0 | exact |
| 116021 | 护体岩铠 | 1602, 216021 | v5.4.0, v7.2.0 | v5.4.0 | exact |
| 116031 | 岩脊 | 1603, 216031 | v5.4.0, v5.6.0 | v5.4.0 | exact |
| 116032 | 玉璋护盾 | 1603, 216031 | v5.4.0, v5.6.0 | v5.4.0 | exact |
| 116041 | 阳华 | 1604, 216041 | v5.6.0, v7.2.0 | v5.6.0 | near |
| 117021 | 通塞识 | 1702, 217021 | v6.6.0, v7.2.0 | v7.2.0 | near |
| 117022 | ClusterbloomArrow | 1702, 217021 | v6.6.0, v7.2.0 | v7.2.0 | 无独立静态证据；随所属技能核对 |
| 117052 | 脉摄宣明 | 1705, 217051 | v5.6.0, v7.2.0 | v5.6.0 | exact |
| 117053 | 无郤气护盾 | 1705, 217051 | v5.6.0, v7.2.0 | v5.6.0 | exact |
| 50011013 | FrostflakeArrowUsedExtension | 1101, 211011 | v5.4.0, v7.2.0 | v5.4.0 | 无独立静态证据；随所属技能核对 |

原始冲突复现：1101→11013 为 v5.4.0，211011→11013 为 v7.2.0。显式统一 11013 时同时处理内部扩展 50011013；仅检查静态 C/S/A 引用不足以覆盖运行依赖。

**D 补充：报告复核后的版本修正**

| ID | 原研究推荐 | 报告采用候选 | 原因 |
| --- | --- | --- | --- |
| 323003 红羽团扇 | v7.2.0 | v6.5.0 | 实体限制本回合；新版 169/170 可跨回合积层，不等价 |
| 302303 红羽团扇状态 | 没有显式顶层选择 | v6.5.0 | 旧实现的 oneDuration 状态；当前 analyzer 只从新版扇子看到 169/170，必须补旧依赖 |

在上述 328 项上覆盖 323003，再增加 302303，共 329 个显式 ID，传播后仍 730 项。实际 resolver 与 registry.resolve 验证无顶层缺失，扇子命中 until v6.5.0，状态定义存在。此处是报告纠正，不修改原研究 JSON；A 保留原始推荐以便追溯。使用当前源码落地前仍需重新构建并验证历史依赖。

**E. 六个含缺描述通配的推荐方案**

| 根 ID | 名称 | 通配节点 | 节点名 | code | 字段 | 版本 |
| --- | --- | --- | --- | --- | --- | --- |
| 2201 | 纯水精灵·洛蒂娅 | entity:122010 | 纯水幻形 | 无来源 | * | v5.8.0 |
| 322023 | 西尔弗和迈勒斯 | entity:322023 | 西尔弗和迈勒斯 | 无来源 | * | v7.2.0 |
| 311205 | 终末嗟叹之诗 | entity:301102 | 千年的大乐章·别离之歌 | 无来源 | * | v7.2.0 |
| 312009 | 将帅兜鍪 | entity:301201 | 重嶂不移 | 无来源 | * | v7.2.0 |
| 312010 | 千岩牢固 | entity:301201 | 重嶂不移 | 无来源 | * | v7.2.0 |
| 332027 | 浮烁的四叶印 | entity:303227 | 四叶印 | 无来源 | * | v7.2.0 |

**F. 同名配件历史候选及组合配件（来源已按 Q03 确认）**

**entity:116051 阿丑**

| 候选 | 发行记录 | 来源 | 规则正文 |
| --- | --- | --- | --- |
| T094 | GCG19S-T094 | [T094/1855.json](../../../physical-static-data/data/T094/1855.json) | 召唤物我方出战角色受到伤害时： 抵消1点伤害。可用次数：1，耗尽时不弃置此牌。此召唤物在场期间可触发1次：我方角色受到伤害后，为荒泷一斗附属「乱神之怪力」。结束阶段：弃置此牌，造成1点岩元素伤害。 |
| PR014 | GCG-PR014 | [PR014/1836.json](../../../physical-static-data/data/PR014/1836.json) | 我方出战角色受到伤害时:抵消1点伤害，可用次数:1，耗尽时不弃置此牌。此召唤物在场期间可触发1次:我方角色受到伤害后，为荒泷一斗附属「乱神之怪力」结束阶段:弃置此牌。造成1点岩元素伤害。 |

**entity:114071 雷罚恶曜之眼**

| 候选 | 发行记录 | 来源 | 规则正文 |
| --- | --- | --- | --- |
| T088 | GCG17S-T088 | [T088/1958.json](../../../physical-static-data/data/T088/1958.json) | 召唤物结束阶段： 造成1点雷元素伤害。可用次数： 3此召唤物在场时： 我方角色「元素爆发」造成的伤害+1。 |
| PR012 | GCG-PR012 | [PR012/1834.json](../../../physical-static-data/data/PR012/1834.json) | 结束阶段:造成1点雷元素伤害可用数:3此召唤物在场时:我方角色「元素爆发」造成的伤害+1。 |

**entity:114081 杀生樱**

| 候选 | 发行记录 | 来源 | 规则正文 |
| --- | --- | --- | --- |
| T090 | GCG21S-T090 | [T090/2147.json](../../../physical-static-data/data/T090/2147.json) | 召唤物结束阶段： 造成1点雷元素伤害。可用次数：3（可叠加，最多叠加到6次）我方宣布结束时：如果此牌的可用次数至少为4，则造成1点雷元素伤害。（需消耗可用次数） |
| PR013 | GCG-PR013 | [PR013/1835.json](../../../physical-static-data/data/PR013/1835.json) | 结束阶段:造成1点可用次数:3(可普加，最多善加到6次)我方宣布结束时:如果此牌的可用次数至少为4，则造成1点 雷元素伤害。(需消耗可用次数) |

**entity:117041 月桂·抛掷型**

| 候选 | 发行记录 | 来源 | 规则正文 |
| --- | --- | --- | --- |
| T063 | GCG02B-T063 | [T063/515.json](../../../physical-static-data/data/T063/515.json) | 召唤物<br>结束阶段：造成1点{{草元素伤害}}，治疗我方受伤最多的角色1点。<br>可用次数：2 |
| PR016 | GCG-PR016 | [PR016/1838.json](../../../physical-static-data/data/PR016/1838.json) | 结束阶段：造成1点草元素伤害，治疗我方受伤最多的角色1可用次数：2点。 |

**entity:117042 月桂·抛掷型**

| 候选 | 发行记录 | 来源 | 规则正文 |
| --- | --- | --- | --- |
| T063 | GCG02B-T063 | [T063/515.json](../../../physical-static-data/data/T063/515.json) | 召唤物<br>结束阶段：造成1点{{草元素伤害}}，治疗我方受伤最多的角色1点。<br>可用次数：2 |
| PR016 | GCG-PR016 | [PR016/1838.json](../../../physical-static-data/data/PR016/1838.json) | 结束阶段：造成1点草元素伤害，治疗我方受伤最多的角色1可用次数：2点。 |

**entity:116062 大将威仪**

| 候选 | 发行记录 | 来源 | 规则正文 |
| --- | --- | --- | --- |
| T098 | GCG19S-T098 | [T098/1873.json](../../../physical-static-data/data/T098/1873.json) | 召唤物结束阶段： 造成1点岩元素伤害；如果队伍中存在2名岩元素角色，则生成「结晶」。可用次数： 2 |
| PR015 | GCG-PR015 | [PR015/1837.json](../../../physical-static-data/data/PR015/1837.json) | 结束阶段:造成1点岩元素伤害,如果队伍中存在2名岩元素角色，则生成「结晶」可用次数:2 |

Q03 已逐组确认 T063、T088、T090、T094、T098，覆盖五组名称、六个线上节点（月桂含 117041/117042）。这些组不再等待来源裁定；基础与天赋强化仍需合并比较。现有 T074 映射不变。

**T068 潜行** — [T068/520.json](../../../physical-static-data/data/T068/520.json)

> 状态
> 所附属角色受到的伤害-1，造成的伤害+1。
> 可用次数：2

**T073 岩盔** — [T073/525.json](../../../physical-static-data/data/T073/525.json)

> 状态
> 角色造成的{{物理伤害}}变为{{岩元素伤害}}。
> 角色造成的伤害+1。（每回合1次，不消耗可用次数）
> 所附属角色受到伤害时：抵消一点伤害。抵消{{岩元素伤害}}时，需额外消耗一次可用次数。
> 可用次数：3

**T075 度厄真符** — [T075/2005.json](../../../physical-static-data/data/T075/2005.json)

> 出战状态我方角色使用技能后：如果该角色生命值未满，则治疗该角色2点。可用次数： 3

**T076 近战状态** — [T076/2009.json](../../../physical-static-data/data/T076/2009.json)

> 状态角色造成的物理伤害转换为水元素伤害。角色进行重击后：目标角色附属「断流」。角色对附属有「断流」的角色造成的伤害+1；角色对已附属有「断流」的角色使用技能后：对下一个敌方后台角色造成1点穿透伤害。（每回合至多2次）角色所附属的「近战状态」效果结束时，重新附属「远程状态」。持续回合： 2

**T092 乱岚拨止** — [T092/2047.json](../../../physical-static-data/data/T092/2047.json)

> 状态我方下次通过「切换角色」行动切换到所附属角色时：将此次切换视为「快速行动」而非「战斗行动」。我方选择行动前： 如果所附属角色为「出战角色」，则直接使用「普通攻击」；本次「普通攻击」造成的物理伤害变为风元素伤害，结算后移除此效果。如果「千早振」引发了扩散，则将「乱岚拨止」转换为被扩散的元素。

**T097 大将旗指物** — [T097/1869.json](../../../physical-static-data/data/T097/1869.json)

> 出战状态我方角色造成的岩元素伤害+1。持续回合： 2（可叠加，最多叠加到3回合）

**T125 焚落踢** — [T125/2497.json](../../../physical-static-data/data/T125/2497.json)

> 准备技能
> （需准备1个行动轮）
> 造成3点{{火元素伤害}}。

**T133 旋云护盾** — [T133/2649.json](../../../physical-static-data/data/T133/2649.json)

> 状态
> 本角色将在下次行动时，直接使用技能：「长枪开相」。
> 准备技能期间：提供2点「{{护盾}}」，保护所附属的角色。

**T134 长枪开相** — [T134/2653.json](../../../physical-static-data/data/T134/2653.json)

> 元素战技
> （需准备1个行动轮）
> 造成2点{{岩元素伤害}}；如果本回合中我方调和过至少1张牌，则此伤害+1。

**G. 原正文研究之外的问答证据**

从所选原始实体文件 qaList 读取；相同问答只展示首个来源。疑问式答文不视为已确定裁定。Q02 要求逐条决定；下列采纳状态全部独立记录，不能因其他 QA 被采纳而自动通过。原研究不比较 QA，所以 exact/near 不涵盖下列结论。

| 编号 | code | 名称 | 来源 | 问 | 答 | 采纳状态 |
| --- | --- | --- | --- | --- | --- | --- |
| QA-01 | A009 | 我界 | [A009/130.json](../../../physical-static-data/data/A009/130.json) | 先给雷元素角色附属「鸣煌护持」，再装备「我界」，能否触发「我界」的增伤？ | 能，天赋并未要求先后顺序。 | 不采纳；不据此新增覆盖 |
| QA-02 | A017 | 烬火重燃 | [A017/288.json](../../../physical-static-data/data/A017/288.json) | 如果与其他护盾/减伤盾同时存在，哪一种护盾先生效？ | 状态标签的护盾/减伤盾会先生效，出战状态的护盾/减伤盾后生效。如果都是状态的护盾/减伤盾，则由所属牌手选择其中一种先生效；如果都是出战状态的护盾/减伤盾，则由所属牌手选择其中一种先生效。 | 不采纳；沿用线上顺序 |
| QA-03 | A046 | 西风大教堂 | [A046/189.json](../../../physical-static-data/data/A046/189.json) | 当我方出战角色生命值为上限时，能否自选不触发回合结束时的恢复效果？ | 可以，回合结束阶段，结算「西风大教堂」效果时，如果出战角色的生命值为上限，由所属玩家自行选择是否触发「西风大教堂」的效果。 | 采纳；满血时经 selectOption 决定触发与否 |
| QA-04 | A051 | 卯师傅 | [A051/139.json](../../../physical-static-data/data/A051/139.json) | 能否自行选择加入手牌的料理？ | 不能，必须为展示的第一张 | 按全局裁定改用线上定向检索，不采用实体检索法 |
| QA-05 | A051 | 卯师傅 | [A051/139.json](../../../physical-static-data/data/A051/139.json) | 触发的效果是”整场牌局限制1次“的话，我方触发1次后，另一张同名牌还能触发这个效果吗？ | 另一张同名牌只要没有触发过这类效果就还可以触发，因为“整场牌局限制1次”仅限制触发效果的这张牌，不会影响到另一张还未触发这类效果的同名牌。 | 采纳；按每张牌分别记录 |
| QA-06 | A051 | 卯师傅 | [A051/139.json](../../../physical-static-data/data/A051/139.json) | 触发入场效果后，发现牌库中没有「料理」事件牌，再次触发入场效果时，是否还要展示所有牌库的卡牌？ | 不需要，牌库中没有「料理」事件牌是双方的已知信息了。 | N/A；实体检索流程已排除 |
| QA-07 | A054 | 田铁嘴 | [A054/71.json](../../../physical-static-data/data/A054/71.json) | 如果出战角色的充能到达充能上限，能否充能到后台的一个角色吗？ | 能，所属玩家可以选择一个充能未满的角色增加1点充能。 | 不采纳；沿用线上自动选择 |
| QA-08 | A061 | 元素共鸣：粉碎之冰 | [A061/304.json](../../../physical-static-data/data/A061/304.json) | 2张「元素共鸣：粉碎之冰」能否叠加？ | 不能。<br>第一张效果未使用时，再次打出第二张无任何效果，直接将第二张放入弃牌区。 | 保持线上结算 |
| QA-09 | A065 | 元素共鸣：热诚之火 | [A065/341.json](../../../physical-static-data/data/A065/341.json) | 2张「元素共鸣：热诚之火」能否叠加？ | 不能。<br>第一张效果未使用时，再次打出第二张无任何效果，直接将第二张放入弃牌区。 | 保持线上结算 |
| QA-10 | A071 | 元素共鸣：坚定之岩 | [A071/235.json](../../../physical-static-data/data/A071/235.json) | 2张「元素共鸣：坚定之岩」能否叠加？ | 不能。<br>第一张效果未使用时，再次打出第二张无任何效果，直接将第二张放入弃牌区。 | 保持线上结算 |
| QA-11 | A073 | 元素共鸣：蔓生之草 | [A073/197.json](../../../physical-static-data/data/A073/197.json) | 2张「元素共鸣：蔓生之草」的增伤效果能否叠加？ | 不能。<br>第一张效果未使用时，再次打出第二张只会增加对应配件牌的可用次数，接着将第二张「元素共鸣：蔓生之草」放入弃牌区。 | 保持线上结算 |
| QA-12 | A075 | 换班时间 | [A075/76.json](../../../physical-static-data/data/A075/76.json) | 此牌打出后本回合没有触发效果，能否保留至之后的回合触发？ | 能，此牌打出后需放在出战状态区，优先级视为出战状态。触发效果后，再放入弃牌区。<br>第一张效果未使用时，再次打出第二张无任何效果，直接将第二张放入弃牌区。 | 保持线上结算与卡牌移除方式 |
| QA-13 | A079 | 交给我吧！ | [A079/80.json](../../../physical-static-data/data/A079/80.json) | 莫娜的被动技能「虚实流动」与「交给我吧！」可同时生效时，哪个先触发？ | 先触发莫娜的被动技能「虚实流动」。<br>角色技能优先级优先于出战状态，「交给我吧！」打出后需放在出战状态区，视为出战状态。 | 保持线上结算 |
| QA-14 | A082 | 白垩之术 | [A082/44.json](../../../physical-static-data/data/A082/44.json) | 可以自由选择转移几名角色的充能数吗？ | 可以，能够从最多2个符合条件的角色中自由选择，也可以选择1个或者0个角色。 | 保持线上自动转移 |
| QA-15 | A090 | 烤蘑菇披萨 | [A090/2324.json](../../../physical-static-data/data/A090/2324.json) | 上回合给角色使用过一张烤蘑菇披萨，本回合再给该角色使用一张烤蘑菇披萨会怎样？ | 先触发即时回1血的效果，再保留1张2次可用次数的烤蘑菇披萨 | 保持线上结算 |
| QA-16 | A097 | 衍溢的汐潮 | [A097/537.json](../../../physical-static-data/data/A097/537.json) | 同时触发香菱的「旋火轮」和坎蒂丝天赋效果的「赤冕祝祷」时，如何结算？ | 由于都为出战状态，优先级一致，所以可由所属玩家决定先触发哪种效果。 | 保持线上结算顺序 |
| QA-17 | A098 | 一触即发 | [A098/539.json](../../../physical-static-data/data/A098/539.json) | 触发该天赋效果与北斗的「雷兽之盾」时，如何结算？ | 先触发该天赋，再触发「雷兽之盾」。<br>该天赋效果为角色装备牌，优先级大于作为出战状态的「雷兽之盾」。 | 保持线上结算 |
| QA-18 | A112 | 苇海信标 | [A112/764.json](../../../physical-static-data/data/A112/764.json) | 实体化改动。 | 原效果在实体牌对战过程中需要两颗骰子分别表示两种效果是否触发，较为繁琐。触发前置条件后的结果也相同，故此选择合并两个前置条件。 | 采纳；保留实体正文的共用每回合 2 次 |
| QA-19 | A113 | 终末嗟叹之诗 | [A113/540.json](../../../physical-static-data/data/A113/540.json) | 实体化改动。 | 为避免行动牌的使用也需要获得对应的配件牌，把其增伤效果视为武器提供给全队的持续增益。装备该武器的角色被击倒后，则不再触发额外增伤。 | 按 Q11d 最终裁定：共享状态仅加本方任意终末存在判定 |
| QA-20 | A115 | 贯虹之槊 | [A115/578.json](../../../physical-static-data/data/A115/578.json) | 如果我方存在多个提供「护盾」的出战状态，触发「贯虹之槊」补充1点「护盾」的效果时，给哪个出战状态补充？ | 由所属玩家选择一个提供「护盾」的出战状态，必须是提供「护盾」的出战状态，不能是「将帅兜鍪」这种提供「护盾」的状态，也不能是「雨帘剑」这种提供「减伤盾」的出战状态状态。<br>前两期环境中可触发「贯虹之槊」补充护盾效果的出战状态有：<br>结晶反应生成的「结晶」；<br>迪奥娜的「猫爪护盾」；<br>诺艾尔的「护体岩铠」；<br>钟离的「玉璋护盾」；<br>白术的「无郤气护盾」；<br>钟剑的「叛逆的守护」。<br>同理，「元素共鸣：坚定之岩」也只能给以上出战状态补充。 | 保持线上自动选择 |
| QA-21 | A117 | 钟剑 | [A117/689.json](../../../physical-static-data/data/A117/689.json) | 实体化改动 | 为避免行动牌的使用也需要获得对应的配件牌，「叛逆的守护」与「钟剑」直接绑定。<br>「叛逆的守护」视为出战状态，可以享受「贯虹之槊」和「元素共鸣：坚定之岩」的效果，但如果装备「钟剑」的角色先被穿透伤害击倒，那对应的「叛逆的守护」也会被弃置。<br>装备新的武器也会同时把「叛逆的守护」弃置。<br>如果两名角色都装备了「钟剑」，各自「叛逆的守护」的上限互相独立，各为2。 | 采纳独立绑定护盾；顺序沿用线上；Q21a 外部补盾可超过 2 |
| QA-22 | A117 | 钟剑 | [A117/689.json](../../../physical-static-data/data/A117/689.json) | 如果与其他护盾/减伤盾同时存在，哪一种护盾先生效？ | 状态标签的护盾/减伤盾会先生效，出战状态的护盾/减伤盾后生效。如果都是状态的护盾/减伤盾，则由所属牌手选择其中一种先生效；如果都是出战状态的护盾/减伤盾，则由所属牌手选择其中一种先生效。<br>「叛逆的守护」视为提供护盾的出战状态 | 依 QA-02 不采纳自选顺序；出战护盾分类已由 QA-21 确认 |
| QA-23 | A119 | 千岩长枪 | [A119/800.json](../../../physical-static-data/data/A119/800.json) | 如果与其他护盾/减伤盾同时存在，哪一种护盾先生效？ | 状态标签的护盾/减伤盾会先生效，出战状态的护盾/减伤盾后生效。如果都是状态的护盾/减伤盾，则由所属牌手选择其中一种先生效；如果都是出战状态的护盾/减伤盾，则由所属牌手选择其中一种先生效。<br>千岩长枪的「千岩之护」是提供护盾的状态。 | 保持线上分类与结算 |
| QA-24 | A133 | 将帅兜鍪 | [A133/582.json](../../../physical-static-data/data/A133/582.json) | 如果与其他护盾/减伤盾同时存在，哪一种护盾先生效？ | 状态标签的护盾/减伤盾会先生效，出战状态的护盾/减伤盾后生效。如果都是状态的护盾/减伤盾，则由所属牌手选择其中一种先生效；如果都是出战状态的护盾/减伤盾，则由所属牌手选择其中一种先生效。<br>将帅兜鍪的「重嶂不移」是提供护盾的状态。 | 保持线上分类与结算 |
| QA-25 | A135 | 群玉阁 | [A135/545.json](../../../physical-static-data/data/A135/545.json) | 支援区有「群玉阁」和「立本」时，「立本」的抓牌，是否会影响「群玉阁」对于手牌数的判定？ | 支援牌会根据打出顺序（编号大小）进行结算，如果行动阶段开始时，我方只有2张手牌。<br>此时如果「立本」先打出（编号更低）且满足触发条件，会先抓2张牌至4张手牌，从而无法触发「群玉阁」生成骰子的效果。<br>此时如果「群玉阁」先打出（编号更低），会先触发「群玉阁」生成骰子的效果。 | 保持线上结算 |
| QA-26 | A135 | 群玉阁 | [A135/545.json](../../../physical-static-data/data/A135/545.json) | 行动阶段开始时，「群玉阁」和「岩与契约」该如何结算？ | 「岩与契约」视为出战状态，优先级大于支援区，会先触发岩与契约的抓牌和生成骰子。如果此时从3张手牌变为4张手牌，则无法触发「群玉阁」生成骰子的效果。 | 保持线上结算 |
| QA-27 | A136 | 望舒客栈 | [A136/553.json](../../../physical-static-data/data/A136/553.json) | 结束阶段，两个望舒客栈该如何结算？ | 同时结算多个支援牌效果时，会按照支援区的编号排列顺序依次结算。<br>会先结算编号更低（先打出）的望舒客栈，治疗后再结算另一个。<br>所以可能会治疗不同的角色。 | 保持线上结算；先打出先结算本就是线上规则 |
| QA-28 | A136 | 望舒客栈 | [A136/553.json](../../../physical-static-data/data/A136/553.json) | 当我方后台角色生命值为上限时，能否自选不触发回合结束时的恢复效果？ | 能，回合结束阶段，结算「望舒客栈」效果时，如果后台角色的生命值为上限，由所属玩家自行选择是否触发「望舒客栈」的效果。 | 保持线上满血自动不触发；撤销手写选择 |
| QA-29 | A137 | 黄金屋 | [A137/546.json](../../../physical-static-data/data/A137/546.json) | 黄金屋与瓦格纳、老章、蒂玛乌斯、弥生七月等牌同时在支援区时，如何结算？ | 瓦格纳和蒂玛乌斯的描述为“如可能，则支付”，视为最后再触发效果。<br>无论先打出瓦格纳或蒂玛乌斯（编号更低）还是后打出，都会最后再消耗瓦格纳或蒂玛乌斯的层数。<br>而黄金屋、老章和弥生七月则为，先触发先打出（编号更低）的效果，结算完黄金屋、老章、弥生七月的效果后，再结算瓦格纳和蒂玛乌斯的减骰效果。 | 保留线上减费规则，无额外改动 |
| QA-30 | A140 | 凯瑟琳 | [A140/626.json](../../../physical-static-data/data/A140/626.json) | 「交给我吧！」、「凯瑟琳」、「阳华」、「红羽团扇」与莫娜的被动技能「虚实流动」可同时生效时，切换角色时如何结算？ | 结算优先级中，角色技能优先级最高——「虚实流动」，接着是出战状态——「交给我吧！」，然后是召唤物——「阳华」，最后则为支援区——「凯瑟琳」和「红羽团扇」。 | 保留线上结算 |
| QA-31 | A143 | 阿圆 | [A143/587.json](../../../physical-static-data/data/A143/587.json) | 我方支援区各有1个本回合未触发过的「化种匣」和「阿圆」时，打出「西风大教堂」该如何结算？ | 根据「化种匣」和「阿圆」的打出顺序进行结算。<br>如果「化种匣」先打出（编号更低），会先消耗「化种匣」的可用次数，再消耗「阿圆」的每回合1次效果。<br>如果「阿圆」先打出（编号更低），会先消耗「阿圆」的每回合1次效果，而不消耗「化种匣」的可用次数。<br>而如果先打出两张「化种匣」，则不消耗后打出的「阿圆」的每回合1次效果。 | 保留线上减费结算 |
| QA-32 | A145 | 红羽团扇 | [A145/551.json](../../../physical-static-data/data/A145/551.json) | 同时触发「红羽团扇」和「交给我吧！」谁先触发？ | 「红羽团扇」与线上不同，不提供额外的出战状态配件牌，而是将「红羽团扇」视为支援区触发的效果。<br>所以同时触发「交给我吧！」和「红羽团扇」效果时，先触发「交给我吧！」的快速切换，再消耗「红羽团扇」的减骰效果，会同时消耗掉。<br>如果同时有「换班时间」、「交给我吧！」和「红羽团扇」时，则不会触发「红羽团扇」每回合1次的效果。 | 沿用所选线上历史版本的结算 |
| QA-33 | A145 | 红羽团扇 | [A145/551.json](../../../physical-static-data/data/A145/551.json) | 「交给我吧！」、「凯瑟琳」、「阳华」、「红羽团扇」与莫娜的被动技能「虚实流动」同时可生效时，切换角色时如何结算？ | 结算优先级中，角色技能优先级最高——「虚实流动」，接着是出战状态——「交给我吧！」，然后是召唤物——「阳华」，最后则为支援区——「凯瑟琳」和「红羽团扇」。<br>支援区按照先打出（编号更低）先触发的优先级结算。 | 依 QA-30 及支援顺序裁定保持线上结算（重复来源） |
| QA-34 | A183 | 海祇之冠 | [A183/1928.json](../../../physical-static-data/data/A183/1928.json) | 实体化改动。 | 为简化操作流程，无需再用两颗骰子分别记录治疗量与海染泡沫，现调整为治疗量直接累积为海染泡沫；同时，装备该效果的角色每次造成伤害时，将消耗当前所有海染泡沫（包含不足 3 个或 6 个的情况）。<br> | 采纳；保留实体改动，伤害时清空全部泡沫 |
| QA-35 | A184 | 海染砗磲 | [A184/1933.json](../../../physical-static-data/data/A184/1933.json) | 实体化改动。 | 为简化操作流程，无需再用两颗骰子分别记录治疗量与海染泡沫，现调整为治疗量直接累积为海染泡沫；同时，装备该效果的角色每次造成伤害时，将消耗当前所有海染泡沫（包含不足 3 个或 6 个的情况）。<br>考虑到海染泡沫额外消耗可能带来的效果弱化，为维持平衡，我们将海染砗磲的治疗量回调至 3 点。 | 采纳两项实体改动：清空泡沫、入场治疗 3 |
| QA-36 | A184 | 海染砗磲 | [A184/1933.json](../../../physical-static-data/data/A184/1933.json) | 装备海染砗磲时，装备的角色只受到了一点伤害，触发海染砗磲的效果治疗1点，累积几个海染泡沫？ | 累积1个，以实际治疗为准，我方三名角色的治疗都可累积海染泡沫。 | 按实际治疗量累计，计入我方所有角色 |
| QA-37 | A186 | 花海甘露之光 | [A186/1881.json](../../../physical-static-data/data/A186/1881.json) | 「花海甘露之光」回合结束阶段的治疗与对手回合结束阶段召唤物的伤害，哪个先触发？ | 先手玩家先进行回合结束阶段效果的结算。 | 保持线上结算 |
| QA-38 | A189 | 珊瑚宫 | [A189/1955.json](../../../physical-static-data/data/A189/1955.json) | 当我方未被击倒角色生命值均为上限时，能否自选不触发回合结束时的恢复效果？ | 能，由所属玩家自行选择是否触发「珊瑚宫」的效果。 | 保持线上满血自动不触发 |
| QA-39 | A195 | 旧时庭园 | [A195/1867.json](../../../physical-static-data/data/A195/1867.json) | 旧时庭园与瓦格纳、老章、蒂玛乌斯、弥生七月、大梦的曲调等牌如何结算？ | 大梦的曲调和旧时庭园优先级与出战状态一致，由所属牌手选择其中一种先生效。<br>与支援牌同时结算，优先触发旧时庭园的减骰效果。<br> | 沿用线上减费结算 |
| QA-40 | A200 | 深渊的呼唤 | [A200/1997.json](../../../physical-static-data/data/A200/1997.json) | 实体化改动。 | 为优化线上操作体验，针对六面骰与八面骰在执行 “4 随机出 1” 操作时便捷性不足的情况，我们将其线上效果调整为当前更易于把控的形式，以提升使用流畅度。 | 保留实体双边选择流程；两阶段均使用 selectOption |
| QA-41 | A204 | 大梦的曲调 | [A204/1840.json](../../../physical-static-data/data/A204/1840.json) | 「大梦的曲调」、「藏锋何处」和「旧时庭园」同时打出，装备武器牌时，如何结算？ | 三张牌优先级与出战状态一致，由所属牌手选择其中一种先生效。 | 沿用线上减费结算 |
| QA-42 | A238 | 浪船 | [A238/2436.json](../../../physical-static-data/data/A238/2436.json) | 如果与其他护盾减伤盾同时存在，哪一种护盾先生效？ | 状态标签的护盾减伤盾会先生效，出战状态的护盾减伤盾后生效。如果都是状态的护盾减伤盾，则由所属牌手选择其中一种先生效；如果都是出战状态的护盾减伤盾，则由所属牌手选择其中一种先生效。 | 与 QA-02 同规则；不采纳，沿用线上护盾顺序 |
| QA-43 | A244 | 婕德 | [A244/2310.json](../../../physical-static-data/data/A244/2310.json) | 沙与梦是状态？ | 是不是自己当状态贴。此时虽然弃置过，但又掏出来了，不会计入其他婕德的统计? | 整体沿用线上计数及弃置/生成状态方式；与 Q10 一并确认 |
| QA-44 | A252 | 浮烁的四叶印 | [A252/2322.json](../../../physical-static-data/data/A252/2322.json) | 若我方存在两个「四叶印」状态，分别附属于两名后台角色，结束阶段如何处理？ | 若存在复数个「四叶印」状态，玩家需记录它们附属的先后顺序。最先附属的「四叶印」先触发，切换到所附属角色，第二个附属的「四叶印」而后触发，再切换到第二个附属角色。 | 保留线上结算顺序 |
| QA-45 | C002 | 重云 | [C002/16.json](../../../physical-static-data/data/C002/16.json) | 「重华叠霜领域」的冰元素附魔与刻晴或迪卢克的元素附魔同时在场时，如何结算？ | 普通攻击优先享受刻晴或迪卢克的元素附魔，因为状态优先级大于出战状态。 | 保留线上附魔结算 |
| QA-46 | C005 | 莫娜 | [C005/10.json](../../../physical-static-data/data/C005/10.json) | 如果「虚影」与其他护盾/减伤盾同时存在，哪一种护盾先生效？ | 状态标签的护盾/减伤盾会先生效，出战状态的护盾/减伤盾后生效。如果都是状态的护盾/减伤盾，则由所属牌手选择其中一种先生效；如果都是出战状态的护盾/减伤盾，则由所属牌手选择其中一种先生效。<br>莫娜的「虚影」优先级和出战状态一致，由所属牌手自选触发顺序。 | 保留线上分类与减伤顺序 |
| QA-47 | C006 | 迪卢克 | [C006/11.json](../../../physical-static-data/data/C006/11.json) | 重云的「重华叠霜领域」的冰元素附魔与迪卢克的「火元素附魔」同时在场时，如何结算？ | 普通攻击优先享受迪卢克的「火元素附魔」，因为状态优先级大于出战状态。 | 保留线上附魔结算 |
| QA-48 | C008 | 刻晴 | [C008/17.json](../../../physical-static-data/data/C008/17.json) | 「雷楔」能否用来执行元素调和行动？ | 能，生成的「雷楔」视为一般手牌，计算手牌数量时会算上它，执行任何需要弃掉手牌的行动时，可以选择弃掉「雷楔」。需要注意的是，「雷楔」被弃掉时不进入弃牌区，而是移出游戏与其他配件牌一样放在一边待用。 | 用户确认两种区域称谓含义相同、与线上一致；不新增区域 |
| QA-49 | C008 | 刻晴 | [C008/17.json](../../../physical-static-data/data/C008/17.json) | 重云「重华叠霜领域」的冰元素附魔与刻晴的「雷元素附魔」同时在场时，如何结算？ | 普通攻击优先享受刻晴的「雷元素附魔」，因为状态优先级大于出战状态。 | 保留线上附魔结算 |
| QA-50 | C011 | 砂糖 | [C011/2.json](../../../physical-static-data/data/C011/2.json) | 元素战技把装备「灵光明烁之心」的角色强制切换至其他角色，能否触发抓牌效果？ | 不能，先触发技能“强制切换角色”的效果，再进行「灵光明烁之心」的效果鉴定，此时已经不是出战角色。 | 保留线上触发时序 |
| QA-51 | C011 | 砂糖 | [C011/2.json](../../../physical-static-data/data/C011/2.json) | 我方场上存在「大型风灵」时，使用砂糖的「元素爆发」，「大型风灵」如何变化？ | 视为召唤新的「大型风灵」，伤害类型为风元素，可用次数为3。而如果此次「元素爆发」引发了扩散反应，转换此牌的元素类型。 | 沿用线上重建行为 |
| QA-52 | C014 | 诺艾尔 | [C014/9.json](../../../physical-static-data/data/C014/9.json) | 「护体岩铠」的护盾耗尽前物理伤害减半是什么意思？ | 此护盾存在时，我方对应角色即将受到物理伤害之前，会先将此次物理伤害减少一半。（小数点后向上取整）<br>3点物理伤害打在「护体岩铠」上会被减为2点，此时所有护盾类效果再开始进行伤害抵消。<br>5点物理伤害打在只有1层「护体岩铠」上，会先触发物理伤害减半至3点物理伤害，消耗1层「护体岩铠」后，对角色造成2点物理伤害。<br>「护体岩铠」物理伤害减半的效果，会在对手武器、状态、出战状态的增伤后结算。 | 保留线上伤害计算规则 |
| QA-53 | C014 | 诺艾尔 | [C014/9.json](../../../physical-static-data/data/C014/9.json) | 「大扫除」的岩元素附魔与「重华叠霜领域」的冰元素附魔同时在场时，如何结算？ | 普通攻击优先享受诺艾尔的岩元素附魔，因为状态优先级大于出战状态。 | 保留线上附魔结算 |
| QA-54 | C016 | 纯水精灵·洛蒂娅 | [C016/15.json](../../../physical-static-data/data/C016/15.json) | 如果「蛙」与其他护盾/减伤盾同时存在，哪一种护盾先生效？ | "状态标签的护盾/减伤盾会先生效，出战状态的护盾/减伤盾后生效。如果都是状态的护盾/减伤盾，则由所属牌手选择其中一种先生效；如果都是出战状态的护盾/减伤盾，则由所属牌手选择其中一种先生效。<br>「蛙」优先级和出战状态一致，由所属牌手自选触发顺序。" | 保留线上分类与减伤顺序 |
| QA-55 | C019 | 迪奥娜 | [C019/474.json](../../../physical-static-data/data/C019/474.json) | 如果「猫爪护盾」与其他护盾/减伤盾同时存在，哪一种护盾先生效？ | 状态标签的护盾/减伤盾会先生效，出战状态的护盾/减伤盾后生效。如果都是状态的护盾/减伤盾，则由所属牌手选择其中一种先生效；如果都是出战状态的护盾/减伤盾，则由所属牌手选择其中一种先生效。 | 与 QA-02 同规则；不采纳，沿用线上护盾顺序 |
| QA-56 | C022 | 行秋 | [C022/472.json](../../../physical-static-data/data/C022/472.json) | 如果「雨帘剑」与其他护盾/减伤盾同时存在，哪一种护盾先生效？ | 状态标签的护盾/减伤盾会先生效，出战状态的护盾/减伤盾后生效。如果都是状态的护盾/减伤盾，则由所属牌手选择其中一种先生效；如果都是出战状态的护盾/减伤盾，则由所属牌手选择其中一种先生效。 | 与 QA-02 同规则；不采纳，沿用线上护盾顺序 |
| QA-57 | C022 | 行秋 | [C022/472.json](../../../physical-static-data/data/C022/472.json) | 未装备天赋且附着冰元素的行秋使用「元素战技」被冻结后，对方使用「普通攻击」造成2点物理伤害时，是否触发「雨帘剑」的减伤？ | 触发，单次（不包括「旋火轮」等协同攻击）伤害结算时会先结算造成伤害的整体增益（包括武器、元素反应等），再结算对手的减伤手段。<br>有「雨帘剑」（我方出战角色受到至少为3的伤害时：抵消1点伤害）且被冻结的行秋受到基础物理伤害时，对方的「普通攻击」会先触发冻结状态的2点增伤，来到4点伤害，从而触发「雨帘剑」的减伤，最终造成3点物理伤害。 | 保留线上伤害计算规则 |
| QA-58 | C022 | 行秋 | [C022/472.json](../../../physical-static-data/data/C022/472.json) | 同时拥有香菱的「旋火轮」和行秋的「虹剑势」，我方角色「普通攻击」时，如何结算？ | 由于都为出战状态，优先级一致，所以由所属玩家决定先触发哪种效果。 | 沿用线上结算顺序 |
| QA-59 | C024 | 坎蒂丝 | [C024/466.json](../../../physical-static-data/data/C024/466.json) | 同时拥有重云的「重华叠霜领域」和坎蒂丝的「赤冕祝祷」，单手剑、双手剑、长柄武器角色「普通攻击」时，造成哪种元素类型的伤害？ | 由于都为出战状态，优先级一致，所以由所属玩家自行决定冰元素或水元素伤害，但角色状态附魔的优先级大于出战状态。 | 保留线上附魔结算 |
| QA-60 | C025 | 安柏 | [C025/467.json](../../../physical-static-data/data/C025/467.json) | 如果与其他护盾/减伤盾同时存在，哪一种护盾先生效？ | 状态标签的护盾/减伤盾会先生效，出战状态的护盾/减伤盾后生效。如果都是状态的护盾/减伤盾，则由所属牌手选择其中一种先生效；如果都是出战状态的护盾/减伤盾，则由所属牌手选择其中一种先生效。<br>「兔兔伯爵」的减伤盾与莫娜的「虚影」、纯水精灵的「蛙」类似，优先级和出战状态一致，由所属牌手自选触发顺序。 | 保留线上分类与减伤顺序 |
| QA-61 | C026 | 胡桃 | [C026/486.json](../../../physical-static-data/data/C026/486.json) | 回合结束阶段的「血梅香」和「烤蘑菇披萨」谁先生效？ | 同为角色状态的优先级一致，所属牌手选择其中一种先生效。 | 保留线上结算顺序 |
| QA-62 | C027 | 北斗 | [C027/478.json](../../../physical-static-data/data/C027/478.json) | 同时拥有香菱的「旋火轮」和北斗的「雷兽之盾」，我方角色「普通攻击」时，如何结算？ | 由于都为出战状态，优先级一致，所以由所属玩家决定先触发哪种效果。 | 沿用线上结算顺序 |
| QA-63 | C028 | 温迪 | [C028/465.json](../../../physical-static-data/data/C028/465.json) | 「换班时间」和「风域」谁先结算？ | 「换班时间」打出后，需将「换班时间」放在出战状态区，优先级与其他出战状态一致，待切换角色触发「换班时间」效果后，再将「换班时间」移至弃牌区。<br>「交给我吧！」、「鹤归之时」等牌优先级同理。<br>故此「换班时间」和「风域」是由所属牌手选择其中一种先消耗。 | 保留线上减费结算及卡牌移除方式 |
| QA-64 | C028 | 温迪 | [C028/465.json](../../../physical-static-data/data/C028/465.json) | 我方场上存在「暴风之眼」时，使用温迪的「元素爆发」，「暴风之眼」如何变化？ | 视为召唤新的「暴风之眼」，伤害类型为风元素，可用次数为2。而如果此次「元素爆发」引发了扩散反应，转换此牌的元素类型。 | 保留线上重建行为 |
| QA-65 | C035 | 无相之雷 | [C035/485.json](../../../physical-static-data/data/C035/485.json) | 「雷晶核心」的「免于被击倒」与「旋火轮」、「雷兽之盾」等协同攻击如何结算？ | 对手的技能伤害触发「雷晶核心」的「免于被击倒」时，会先触发「雷晶核心」的效果回复到1点生命值，接着再结算协同攻击的伤害。而如果同时有「旋火轮」和「雷兽之盾」的协同攻击，其中之一触发「雷晶核心」的「免于被击倒」时，会先触发「雷晶核心」的效果回复到1点生命值，接着再结算另一个协同攻击的伤害。<br>扩散反应引发的感电/超导反应造成的穿透伤害，会与触发元素反应的伤害同时结算，再触发「雷晶核心」的效果回复到1点生命值。<br>举例：香菱对2点生命值、有「雷晶核心」的无相之雷使用「普通攻击」并触发「旋火轮」时，2点物理伤害会先触发「雷晶核心」的效果，再通过「旋火轮」击倒无相之雷。 | 整体保留线上伤害及免于击倒时序 |
| QA-66 | C036 | 丘丘岩盔王 | [C036/477.json](../../../physical-static-data/data/C036/477.json) | 实体化改动 | 由于坚岩之力依附「岩盔」的移除而移除，为简化实体牌操作，选择将「岩盔」与「坚岩之力」进行效果合并。 | 直接应用线上行为，不做调整 |
| QA-67 | C037 | 七七 | [C037/1797.json](../../../physical-static-data/data/C037/1797.json) | 同时触发「度厄真符」的治疗效果与「鹤归之时」或「风与自由」的切人效果时，如何结算？ | 由所属玩家自选触发顺序。因为优先级同为出战状态，且同为“我方角色使用技能后”触发。 | 保留线上结算顺序 |
| QA-68 | C037 | 七七 | [C037/1797.json](../../../physical-static-data/data/C037/1797.json) | 枫原万叶使用元素战技切换角色时，触发「度厄真符」的治疗效果，如何结算？ | 先触发枫原万叶元素战技的切换角色效果，再结算「度厄真符」的回复给新的出战角色。 | 保留线上治疗对象和触发时序 |
| QA-69 | C040 | 宵宫 | [C040/1809.json](../../../physical-static-data/data/C040/1809.json) | 同时拥有宵宫的「琉金火光」和行秋的「虹剑势」，我方行秋「普通攻击」时，如何结算？ | 由于都为出战状态，优先级一致，所以由所属玩家决定先触发哪种效果。 | 沿用线上结算顺序 |
| QA-70 | C042 | 托马 | [C042/1790.json](../../../physical-static-data/data/C042/1790.json) | 同时拥有托马的「炽火大铠」和行秋的「虹剑势」，我方行秋「普通攻击」时，如何结算？ | 由于都为出战状态，优先级一致，所以由所属玩家决定先触发哪种效果。 | 沿用线上结算顺序 |
| QA-71 | C043 | 雷泽 | [C043/1804.json](../../../physical-static-data/data/C043/1804.json) | 同时拥有雷泽的「雷狼」和行秋的「虹剑势」，我方雷泽「普通攻击」时，如何结算？ | 由于都为出战状态，优先级一致，所以由所属玩家决定先触发哪种效果。 | 保留线上结算，不新增覆盖；与 QA-83 冲突已裁定 |
| QA-72 | C046 | 枫原万叶 | [C046/1806.json](../../../physical-static-data/data/C046/1806.json) | 同时有「乱岚拨止」的「快速行动」效果和其他「快速行动」效果（交给我吧！、凯瑟琳等等）时，是否触发其他卡牌效果？ | 莫娜的被动技能、「交给我吧！」的优先级高于「乱岚拨止」，「凯瑟琳」、「红羽团扇」、「阳华」的优先级低于「乱岚拨止」。<br>故此，先打出「交给我吧！」再切换到附属「乱岚拨止」的枫原万叶，会消耗掉「交给我吧！」。 | 保留线上快速切换结算 |
| QA-73 | C046 | 枫原万叶 | [C046/1806.json](../../../physical-static-data/data/C046/1806.json) | 我方场上存在「流风秋野」时，使用枫原万叶的「元素爆发」，「流风秋野」如何变化？ | 视为召唤新的「流风秋野」，伤害类型为风元素，可用次数为3。而如果此次「元素爆发」引发了扩散反应，转换此牌的元素类型。 | 保留线上重建行为 |
| QA-74 | C046 | 枫原万叶 | [C046/1806.json](../../../physical-static-data/data/C046/1806.json) | 枫原万叶使用元素战技时，触发「度厄真符」的治疗效果，如何结算？ | 先触发枫原万叶元素战技的切换角色效果，再结算「度厄真符」。<br>角色技能优先级高于出战状态，其他同理。 | 保留线上治疗对象和触发时序 |
| QA-75 | C047 | 荒泷一斗 | [C047/1794.json](../../../physical-static-data/data/C047/1794.json) | 当回合再次使用荒泷一斗的元素战技，能否刷新「阿丑」的效果？ | 能，视为召唤新的「阿丑」，会重置减伤盾并可重新触发“此召唤物在场期间可触发1次”的效果。 | 保留所选线上历史版本的重建行为 |
| QA-76 | C071 | 特瓦林 | [C071/2259.json](../../../physical-static-data/data/C071/2259.json) | 什么是准备技能？ | 有些技能无法被直接使用，而是需要一定次数的行动轮来进行准备。<br>轮到一位牌手行动时，如果该牌手的「出战角色」正在准备技能，则跳过该牌手的行动；如果技能已经完成准备，角色将会在此时直接使用此技能。（此类需要准备的技能，无法触发「使用技能后」「角色引发元素反应后」等效果。）<br>只有「出战角色」才能准备技能；如果正在准备技能的「出战角色」被切换到后台，技能的准备就会被打断。<br>准备技能不会额外充能。<br>例如北斗、坎蒂丝、无相之雷的一次「元素战技」只会获得一点充能。 | 整体沿用线上准备技能行为 |
| QA-77 | T026 | 纯水幻形：蛙 | [T026/125.json](../../../physical-static-data/data/T026/125.json) | 如果「蛙」与其他护盾/减伤盾同时存在，哪一种护盾先生效？ | 状态标签的护盾/减伤盾会先生效，出战状态的护盾/减伤盾后生效。如果都是状态的护盾/减伤盾，则由所属牌手选择其中一种先生效；如果都是出战状态的护盾/减伤盾，则由所属牌手选择其中一种先生效。<br>「蛙」优先级和出战状态一致，由所属牌手自选触发顺序。 | 保留线上分类与减伤顺序；与 QA-54 同条规则 |
| QA-78 | T030 | 渊火加护 | [T030/258.json](../../../physical-static-data/data/T030/258.json) | 如果与其他护盾同时存在，哪一种护盾先生效？ | 状态标签的护盾会先生效，出战状态的护盾后生效。如果都是状态的护盾则所属牌手选择其中一种先生效，如果都是出战状态的护盾则所属牌手选择其中一种先生效。 | 与 QA-02 同规则；不采纳，沿用线上护盾顺序 |
| QA-79 | T054 | 雷兽之盾 | [T054/718.json](../../../physical-static-data/data/T054/718.json) | 如果与其他护盾/减伤盾同时存在，哪一种护盾先生效？ | 状态标签的护盾/减伤盾会先生效，出战状态的护盾/减伤盾后生效。如果都是状态的护盾/减伤盾则所属牌手选择其中一种先生效，如果都是出战状态的护盾/减伤盾则所属牌手选择其中一种先生效。 | 与 QA-02 同规则；不采纳，沿用线上护盾顺序 |
| QA-80 | T072 | 雷晶核心 | [T072/524.json](../../../physical-static-data/data/T072/524.json) | 「雷晶核心」的「免于被击倒」与「旋火轮」、「雷兽之盾」等协同攻击如何结算？ | 对手的技能伤害触发「雷晶核心」的「免于被击倒」时，会先触发「雷晶核心」的效果回复到1点生命值，接着再结算协同攻击的伤害。<br>而如果同时有「旋火轮」和「雷兽之盾」的协同攻击，其中之一触发「雷晶核心」的「免于被击倒」时，会先触发「雷晶核心」的效果回复到1点生命值，接着再结算另一个协同攻击的伤害。<br>扩散反应引发的感电/超导反应造成的穿透伤害，会与触发元素反应的伤害同时结算，再触发「雷晶核心」的效果回复到1点生命值。<br>举例：香菱对2点生命值、有「雷晶核心」的无相之雷使用「普通攻击」并触发「旋火轮」时，2点物理伤害会先触发「雷晶核心」的效果，再通过「旋火轮」击倒无相之雷。 | 整体保留线上伤害及免于击倒时序 |
| QA-81 | T073 | 岩盔 | [T073/525.json](../../../physical-static-data/data/T073/525.json) | 实体化改动 | 由于「坚岩之力」依附「岩盔」的移除而移除，为简化实体牌操作，选择将「岩盔」与「坚岩之力」进行效果合并。 | 直接应用线上行为，不做调整 |
| QA-82 | T075 | 度厄真符 | [T075/2005.json](../../../physical-static-data/data/T075/2005.json) | 如果触发「度厄真符」时，出战状态的枫原万叶使用元素战技切换角色时，触发「度厄真符」的治疗效果，如何结算？ | 先触发枫原万叶元素战技的切换角色效果，再结算「度厄真符」的回复给新的出战角色。 | 保留线上治疗对象和触发时序 |
| QA-83 | T087 | 雷狼 | [T087/1911.json](../../../physical-static-data/data/T087/1911.json) | 同时拥有雷泽的「雷狼」和行秋的「虹剑势」，我方雷泽「普通攻击」时，如何结算？ | 先触发「雷狼」再触发「虹剑势」，因为先结算角色状态的效果再结算「虹剑势」。 | 保留线上结算，不新增覆盖；与 QA-71 冲突已裁定 |
| QA-84 | T125 | 焚落踢 | [T125/2497.json](../../../physical-static-data/data/T125/2497.json) | 什么是准备技能？ | "有些技能无法被直接使用，而是需要一定次数的行动轮来进行准备。<br>轮到一位牌手行动时，如果该牌手的「出战角色」正在准备技能，则跳过该牌手的行动；如果技能已经完成准备，角色将会在此时直接使用此技能。（此类需要准备的技能，无法触发「使用技能后」「角色引发元素反应后」等效果。）<br>只有「出战角色」才能准备技能；如果正在准备技能的「出战角色」被切换到后台，技能的准备就会被打断。<br>准备技能不会额外充能。<br>例如北斗、坎蒂丝、无相之雷的一次「元素战技」只会获得一点充能。" | 整体沿用线上准备技能行为 |
| QA-85 | T133 | 旋云护盾 | [T133/2649.json](../../../physical-static-data/data/T133/2649.json) | 如果「旋云护盾」与其他护盾减伤盾同时存在，哪一种护盾先生效？ | 状态标签的护盾减伤盾会先生效，出战状态的护盾减伤盾后生效。如果都是状态的护盾减伤盾，则由所属牌手选择其中一种先生效；如果都是出战状态的护盾减伤盾，则由所属牌手选择其中一种先生效。 | 与 QA-02 同规则；不采纳，沿用线上护盾顺序 |
| QA-86 | T142 | 雷萤护罩 | [T142/2288.json](../../../physical-static-data/data/T142/2288.json) | 如果「雷萤护罩」与其他护盾减伤盾同时存在，哪一种护盾先生效？ | 状态标签的护盾减伤盾会先生效，出战状态的护盾减伤盾后生效。如果都是状态的护盾减伤盾，则由所属牌手选择其中一种先生效；如果都是出战状态的护盾减伤盾，则由所属牌手选择其中一种先生效。 | 与 QA-02 同规则；不采纳，沿用线上护盾顺序 |


**H. 目标白名单**

用户已按 Q01 确认：目标集合为 A、B 的顶层 ID 并集去掉 322023，共 327 项：72 个角色、255 张行动牌。A 含 284 项，B 含 44 项（含补回的 322003），互不重复；C 是它们的子集。依赖、技能、配件与协调状态不加入白名单。

为方便后续生成，完整 ID 集合如下（只有数据，没有实现代码）：

```text
1101, 1102, 1103, 1104, 1105, 1106, 1107, 1108, 1109, 1110, 1201, 1202, 1203, 1204, 1205, 1206, 1207, 1208, 1209, 1301, 1302, 1303, 1304, 1305, 1307, 1308, 1309, 1311, 1401, 1402, 1403, 1404, 1405, 1406, 1407, 1408, 1409, 1501, 1502, 1503, 1504, 1505, 1506, 1510, 1601, 1602, 1603, 1604, 1605, 1606, 1607, 1701, 1702, 1703, 1704, 1705, 1707, 2101, 2201, 2202, 2205, 2301, 2302, 2303, 2401, 2403, 2404, 2501, 2502, 2601, 2701, 2703, 211011, 211021, 211031, 211041, 211051, 211061, 211071, 211081, 211091, 211101, 212011, 212021, 212031, 212041, 212051, 212061, 212071, 212081, 212091, 213011, 213021, 213031, 213041, 213051, 213071, 213081, 213091, 213111, 214011, 214021, 214031, 214041, 214051, 214061, 214071, 214081, 214091, 215011, 215021, 215031, 215041, 215051, 215061, 215101, 216011, 216021, 216031, 216041, 216051, 216061, 216071, 217011, 217021, 217031, 217041, 217051, 217071, 221011, 222011, 222021, 222051, 223011, 223021, 223031, 224011, 224031, 224041, 225011, 225021, 226011, 227011, 227031, 311101, 311102, 311103, 311104, 311105, 311106, 311107, 311201, 311202, 311203, 311204, 311205, 311206, 311301, 311302, 311303, 311304, 311305, 311306, 311307, 311401, 311402, 311404, 311405, 311406, 311407, 311501, 311502, 311503, 311504, 311505, 311507, 312001, 312002, 312003, 312004, 312005, 312006, 312007, 312008, 312009, 312010, 312011, 312012, 312013, 312014, 312015, 312016, 312017, 312018, 312019, 312020, 312021, 312022, 312025, 312027, 312028, 312101, 312102, 312201, 312202, 312301, 312302, 312401, 312402, 312501, 312502, 312601, 312602, 312701, 312702, 313001, 313003, 313007, 321001, 321002, 321003, 321005, 321006, 321007, 321008, 321009, 321010, 321011, 321012, 321013, 321014, 321015, 321016, 321022, 322001, 322002, 322003, 322004, 322005, 322006, 322007, 322008, 322009, 322010, 322011, 322012, 322013, 322014, 322015, 322016, 322017, 322018, 322019, 322020, 322022, 323001, 323002, 323003, 323004, 323005, 323006, 323007, 330001, 330002, 330003, 330004, 330005, 330007, 330008, 331101, 331102, 331201, 331202, 331301, 331302, 331401, 331402, 331501, 331502, 331601, 331602, 331701, 331702, 331801, 331802, 331803, 331804, 332001, 332002, 332003, 332004, 332005, 332006, 332007, 332008, 332009, 332010, 332011, 332012, 332013, 332014, 332015, 332016, 332017, 332018, 332019, 332020, 332021, 332022, 332023, 332024, 332026, 332027, 333001, 333002, 333003, 333004, 333005, 333006, 333007, 333008, 333009, 333010, 333011, 333012, 333013, 333016
```

R 项完成整组验证后才能转正式输入；M 项覆盖官方身份并同步展示。QA 已全部裁定；全局选序、区域改造、强制重建等提案已撤销，最终手写范围与未完成的技术核验见主报告。

