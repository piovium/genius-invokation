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

import { card, character, combatStatus, DamageType, DiceType, Reaction, skill, status, summon } from "@gi-tcg/core/builder";

/**
 * @id 114161
 * @name 超音灵眼
 * @description
 * 结束阶段：造成1点雷元素伤害。
 * 我方出战角色受到伤害时：抵消1点伤害，然后此牌可用次数-1。（每回合1次）
 * 可用次数：3
 */
define summon {
  id 114161 as SupersonicOculus;
  since "v6.3.0";
  tags barrier;
  hint DamageType.Electro, 1;
  on endPhase {
    usage 3;
    :damage(DamageType.Electro, 1);
  }
  on decreaseDamaged {
    when :( :e.target.isActive() );
    usage perRound, 1;
    :e.decreaseDamage(1);
    :consumeUsage(1);
  }
}

/**
 * @id 114163
 * @name 夜魂加持
 * @description
 * 所附属角色可累积「夜魂值」。（最多累积到2点）
 * 夜魂值为0时，退出夜魂加持。
 */
define status {
  id 114163 as NightsoulsBlessing;
  since "v6.3.0";
  nightsoulsBlessing 2 {
    autoDispose;
  };
}

/**
 * @id 114162
 * @name 宿灵球
 * @description
 * 行动阶段开始时：造成1点雷元素伤害。
 * 可用次数：1
 */
define combatStatus {
  id 114162 as SpiritOrb;
  since "v6.3.0";
  on actionPhase {
    usage 1;
    :damage(DamageType.Electro, 1);
  }
}

/**
 * @id 14161
 * @name 宿灵闪箭
 * @description
 * 造成2点物理伤害。
 */
define skill {
  id 14161 as SpiritvesselSnapshot;
  skillType normal;
  cost DiceType.Electro, 1;
  cost DiceType.Void, 2;
  :damage(DamageType.Physical, 2);
}

/**
 * @id 14162
 * @name 暝色缒索
 * @description
 * 造成2点雷元素伤害，生成宿灵球。
 */
define skill {
  id 14162 as NightsSling;
  skillType elemental;
  cost DiceType.Electro, 3;
  :damage(DamageType.Electro, 2);
  :combatStatus(SpiritOrb);
}

/**
 * @id 14163
 * @name 黯声回响
 * @description
 * 造成2点雷元素伤害，召唤超音灵眼。
 */
define skill {
  id 14163 as DarkVoicesEcho;
  skillType burst;
  cost DiceType.Electro, 3;
  cost DiceType.Energy, 2;
  :damage(DamageType.Electro, 2);
  :summon(SupersonicOculus);
}

/**
 * @id 14164
 * @name 夜翳的通感
 * @description
 * 【被动】我方触发感电或月感电反应后：如果可能，消耗2点「夜魂值」，造成1点雷元素伤害。
 * 我方造成此技能以外的水元素伤害或雷元素伤害后，自身进入夜魂加持，并获得1点「夜魂值」。（每回合1次）
 */
define skill {
  id 14164 as NightshadeSynesthesia;
  skillType passive {
    on dealReaction {
      when :( ([Reaction.ElectroCharged, Reaction.LunarElectroCharged] as Reaction[]).includes(:e.type) && 
          (:self.hasNightsoulsBlessing()?.variables.nightsoul ?? 0) >= 2 );
      listenTo samePlayer;
      :consumeNightsoul("@self", 2);
      :damage(DamageType.Electro, 1, "opp characters with health > 0 limit 1");
    }
    on dealDamage {
      when :( ([DamageType.Electro, DamageType.Hydro] as DamageType[]).includes(:e.type) &&
          Math.floor(:e.via.definition.id) !== Math.floor(:skillInfo.definition.id) );
      listenTo samePlayer;
      usage perRound, 1 {
        name "usagePerRound1";
      };
      :gainNightsoul("@self", 1);
    }
  }
}

/**
 * @id 14165
 * @name 夜翳的通感
 * @description
 * 【被动】我方触发感电或月感电反应后：如果可能，消耗2点「夜魂值」，造成1点雷元素伤害。
 * 我方造成此技能以外的水元素伤害或雷元素伤害后，自身进入夜魂加持，并获得1点「夜魂值」。（每回合1次）
 */
define skill {
  id 14165 as NightshadeSynesthesia01;
  skillType passive {
    reserved;
  }
}

/**
 * @id 1416
 * @name 欧洛伦
 * @description
 * 难辨难明之形色。
 */
define character {
  id 1416 as Ororon;
  since "v6.3.0";
  tags electro, bow, natlan;
  health 10;
  energy 2;
  skills SpiritvesselSnapshot, NightsSling, DarkVoicesEcho, NightshadeSynesthesia;
}

/**
 * @id 214161
 * @name 林雾间的行迹
 * @description
 * 快速行动：装备给我方的欧洛伦。
 * 我方每回合首次引发的感电反应造成的穿透伤害+1。
 * （牌组中包含欧洛伦，才能加入牌组）
 */
define card {
  id 214161 as TrailsAmidstTheForestFog;
  since "v6.3.0";
  cost DiceType.Electro, 1;
  talent Ororon, none {
    on modifyReaction {
      when :( :e.type === Reaction.ElectroCharged && :e.reactionInfo.fromDamage && :e.caller.isMine() );
      listenTo all;
      usage perRound, 1;
      :e.increasePiercingOtherDamage(1);
    }
  }
}
