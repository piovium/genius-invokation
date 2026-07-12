import { card, character, DamageType, DiceType, type PassiveSkillHandle, skill, status, summon, type SummonHandle } from "@gi-tcg/core/builder";
import { CryoElementalInfusion, CryoElementalInfusion01, KamisatoArtHyouka, KamisatoArtKabuki, KamisatoArtSoumetsu, KantenSenmyouBlessing } from "../characters/cryo/kamisato_ayaka.gts";
import { NORMAL_MIMICS, PREVIEW_MIMICS, Surge, TideAndTorrent } from "../characters/hydro/rhodeia_of_loch.gts";
import { GoldenCorrosion, RifthoundSkull } from "../characters/geo/golden_wolflord.gts";
import { ExplosivePuppet, FieryRain, Sharpshooter } from "../characters/pyro/amber.gts";
import { ArtisticIngenuity, PaintedDome, SchematicSetup } from "../characters/dendro/kaveh.gts";
import { EhecatlsRoar, NightsoulsBlessing, OcelotlicuePoint, SourceSample, YohualsScratch } from "../characters/geo/xilonen.gts";
import { IcyPaws, KatzleinStyle, SignatureMix } from "../characters/cryo/diona.gts";
import { CrushingTailAttack, FlamegranateConflagration, FlyingFruit, GluttonousRex01, GluttonousRex02 } from "../characters/dendro/gluttonous_yumkasaur_mountain_king.gts";
import { JadeScreen, Ningguang } from "../characters/geo/ningguang.gts";
import { Frostgnaw, Kaeya } from "../characters/cryo/kaeya.gts";

/**
 * @id 1304
 * @name 安柏
 * @description
 * 如果想要成为一名伟大的牌手…
 * 首先，要有坐上牌桌的勇气。
 */
define character {
  id 1304 as private Amber;
  until "v5.8.0";
  tags pyro, bow, mondstadt;
  health 10;
  energy 2;
  skills Sharpshooter, ExplosivePuppet, FieryRain;
}


/**
 * @id 1708
 * @name 卡维
 * @description
 * 体悟、仁爱与识美之知。
 */
define character {
  id 1708 as private Kaveh;
  until "v5.8.0";
  tags dendro, claymore, sumeru;
  health 10;
  energy 2;
  skills SchematicSetup, ArtisticIngenuity, PaintedDome;
}


/**
 * @id 1611
 * @name 希诺宁
 * @description
 * 嵴锋荡响，铄石显金
 */
define character {
  id 1611 as private Xilonen;
  until "v5.8.0";
  tags geo, sword, natlan;
  health 10;
  energy 2;
  skills EhecatlsRoar, YohualsScratch, OcelotlicuePoint, SourceSample;
  associateNightsoul NightsoulsBlessing;
}

/**
 * @id 1102
 * @name 迪奥娜
 * @description
 * 用1%的力气调酒，99%的力气…拒绝失败。
 */
define character {
  id 1102 as private Diona;
  until "v5.8.0";
  tags cryo, bow, mondstadt;
  health 10;
  energy 3;
  skills KatzleinStyle, IcyPaws, SignatureMix;
}

/**
 * @id 22012
 * @name 纯水幻造
 * @description
 * 随机召唤1种纯水幻形。（优先生成不同的类型，召唤区最多同时存在2种纯水幻形。）
 */
define skill {
  id 22012 as private OceanidMimicSummoning;
  until "v5.8.0";
  skillType elemental;
  cost DiceType.Hydro, 3;
  const mimics = :isPreview ? PREVIEW_MIMICS : NORMAL_MIMICS;
  const exists = :player.summons.map((s) => s.definition.id).filter((id) => mimics.includes(id));
  let target;
  if (exists.length >= 2) {
    target = :random(exists);
  } else {
    const rest = mimics.filter((id) => !exists.includes(id));
    target = :random(rest);
  }
  :summon(target as SummonHandle);
}

/**
 * @id 22013
 * @name 林野百态
 * @description
 * 随机召唤2种纯水幻形。（优先生成不同的类型，召唤区最多同时存在2种纯水幻形。）
 */
