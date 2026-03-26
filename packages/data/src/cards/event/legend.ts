// Copyright (C) 2024-2025 Guyutongxue
// 
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as
// published by the Free Software Foundation, either version 3 of the
// License, or (at your option) any later version.
// 
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Affero General Public License for more details.
// 
// You should have received a copy of the GNU Affero General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>.

import { DiceType, card, combatStatus, extension, flip, status } from "@gi-tcg/core/builder";
import { DisperseTheCalamity, SanctifyTheDefiled } from "./other";
import { IneffectiveWhenPlayed } from "../../commons";

/**
 * @id 330001
 * @name 旧时庭园
 * @description
 * 我方有角色已装备「武器」或「圣遗物」时，才能打出：本回合中，我方下次打出「武器」或「圣遗物」装备牌时少花费2个元素骰。
 * （整局游戏只能打出一张「秘传」卡牌；这张牌一定在你的起始手牌中）
 */
export const [AncientCourtyard] = card(330001)
  .since("v3.8.0")
  .legend()
  .filter((c) => c.$("my character has equipment with tag (weapon) or my character has equipment with tag (artifact)"))
  .toCombatStatus(300001)
  .oneDuration()
  .once("deductOmniDiceCard", (c, e) => e.hasOneOfCardTag("weapon", "artifact"))
  .deductOmniCost(2)
  .done();

/**
 * @id 330002
 * @name 磐岩盟契
 * @description
 * 我方剩余元素骰数量为0时，才能打出：生成2个不同的基础元素骰。
 * （整局游戏只能打出一张「秘传」卡牌；这张牌一定在你的起始手牌中）
 */
export const CovenantOfRock = card(330002)
  .since("v3.8.0")
  .legend()
  .filter((c) => c.player.dice.length === 0)
  .generateDice("randomElement", 2)
  .done();

/**
 * @id 330003
 * @name 愉舞欢游
 * @description
 * 我方出战角色的元素类型为冰/水/火/雷/草时，才能打出：对我方所有具有元素附着的角色，附着我方出战角色类型的元素。
 * （整局游戏只能打出一张「秘传」卡牌；这张牌一定在你的起始手牌中）
 */
export const JoyousCelebration = card(330003)
  .since("v4.0.0")
  .legend()
  .filter((c) => ([DiceType.Cryo, DiceType.Hydro, DiceType.Pyro, DiceType.Electro, DiceType.Dendro] as (DiceType | undefined)[]).includes(c.$("my active")?.element()))
  .do((c) => {
    const element = c.$("my active")!.element() as 1 | 2 | 3 | 4 | 7;
    // 先挂后台再挂前台（避免前台被超载走导致结算错误）
    c.apply(element, "my standby character with aura != 0");
    c.apply(element, "my active character with aura != 0");
  })
  .done();


/**
 * @id 330004
 * @name 自由的新风
 * @description
 * 本回合中，轮到我方行动期间有对方角色被击倒时：本次行动结束后，我方可以再连续行动一次。
 * 可用次数：1
 * （整局游戏只能打出一张「秘传」卡牌；这张牌一定在你的起始手牌中）
 */
export const [FreshWindOfFreedom, FreshWindOfFreedomInEffect] = card(330004)
  .since("v4.1.0")
  .legend()
  .toCombatStatus(300002)
  .oneDuration()
  .on("defeated", (c, e) =>
    c.isMyTurn() && 
    !c.oppPlayer.declaredEnd &&
    !e.target.isMine() && 
    (c.phase === "action" || c.player.defeatedSwitching || c.oppPlayer.defeatedSwitching))
  .listenToAll()
  .usage(1)
  .continueNextTurn()
  .done();

/**
 * @id 330005
 * @name 万家灶火
 * @description
 * 第1回合打出此牌时：如果我方牌组中初始包含至少2张不同的「天赋」牌，则抓1张「天赋」牌。
 * 第2回合及以后打出此牌时：我方抓当前的回合数-1数量的牌。（最多抓4张）
 * （整局游戏只能打出一张「秘传」卡牌；这张牌一定在你的起始手牌中）
 * 【此卡含描述变量】
 */
export const InEveryHouseAStove = card(330005)
  .since("v4.2.0")
  .legend()
  .replaceDescription("[T]", (st) => st.roundNumber)
  .filter((c) => {
    if (c.roundNumber === 1) {
      return new Set(
        c.player.initialPile
          .filter((card) => card.tags.includes("talent"))
          .map((card) => card.id)
      ).size >= 2;
    } else {
      return true;
    }
  })
  .do((c) => {
    if (c.roundNumber === 1) {
      const initTalentDefIds = c.player.initialPile
        .filter((card) => card.tags.includes("talent"))
        .map((card) => card.id)
      if (new Set(initTalentDefIds).size >= 2) {
        c.drawCards(1, { withTag: "talent" });
      }
    } else {
      const count = Math.min(c.roundNumber - 1, 4);
      c.drawCards(count);
    }
  })
  .done();

