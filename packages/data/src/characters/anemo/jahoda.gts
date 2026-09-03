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

import { DiceType, DamageType, $, Aura, type CardHandle, Reaction } from "@gi-tcg/core/data";
import { AgileSwitch } from "../../commons.gts";

/**
 * @id 115161
 * @name 呼噜噜秘藏瓶
 * @description
 * 雅珂达切换为出战角色时:如果敌方出战角色附着有火/水/雷/冰元素，则将此牌转化为对应元素。
 * 战斗行动：对敌方出战角色造成2点风元素伤害，然后再造成1点风元素伤害。
 */
define card {
  id 115161 as PurrloinedTreasureFlask;
  since "v7.0.0";
  cost DiceType.Aligned, 4;
  tags action;
  undiscoverable;
  on switchActive {
    when :(
      :e.switchInfo.to.definition.id === Jahoda &&
        ([Aura.Pyro, Aura.Hydro, Aura.Electro, Aura.Cryo] as Aura[]).includes(
          :query($.opp.active)!.aura,
        )
    );
    const TRANSFORM_MAP: Partial<Record<Aura, CardHandle>> = {
      [Aura.Pyro]: PurrloinedTreasureFlaskPyro,
      [Aura.Hydro]: PurrloinedTreasureFlaskHydro,
      [Aura.Electro]: PurrloinedTreasureFlaskElectro,
      [Aura.Cryo]: PurrloinedTreasureFlaskCryo,
    };
    const target = TRANSFORM_MAP[:query($.opp.active)!.aura];
    if (target) {
      :transformDefinition(:self, target);
    }
  };
  :damage(DamageType.Anemo, 2);
  :eventBoundary();
  :damage(DamageType.Anemo, 1, $.macros.oppActivePrioritized);
}

/**
 * @id 115162
 * @name 呼噜噜秘藏瓶·火
 * @description
 * 战斗行动：对敌方出战角色造成2点火元素伤害，然后再造成1点火元素伤害。
 */
define card {
  id 115162 as PurrloinedTreasureFlaskPyro;
  since "v7.0.0";
  cost DiceType.Aligned, 4;
  tags action;
  undiscoverable;
  :damage(DamageType.Pyro, 2);
  :eventBoundary();
  :damage(DamageType.Pyro, 1, $.macros.oppActivePrioritized);
}

/**
 * @id 115163
 * @name 呼噜噜秘藏瓶·水
 * @description
 * 战斗行动：对敌方出战角色造成2点水元素伤害，然后再造成1点水元素伤害。
 */
define card {
  id 115163 as PurrloinedTreasureFlaskHydro;
  since "v7.0.0";
  cost DiceType.Aligned, 4;
  tags action;
  undiscoverable;
  :damage(DamageType.Hydro, 2);
  :eventBoundary();
  :damage(DamageType.Hydro, 1, $.macros.oppActivePrioritized);
}

/**
 * @id 115164
 * @name 呼噜噜秘藏瓶·雷
 * @description
 * 战斗行动：对敌方出战角色造成2点雷元素伤害，然后再造成1点雷元素伤害。
 */
define card {
  id 115164 as PurrloinedTreasureFlaskElectro;
  since "v7.0.0";
  cost DiceType.Aligned, 4;
  tags action;
  undiscoverable;
  :damage(DamageType.Electro, 2);
  :eventBoundary();
  :damage(DamageType.Electro, 1, $.macros.oppActivePrioritized);
}

/**
 * @id 115165
 * @name 呼噜噜秘藏瓶·冰
 * @description
 * 战斗行动：对敌方出战角色造成2点冰元素伤害，然后再造成1点冰元素伤害。
 */
define card {
  id 115165 as PurrloinedTreasureFlaskCryo;
  since "v7.0.0";
  cost DiceType.Aligned, 4;
  tags action;
  undiscoverable;
  :damage(DamageType.Cryo, 2);
  :eventBoundary();
  :damage(DamageType.Cryo, 1, $.macros.oppActivePrioritized);
}

/**
 * @id 115166
 * @name 猫型家用互助协调器
 * @description
 * 结束阶段：造成1点等于我方出战角色元素属性的元素伤害（如果是草、岩元素角色，则造成风元素伤害），治疗我方受伤最多的角色2点。
 * 可用次数：2
 */
define combatStatus {
  id 115166 as PurrsonalCoordinatedAssistanceRobots;
  since "v7.0.0";
  on endPhase {
    usage 2;
    const activeElement = :query($.my.active)!.element();
    if (activeElement === DiceType.Dendro || activeElement === DiceType.Geo) {
      :damage(DamageType.Anemo, 1);
    } else {
      :damage(activeElement as number as DamageType, 1);
    }
    :heal(2, $.macros.myMostInjured);
  };
}

/**
 * @id 15161
 * @name 见机行矢
 * @description
 * 造成2点物理伤害。
 */
define skill {
  id 15161 as StrikeWhileTheArrowsHot;
  skillType normal;
  cost DiceType.Anemo, 1;
  cost DiceType.Void, 2;
  :damage(DamageType.Physical, 2);
}