define skill {
  id 22013 as private TheMyriadWilds;
  until "v5.8.0";
  skillType elemental;
  cost DiceType.Hydro, 5;
  const mimics = :isPreview ? PREVIEW_MIMICS : NORMAL_MIMICS;
  const exists = :player.summons.map((s) => s.definition.id).filter((id) => mimics.includes(id));
  for (let i = 0; i < 2; i++) {
    let target;
    if (exists.length >= 2) {
      target = :random(exists);
    } else {
      const rest = mimics.filter((id) => !exists.includes(id));
      target = :random(rest);
    }
    :summon(target as SummonHandle);
    exists.push(target);
  }
}

/**
 * @id 2201
 * @name 纯水精灵·洛蒂娅
 * @description
 * 「但，只要百川奔流，雨露不休，水就不会消失…」
 */
define character {
  id 2201 as private RhodeiaOfLoch;
  until "v5.8.0";
  tags hydro, monster;
  health 10;
  energy 3;
  skills Surge, OceanidMimicSummoning, TheMyriadWilds, TideAndTorrent;
}

/**
 * @id 2704
 * @name 贪食匿叶龙山王
 * @description
 * 自古老的年代存活至今，经历了无数战场的强大匿叶龙。
 */
define character {
  id 2704 as private GluttonousYumkasaurMountainKing;
  until "v5.8.0";
  tags dendro, monster;
  health 7;
  energy 2;
  skills CrushingTailAttack, FlyingFruit, FlamegranateConflagration, GluttonousRex01, GluttonousRex02;
}

/**
 * @id 127041
 * @name 食足力增
 * @description
 * 自身下次造成的伤害+1。（可叠加，没有上限）
 */
define status {
  id 127041 as private WellFedAndStrong;
  until "v5.8.0";
  on increaseSkillDamage {
    usage 1 {
      append;
    };
    :e.increaseDamage(1);
  }
}

/**
 * @id 11054
 * @name 神里流·霰步
 * @description
 * 【被动】此角色被切换为「出战角色」时，附属冰元素附魔。
 */
define skill {
  id 11054 as private KamisatoArtSenho;
  until "v5.8.0";
  skillType passive {
    on battleBegin { // 战斗开始时也附属附魔
      when :( :self.isActive() );
      :characterStatus(CryoElementalInfusion);
    }
    on switchActive {
      when :( :e.switchInfo.to.id === :self.id );
      if (:self.hasEquipment(KantenSenmyouBlessing)) {
        :characterStatus(CryoElementalInfusion01);
      }
      else {
        :characterStatus(CryoElementalInfusion);
      }
    }
  }
}

/**
 * @id 1105
 * @name 神里绫华
 * @description
 * 如霜凝华，如鹭在庭。
 */
define character {
  id 1105 as private KamisatoAyaka;
  until "v5.8.0";
  tags cryo, sword, inazuma;
  health 10;
  energy 3;
  skills KamisatoArtKabuki, KamisatoArtHyouka, KamisatoArtSoumetsu, KamisatoArtSenho;
}

/**
 * @id 216011
 * @name 储之千日，用之一刻
 * @description
 * 战斗行动：我方出战角色为凝光时，装备此牌。
 * 凝光装备此牌后，立刻使用一次璇玑屏。
 * 装备有此牌的凝光在场时，璇玑屏会使我方造成的岩元素伤害+1。
 * （牌组中包含凝光，才能加入牌组）
 */
define card {
  id 216011 as private StrategicReserve;
  until "v5.8.0";
  cost DiceType.Geo, 4;
  talent Ningguang {
    on enter {
      :useSkill(JadeScreen);
    }
  }
}

/**
 * @id 211031
 * @name 冷血之剑
 * @description
 * 战斗行动：我方出战角色为凯亚时，装备此牌。
 * 凯亚装备此牌后，立刻使用一次霜袭。
 * 装备有此牌的凯亚使用霜袭后：治疗自身2点。（每回合1次）
 * （牌组中包含凯亚，才能加入牌组）
 */
define card {
  id 211031 as private ColdbloodedStrike;
  until "v5.8.0";
  cost DiceType.Cryo, 4;
  talent Kaeya {
    on enter {
      :useSkill(Frostgnaw);
    }
    on useSkill {
      when :( :e.skill.definition.id === Frostgnaw );
      usage perRound, 1;
      :heal(2, "@master");
    }
  }
}

