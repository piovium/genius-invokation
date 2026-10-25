import {
  $,
  DamageType,
  DiceType,
  type SkillHandle,
  type StatusHandle,
  type SummonHandle,
  type EquipmentHandle,
  type ExtensionHandle,
} from "@gi-tcg/core/data";

const [LiutianArchery, TrailOfTheQilin, FrostflakeArrow, CelestialShower] = [
  11011, 11012, 11013, 11014,
] as SkillHandle[];

/**
 * @id 1101
 * @name 甘雨
 * @description
 * 「既然是明早前要，那这份通稿，只要熬夜写完就好。」
 */
define character {
  id 1101 as Ganyu;
  tags cryo, bow, liyue;
  health 12;
  energy 2;
  skills LiutianArchery, TrailOfTheQilin, FrostflakeArrow, CelestialShower;
};

const [FireworkFlareup, NiwabiFiredance, RyuukinSaxifrage] = [
  13051, 13052, 13053,
] as SkillHandle[];

/**
 * @id 1305
 * @name 宵宫
 * @description
 * 花见坂第十一届全街邀请赛「长野原队」队长兼首发牌手。
 */
define character {
  id 1305 as Yoimiya;
  tags pyro, bow, inazuma;
  health 10;
  energy 2;
  skills FireworkFlareup, NiwabiFiredance, RyuukinSaxifrage;
};

/**
 * @id 311309
 * @name 便携动力锯
 * @description
 * 所附属角色受到伤害时：如可能，舍弃1张当前元素骰费用最高的手牌，以抵消1点伤害，然后累积1点「坚忍标记」。（每回合最多触发2次）
 * 角色造成伤害时：如果此牌已有「坚忍标记」，则消耗所有「坚忍标记」，使此伤害+1，并且每消耗1点「坚忍标记」就抓1张牌。
 * （「双手剑」角色才能装备。角色最多装备1件「武器」）
 */
define card {
  id 311309 as PortablePowerSaw;
  description "<color=#FFFFFFFF>所附属角色受到伤害时：</color>如可能，$[K56]1张$[K3002]最高的手牌，以抵消1点伤害，然后累积1点<color=#FFFFFFFF>「坚忍标记」</color>。（每回合最多触发2次）\\n<color=#FFFFFFFF>角色造成伤害时：</color>如果此牌已有<color=#FFFFFFFF>「坚忍标记」</color>，则消耗所有<color=#FFFFFFFF>「坚忍标记」</color>，使此伤害+1，并且每消耗1点<color=#FFFFFFFF>「坚忍标记」</color>就抓1张牌。\\n（<color=#FFFFFFFF>「{SPRITE_PRESET#3203}双手剑」角色</color>才能装备。角色最多装备1件「{SPRITE_PRESET#3003}武器」）";
  playingDescription "<color=#FFFFFFFF>所附属角色受到伤害时：</color>如可能，$[K56]1张$[K3002]最高的手牌，以抵消1点伤害，然后累积1点<color=#FFFFFFFF>「坚忍标记」</color>。（每回合最多触发2次）\\n<color=#FFFFFFFF>角色造成伤害时：</color>如果此牌已有<color=#FFFFFFFF>「坚忍标记」</color>，则消耗所有<color=#FFFFFFFF>「坚忍标记」</color>，使此伤害+1，并且每消耗1点<color=#FFFFFFFF>「坚忍标记」</color>就抓1张牌。";
  cost DiceType.Aligned, 2;
  weapon claymore {
    tags barrier;
    variable barrierUsage, 0;
    variable stoic, 0;
    on decreaseDamaged {
      when :( :player.hands.length > 0 );
      usage perRound, 2;
      :discardMaxCostHands(1);
      :e.decreaseDamage(1);
      :addVariable("stoic", 1);
    };
    on increaseSkillDamage {
      when :( :getVariable("stoic") > 0 );
      :e.increaseDamage(1);
      :drawCards(:getVariable("stoic"));
      :setVariable("stoic", 0);
    };
  };
};

/**
 * @id 311509
 * @name 船坞长剑
 * @description
 * 所附属角色受到伤害时：如可能，舍弃1张当前元素骰费用最高的手牌，以抵消1点伤害，然后累积1点「团结」。（每回合最多触发2次）
 * 角色造成伤害时：如果此牌已有「团结」，则消耗所有「团结」，使此伤害+1，并且每消耗1点「团结」就抓1张牌。
 * （「单手剑」角色才能装备。角色最多装备1件「武器」）
 */
