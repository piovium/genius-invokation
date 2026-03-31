import { Aura, DiceType } from "@gi-tcg/typings";
import type { PhaseType, EntityType, EntityTag } from "@gi-tcg/core";

export const PHASE_LABELS: Partial<Record<PhaseType, string>> = {
  roll: "掷骰阶段",
  action: "行动阶段",
  end: "结束阶段",
};

export const DICE_OPTIONS = [
  DiceType.Cryo,
  DiceType.Hydro,
  DiceType.Pyro,
  DiceType.Electro,
  DiceType.Anemo,
  DiceType.Geo,
  DiceType.Dendro,
  DiceType.Omni,
] as const;

export const DICE_LABELS: Record<number, string> = {
  [DiceType.Cryo]: "冰",
  [DiceType.Hydro]: "水",
  [DiceType.Pyro]: "火",
  [DiceType.Electro]: "雷",
  [DiceType.Anemo]: "风",
  [DiceType.Geo]: "岩",
  [DiceType.Dendro]: "草",
  [DiceType.Omni]: "万能",
};

export const AURA_OPTIONS = [
  Aura.None,
  Aura.Cryo,
  Aura.Hydro,
  Aura.Pyro,
  Aura.Electro,
  Aura.Dendro,
  Aura.CryoDendro,
] as const;

export const AURA_LABELS: Record<number, string> = {
  [Aura.None]: "无附着",
  [Aura.Cryo]: "冰元素",
  [Aura.Hydro]: "水元素",
  [Aura.Pyro]: "火元素",
  [Aura.Electro]: "雷元素",
  [Aura.Dendro]: "草元素",
  [Aura.CryoDendro]: "冰草共存",
};

export const ENTITY_TYPE_LABELS: Record<EntityType, string> = {
  combatStatus: "出战状态",
  status: "状态",
  equipment: "装备",
  support: "支援",
  summon: "召唤物",
  eventCard: "事件牌",
};

export const WEAPON_TAGS = [
  "sword",
  "claymore",
  "pole",
  "catalyst",
  "bow",
] as const;

export const SPECIAL_ENERGY_LABELS: Record<string, string> = {
  fightingSpirit: "战意",
  serpentsSubtlety: "蛇之狡谋",
};

export const TAG_LABELS: Record<EntityTag, string> = {
  // CardTag
  legend: "秘传",
  action: "战斗行动",
  food: "料理",
  resonance: "元素共鸣",
  abyss: "",
  // CommonEntityTag
  shield: "护盾",
  barrier: "伤害降低",
  normalAsPlunging: "下落攻击",
  // StatusTag
  bondOfLife: "生命之契",
  disableSkill: "",
  immuneControl: "免疫控制",
  preparingSkill: "准备技能",
  // CombatStatusTag
  eventEffectless: "",
  nightsoulsBlessing: "夜魂加持",
  // EquipmentTag
  talent: "天赋",
  artifact: "圣遗物",
  technique: "特技",
  weapon: "武器",
  sword: "单手剑",
  claymore: "双手剑",
  pole: "长柄武器",
  catalyst: "法器",
  bow: "弓",
  // SupportTag
  ally: "伙伴",
  place: "场地",
  item: "道具",
  blessing: "元素幻变",
  adventureSpot: "冒险地点",
};
