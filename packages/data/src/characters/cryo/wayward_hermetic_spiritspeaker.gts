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

import { DiceType, DamageType, $ } from "@gi-tcg/core/builder";
import { BattlePlan, Shield } from "../../commons.gts";

/**
 * @id 121052
 * @name 浮彩分身
 * @description
 * 结束阶段：造成1点冰元素伤害。
 * 可用次数：1
 */
define summon {
  id 121052 as RadiantReflection;
  since "v6.7.0";
  variable damageValue, 1;
  hint DamageType.Cryo, ((st, self) => self.variables.damageValue);
  on endPhase {
    usage 1;
    :damage(DamageType.Cryo, :getVariable("damageValue"));
  }
}

/**
 * @id 121051
 * @name 浮彩
 * @description
 * 战斗行动：生成2层护盾。
 */
define card {
  id 121051 as RadiantHues;
  since "v6.7.0";
  cost DiceType.Cryo, 2;
  tags action;
  :combatStatus(Shield, "my", {
    overrideVariables: {
      shield: 2,
    }
  });
}

/**
 * @id 221052
 * @name 浮彩·冰凌
 * @description
 * 打出浮彩时：造成等于此状态层数点冰元素伤害。
 */
define combatStatus {
  id 221052 as RadiantHuesIcicleInEffect;
  variable damageValue, 1 { append; };
  on playCard {
    when :( :e.card.definition.id === RadiantHues )
    :damage(DamageType.Cryo, :getVariable("damageValue"));
  } 
}

/**
 * @id 121054
 * @name 浮彩·冰凌
 * @description
 * 打出浮彩时：额外造成1点冰元素伤害。（重复选择将使造成的伤害+1）
 */
define card {
  id 121054 as RadiantHuesIcicle;
  since "v6.7.0";
  undiscoverable;
  :combatStatus(RadiantHuesIcicleInEffect);
}

/**
 * @id 221053
 * @name 浮彩·多重
 * @description
 * 打出浮彩时：召唤浮彩分身。（浮彩分身造成的伤害等于此状态层数）
 */
define combatStatus {
  id 221053 as RadiantHuesEchoesInEffect;
  variable damageValue, 1 { append; };
  on playCard {
    when :( :e.card.definition.id === RadiantHues )
    :summon(RadiantReflection, "my", {
      overrideVariables: {
        damageValue: :getVariable("damageValue"),
      }
    });
  }
}

/**
 * @id 121055
 * @name 浮彩·多重
 * @description
 * 打出浮彩时：召唤浮彩分身。（重复选择时将使召唤的浮彩分身造成的伤害+1）
 */
define card {
  id 121055 as RadiantHuesEchoes;
  since "v6.7.0";
  undiscoverable;
  :combatStatus(RadiantHuesEchoesInEffect);
}

/**
 * @id 221054
 * @name 浮彩·实像
 * @description
 * 打出浮彩时：抓等于此状态层数张牌。
 */
define combatStatus {
  id 221054 as RadiantHuesManifestationInEffect;
  variable drawValue, 1 { append; };
  on playCard {
    when :( :e.card.definition.id === RadiantHues )
    :drawCards(:getVariable("drawValue"));
  }
}

/**
 * @id 121056
 * @name 浮彩·实像
 * @description
 * 打出浮彩时：抓1张牌。（重复选择将额外抓1张牌）
 */
define card {
  id 121056 as RadiantHuesManifestation;
  since "v6.7.0";
  undiscoverable;
  :combatStatus(RadiantHuesManifestationInEffect);
}

/**
 * @id 221055
 * @name 浮彩·支柱
 * @description
 * 打出浮彩时：生成等于此状态层数层护盾。
 */
define combatStatus {
  id 221055 as RadiantHuesPillarInEffect;
  variable shieldValue, 1 { append; };
  on playCard {
    when :( :e.card.definition.id === RadiantHues )
    :combatStatus(Shield, "my", {
      overrideVariables: {
        shield: :getVariable("shieldValue"),
      }
    });
  }
}

/**
 * @id 121057
 * @name 浮彩·支柱
 * @description
 * 打出浮彩时：生成1层护盾。（重复选择时将额外生成1层护盾）
 */
define card {
  id 121057 as RadiantHuesPillar;
  since "v6.7.0";
  undiscoverable;
  :combatStatus(RadiantHuesPillarInEffect);
}

/**
 * @id 221056
 * @name 浮彩·坚冰
 * @description
 * 打出浮彩时：使我方出战角色附属等于此状态层数层战斗计划。
 */
define combatStatus {
  id 221056 as RadiantHuesSolidIceInEffect;
  variable layer, 1 { append; };
  on playCard {
    when :( :e.card.definition.id === RadiantHues )
    :characterStatus(BattlePlan, $.my.active, {
      overrideVariables: {
        usage: :getVariable("layer"),
      }
    });
  }
}

