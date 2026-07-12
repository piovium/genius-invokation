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

import { Aura, card, character, DamageType, DiceType, skill, status, type StatusHandle } from "@gi-tcg/core/builder";

/**
 * @id 115132
 * @name 变格
 * @description
 * 如果此状态有2层，则消耗2层此状态，并且本角色下次勠心拳将视为快速行动，并且此次勠心拳·蓄力伤害+1。（可叠加，没有上限）
 */
define status {
  id 115132 as Declension;
  since "v5.8.0";
  variable henkaku, 1 {
    append;
  };
  on useSkill {
    when :( :e.skill.definition.id === HeartstopperStrike &&
        :self.getVariable("henkaku") >= 2 );
    void 0;
    // 使用 勠心拳 后，我方继续行动一个回合
    if(!:oppPlayer.declaredEnd) {
      :continueNextTurn();      
    }
    // 为 角色 添加 增伤数值
    if (:self.master.hasEquipment(CuriousCasefiles)) {
      :self.master.setVariable("increaseDmg", 2);
    } else {
      :self.master.setVariable("increaseDmg", 1);
    }
    // 消耗 2 层变格
    :addVariable("henkaku", -2);
    if (:getVariable("henkaku") <= 0){
      :dispose();
    }
  }
}

/**
 * @id 15135
 * @name 勠心拳·蓄力
 * @description
 * 造成4点风元素伤害。
 */
define skill {
  id 15135 as HeartstopperStrikeCharge;
  skillType elemental;
  prepared;
  void 0;
  // 读取 角色 的 增伤数值，随后清空
  const increaseDmg = :self.getVariable("increaseDmg") ?? 0;
  :damage(DamageType.Anemo, 4 + increaseDmg);
  :self.setVariable("increaseDmg", 0);
}

/**
 * @id 115131
 * @name 在罪之先
 * @description
 * 本角色将在下次行动时，直接使用技能：勠心拳·蓄力。
 */
define status {
  id 115131 as PreexistingGuilt;
  since "v5.8.0";
  prepare HeartstopperStrikeCharge;
}

/**
 * @id 115133
 * @name 聚风真眼·冰
 * @description
 * 所在阵营选择行动前：对所附属角色造成1点冰元素伤害。
 * 可用次数：1
 */
define status {
  id 115133 as WindmusterIrisCryo;
  since "v5.8.0";
  on beforeAction {
    usage 1;
    :damage(DamageType.Cryo, 1, "@master");
  }
}

/**
 * @id 115134
 * @name 聚风真眼·水
 * @description
 * 所在阵营选择行动前：对所附属角色造成1点水元素伤害。
 * 可用次数：1
 */
define status {
  id 115134 as WindmusterIrisHydro;
  since "v5.8.0";
  on beforeAction {
    usage 1;
    :damage(DamageType.Hydro, 1, "@master");
  }
}

/**
 * @id 115135
 * @name 聚风真眼·火
 * @description
 * 所在阵营选择行动前：对所附属角色造成1点火元素伤害。
 * 可用次数：1
 */
define status {
  id 115135 as WindmusterIrisPyro;
  since "v5.8.0";
  on beforeAction {
    usage 1;
    :damage(DamageType.Pyro, 1, "@master");
  }
}

/**
 * @id 115136
 * @name 聚风真眼·雷
 * @description
 * 所在阵营选择行动前：对所附属角色造成1点雷元素伤害。
 * 可用次数：1
 */
define status {
  id 115136 as WindmusterIrisElectro;
  since "v5.8.0";
  on beforeAction {
    usage 1;
    :damage(DamageType.Electro, 1, "@master");
  }
}

/**
 * @id 15131
 * @name 不动流格斗术
 * @description
 * 造成1点风元素伤害。
 */
define skill {
  id 15131 as FudouStyleMartialArts;
  skillType normal;
  cost DiceType.Anemo, 1;
  cost DiceType.Void, 2;
  :damage(DamageType.Anemo, 1);
}

/**
 * @id 15132
 * @name 勠心拳
 * @description
 * 准备技能：勠心拳·蓄力
 */
define skill {
  id 15132 as HeartstopperStrike;
  skillType elemental;
  cost DiceType.Anemo, 3;
  :characterStatus(PreexistingGuilt);
}

/**
 * @id 15133
 * @name 聚风蹴
 * @description
 * 造成4点风元素伤害，如果此技能引发了风元素相关反应，则敌方出战角色附属对应元素的聚风真眼。
 */
define skill {
  id 15133 as WindmusterKick;
  skillType burst;
  cost DiceType.Anemo, 3;
  cost DiceType.Energy, 2;
  const aura = :$("opp active")?.aura;
  :damage(DamageType.Anemo, 4);
  switch (aura) {
    case Aura.Cryo:
    case Aura.CryoDendro:
      :characterStatus(WindmusterIrisCryo, "opp active");
      break;
    case Aura.Hydro:
      :characterStatus(WindmusterIrisHydro, "opp active");
      break;
    case Aura.Pyro:
      :characterStatus(WindmusterIrisPyro, "opp active");
      break;
    case Aura.Electro:
      :characterStatus(WindmusterIrisElectro, "opp active");
      break;
    default:
      break;
  }
}

/**
 * @id 15134
 * @name 反论稽古
 * @description
 * 【被动】我方引发了风元素相关反应后：自身附属1层变格。
 */
define skill {
  id 15134 as ParadoxicalPractice;
  skillType passive {
    variable increaseDmg, 0;
    on dealDamage {
      when :( :e.isReactionRelatedTo(DamageType.Anemo) );
      listenTo samePlayer;
      :characterStatus(Declension, "@self");
    }
  }
}

/**
 * @id 1513
 * @name 鹿野院平藏
 * @description
 * 天衣但无缝，也惧凉风吹。
 */
define character {
  id 1513 as ShikanoinHeizou;
  since "v5.8.0";
  tags anemo, catalyst, inazuma;
  health 10;
  energy 2;
  skills FudouStyleMartialArts, HeartstopperStrike, WindmusterKick, ParadoxicalPractice, HeartstopperStrikeCharge;
}

/**
 * @id 215131
 * @name 奇想天开捕物帐
 * @description
 * 战斗行动：我方出战角色为鹿野院平藏时，装备此牌。
 * 鹿野院平藏装备此牌后，立刻使用一次勠心拳。
 * 变格提高的伤害额外+1。
 * （牌组中包含鹿野院平藏，才能加入牌组）
 */
define card {
  id 215131 as CuriousCasefiles;
  since "v5.8.0";
  cost DiceType.Anemo, 3;
  talent ShikanoinHeizou {
    on enter {
      :useSkill(HeartstopperStrike);
    }
  }
}