/**
 * @id 321004
 * @name 晨曦酒庄
 * @description
 * 我方执行「切换角色」行动时：少花费1个元素骰。（每回合至多2次）
 */
define card {
  id 321004 as private DawnWinery;
  until "v5.8.0";
  cost DiceType.Aligned, 2;
  support place {
    on deductOmniDiceSwitch {
      usage perRound, 2;
      :e.deductOmniCost(1);
    }
  }
}

/**
 * @id 26032
 * @name 兽境轰召
 * @description
 * 造成1点岩元素伤害，目标角色附属2层黄金侵蚀，召唤兽境犬首。
 */
define skill {
  id 26032 as private HowlingRiftcall;
  until "v5.8.0";
  skillType elemental;
  cost DiceType.Geo, 3;
  :damage(DamageType.Geo, 1);
  :characterStatus(GoldenCorrosion, "opp active", {
      overrideVariables: {
        usage: 2
      }
    });
  :summon(RifthoundSkull);
}

/**
 * @id 312027
 * @name 紫晶的花冠
 * @description
 * 所附属角色为出战角色，敌方受到草元素伤害后：累积1枚「花冠水晶」。如果「花冠水晶」大于等于我方手牌数，则生成1个随机基础元素骰。
 * （每回合至多生成2个）
 * （角色最多装备1件「圣遗物」）
 */
define card {
  id 312027 as private AmethystCrown;
  until "v5.8.0";
  cost DiceType.Aligned, 1;
  artifact {
    variable generatedCount, 0 {
      visible false;
    };
    variable crystal, 0;
    on roundEnd {
      :setVariable("generatedCount", 0);
    }
    on damaged {
      when :( !:e.target.isMine() &&
          :e.type === DamageType.Dendro &&
          :self.master.isActive() );
      listenTo all;
      :addVariable("crystal", 1);
      const crystal = :getVariable("crystal");
      const hands = :player.hands.length;
      if (crystal >= hands && :getVariable("generatedCount") < 2) {
        :generateDice("randomElement", 1);
        :addVariable("generatedCount", 1);
      }
    }
  }
}

/**
 * @id 312028
 * @name 乐园遗落之花
 * @description
 * 所附属角色为出战角色，敌方受到伤害后：如果此伤害是草元素伤害或发生了草元素相关反应，则累积2枚「花冠水晶」。如果「花冠水晶」大于等于我方手牌数，则生成1个万能元素。
 * （每回合至多生成2个）
 * （角色最多装备1件「圣遗物」）
 */
define card {
  id 312028 as private FlowerOfParadiseLost;
  until "v5.8.0";
  cost DiceType.Aligned, 2;
  artifact {
    variable crystal, 0;
    variable generatedCount, 0 {
      visible false;
    };
    on roundEnd {
      :setVariable("generatedCount", 0);
    }
    on damaged {
      when :( :self.master.isActive() &&
          !:e.target.isMine() &&
          (:e.type === DamageType.Dendro || :e.isReactionRelatedTo(DamageType.Dendro)) );
      listenTo all;
      :addVariable("crystal", 2);
      const crystal = :getVariable("crystal");
      const hands = :player.hands.length;
      if (crystal >= hands && :getVariable("generatedCount") < 2) {
        :generateDice(DiceType.Omni, 1);
        :addVariable("generatedCount", 1);
      }
    }
  }
}

/**
 * @id 321012
 * @name 镇守之森
 * @description
 * 行动阶段开始时：如果我方不是「先手牌手」，则生成1个出战角色类型的元素骰。
 * 可用次数：3
 */
define card {
  id 321012 as private ChinjuForest;
  until "v5.8.0";
  cost DiceType.Aligned, 1;
  support place {
    on actionPhase {
      when :( !:isMyTurn() );
      usage 3;
      :generateDice(:$("my active")!.element(), 1);
    }
  }
}

/**
 * @id 321008
 * @name 鸣神大社
 * @description
 * 每回合自动触发1次：生成1个随机的基础元素骰。
 * 可用次数：3
 */
define card {
  id 321008 as private GrandNarukamiShrine;
  until "v5.8.0";
  cost DiceType.Aligned, 2;
  support place {
    on enter {
      :generateDice("randomElement", 1);
    }
    on actionPhase {
      usage 2;
      :generateDice("randomElement", 1);
    }
  }
}
