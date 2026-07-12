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

import { Aura, card, character, combatStatus, DamageType, DiceType, skill, status, summon, type SkillHandle } from "@gi-tcg/core/builder";

/**
 * @id 115052
 * @name 流风秋野
 * @description
 * 结束阶段：造成1点风元素伤害。
 * 可用次数：3
 * 我方角色或召唤物引发扩散反应后：转换此牌的元素类型，改为造成被扩散的元素类型的伤害。（离场前仅限一次）
 */
define summon {
  id 115052 as AutumnWhirlwind;
  hint swirled, 1;
  on endPhase {
    usage 3;
    :damage(:self.variables.hintIcon, 1);
  }
}

/**
 * @id 15051
 * @name 我流剑术
 * @description
 * 造成2点物理伤害。
 */
define skill {
  id 15051 as GaryuuBladework;
  skillType normal;
  cost DiceType.Anemo, 1;
  cost DiceType.Void, 2;
  :damage(DamageType.Physical, 2);
}

/**
 * @id 115051
 * @name 乱岚拨止
 * @description
 * 我方下次通过「切换角色」行动切换到所附属角色时：将此次切换视为「快速行动」而非「战斗行动」。
 * 如果所附属角色为「出战角色」，则所附属角色将在下次行动时直接使用「普通攻击」；本次「普通攻击」造成的物理伤害变为风元素伤害，结算后移除此效果。
 */
define status {
  id 115051 as MidareRanzan;
  on beforeFastSwitch {
    when :( :self.master.id === :e.action.to.id );
    usage 1 {
      autoDispose false;
    };
    :e.setFastAction();
  }
  on replaceActionBySkill {
    :useSkill(GaryuuBladework);
  }
  on modifySkillDamageType {
    when :( :e.viaSkillType("normal") && :e.type === DamageType.Physical );
    :e.changeDamageType(DamageType.Anemo);
  }
  on useSkill {
    when :( :e.isSkillType("normal") );
    :dispose();
  }
}

/**
 * @id 115053
 * @name 乱岚拨止·冰
 * @description
 * 我方下次通过「切换角色」行动切换到所附属角色时：将此次切换视为「快速行动」而非「战斗行动」。
 * 如果所附属角色为「出战角色」，则所附属角色将在下次行动时直接使用「普通攻击」；本次「普通攻击」造成的物理伤害变为冰元素伤害，结算后移除此效果。
 */
define status {
  id 115053 as MidareRanzanCryo;
  on beforeFastSwitch {
    when :( :self.master.id === :e.action.to.id );
    usage 1 {
      autoDispose false;
    };
    :e.setFastAction();
  }
  on replaceActionBySkill {
    :useSkill(GaryuuBladework);
  }
  on modifySkillDamageType {
    when :( :e.viaSkillType("normal") && :e.type === DamageType.Physical );
    :e.changeDamageType(DamageType.Cryo);
  }
  on useSkill {
    when :( :e.isSkillType("normal") );
    :dispose();
  }
}

/**
 * @id 115056
 * @name 乱岚拨止·雷
 * @description
 * 我方下次通过「切换角色」行动切换到所附属角色时：将此次切换视为「快速行动」而非「战斗行动」。
 * 如果所附属角色为「出战角色」，则所附属角色将在下次行动时直接使用「普通攻击」；本次「普通攻击」造成的物理伤害变为雷元素伤害，结算后移除此效果。
 */
define status {
  id 115056 as MidareRanzanElectro;
  on beforeFastSwitch {
    when :( :self.master.id === :e.action.to.id );
    usage 1 {
      autoDispose false;
    };
    :e.setFastAction();
  }
  on replaceActionBySkill {
    :useSkill(GaryuuBladework);
  }
  on modifySkillDamageType {
    when :( :e.viaSkillType("normal") && :e.type === DamageType.Physical );
    :e.changeDamageType(DamageType.Electro);
  }
  on useSkill {
    when :( :e.isSkillType("normal") );
    :dispose();
  }
}

/**
 * @id 115054
 * @name 乱岚拨止·水
 * @description
 * 我方下次通过「切换角色」行动切换到所附属角色时：将此次切换视为「快速行动」而非「战斗行动」。
 * 如果所附属角色为「出战角色」，则所附属角色将在下次行动时直接使用「普通攻击」；本次「普通攻击」造成的物理伤害变为水元素伤害，结算后移除此效果。
 */
define status {
  id 115054 as MidareRanzanHydro;
  on beforeFastSwitch {
    when :( :self.master.id === :e.action.to.id );
    usage 1 {
      autoDispose false;
    };
    :e.setFastAction();
  }
  on replaceActionBySkill {
    :useSkill(GaryuuBladework);
  }
  on modifySkillDamageType {
    when :( :e.viaSkillType("normal") && :e.type === DamageType.Physical );
    :e.changeDamageType(DamageType.Hydro);
  }
  on useSkill {
    when :( :e.isSkillType("normal") );
    :dispose();
  }
}

/**
 * @id 115055
 * @name 乱岚拨止·火
 * @description
 * 我方下次通过「切换角色」行动切换到所附属角色时：将此次切换视为「快速行动」而非「战斗行动」。
 * 如果所附属角色为「出战角色」，则所附属角色将在下次行动时直接使用「普通攻击」；本次「普通攻击」造成的物理伤害变为火元素伤害，结算后移除此效果。
 */
