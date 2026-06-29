import { DiceType, DamageType, $ } from "@gi-tcg/core/builder";

/**
 * @id 313002
 * @name 匿叶龙
 * @description
 * 特技：钩物巧技
 * 可用次数：2
 * （角色最多装备1个「特技」）
 * [3130021: 钩物巧技] (2*Same) 造成1点物理伤害，窃取1张当前元素骰费用最高的对方手牌，然后对手抓1张牌。
 * 如果我方手牌数不多于2，此特技少花费1个元素骰。
 * [3130022: ] ()
 */
const Yumkasaurus = card(313002)
  .since("v5.0.0")
  .costSame(1)
  .technique()
  .on("deductOmniDiceTechnique", (c, e) => e.action.skill.definition.id === 3130021 && c.player.hands.length <= 2)
  .deductOmniCost(1)
  .endOn()
  .provideSkill(3130021)
  .costSame(2)
  .usage(2)
  .damage(DamageType.Physical, 1)
  .do((c) => {
    const [handCard] = c.maxCostHands(1, { who: "opp" });
    if (handCard) {
      c.stealHandCard(handCard);
    }
    c.drawCards(1, { who: "opp" });
  })
  .done();

/**
 * @id 313003
 * @name 鳍游龙
 * @description
 * 特技：游隙灵道
 * 可用次数：2
 * （角色最多装备1个「特技」）
 * [3130031: 游隙灵道] (1*Same) 选择一个我方「召唤物」，立刻触发其「结束阶段」效果。（每回合最多使用1次）
 * [3130032: ] ()
 */
const Koholasaurus = card(313003)
  .since("v5.0.0")
  .costSame(2)
  .technique()
  .provideSkill(3130031)
  .costSame(1)
  .usage(2)
  .usagePerRound(1)
  .addTarget("my summon")
  .do((c, e) => {
    c.triggerEndPhaseSkill(e.targets[0])
  })
  .done();

/**
 * @id 313005
 * @name 暝视龙
 * @description
 * 特技：灵性援护
 * 可用次数：2
 * （角色最多装备1个「特技」）
 * [3130051: 灵性援护] (1*Same) 从「场地」「道具」「料理」中挑选1张加入手牌，并且治疗附属角色1点。
 */
const Iktomisaurus = card(313005)
  .since("v5.2.0")
  .costSame(2)
  .technique()
  .provideSkill(3130051)
  .usage(2)
  .costSame(1)
  .heal(1, "@master")
  .do((c) => {
    const tags = ["place", "item", "food"] as const;
    const candidates: EntityDefinition[] = [];
    for (const tag of tags) {
      const def = c.random(c.allCardDefinitions(tag));
      candidates.push(def);
    }
    c.selectAndCreateHandCard(candidates);
  })
  .done();

/**
 * @id 313006
 * @name 绒翼龙
 * @description
 * 入场时：敌方出战角色附属目标。
 * 敌方附属有目标的角色切换为出战角色时：我方获得1层高效切换和敏捷切换，并移除对方所有角色的目标。
 * 特技：迅疾滑翔
 * 可用次数：2
 * （角色最多装备1个「特技」）
 * [3130061: ] ()
 * [3130062: ] ()
 * [3130063: 迅疾滑翔] (1*Same) 舍弃1张当前元素骰费用最高的手牌，切换到下一名角色，敌方出战角色附属目标。
 */
const Qucusaurus = card(313006)
  .since("v5.3.0")
  .costSame(1)
  .technique()
  .variable("deductDiceTriggered", 0, { visible: false })
  .on("enter")
  .characterStatus(Target, $.opp.active)
  .on("switchActive", (c, e) =>
    !e.switchInfo.to.isMine() &&
    e.switchInfo.to.hasStatus(Target))
  .listenToAll()
  .combatStatus(EfficientSwitch)
  .combatStatus(AgileSwitch)
  .dispose($.opp.typeStatus.def(Target))
  .endOn()
  .provideSkill(3130063)
  .usage(2)
  .costSame(1)
  .disposeMaxCostHands(1)
  .switchActive($.my.next)
  .characterStatus(Target, $.opp.active)
  .done();

/**
 * @id 313007
 * @name 浪船
 * @description
 * 入场时：为我方附属角色提供2点护盾。
 * 附属角色切换至后台时：此牌可用次数+1。
 * 特技：浪船·迅击炮
 * 可用次数：2
 * （角色最多装备1个「特技」）
 * [3130071: 浪船·迅击炮] (1*Same) 造成2点物理伤害。
 * [3130072: ] () 附属角色切换至后台时，此牌可用次数+1。
 * [3130073: ] () 使用时，生成2点护盾
 */
const Waverider = card(313007)
  .since("v5.5.0")
  .costSame(5)
  .technique()
  .provideSkill(3130071)
  .usage(2)
  .costSame(1)
  .damage(DamageType.Physical, 2)
  .endProvide()
  .on("enter")
  .characterStatus(WaveriderShield, "@master")
  .on("switchActive", (c, e) => e.switchInfo.from?.id === c.self.master.id)
  .addVariable("usage", 1)
  .done();