define card {
  id 311509 as TheDockhandsAssistant;
  description "<color=#FFFFFFFF>所附属角色受到伤害时：</color>如可能，$[K56]1张$[K3002]最高的手牌，以抵消1点伤害，然后累积1点<color=#FFFFFFFF>「团结」</color>。（每回合最多触发2次）\\n<color=#FFFFFFFF>角色造成伤害时：</color>如果此牌已有<color=#FFFFFFFF>「团结」</color>，则消耗所有<color=#FFFFFFFF>「团结」</color>，使此伤害+1，并且每消耗1点<color=#FFFFFFFF>「团结」</color>就抓1张牌。\\n（<color=#FFFFFFFF>「{SPRITE_PRESET#3205}单手剑」角色</color>才能装备。角色最多装备1件「{SPRITE_PRESET#3003}武器」）";
  playingDescription "<color=#FFFFFFFF>所附属角色受到伤害时：</color>如可能，$[K56]1张$[K3002]最高的手牌，以抵消1点伤害，然后累积1点<color=#FFFFFFFF>「团结」</color>。（每回合最多触发2次）\\n<color=#FFFFFFFF>角色造成伤害时：</color>如果此牌已有<color=#FFFFFFFF>「团结」</color>，则消耗所有<color=#FFFFFFFF>「团结」</color>，使此伤害+1，并且每消耗1点<color=#FFFFFFFF>「团结」</color>就抓1张牌。";
  cost DiceType.Aligned, 2;
  weapon sword {
    tags barrier;
    variable barrierUsage, 0;
    variable solidarity, 0;
    on decreaseDamaged {
      when :( :player.hands.length > 0 );
      usage perRound, 2;
      :discardMaxCostHands(1);
      :e.decreaseDamage(1);
      :addVariable("solidarity", 1);
    };
    on increaseSkillDamage {
      when :( :getVariable("solidarity") > 0 );
      :e.increaseDamage(1);
      :drawCards(:getVariable("solidarity"));
      :setVariable("solidarity", 0);
    };
  };
};

/**
 * @id 330005
 * @name 万家灶火
 * @description
 * 第1回合打出此牌时：如果我方牌组中初始包含至少4/2张不同的「天赋」牌，则抓2/1张「天赋」牌。
 * 第2回合及以后打出此牌时：我方抓当于当前的回合数的牌。（最多抓4张）
 * （整局游戏只能打出一张「秘传」卡牌；这张牌一定在你的起始手牌中）
 * 【此卡含描述变量】
 */
define card {
  id 330005 as InEveryHouseAStove;
  description "<color=#FFFFFFFF>第1回合打出此牌时：</color>如果我方牌组中初始包含至少4/2张不同的「{SPRITE_PRESET#3006}天赋」牌，则抓2/1张「{SPRITE_PRESET#3006}天赋」牌。\\n<color=#FFFFFFFF>第2回合及以后打出此牌时：</color>我方抓当于当前的回合数的牌。（最多抓4张）\\n（整局游戏只能打出一张「{SPRITE_PRESET#3007}秘传」卡牌；这张牌一定在你的起始手牌中）";
  dynamicDescription "<color=#FFFFFFFF>第1回合打出此牌时：</color>如果我方牌组中初始包含至少4/2张不同的「{SPRITE_PRESET#3006}天赋」牌，则抓2/1张「{SPRITE_PRESET#3006}天赋」牌。\\n<color=#FFFFFFFF>第2回合及以后打出此牌时：</color>我方抓当于当前的回合数的牌。（最多抓4张，<color=#D3BC8EFF>当前为回合${[T]}</color>）\\n（整局游戏只能打出一张「{SPRITE_PRESET#3007}秘传」卡牌；这张牌一定在你的起始手牌中）";
  legend;
  replaceDescription "[T]", ((st) => st.roundNumber);
  filter :{
    if (:roundNumber === 1) {
      return (
        new Set(
          :player.initialPile
            .filter((card) => card.tags.includes("talent"))
            .map((card) => card.id),
        ).size >= 2
      );
    } else {
      return true;
    }
  };
  if (:roundNumber === 1) {
    const initTalentDefIds = :player.initialPile
      .filter((card) => card.tags.includes("talent"))
      .map((card) => card.id);
    const size = new Set(initTalentDefIds).size;
    if (size >= 4) {
      :drawCards(2, { withTag: "talent" });
    } else if (size >= 2) {
      :drawCards(1, { withTag: "talent" });
    }
  } else {
    const count = Math.min(:roundNumber, 4);
    :drawCards(count);
  }
};

