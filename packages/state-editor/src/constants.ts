import { Aura, DiceType } from "@gi-tcg/typings";
import type { PhaseType, EntityType } from "@gi-tcg/core";

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