/**
 * @id 121058
 * @name 浮彩·坚冰
 * @description
 * 打出浮彩时：使我方出战角色附属1层战斗计划。（重复选择时将额外附属1层战斗计划）
 */
define card {
  id 121058 as RadiantHuesSolidIce;
  since "v6.7.0";
  undiscoverable;
  :combatStatus(RadiantHuesSolidIceInEffect);
}

/**
 * @id 221057
 * @name 浮彩·迅影
 * @description
 * 打出浮彩少花费等于此状态层数个元素骰。
 */
define combatStatus {
  id 221057 as RadiantHuesSwiftShadowInEffect;
  variable reductCount, 1 { append; };
  on deductOmniDiceCard {
    when :( :e.action.skill.caller.definition.id === RadiantHues );
    :e.deductOmniCost(:getVariable("reductCount"));
  }
}

/**
 * @id 121059
 * @name 浮彩·迅影
 * @description
 * 打出浮彩少花费1个元素骰。（重复选择时将额外少花费1个元素骰）
 */
define card {
  id 121059 as RadiantHuesSwiftShadow;
  since "v6.7.0";
  undiscoverable;
  :combatStatus(RadiantHuesSwiftShadowInEffect);
}

/**
 * @id 121053
 * @name （test）绿皮隐藏
 * @description
 * （test）绿皮隐藏
 */
define combatStatus {
  id 121053 as private Untitled13;
  since "v6.7.0";
  reserved;
}

/**
 * @id 21051
 * @name 灵觉·寒星
 * @description
 * 造成1点冰元素伤害。
 */
define skill {
  id 21051 as SpiritspeakingFrostStar;
  skillType normal;
  cost DiceType.Cryo, 1;
  cost DiceType.Void, 2;
  :damage(DamageType.Cryo, 1);
}

/**
 * @id 21052
 * @name 千变的浮彩
 * @description
 * 造成1点冰元素伤害，将1张浮彩加入牌库中第3张的位置，并从3个随机的浮彩强化效果中挑选1个。
 */
define skill {
  id 21052 as RadianceInFlux;
  skillType elemental;
  cost DiceType.Cryo, 3;
  :damage(DamageType.Cryo, 1);
  :createPileCards(RadiantHues, 1, "topIndex2");
  const candidates = :randomSubset([
    RadiantHuesIcicle,
    RadiantHuesEchoes,
    RadiantHuesManifestation,
    RadiantHuesPillar,
    RadiantHuesSolidIce,
    RadiantHuesSwiftShadow,
  ], 3)
  :selectAndPlay(candidates);
}

/**
 * @id 21053
 * @name 沍寒的图绘
 * @description
 * 造成4点冰元素伤害，将1张浮彩加入手牌。
 */
define skill {
  id 21053 as ChillingIllustration;
  skillType burst;
  cost DiceType.Cryo, 3;
  cost DiceType.Energy, 2;
  :damage(DamageType.Cryo, 4)
  :createHandCard(RadiantHues)
}

/**
 * @id 21054
 * @name 斑斓的绚影
 * @description
 * 【被动】战斗开始时，生成3张浮彩，均匀放入牌库。
 */
define skill {
  id 21054 as IridescentSilhouette;
  skillType passive {
    on battleBegin {
      :createPileCards(RadiantHues, 3, "spaceAround");
    }
  }
}

/**
 * @id 2105
 * @name 灵觉隐修的迷者
 * @description
 * 独自在外潜修的「烟谜主」的祭司。据说因为得到了「烟谜主」大灵的庇护而拥有比一般的祭司与萨满更强大的「灵觉」的能力。
 */
define character {
  id 2105 as WaywardHermeticSpiritspeaker;
  since "v6.7.0";
  tags cryo, monster;
  health 10;
  energy 2;
  skills SpiritspeakingFrostStar, RadianceInFlux, ChillingIllustration, IridescentSilhouette;
}

/**
 * @id 221051
 * @name 流变的绘形
 * @description
 * 快速行动：装备给我方的灵觉隐修的迷者。
 * 生成1张浮彩加入手牌。
 * 我方打出浮彩后，生成2层护盾。（每回合1次）
 * （牌组中包含灵觉隐修的迷者，才能加入牌组）
 */
define card {
  id 221051 as FlowOfForms;
  since "v6.7.0";
  cost DiceType.Cryo, 1;
  talent WaywardHermeticSpiritspeaker, none {
    on enter {
      :createHandCard(RadiantHues);
    }
    on playCard {
      when :( :e.card.definition.id === RadiantHues );
      usage perRound, 1;
      :combatStatus(Shield, "my", {
        overrideVariables: {
          shield: 2,
        }
      });
    }
  }
}