/**
 * @id 323005
 * @name 化种匣
 * @description
 * 我方打出支援牌，或我方打出当前元素骰费用为1的装备牌时：少花费1个元素骰。（每回合1次）
 * 可用次数：2
 */
define card {
  id 323005 as SeedDispensary;
  description "<color=#FFFFFFFF>我方打出支援牌，或我方打出$[K3002]为1的装备牌时：</color>少花费1个元素骰。（每回合1次）\\n<color=#FFFFFFFF>$[K3]：2</color>";
  support item {
    on deductOmniDiceCard {
      when :(
        :e.action.skill.caller.definition.type === "support" ||
          (:e.action.skill.caller.definition.type === "equipment" &&
            :e.currentDiceCostSize() === 1)
      );
      usage perRound, 1;
      usage 2;
      :e.deductOmniCost(1);
    };
  };
};

const MachineAssemblyLineInEffect = 303228 as StatusHandle;

/**
 * @id 332028
 * @name 机关铸成之链
 * @description
 * 对目标我方角色造成1点物理伤害，并从牌组中随机抽取1张「圣遗物」牌。该角色每次受到伤害或治疗后：累积1点「备战度」（最多累积2点）。
 * 我方打出原本费用不多于「备战度」的「武器」或「圣遗物」时：移除所有「备战度」，以免费打出该牌。
 */
define card {
  id 332028 as MachineAssemblyLine;
  description "对目标我方角色造成1点$[K100]，并牌组中随机抽取1张「{SPRITE_PRESET#3004}圣遗物」牌。<color=#FFFFFFFF>该角色每次受到伤害或治疗后：</color>累积1点<color=#FFFFFFFF>「备战度」</color>（最多累积2点）。\\n<color=#FFFFFFFF>我方打出原本费用不多于<color=#FFFFFFFF>「备战度」</color>的「{SPRITE_PRESET#3003}武器」或「{SPRITE_PRESET#3004}圣遗物」时：</color>移除所有<color=#FFFFFFFF>「备战度」</color>，以免费打出该牌。";
  cost DiceType.Aligned, 1;
  addTarget $.my.character;
  :damage(DamageType.Physical, 1, :e.targets[0]);
  :drawCards(1, { withTag: "artifact" });
  :characterStatus(MachineAssemblyLineInEffect, :e.targets[0]);
};

const ShadowswordGallopingFrost = 125012 as SummonHandle;
const TranscendentAutomaton = 225011 as EquipmentHandle;

/**
 * @id 25013
 * @name 霜驰影突
 * @description
 * 造成1点冰元素伤害，召唤剑影·霜驰。
 */
define skill {
  id 25013 as FrostyAssault;
  description "造成$[D__KEY__DAMAGE]点$[D__KEY__ELEMENT]，召唤<color=#FFFFFFFF>$[C125012]</color>。";
  skillType elemental;
  cost DiceType.Anemo, 3;
  :damage(DamageType.Cryo, 1);
  :summon(ShadowswordGallopingFrost);
  if (:self.hasEquipment(TranscendentAutomaton)) {
    :switchActive($.my.prev);
  }
};

const DisposedSupportCountExtension = (50_000_000 + 322022) as ExtensionHandle<{
  disposedSupportCount: [number, number];
}>;

/**
 * @id 322022
 * @name 婕德
 * @description
 * 此牌会记录本场对局中我方支援区弃置卡牌的数量，称为「阅历」。（最多6点）
 * 我方角色使用「元素爆发」后：如果「阅历」至少为5，则弃置此牌，生成「阅历」-2数量的万能元素。
 */
define card {
  id 322022 as Jeht;
  cost DiceType.Void, 2;
  associateExtension DisposedSupportCountExtension;
  replaceDescription "[GCG_TOKEN_COUNTER]",
    ((_, { area }, ext) => ext.disposedSupportCount[area.who]);
  support ally {
    variable experience, 0;
    on staged {
      :setVariable(
        "experience",
        Math.min(:getExtensionState().disposedSupportCount[:self.who], 6),
      );
    };
    on entityDispose {
      when :( :e.entity.definition.type === "support" );
      :setVariable(
        "experience",
        Math.min(:getExtensionState().disposedSupportCount[:self.who], 6),
      );
    };
    on useSkill {
      when :( :e.isSkillType("burst") );
      const exp = :getVariable("experience");
      if (exp >= 5) {
        :generateDice(DiceType.Omni, exp - 2);
        :dispose();
      }
    };
  };
};
