import { DamageType, DiceType, card, skill, status } from "@gi-tcg/core/builder";
import { EmbersRekindled } from "../characters/pyro/abyss_lector_fathomless_flames.gts";
import { HeronStrike } from "../characters/hydro/candace.gts";
import { Wavestrider } from "../characters/electro/beidou.gts";
import { DisposedSupportCountExtension } from "../cards/support/ally.gts";

/**
 * @id 123022
 * @name 火之新生
 * @description
 * 所附属角色被击倒时：移除此效果，使角色免于被击倒，并治疗该角色到3点生命值。
 */
define status {
  id 123022 as private FieryRebirthStatus;
  until "v4.5.0";
  on beforeDefeated {
    :immune(3);
    const talent = :self.master.hasEquipment(EmbersRekindled);
    if (talent) {
      :dispose(talent);
      :characterStatus(AegisOfAbyssalFlame, "@master");
    }
    :dispose();
  }
}

/**
 * @id 123024
 * @name 渊火加护
 * @description
 * 为所附属角色提供3点护盾。
 * 此护盾耗尽前：所附属角色造成的火元素伤害+1。
 */
define status {
  id 123024 as private AegisOfAbyssalFlame;
  until "v4.5.0";
  shield 3;
  on increaseSkillDamage {
    when :( :e.type === DamageType.Pyro );
    :e.increaseDamage(1);
  }
}

/**
 * @id 112071
 * @name 苍鹭护盾
 * @description
 * 本角色将在下次行动时，直接使用技能：苍鹭震击。
 * 准备技能期间：提供2点护盾，保护所附属的角色。
 */
define status {
  id 112071 as private HeronShield;
  until "v4.5.0";
  shield 2;
  prepare HeronStrike;
}

/**
 * @id 12072
 * @name 圣仪·苍鹭庇卫
 * @description
 * 本角色附属苍鹭护盾并准备技能：苍鹭震击。
 */
define skill {
  id 12072 as private SacredRiteHeronsSanctum;
  until "v4.5.0";
  skillType elemental;
  cost DiceType.Hydro, 3;
  :characterStatus(HeronShield);
}

/**
 * @id 114051
 * @name 捉浪·涛拥之守
 * @description
 * 本角色将在下次行动时，直接使用技能：踏潮。
 * 准备技能期间：提供2点护盾，保护所附属的角色。
 */
define status {
  id 114051 as private TidecallerSurfEmbrace;
  until "v4.5.0";
  prepare Wavestrider;
  shield 2;
}

/**
 * @id 14052
 * @name 捉浪
 * @description
 * 本角色附属捉浪·涛拥之守并准备技能：踏潮。
 */
define skill {
  id 14052 as private Tidecaller;
  until "v4.5.0";
  skillType elemental;
  cost DiceType.Electro, 3;
  :characterStatus(TidecallerSurfEmbrace);
}

/**
 * @id 322020
 * @name 弥生七月
 * @description
 * 我方打出「圣遗物」手牌时：少花费1个元素骰；我方场上每有一个已装备「圣遗物」的角色，就额外少花费1个元素骰。（每回合1次）
 */
define card {
  id 322020 as YayoiNanatsuki;
  until "v4.5.0";
  cost DiceType.Aligned, 1;
  support ally {
    on deductOmniDiceCard {
      when :( :e.hasCardTag("artifact") );
      usage perRound, 1;
      const artifactedCh = :$$("my characters has equipment with tag (artifact)").length;
      :e.deductOmniCost(1 + artifactedCh);
    }
  }
}

/**
 * @id 323005
 * @name 化种匣
 * @description
 * 我方打出原本元素骰费用为1的装备或支援牌时：少花费1个元素骰。（每回合1次）
 * 可用次数：2
 */
define card {
  id 323005 as private SeedDispensary;
  until "v4.5.0";
  support item {
    on deductOmniDiceCard {
      when :( :e.currentDiceCostSize() === 1 &&
          ["equipment", "support"].includes(:e.action.skill.caller.definition.type) );
      usage perRound, 1;
      usage 2;
      :e.deductOmniCost(1);
    }
  }
}

/**
 * @id 322022
 * @name 婕德
 * @description
 * 此牌会记录本场对局中我方支援区弃置卡牌的数量，称为「阅历」。（最多6点）
 * 我方角色使用「元素爆发」后：如果「阅历」至少为5，则弃置此牌，生成「阅历」-2数量的万能元素。
 */
define card {
  id 322022 as private Jeht;
  until "v4.5.0";
  cost DiceType.Void, 2;
  support ally {
    associateExtension DisposedSupportCountExtension;
    variable experience, 0;
    on enter {
      :setVariable("experience", Math.min(:getExtensionState().disposedSupportCount[:self.who], 6));
    }
    on dispose {
      when :( :e.entity.definition.type === "support" );
      :setVariable("experience", Math.min(:getExtensionState().disposedSupportCount[:self.who], 6));
    }
    on useSkill {
      when :( :e.isSkillType("burst") );
      const exp = :getVariable("experience");
      if (exp >= 5) {
        :generateDice(DiceType.Omni, exp - 2);
        :dispose();
      }
    }
  }
}