/**
 * @id 300003
 * @name 裁定之时（生效中）
 * @description
 * 本回合中，我方打出事件牌后：赋予我方手牌中所有事件牌无效化。
 * 本回合中，我方舍弃手牌后：将我方手牌中2张当前元素骰费用最高的卡牌置入牌组底。
 */
export const PassingOfJudgmentInEffect = combatStatus(300003)
  .oneDuration()
  .on("playCard", (c, e) => e.card.definition.type === "eventCard")
  .usage(1, { autoDispose: false, visible: false })
  .do((c) => {
    for (const hand of c.player.hands) {
      if (hand.definition.type === "eventCard") {
        c.attach(IneffectiveWhenPlayed, hand);
      }
    }
  })
  .on("disposeCard", (c, e) => e.from.type === "hands")
  .do((c) => {
    const maxCostHands = c.maxCostHands(2);
    c.undrawCards(maxCostHands, "bottom");
  })
  .done();

/**
 * @id 330006
 * @name 裁定之时
 * @description
 * 本回合中，敌方下次打出事件牌后：赋予敌方手牌中所有事件牌无效化。
 * 本回合中，敌方舍弃手牌后：将敌方手牌中2张当前元素骰费用最高的卡牌置入牌组底。
 * （整局游戏只能打出一张「秘传」卡牌；这张牌一定在你的起始手牌中）
 */
export const PassingOfJudgment = card(330006)
  .since("v4.3.0")
  .legend()
  .combatStatus(PassingOfJudgmentInEffect, "opp")
  .done();

/**
 * @id 330007
 * @name 抗争之日·碎梦之时
 * @description
 * 本回合中，目标我方角色受到的伤害-1。（最多生效4次）
 * （整局游戏只能打出一张「秘传」卡牌；这张牌一定在你的起始手牌中）
 */
export const [DayOfResistanceMomentOfShatteredDreams] = card(330007)
  .since("v4.5.0")
  .legend()
  .addTarget("my character")
  .toStatus(300004, "@targets.0")
  .tags("barrier")
  .oneDuration()
  .on("decreaseDamaged")
  .usage(4)
  .decreaseDamage(1)
  .done();

/**
 * @id 330008
 * @name 旧日鏖战
 * @description
 * 敌方出战角色失去1点充能。
 * （整局游戏只能打出一张「秘传」卡牌；这张牌一定在你的起始手牌中）
 */
export const ViciousAncientBattle = card(330008)
  .since("v4.7.0")
  .legend()
  .do((c) => {
    c.$("opp active")?.loseEnergy(1);
  })
  .done();

/**
 * @id 300005
 * @name 赦免宣告（生效中）
 * @description
 * 所附属角色免疫冻结、眩晕、石化等无法使用技能的效果，并且该角色为「出战角色」时不会因效果而切换。
 * 持续回合：2
 */
export const EdictOfAbsolutionInEffect = status(300005)
  .since("v5.0.0")
  .tags("immuneControl")
  .duration(2)
  .done();


/**
 * @id 330009
 * @name 赦免宣告
 * @description
 * 治疗目标角色2点。
 * 目标角色免疫冻结、眩晕、石化等无法使用技能的效果，并且该角色为「出战角色」时不会因效果而切换，持续2个回合。
 * （整局游戏只能打出一张「秘传」卡牌；这张牌一定在你的起始手牌中）
 */
export const EdictOfAbsolution = card(330009)
  .since("v5.0.0")
  .costSame(1)
  .legend()
  .addTarget("my characters")
  .heal(2, "@targets.0")
  .characterStatus(EdictOfAbsolutionInEffect, "@targets.0")
  .done();

