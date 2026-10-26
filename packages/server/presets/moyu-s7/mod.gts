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
  $,
  DamageType,
  DiceType,
  type SkillHandle,
  type SummonHandle,
} from "#custom-data-loader";

const [LiutianArchery, TrailOfTheQilin, FrostflakeArrow] = [
  11011, 11012, 11013,
] as SkillHandle[];
const SacredCryoPearl = 111011 as SummonHandle;

define skill {
  id 11014 as CelestialShower;
  description "造成2点冰元素伤害，对所有敌方后台角色造成1点穿透伤害，召唤冰灵珠。";
  skillType burst;
  cost DiceType.Cryo, 3;
  cost DiceType.Energy, 2;
  :damage(DamageType.Piercing, 1, $.opp.standby);
  :damage(DamageType.Cryo, 2);
  :summon(SacredCryoPearl);
};

define character {
  id 1101 as Ganyu;
  tags cryo, bow, liyue;
  health 12;
  energy 2;
  skills LiutianArchery, TrailOfTheQilin, FrostflakeArrow, CelestialShower;
};

define card {
  id 330005 as InEveryHouseAStove;
  description "第1回合打出此牌时：如果我方牌组中初始包含至少2张不同的「天赋」牌，则抓1张「天赋」牌。\n第2回合及以后打出此牌时：我方抓当前的回合数数量的牌。（最多抓4张）\n（整局游戏只能打出一张「秘传」卡牌；这张牌一定在你的起始手牌中）";
  dynamicDescription "第1回合打出此牌时：如果我方牌组中初始包含至少2张不同的「天赋」牌，则抓1张「天赋」牌。\n第2回合及以后打出此牌时：我方抓当前的回合数数量的牌。（最多抓4张，当前为回合${[T]}）";
  legend;
  replaceDescription "[T]", ((st) => st.roundNumber);
  if (:roundNumber === 1) {
    const ids = :player.initialPile
      .filter((card) => card.tags.includes("talent"))
      .map((card) => card.id);
    if (new Set(ids).size >= 2) {
      :drawCards(1, { withTag: "talent" });
    }
  } else {
    :drawCards(Math.min(:roundNumber, 4));
  }
};

define card {
  id 312008 as EmblemOfSeveredFate;
  cost DiceType.Aligned, 2;
  artifact {
    on useSkill {
      when :(
        :e.skill.caller.id !== :self.master.id && :e.isSkillType("burst")
      );
      listenTo samePlayer;
      :gainEnergy(1, :self.master);
    };
    on increaseSkillDamage {
      when :( :e.viaSkillType("burst") );
      :e.increaseDamage(2);
    };
  };
};
