import { DiceType, DamageType, $, Aura } from "@gi-tcg/core/data";
import {
  HalfswordTechnique,
  RisingSlash,
  GuardStance,
  RecklessStance,
  GalePursuit,
} from "../characters/anemo/black_serpent_knight_windcutter.gts";

/**
 * @id 2504
 * @name 黑蛇骑士·斩风之剑
 * @hp 10
 * @energy 2
 * @description
 * 「在宫廷当中颇具地位的近卫军人，『末光之剑』也曾是他们当中的一员。」
 */
define character {
  id 2504 as private BlackSerpentKnightWindcutter;
  until "v7.1.0";
  tags anemo, monster;
  health 10;
  energy 2;
  skills HalfswordTechnique,
    RisingSlash,
    GuardStance,
    VanguardMomentum,
    RecklessStance,
    GalePursuit;
};

/**
 * @id 25044
 * @name 前驱气势
 * @cost
 * @description
 * 【被动】我方触发扩散反应，或敌方失去护盾、 伤害抵消状态以及出战状态时，抓1张牌。（每回合2次）
 */
define skill {
  id 25044 as private VanguardMomentum;
  until "v7.1.0";
  skillType passive {
    on dealReaction {
      when :( :e.relatedTo(DamageType.Anemo) );
      listenTo samePlayer;
      usage perRound, 2 { name "usagePerRound1"; };
      :drawCards(1);
    };
    on entityDispose {
      when :(
        !:e.entity.isMine() &&
          (:e.entity.definition.type === "status" ||
            :e.entity.definition.type === "combatStatus") &&
          (:e.entity.definition.tags.includes("shield") ||
            :e.entity.definition.tags.includes("barrier"))
      );
      listenTo all;
      usage perRound, 2 { name "usagePerRound1"; };
      :drawCards(1);
    };
  };
};

/**
 * @id 303081
 * @name 冰草祝佑·棘霜
 * @description
 * 投掷阶段：总是投出2个冰元素骰和2个草元素骰。
 * 结束阶段：对敌方附着有冰元素的角色造成2点穿透伤害，然后移除其冰元素附着。
 */
define card {
  id 303081 as private RimegrassBlessingThornFrost;
  until "v7.1.0";
  undiscoverable;
  support {
    on roll {
      :e.fixDice(DiceType.Cryo, 2);
      :e.fixDice(DiceType.Dendro, 2);
    };
    on endPhase {
      const targets = :oppPlayer.characters.filter((ch) =>
        ([Aura.Cryo, Aura.CryoDendro] as Aura[]).includes(ch.aura),
      );
      for (const target of targets) {
        :damage(DamageType.Piercing, 2, target);
        :cleanAura(Aura.Cryo, target);
      }
    };
  };
};

/**
 * @id 303082
 * @name 冰草祝佑·寒蔓
 * @description
 * 投掷阶段：总是投出2个冰元素骰和2个草元素骰。
 * 我方使用技能后，如果敌方出战角色附着草元素：抓1张牌，治疗我方受伤最多的角色1点，然后移除敌方出战角色草元素附着。（每回合2次）
 */
define card {
  id 303082 as private RimegrassBlessingColdVine;
  until "v7.1.0";
  cost DiceType.Dendro, 1;
  undiscoverable;
  support {
    on roll {
      :e.fixDice(DiceType.Cryo, 2);
      :e.fixDice(DiceType.Dendro, 2);
    };
    on useSkill {
      when :(
        ([Aura.Dendro, Aura.CryoDendro] as (Aura | undefined)[]).includes(
          :query($.opp.active)?.aura,
        )
      );
      usage perRound, 2;
      :drawCards(1);
      :heal(1, $.macros.myMostInjured);
      :cleanAura(Aura.Dendro, $.opp.active);
    };
  };
};

/**
 * @id 303122
 * @name 超载祝佑·霆击
 * @description
 * 投掷阶段：总是投出2个雷元素骰和2个火元素骰。
 * 敌方每切换一次角色后：对敌方出战角色造成1点穿透伤害，然后本回合此牌造成的穿透伤害+1（最多3）。
 */
define card {
  id 303122 as private ThunderbombBlessingElectro;
  until "v7.1.0";
  cost DiceType.Electro, 2;
  undiscoverable;
  support {
    variable damageValue, 1 { range 3; };
    hint DamageType.Physical, ((st, self) => self.variables.damageValue);
    on roll {
      :e.fixDice(DiceType.Electro, 2);
      :e.fixDice(DiceType.Pyro, 2);
    };
    on switchActive {
      listenTo all;
      when :( !:e.switchInfo.to.isMine() );
      :damage(DamageType.Piercing, :variables.damageValue);
      :variables.damageValue += 1;
    };
    // 官方 bug：宿灵球出伤比重置还早
    on actionPhase {
      :variables.damageValue = 1;
    };
  };
};