/**
 * @id 313010
 * @name 膨膨兽
 * @description
 * 特技：膨膨音波
 * 可用次数：2
 * （角色最多装备1个「特技」）
 * [3130101: 膨膨音波] (1*Same) 切换到下一个角色，从牌组里随机抓1张当前元素骰费用最高或最低的牌。
 */
const Blubberbeast = card(313010)
  .since("v6.5.0")
  .costSame(1)
  .technique()
  .provideSkill(3130101)
  .usage(2)
  .costSame(1)
  .abortPreview()
  .do((c) => {
    c.switchActive($.my.next);
    const takeMax = c.random([true, false]);
    const pile = Object.groupBy(c.player.pile, (c) => c.diceCost());
    // ES6 保证从小到大排序，无需再 sort
    const costs = Object.keys(pile).map(Number);
    if (costs.length === 0) {
      return;
    }
    const targetCost = takeMax ? costs[costs.length - 1] : costs[0];
    const candidates = pile[targetCost]!;
    const targetCard = c.random(candidates);
    if (targetCard) {
      c.drawCards(targetCard);
    }
  })
  .done();

/**
 * @id 115102
 * @name 竹星
 * @description
 * 特技：仙力助推
 * 可用次数：2
 * （角色最多装备1个「特技」）
 * [1151021: 仙力助推] (1*Same) 治疗所附属角色2点，并使其下次普通攻击视为下落攻击，伤害+1，并且技能结算后造成1点风元素伤害。
 */

const Starwicker = card(115102)
  .since("v5.0.0")
  .undiscoverable()
  .technique()
  .provideSkill(1151021)
  .costSame(1)
  .usage(2)
  .heal(2, "@master")
  .characterStatus(SoaringOnTheWind, "@master")
  .done();

/**
 * @id 122051
 * @name 水泡史莱姆
 * @description
 * 特技：水泡战法
 * 可用次数：2
 * （角色最多装备1个「特技」）
 * [1220511: 水泡战法] (1*Same) （需准备1个行动轮）造成1点水元素伤害，敌方出战角色附属水泡围困。
 * [1220512: 水泡封锁] () 造成1点水元素伤害，敌方出战角色附属水泡围困。
 * [1220513: 水泡封锁] () 造成1点水元素伤害，敌方出战角色附属水泡围困。
 */

const MistBubbleSlime = card(122051)
  .since("v5.0.0")
  .undiscoverable()
  .technique()
  .provideSkill(1220511)
  .costSame(1)
  .usage(2, { autoDispose: false })
  .characterStatus(MistBubbleLockdownPreparing, "@master")
  .endProvide()
  .provideSkill(1220512)
  .prepared()
  .damage(DamageType.Hydro, 1)
  .characterStatus(MistBubblePrison, "opp active")
  .if((c) => c.getVariable("usage") === 0)
  .dispose()
  .endProvide()
  // 切人导致准备中状态消失时，自己如果可用次数耗尽也消失
  .on("switchActive", (c, e) => {
    const ch = c.self.master;
    return ch.id === e.switchInfo.from?.id &&
      ch.hasStatus(MistBubbleLockdownPreparing) &&
      c.getVariable("usage") === 0;
  })
  .dispose()
  .done();

/**
 * @id 123031
 * @name 厄灵·炎之魔蝎
 * @description
 * 所附属角色受到伤害时：如可能，失去1点充能，以抵消1点伤害，然后生成魔蝎祝福。（每回合至多2次）
 * 特技：炙烧攻势
 * 可用次数：1
 * （角色最多装备1个「特技」）
 * [1230311: 炙烧攻势] (2*Same) 造成2点火元素伤害。
 * [1230312: ] ()
 */

const SpiritOfOmenPyroScorpion = card(123031)
  .since("v5.1.0")
  .undiscoverable()
  .technique()
  .tags("barrier")
  .variable("barrierUsage", 0) // no io hint for now
  .on("decreaseDamaged", (c, e) => c.self.master.energy > 0)
  .usagePerRound(2)
  .do((c) => {
    c.self.master.loseEnergy(1);
  })
  .decreaseDamage(1)
  .combatStatus(ScorpionBlessing)
  .endOn()
  .provideSkill(1230311)
  .costSame(2)
  .usage(1)
  .damage(DamageType.Pyro, 2)
  .done();

/**
 * @id 127032
 * @name 厄灵·草之灵蛇
 * @description
 * 特技：藤蔓锋鳞
 * 可用次数：2
 * （角色最多装备1个「特技」）
 * [1270321: 藤蔓锋鳞] (1*Same, 1*Energy) 造成1点草元素伤害。
 * [2270312: ] ()
 */

const SpiritOfOmenDendroSpiritserpent = card(127032)
  .since("v5.1.0")
  .undiscoverable()
  .technique()
  .provideSkill(1270321)
  .costSame(1)
  .costEnergy(1)
  .usage(2, { autoDecrease: false })
  .damage(DamageType.Dendro, 1)
  .if((c) => !c.$(`my combat status with definition id ${SpiritserpentsBlessing}`))
  .consumeUsage(1)
  .done();
