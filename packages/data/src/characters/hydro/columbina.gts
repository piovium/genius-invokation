// Copyright (C) 2026 Piovium Labs
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

import {
  DiceType,
  DamageType,
  $,
  Reaction,
  pair,
  flip,
} from "@gi-tcg/core/data";
import {
  Conductive,
  CostReduction,
  LunarSymphony,
  Thundercloud,
} from "../../commons.gts";

/**
 * @id 112171
 * @name 月之领域
 * @description
 * 敌方受到月感电时：额外赋予敌方随机手牌电击3次，我方月感电造成的伤害+2，我方雷暴云造成的伤害改为3。
 * 敌方受到月绽放时：赋予我方随机手牌费用降低次数改为3。
 * 敌方受到月结晶时：生成的月笼协奏数量改为3。
 * 可用次数：3
 */
define combatStatus {
  id 112171 as LunarDomain;
  since "v7.1.0";
  on increaseDamage {
    // 月感电增伤2点
    when :( :e.getReaction() === Reaction.LunarElectroCharged );
    :e.increaseDamage(2);
  };
  on modifyReaction {
    listenTo all;
    when :(
      !:e.target.isMine() &&
        (
          [
            Reaction.LunarElectroCharged,
            Reaction.LunarBloom,
            Reaction.LunarCrystallizeHydro,
          ] as Reaction[]
        ).includes(:e.type)
    );
    :e.cancelCoreEffects();
    if (:e.type === Reaction.LunarElectroCharged) {
      :summon(Thundercloud, "my", {
        overrideVariables: {
          damageValue: 3,
        },
      });
    } else if (:e.type === Reaction.LunarBloom) {
      const candidates = :queryAll($.macros.myHandsNotFree);
      if (candidates.length > 0) {
        for (let i = 0; i < 3; i++) {
          :attachCostReduction(:random(candidates));
        }
      }
    } else if (:e.type === Reaction.LunarCrystallizeHydro) {
      for (let i = 0; i < 3; i++) {
        :createHandCard(LunarSymphony);
      }
    }
  };
  on reaction {
    listenTo all;
    when :(
      !:e.target.isMine() &&
        (
          [
            Reaction.LunarElectroCharged,
            Reaction.LunarBloom,
            Reaction.LunarCrystallizeHydro,
          ] as Reaction[]
        ).includes(:e.type)
    );
    usage 3;
    if (:e.type === Reaction.LunarElectroCharged) {
      const oppHands = :randomSubset(:queryAll($.opp.hand), 3);
      for (const card of oppHands) {
        :attach(Conductive, card);
      }
    }
  };
};

/**
 * @id 112172
 * @name 引力涟漪
 * @description
 * 结束阶段：造成1点水元素伤害。
 * 可用次数：2
 */
define combatStatus {
  id 112172 as GravityRipple;
  since "v7.1.0";
  on endPhase {
    usage 2;
    :damage(DamageType.Hydro, 1);
  };
};

/**
 * @id 112173
 * @name 抗性
 * @description
 * 我方出战角色受到伤害时：抵消1点伤害。
 */
define combatStatus {
  id 112173 as ResColumbina;
  since "v7.1.0";
  once decreaseDamaged {
    when :( :e.target.isActive() );
    :e.decreaseDamage(1);
  };
};

/**
 * @id 12171
 * @name 月露泼降
 * @description
 * 造成1点水元素伤害。
 * 本局游戏中，敌方累计受到3次月曜反应后，如果我方手牌中存在附着有费用降低的卡牌，则将随机1张附着有费用降低的手牌置于牌组顶，然后再造成1点草元素伤害。（每回合1次）
 */
define skill {
  id 12171 as MoondewCascade;
  skillType normal;
  cost DiceType.Hydro, 1;
  cost DiceType.Void, 2;
  :damage(DamageType.Hydro, 1);
};

/**
 * @id 12172
 * @name 万古潮汐
 * @description
 * 造成1点水元素伤害，生成引力涟漪。
 */
define skill {
  id 12172 as EternalTides;
  skillType elemental;
  cost DiceType.Hydro, 3;
  :damage(DamageType.Hydro, 1);
  :combatStatus(GravityRipple);
};

/**
 * @id 12173
 * @name 她的乡愁
 * @description
 * 造成3点水元素伤害，生成月之领域。
 */
define skill {
  id 12173 as MoonlitMelancholy;
  skillType burst;
  cost DiceType.Hydro, 3;
  cost DiceType.Energy, 3;
  :combatStatus(LunarDomain);
  :damage(DamageType.Hydro, 3);
};

/**
 * @id 12174
 * @name 月兆祝赐·借汝月光
 * @description
 * 【被动】本局游戏中，敌方受到感电反应/绽放反应/结晶(水)反应时，改为月感电/月绽放/月结晶反应。
 * 敌方受到月感电/月绽放/月结晶反应后：造成1点雷元素伤害/草元素伤害/岩元素伤害。（每回合1次）
 */
