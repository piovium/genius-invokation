import { DiceType, DamageType, $, Reaction } from "@gi-tcg/core/data";
import { Aino, PrecisionHydronicCooler } from "../characters/hydro/aino.gts";
import { Empowerment } from "../commons.gts";
import { AncientSwordArt } from "../characters/cryo/qiqi.gts";
import { AdeptusArtHeraldOfFrost } from "../characters/cryo/qiqi.gts";
import { AdeptusArtPreserverOfFortune } from "../characters/cryo/qiqi.gts";
import { ShadowswordGallopingFrost } from "../characters/anemo/maguu_kenki.gts";
import { TranscendentAutomaton } from "../characters/anemo/maguu_kenki.gts";
import { GoldenWolflord } from "../characters/geo/golden_wolflord.gts";
import { HowlingRiftcall } from "../characters/geo/golden_wolflord.gts";

/**
 * @id 1108
 * @name 七七
 * @description
 * 流转不息，生生不绝。
 */
define character {
  id 1108 as Qiqi;
  until "v7.0.0";
  tags cryo, sword, liyue;
  health 10;
  energy 3;
  skills AncientSwordArt, AdeptusArtHeraldOfFrost, AdeptusArtPreserverOfFortune;
};

/**
 * @id 25013
 * @name 霜驰影突
 * @description
 * 召唤剑影·霜驰。
 */
define skill {
  id 25013 as FrostyAssault;
  until "v7.0.0";
  skillType elemental;
  cost DiceType.Cryo, 3;
  :summon(ShadowswordGallopingFrost);
  if (:self.hasEquipment(TranscendentAutomaton)) {
    :switchActive($.my.prev);
  }
};

/**
 * @id 226031
 * @name 异兽侵蚀
 * @description
 * 战斗行动：我方出战角色为黄金王兽时，装备此牌。
 * 黄金王兽装备此牌后，立刻使用一次兽境轰召。
 * 装备有此牌的黄金王兽在场时，对方的黄金侵蚀最多可叠加到5次，并且所附属角色不在后台时也会生效。
 * （牌组中包含黄金王兽，才能加入牌组）
 */
define card {
  id 226031 as BeastlyCorrosion;
  until "v7.0.0";
  cost DiceType.Geo, 3;
  talent GoldenWolflord {
    on staged {
      :useSkill(HowlingRiftcall);
    };
  };
};

/**
 * @id 311111
 * @name 不灭月华
 * @description
 * 所附属角色生命值至少为11时：造成的伤害+2。
 * 入场时：所附属角色获得1点最大生命值。
 * （「法器」角色才能装备。角色最多装备1件「武器」）
 */
define card {
  id 311111 as private EverlastingMoonglow;
  until "v7.0.0";
  cost DiceType.Aligned, 2;
  weapon catalyst {
    on increaseSkillDamage {
      when :( :self.master.health >= 11 );
      :e.increaseDamage(2);
    };
    on staged {
      :increaseMaxHealth(1, :e.targets[0]);
    };
  };
};

// 爱诺天赋 7.1 增加了水结晶响应，导致效果实际存在变化：故不视为常规更新，保留旧版本

/**
 * @id 212161
 * @name 天才之为构造之责任
 * @description
 * 战斗行动：我方出战角色为爱诺时，装备此牌。
 * 爱诺装备此牌后，立刻使用一次精密水冷仪。
 * 装备有此卡牌的爱诺在场时，我方触发感电、月感电、绽放及月绽放反应时：该次伤害+2，并且赋予我方当前元素骰费用最高的1张手牌赋能。（每回合1次）
 * （牌组中包含爱诺，才能加入牌组）
 */
define card {
  id 212161 as private TheBurdenOfCreativeGenius;
  until "v7.0.0";
  cost DiceType.Hydro, 3;
  cost DiceType.Energy, 2;
  talent Aino {
    on staged {
      :useSkill(PrecisionHydronicCooler);
    };
    on increaseDamage {
      when :(
        (
          [
            Reaction.ElectroCharged,
            Reaction.LunarElectroCharged,
            Reaction.Bloom,
            Reaction.LunarBloom,
          ] as (Reaction | null)[]
        ).includes(:e.getReaction())
      );
      listenTo samePlayer;
      usage perRound, 1;
      :e.increaseDamage(2);
      const [hand] = :maxCostHands(1);
      if (hand) {
        :attach(Empowerment, hand);
      }
    };
  };
};
