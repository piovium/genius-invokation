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

import { Aura, card, character, DamageType, DiceType, skill, status, summon } from "@gi-tcg/core/builder";

/**
 * @id 115072
 * @name 不倒貉貉
 * @description
 * 结束阶段：造成1点风元素伤害，治疗我方受伤最多的角色2点。
 * 可用次数：2
 */
define summon {
  id 115072 as MujimujiDaruma;
  hint DamageType.Anemo, 1;
  on endPhase {
    usage 2;
    :damage(DamageType.Anemo, 1);
    :heal(2, "my characters order by health - maxHealth limit 1");
  }
}

/**
 * @id 15074
 * @name 风风轮舞踢
 * @description
 * （需准备1个行动轮）
 * 造成2点风元素伤害（或被扩散元素的伤害）。
 */
define skill {
  id 15074 as FuufuuWhirlwindKick;
  skillType elemental;
  prepared;
  const caller = :skillInfo.requestBy!.caller;
  const damageType = :getVariable("swirled", caller);
  if (damageType) {
    :damage(damageType, 2);
  } else {
    :damage(DamageType.Anemo, 2);
  }
}

/**
 * @id 115071
 * @name 风风轮
 * @description
 * 本角色将在下次行动时，直接使用技能：风风轮舞踢。
 */
define status {
  id 115071 as FuufuuWindwheel;
  variable swirled, 0 {
    visible false;
  };
  prepare FuufuuWhirlwindKick;
}

/**
 * @id 15071
 * @name 忍刀·终末番
 * @description
 * 造成2点物理伤害。
 */
define skill {
  id 15071 as ShuumatsubanNinjaBlade;
  skillType normal;
  cost DiceType.Anemo, 1;
  cost DiceType.Void, 2;
  :damage(DamageType.Physical, 2);
}

/**
 * @id 15072
 * @name 呜呼流·风隐急进
 * @description
 * 造成1点风元素伤害，本角色准备技能：风风轮舞踢。
 * 如果当前技能引发了扩散，则风风轮舞踢将改为造成被扩散元素的伤害。
 */
define skill {
  id 15072 as YoohooArtFuuinDash;
  skillType elemental;
  cost DiceType.Anemo, 3;
  const aura = :$("opp active")?.aura;
  let fuufuuWindType: DamageType;
  switch (aura) {
    case Aura.Cryo:
    case Aura.CryoDendro:
      fuufuuWindType = DamageType.Cryo;
      break;
    case Aura.Hydro:
      fuufuuWindType = DamageType.Hydro;
      break;
    case Aura.Pyro:
      fuufuuWindType = DamageType.Pyro;
      break;
    case Aura.Electro:
      fuufuuWindType = DamageType.Electro;
      break;
    default:
      fuufuuWindType = DamageType.Anemo;
      break;
  }
  :characterStatus(FuufuuWindwheel, "@self", {
    overrideVariables: {
      swirled: fuufuuWindType
    }
  });
  :damage(DamageType.Anemo, 1);
}

/**
 * @id 15073
 * @name 呜呼流·影貉缭乱
 * @description
 * 造成1点风元素伤害，召唤不倒貉貉。
 */
define skill {
  id 15073 as YoohooArtMujinaFlurry;
  skillType burst;
  cost DiceType.Anemo, 3;
  cost DiceType.Energy, 2;
  :damage(DamageType.Anemo, 1);
  :summon(MujimujiDaruma);
}

/**
 * @id 1507
 * @name 早柚
 * @description
 * 一梦作伴，万野无踪。
 */
define character {
  id 1507 as Sayu;
  since "v4.4.0";
  tags anemo, claymore, inazuma;
  health 10;
  energy 2;
  skills ShuumatsubanNinjaBlade, YoohooArtFuuinDash, YoohooArtMujinaFlurry, FuufuuWhirlwindKick;
}

/**
 * @id 215071
 * @name 偷懒的新方法
 * @description
 * 战斗行动：我方出战角色为早柚时，装备此牌。
 * 早柚装备此牌后，立刻使用一次呜呼流·风隐急进。
 * 装备有此牌的早柚为出战角色期间，我方引发扩散反应时：抓2张牌。（每回合1次）
 * （牌组中包含早柚，才能加入牌组）
 */
define card {
  id 215071 as SkivingNewAndImproved;
  since "v4.4.0";
  cost DiceType.Anemo, 3;
  talent Sayu {
    on enter {
      :useSkill(YoohooArtFuuinDash);
    }
    on dealDamage {
      when :( :self.master.isActive() && :e.isSwirl() );
      listenTo samePlayer;
      usage perRound, 1;
      :drawCards(2);
    }
  }
}