define skill {
  id 12174 as MoonsignBenedictionMoonlightLentUntoYou;
  skillType passive {
    on reaction {
      listenTo all;
      when :(
        !:e.target.isMine() &&
          (
            [
              Reaction.LunarElectroCharged,
              Reaction.LunarBloom,
              Reaction.LunarCrystallizeHydro,
            ] as Reaction[]
          ).includes(:e.type)
      );
      usage perRound, 1 { name usagePerRound1; };
      if (:e.type === Reaction.LunarElectroCharged) {
        :damage(DamageType.Electro, 1, $.macros.oppActivePrioritized);
      } else if (:e.type === Reaction.LunarBloom) {
        :damage(DamageType.Dendro, 1, $.macros.oppActivePrioritized);
      } else if (:e.type === Reaction.LunarCrystallizeHydro) {
        :damage(DamageType.Geo, 1, $.macros.oppActivePrioritized);
      }
    };
  };
};

/**
 * @id 12175
 * @name 月兆祝赐·借汝月光
 * @description
 *
 */
define skill {
  id 12175 as MoonsignBenedictionMoonlightLentUntoYou01;
  skillType passive;
  reserved;
};

define extension {
  idHint 12176 as LunarReactionExtension;
  description "记录本局游戏受到月曜反应的次数";
  schema ({ reactionCount: "pair<number>" });
  initialState ({ reactionCount: pair(0) });
  mutateWhen onReaction,
    ((st, e) => {
      if (
        (
          [
            Reaction.LunarElectroCharged,
            Reaction.LunarBloom,
            Reaction.LunarCrystallizeHydro,
          ] as Reaction[]
        ).includes(e.type)
      ) {
        st.reactionCount[e.who]++;
      }
    });
};

/**
 * @id 12176
 * @name 月露泼降
 * @description
 *
 */
define skill {
  id 12176 as MoondewCascadePassive;
  skillType passive {
    associateExtension LunarReactionExtension;
    on useSkill {
      asSkillType normal;
      when :(
        :getExtensionState().reactionCount[flip(:self.who)] >= 3 &&
          :e.skill.definition.id === MoondewCascade &&
          :query($.my.hand.with($.def(CostReduction)))
      );
      usage perRound, 1 { name usagePerRound2; };
      const candidates = :queryAll($.my.hand.with($.def(CostReduction)));
      if (candidates.length > 0) {
        const target = :random(candidates);
        :undrawCards([target], "top");
        :damage(DamageType.Dendro, 1);
      }
    };
  };
};

/**
 * @id 1217
 * @name 哥伦比娅
 * @description
 * 月下白鸽，何以为家？
 */
define character {
  id 1217 as Columbina;
  since "v7.1.0";
  tags hydro, catalyst, nodkrai;
  health 10;
  energy 3;
  skills MoondewCascade,
    EternalTides,
    MoonlitMelancholy,
    MoonsignBenedictionMoonlightLentUntoYou,
    MoondewCascadePassive;
  enabledLunarReactions Reaction.LunarElectroCharged,
    Reaction.LunarBloom,
    Reaction.LunarCrystallizeHydro;
};

/**
 * @id 212171
 * @name 遍照花海，隐入群山
 * @description
 * 战斗行动：我方出战角色为哥伦比娅时，装备此牌。
 * 哥伦比娅装备此牌后，立刻使用一次万古潮汐。
 * 装备有此卡牌的哥伦比娅在场时，敌方受到月感电后：我方一名充能未满的角色获得1点充能。
 * 敌方受到月绽放后：我方出战角色下次受到的伤害-1。
 * 敌方受到月结晶后：自动免费打出手牌中当前元素骰费用最高的1张月笼协奏。（每回合2次）
 * （牌组中包含哥伦比娅，才能加入牌组）
 */
define card {
  id 212171 as RadianceOverBlossomsAndPeaks;
  since "v7.1.0";
  cost DiceType.Hydro, 3;
  talent Columbina {
    on staged {
      :useSkill(EternalTides);
    };
    on reaction {
      listenTo all;
      when :(
        !:e.target.isMine() &&
          (
            [
              Reaction.LunarElectroCharged,
              Reaction.LunarBloom,
              Reaction.LunarCrystallizeHydro,
            ] as Reaction[]
          ).includes(:e.type)
      );
      usage perRound, 2;
      if (:e.type === Reaction.LunarElectroCharged) {
        :gainEnergy(1, $.macros.myFirstEnergyNotFull);
      } else if (:e.type === Reaction.LunarBloom) {
        :combatStatus(ResColumbina);
      } else if (:e.type === Reaction.LunarCrystallizeHydro) {
        const targetCard = :query(
          $.my.hand
            .def(LunarSymphony)
            .orderBy(0, "-", $.keys.diceCost)
            .limit(1),
        );
        if (targetCard) {
          :playCard(targetCard, "random");
        }
      }
    };
  };
};
