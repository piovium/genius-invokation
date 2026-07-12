import { card, skill, DiceType, status, DamageType, type StatusHandle, summon } from "@gi-tcg/core/builder";
import { Diluc, SearingOnslaught } from "../characters/pyro/diluc.gts";
import { NiwabiFiredance, Yoimiya } from "../characters/pyro/yoimiya.gts";
import { KyoukaFuushi } from "../characters/hydro/kamisato_ayato.gts";
import { AdeptusArtPreserverOfFortune, Qiqi } from "../characters/cryo/qiqi.gts";

/**
 * @id 330005
 * @name 万家灶火
 * @description
 * 我方抓当前的回合数-1数量的牌。（最多抓4张）
 * （整局游戏只能打出一张「秘传」卡牌；这张牌一定在你的起始手牌中）
 */
define card {
  id 330005 as private InEveryHouseAStove;
  until "v4.6.1";
  legend;
  const count = Math.min(:roundNumber - 1, 4);
  :drawCards(count);
}

/**
 * @id 213011
 * @name 流火焦灼
 * @description
 * 战斗行动：我方出战角色为迪卢克时，装备此牌。
 * 迪卢克装备此牌后，立刻使用一次逆焰之刃。
 * 装备有此牌的迪卢克每回合第2次使用逆焰之刃时：少花费1个火元素。
 * （牌组中包含迪卢克，才能加入牌组）
 */
define card {
  id 213011 as private FlowingFlame;
  until "v4.6.1";
  cost DiceType.Pyro, 3;
  talent Diluc {
    on enter {
      :useSkill(SearingOnslaught);
    }
    on deductElementDiceSkill {
      when :( :e.action.skill.definition.id === SearingOnslaught && 
          :countOfSkill(Diluc, SearingOnslaught) === 1 &&
          :e.canDeductCostOfType(DiceType.Pyro) );
      :e.deductCost(DiceType.Pyro, 1);
    }
  }
}

/**
 * @id 113051
 * @name 庭火焰硝
 * @description
 * 所附属角色普通攻击伤害+1，造成的物理伤害变为火元素伤害。
 * 可用次数：2
 */
define status {
  id 113051 as private NiwabiEnshou;
  until "v4.6.1";
  conflictWith 113053;
  on modifySkillDamageType {
    when :( :e.type === DamageType.Physical );
    :e.changeDamageType(DamageType.Pyro);
  }
  on increaseSkillDamage {
    when :( :e.viaSkillType("normal") );
    usage 2;
    :e.increaseDamage(1);
  }
}

/**
 * @id 213051
 * @name 长野原龙势流星群
 * @description
 * 战斗行动：我方出战角色为宵宫时，装备此牌。
 * 宵宫装备此牌后，立刻使用一次焰硝庭火舞。
 * 装备有此牌的宵宫所生成的庭火焰硝初始可用次数+1，并且触发后额外造成1点火元素伤害。
 * （牌组中包含宵宫，才能加入牌组）
 */
define card {
  id 213051 as private NaganoharaMeteorSwarm;
  until "v4.6.1";
  cost DiceType.Pyro, 2;
  talent Yoimiya {
    on enter {
      :useSkill(NiwabiFiredance);
    }
  }
}

/**
 * @id 112061
 * @name 泷廻鉴花
 * @description
 * 所附属角色普通攻击造成的伤害+1，造成的物理伤害变为水元素伤害。
 * 可用次数：3
 */
define status {
  id 112061 as private TakimeguriKanka;
  until "v4.6.1";
  on modifySkillDamageType {
    when :( :e.type === DamageType.Physical );
    :e.changeDamageType(DamageType.Hydro);
  }
  on increaseSkillDamage {
    when :( :e.viaSkillType("normal") );
    usage 3;
    :e.increaseDamage(1);
    if (:self.master.hasEquipment(KyoukaFuushi) && :e.target.health <= 6) {
      :e.increaseDamage(1);
    }
  }
}

/**
 * @id 111081
 * @name 寒病鬼差
 * @description
 * 结束阶段：造成1点冰元素伤害。
 * 可用次数：3
 * 此召唤物在场时，七七使用「普通攻击」后：治疗受伤最多的我方角色1点。
 */
define summon {
  id 111081 as HeraldOfFrost;
  until "v4.6.1";
  hint DamageType.Cryo, 1;
  on endPhase {
    usage 3;
    :damage(DamageType.Cryo, 1);
  }
  on useSkill {
    when :( :e.skill.caller.definition.id === Qiqi && :e.isSkillType("normal") );
    :heal(1, "my characters order by health - maxHealth limit 1");
  }
}

/**
 * @id 211081
 * @name 起死回骸
 * @description
 * 战斗行动：我方出战角色为七七时，装备此牌。
 * 七七装备此牌后，立刻使用一次仙法·救苦度厄。
 * 装备有此牌的七七使用仙法·救苦度厄时：复苏我方所有倒下的角色，并治疗其2点。（整场牌局限制2次）
 * （牌组中包含七七，才能加入牌组）
 */
define card {
  id 211081 as RiteOfResurrection;
  until "v4.6.1";
  cost DiceType.Cryo, 5;
  cost DiceType.Energy, 3;
  talent Qiqi {
    on enter {
      :useSkill(AdeptusArtPreserverOfFortune);
    }
    on useSkill {
      when :( :e.skill.definition.id === AdeptusArtPreserverOfFortune );
      usage 2 {
        autoDispose false;
      };
      for (const ch of :$$(`all my defeated characters`)) {
        ch.heal(2, { kind: "revive" });
      }
    }
  }
}