export const FlamesOfWarExtension = extension(300006, {
    spirit: "pair<number>",
    win: "pair<boolean>",
  })
    .initialState({
      spirit: [0, 0],
      win: [false, false],
    })
    .description("记录双方斗争之火的「斗志」，并在行动阶段开始时设置斗争之火的胜者")
    .mutateWhen("onDamageOrHeal", (st, e) => {
      if (e.sourceWho !== e.targetWho) {
        st.spirit[e.sourceWho] += e.damageInfo.value;
      }
    })
    .mutateWhen("onActionPhase", (st) => {
      const currentSpirits = [...st.spirit];
      st.win = [false, false];
      if (currentSpirits[0] >= currentSpirits[1]) {
        st.win[0] = true;
        st.spirit[0] = 0;
      }
      if (currentSpirits[0] <= currentSpirits[1]) {
        st.win[1] = true;
        st.spirit[1] = 0;
      }
    })
    .done();
  
  /**
   * @id 300007
   * @name 斗争之火（生效中）
   * @description
   * 附属角色本回合造成的伤害+1。（可叠加）
   */
  export const FlamesOfWarInEffect = status(300007)
    .oneDuration()
    .variable("increasedDamage", 1)
    .on("increaseSkillDamage")
    .do((c, e) => {
      e.increaseDamage(c.getVariable("increasedDamage"));
    })
    .done();
  
  /**
   * @id 300006
   * @name 斗争之火
   * @description
   * 此牌会记录本回合你对敌方角色造成的伤害，记为「斗志」。
   * 行动阶段开始时：若此牌是场上「斗志」最高的斗争之火，则清空此牌的「斗志」，使我方出战角色本回合造成的伤害+1。
   */
  export const FlamesOfWar = card(300006)
    .undiscoverable()
    .support()
    .variable("spirit", 0)
    .associateExtension(FlamesOfWarExtension)
    .on("enter")
    .do((c) => {
      c.setExtensionState((st) => {
        st.spirit[c.self.who] = c.getVariable("spirit");
      });
    })
    .on("dealDamage")
    .do((c) => {
      c.setVariable("spirit", c.getExtensionState().spirit[c.self.who]);
    })
    .on("actionPhase")
    .do((c) => {
      c.setVariable("spirit", c.getExtensionState().spirit[c.self.who]);
      if (c.getExtensionState().win[c.self.who]) {
        c.characterStatus(FlamesOfWarInEffect, "my active");
      }
    })
    .on("selfDispose")
    .do((c) => {
      c.setExtensionState((st) => {
        st.spirit[c.self.who] = 0;
      });
    })
    .done();

/**
 * @id 330010
 * @name 归火圣夜巡礼
 * @description
 * 在双方场上生成斗争之火，然后我方场上的斗争之火的「斗志」+1。（斗争之火会将各自阵营对对方造成的伤害记录为「斗志」，每回合行动阶段开始时「斗志」较高的一方会清空「斗志」，使当前出战角色在本回合中造成的伤害+1。）
 * （整局游戏只能打出一张「秘传」卡牌；这张牌一定在你的起始手牌中）
 */
export const PilgrimageOfTheReturnOfTheSacredFlame = card(330010)
  .since("v5.3.0")
  .legend()
  .do((c) => {
    const myExistsFlame = c.$(`my support with definition id ${FlamesOfWar}`);
    const oppExistsFlame = c.$(`opp support with definition id ${FlamesOfWar}`);
    if (myExistsFlame) {
      myExistsFlame.addVariable("spirit", 1);
    } else if (c.remainingSupportCount("my") > 0) {
      c.createEntity("support", FlamesOfWar, {
        who: c.self.who,
        type: "supports"
      }, {
        overrideVariables: {
          spirit: 1
        }
      });
    }
    if (oppExistsFlame) {
      // do nothing
    } else if (c.remainingSupportCount("opp") > 0) {
      c.createEntity("support", FlamesOfWar, {
        who: flip(c.self.who),
        type: "supports"
      });
    }
  })
  .done();

/**
 * @id 330011
 * @name 为「死」而战
 * @description
 * 抓1张牌。
 * 我方场上每存在一个被击倒的角色：我方剩余全体角色+2最大生命上限。
 */
export const FightForDeath = card(330011)
  .since("v5.7.0")
  .costSame(1)
  .legend()
  .drawCards(1)
  .do((c) => {
    const defeatedCount = c.$$(`my defeated characters`).length;
    if (defeatedCount > 0) {
      const increasedValue = defeatedCount * 2;
      c.increaseMaxHealth(increasedValue, `my characters`);
    }
  })
  .done();

/**
 * @id 330012
 * @name 「沙中遗事」
 * @description
 * 挑选一项：
 * 将敌方1张当前元素骰费用最高的手牌置于牌组底。
 * 或
 * 将我方所有手牌置于牌组底，然后抓相同数量+1张手牌。
 */
export const LostLegaciesInTheSand = card(330012)
  .since("v6.2.0")
  .legend()
  .selectAndPlay([DisperseTheCalamity, SanctifyTheDefiled])
  .done();