/**
 * @id 15162
 * @name 奇策·财富分配方案
 * @description
 * 造成2点风元素伤害，生成1层敏捷切换，我方切换到下一个角色。如果手牌中没有任意元素的呼噜噜秘藏瓶，则生成手牌呼噜噜秘藏瓶；否则，赋予手牌中所有的呼噜噜秘藏瓶费用降低。
 */
define skill {
  id 15162 as SavvyStrategySplittingTheSpoils;
  skillType elemental;
  cost DiceType.Anemo, 3;
  :damage(DamageType.Anemo, 2);
  :combatStatus(AgileSwitch);
  :switchActive($.my.next);
  const bottles = :player.hands.filter((card) =>
    (
      [
        PurrloinedTreasureFlask,
        PurrloinedTreasureFlaskPyro,
        PurrloinedTreasureFlaskHydro,
        PurrloinedTreasureFlaskElectro,
        PurrloinedTreasureFlaskCryo,
      ] as CardHandle[]
    ).includes(card.definition.id as CardHandle),
  );
  if (bottles.length === 0) {
    :createHandCard(PurrloinedTreasureFlask);
  } else {
    for (const bottle of bottles) {
      :attachCostReduction(bottle);
    }
  }
}

/**
 * @id 15163
 * @name 秘器·猎人的七道具
 * @description
 * 造成3点风元素伤害，生成猫型家用互助协调器。
 */
define skill {
  id 15163 as HiddenAcesSevenToolsOfTheHunter;
  skillType burst;
  cost DiceType.Anemo, 3;
  cost DiceType.Energy, 2;
  :damage(DamageType.Anemo, 3);
  :combatStatus(PurrsonalCoordinatedAssistanceRobots);
}

/**
 * @id 15164
 * @name 月兆祝赐·檐上趱行
 * @description
 * 【被动】战斗开始时，生成手牌呼噜噜秘藏瓶。
 * 我方触发月反应或扩散反应后，使我方手牌中所有呼噜噜秘藏瓶附着费用降低。（每回合2次）
 */
define skill {
  id 15164 as MoonsignBenedictionRooftopDash;
  skillType passive {
    on battleBegin {
      :createHandCard(PurrloinedTreasureFlask);
    };
    on dealReaction {
      when :(
        (
          [
            Reaction.LunarElectroCharged,
            Reaction.LunarBloom,
            Reaction.LunarCrystallizeHydro,
          ] as Reaction[]
        ).includes(:e.type) || :e.relatedTo(DamageType.Anemo)
      );
      listenTo samePlayer;
      usage perRound, 2 { name usagePerRound1; };
      const bottles = :player.hands.filter((card) =>
        (
          [
            PurrloinedTreasureFlask,
            PurrloinedTreasureFlaskPyro,
            PurrloinedTreasureFlaskHydro,
            PurrloinedTreasureFlaskElectro,
            PurrloinedTreasureFlaskCryo,
          ] as CardHandle[]
        ).includes(card.definition.id as CardHandle),
      );
      for (const bottle of bottles) {
        :attachCostReduction(bottle);
      }
    };
  };
}

/**
 * @id 15165
 * @name 月兆祝赐·檐上趱行
 * @description
 * 【被动】战斗开始时，生成手牌呼噜噜秘藏瓶。
 * 我方触发月反应或扩散反应后，使我方手牌中所有呼噜噜秘藏瓶附着费用降低。（每回合2次）
 */
define skill {
  id 15165 as MoonsignBenedictionRooftopDash01;
  skillType passive;
  reserved;
}

/**
 * @id 1516
 * @name 雅珂达
 * @description
 * 千虑秘闻，亦有一得。
 */
define character {
  id 1516 as Jahoda;
  since "v7.0.0";
  tags anemo, bow, nodkrai;
  health 10;
  energy 2;
  skills StrikeWhileTheArrowsHot, SavvyStrategySplittingTheSpoils, HiddenAcesSevenToolsOfTheHunter, MoonsignBenedictionRooftopDash;
}

/**
 * @id 215161
 * @name 暗巷的黠慧
 * @description
 * 战斗行动：我方出战角色为雅珂达时，装备此牌。
 * 雅珂达装备此牌后，立刻使用一次奇策·财富分配方案。
 * 雅珂达切换成出战角色时，如果敌方手牌数量大于或等于我方手牌数量，则随机复制2张敌方手牌。（每回合1次）
 * （牌组中包含雅珂达，才能加入牌组）
 */
define card {
  id 215161 as BackstreetGuile;
  since "v7.0.0";
  cost DiceType.Anemo, 3;
  talent Jahoda {
    on staged {
      :useSkill(SavvyStrategySplittingTheSpoils);
    };
    on switchActive {
      when :(
        :e.switchInfo.to.definition.id === Jahoda &&
          :oppPlayer.hands.length >= :player.hands.length
      );
      usage perRound, 1;
      const randomCards = :randomSubset(:oppPlayer.hands, 2);
      for (const card of randomCards) {
        :createHandCard(card.definition.id as CardHandle);
      }
    };
  };
}
