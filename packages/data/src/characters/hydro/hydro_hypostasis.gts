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

import { DiceType, DamageType, $ } from "@gi-tcg/core/data";

/**
 * @id 122082
 * @name 水滴
 * @description
 * 结束阶段：如果无相之水未附属水晶核心，则使其附属水晶核心；否则，造成2点水元素伤害。
 * 可用次数：2
 */
define summon {
  id 122082 as WaterDroplet;
  since "v7.0.0";
  hint DamageType.Hydro, 2;
  on endPhase {
    usage 2;
    if (
      :query(
        $.my.character
          .def(HydroHypostasis)
          .exclude($.has.typeStatus.def(HydroCrystalCore)),
      )
    ) {
      :characterStatus(HydroCrystalCore, $.def(HydroHypostasis));
    } else {
      :damage(DamageType.Hydro, 2);
    }
  };
}

/**
 * @id 122081
 * @name 水晶核心
 * @description
 * 所附属角色被击倒时：移除此效果，使角色免于被击倒，并治疗该角色到1点生命值。
 */
define status {
  id 122081 as HydroCrystalCore;
  since "v7.0.0";
  on beforeDefeated {
    :immune(1);
    :dispose();
  };
}

/**
 * @id 122083
 * @name 蓄洪
 * @description
 * 本角色将在下次行动时，直接使用技能：溢流。
 */
define status {
  id 122083 as SwellingTorrent;
  since "v7.0.0";
  prepare Overflow;
}

/**
 * @id 22081
 * @name 水珠漫射
 * @description
 * 造成1点水元素伤害。
 */
define skill {
  id 22081 as DropletDiffusion;
  skillType normal;
  cost DiceType.Hydro, 1;
  cost DiceType.Void, 2;
  :damage(DamageType.Hydro, 1);
}

/**
 * @id 22082
 * @name 涌动洪流
 * @description
 * 造成2点水元素伤害，然后准备技能：溢流。
 */
define skill {
  id 22082 as SurgingTides;
  skillType elemental;
  cost DiceType.Hydro, 3;
  :damage(DamageType.Hydro, 2);
  :characterStatus(SwellingTorrent, :self);
}

/**
 * @id 22083
 * @name 危祸之潮
 * @description
 * 造成3点水元素伤害，召唤水滴。
 */
define skill {
  id 22083 as CalamitousTides;
  skillType burst;
  cost DiceType.Hydro, 3;
  cost DiceType.Energy, 2;
  :damage(DamageType.Hydro, 3);
  :summon(WaterDroplet);
}

/**
 * @id 22084
 * @name 水晶核心
 * @description
 * 【被动】战斗开始时，初始附属水晶核心。如果场上存在水滴，消耗水晶核心时重新附属水晶核心，并使水滴可用次数-1。
 */
define skill {
  id 22084 as HydroCrystalCorePassive;
  skillType passive {
    on battleBegin {
      :characterStatus(HydroCrystalCore, :self);
    };
    on entityDispose {
      when :( :e.entity.definition.id === HydroCrystalCore );
      const droplet = :query($.my.def(WaterDroplet));
      if (droplet) {
        droplet.consumeUsage();
        :characterStatus(HydroCrystalCore, :self);
      }
    };
  };
}

/**
 * @id 22085
 * @name 溢流
 * @description
 * 造成1点水元素伤害。
 */
define skill {
  id 22085 as Overflow;
  skillType elemental;
  prepared;
  :damage(DamageType.Hydro, 1);
}

/**
 * @id 22086
 * @name 水晶核心
 * @description
 * 【被动】战斗开始时，初始附属水晶核心。如果场上存在水滴，消耗水晶核心时重新附属水晶核心，并使水滴可用次数-1。
 */
define skill {
  id 22086 as HydroCrystalCorePassive01;
  skillType passive;
  reserved;
}

/**
 * @id 2208
 * @name 无相之水
 * @description
 * 代号为「希伊」的高级水元素生命，有着强大的排异本能，会无情地驱逐试探它的人。
 */
define character {
  id 2208 as HydroHypostasis;
  since "v7.0.0";
  tags hydro, monster;
  health 8;
  energy 2;
  skills DropletDiffusion, SurgingTides, CalamitousTides, HydroCrystalCorePassive, Overflow;
}

/**
 * @id 222081
 * @name 诡谲恶浪
 * @description
 * 快速行动：装备给我方的无相之水。
 * 无相之水或水滴造成伤害后，治疗我方受伤最多的魔物1点。（每回合3次）
 * （牌组中包含无相之水，才能加入牌组）
 */
define card {
  id 222081 as TreacherousTorrent;
  since "v7.0.0";
  cost DiceType.Hydro, 1;
  talent HydroHypostasis, none {
    on dealDamage {
      when :(
        ([HydroHypostasis, WaterDroplet] as number[]).includes(
          :e.source.definition.id,
        )
      );
      listenTo samePlayer;
      usage perRound, 3;
      :heal(
        1,
        $.my.character
          .tag("monster")
          .orderBy("health", "-", "maxHealth")
          .limit(1),
      );
    };
  };
}