define status {
  id 115055 as MidareRanzanPyro;
  on beforeFastSwitch {
    when :( :self.master.id === :e.action.to.id );
    usage 1 {
      autoDispose false;
    };
    :e.setFastAction();
  }
  on replaceActionBySkill {
    :useSkill(GaryuuBladework);
  }
  on modifySkillDamageType {
    when :( :e.viaSkillType("normal") && :e.type === DamageType.Physical );
    :e.changeDamageType(DamageType.Pyro);
  }
  on useSkill {
    when :( :e.isSkillType("normal") );
    :dispose();
  }
}

/**
 * @id 115057
 * @name 风物之诗咏·冰
 * @description
 * 我方角色和召唤物所造成的冰元素伤害+1。
 * 可用次数：2
 */
define combatStatus {
  id 115057 as PoeticsOfFuubutsuCryo;
  on increaseDamage {
    when :( ["character", "summon"].includes(:e.source.definition.type) && :e.type === DamageType.Cryo );
    usage 2;
    :e.increaseDamage(1);
  }
}

/**
 * @id 115050
 * @name 风物之诗咏·雷
 * @description
 * 我方角色和召唤物所造成的雷元素伤害+1。
 * 可用次数：2
 */
define combatStatus {
  id 115050 as PoeticsOfFuubutsuElectro;
  on increaseDamage {
    when :( ["character", "summon"].includes(:e.source.definition.type) && :e.type === DamageType.Electro );
    usage 2;
    :e.increaseDamage(1);
  }
}

/**
 * @id 115058
 * @name 风物之诗咏·水
 * @description
 * 我方角色和召唤物所造成的水元素伤害+1。
 * 可用次数：2
 */
define combatStatus {
  id 115058 as PoeticsOfFuubutsuHydro;
  on increaseDamage {
    when :( ["character", "summon"].includes(:e.source.definition.type) && :e.type === DamageType.Hydro );
    usage 2;
    :e.increaseDamage(1);
  }
}

/**
 * @id 115059
 * @name 风物之诗咏·火
 * @description
 * 我方角色和召唤物所造成的火元素伤害+1。
 * 可用次数：2
 */
define combatStatus {
  id 115059 as PoeticsOfFuubutsuPyro;
  on increaseDamage {
    when :( ["character", "summon"].includes(:e.source.definition.type) && :e.type === DamageType.Pyro );
    usage 2;
    :e.increaseDamage(1);
  }
}

/**
 * @id 15052
 * @name 千早振
 * @description
 * 造成1点风元素伤害，本角色附属乱岚拨止。
 * 如果此技能引发了扩散，则将乱岚拨止转换为被扩散的元素。
 * 此技能结算后：我方切换到下一个角色。
 */
define skill {
  id 15052 as Chihayaburu;
  skillType elemental;
  cost DiceType.Anemo, 3;
  const aura = :$("opp active")?.aura;
  let midareRanzan;
  switch (aura) {
    case Aura.Cryo:
    case Aura.CryoDendro:
      midareRanzan = MidareRanzanCryo;
      break;
    case Aura.Electro:
      midareRanzan = MidareRanzanElectro;
      break;
    case Aura.Hydro:
      midareRanzan = MidareRanzanHydro;
      break;
    case Aura.Pyro:
      midareRanzan = MidareRanzanPyro;
      break;
    default:
      midareRanzan = MidareRanzan;
      break;
  }
  :characterStatus(midareRanzan);
  :damage(DamageType.Anemo, 1);
}

/**
 * @id 15053
 * @name 万叶之一刀
 * @description
 * 造成1点风元素伤害，召唤流风秋野。
 */
define skill {
  id 15053 as KazuhaSlash;
  skillType burst;
  cost DiceType.Anemo, 3;
  cost DiceType.Energy, 2;
  :damage(DamageType.Anemo, 1);
  :summon(AutumnWhirlwind);
}

/**
 * @id 15054
 * @name 千早振
 * @description
 * 
 */
define skill {
  id 15054 as ChihayaburuPassive;
  skillType passive {
    on useSkill {
      when :( :e.skill.definition.id === Chihayaburu );
      :switchActive("my next");
    }
  }
}

/**
 * @id 1505
 * @name 枫原万叶
 * @description
 * 拾花鸟之一趣，照月风之长路。
 */
define character {
  id 1505 as KaedeharaKazuha;
  since "v3.8.0";
  tags anemo, sword, inazuma;
  health 10;
  energy 2;
  skills GaryuuBladework, Chihayaburu, KazuhaSlash, ChihayaburuPassive;
}

/**
 * @id 215051
 * @name 风物之诗咏
 * @description
 * 战斗行动：我方出战角色为枫原万叶时，装备此牌。
 * 枫原万叶装备此牌后，立刻使用一次千早振。
 * 装备有此牌的枫原万叶引发扩散反应后：使我方角色和召唤物接下来2次所造成的被扩散元素类型的伤害+1。（每种元素类型分别计算次数）
 * （牌组中包含枫原万叶，才能加入牌组）
 */
define card {
  id 215051 as PoeticsOfFuubutsu;
  since "v3.8.0";
  cost DiceType.Anemo, 3;
  talent KaedeharaKazuha {
    on enter {
      :useSkill(Chihayaburu);
    }
    on dealDamage {
      when :( :e.isSwirl() );
      const swirled = :e.isSwirl()!;
      switch (swirled) {
        case DamageType.Cryo:
          :combatStatus(PoeticsOfFuubutsuCryo);
          break;
        case DamageType.Electro:
          :combatStatus(PoeticsOfFuubutsuElectro);
          break;
        case DamageType.Hydro:
          :combatStatus(PoeticsOfFuubutsuHydro);
          break;
        case DamageType.Pyro:
          :combatStatus(PoeticsOfFuubutsuPyro);
          break;
      }
    }
  }
}
