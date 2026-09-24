export interface PlayCost {
  type: string;
  count: number;
}
export interface SkillRawData {
  id: number;
  type: string;
  name: string;
  englishName: string;
  rawDescription: string;
  description: string;
  playCost: PlayCost[];
  targetList: ChooseTarget[];
  hidden: boolean;
  keyMap: Record<string, any> | null;
  iconHash: string | null;
  icon: string | null;
}
export interface ChooseTarget {
  id: number;
  type: string;
  camp: string;
  tags: string[];
  rawHintText: string;
  hintText: string;
}
export interface CharacterRawData {
  subElements: string[];
  id: number;
  shareId: number | null;
  sinceVersion: string | null;
  name: string;
  englishName: string;
  tags: string[];
  storyTitle: string | null;
  storyText: string | null;
  skills: SkillRawData[];
  hp: number;
  maxEnergy: number;
  cardFace: string;
  icon: string;
}
export interface EntityRawData {
  shownTokenName: string | null;
  shareId: number | null;
  sinceVersion: string | null;
  targetList: ChooseTarget[];
  relatedCharacterId: number | null;
  relatedCharacterTags: string[];
  storyTitle: string | null;
  storyText: string | null;
  rawDynamicDescription: string | null;
  dynamicDescription: string | null;
  playCost: PlayCost[];
  id: number;
  type: string;
  name: string;
  englishName: string;
  tags: string[];
  skills: SkillRawData[];
  rawDescription: string;
  description: string;
  rawPlayingDescription: string | null;
  playingDescription: string | null;
  hidden: boolean;
  remainAfterDie: boolean;
  persistEffectType: string | null;
  /**
   * 持续效果
   * GCG_PERSIST_EFFECT_EXPECTO_PATRONUM 蓝盾
   * GCG_PERSIST_EFFECT_PROTEGO 黄盾
   * GCG_PERSIST_EFFECT_IMPERTURBABLE_CHARM 冻结
   * GCG_PERSIST_EFFECT_PETRIFICUS_TOTALUS 石化
   * GCG_PERSIST_EFFECT_STUPEFY 眩晕
   * GCG_PERSIST_EFFECT_NYX_* 夜魂加持
   * GCG_PERSIST_EFFECT_ATTACK_UP 强化
   * GCG_PERSIST_EFFECT_ATTACK_DOWN 虚弱
   */
  buffType: string | null;
  hintType: string | null;
  shownToken: string | null;
  shownIcon: string | null;
  /** Card face when a corresponding view exists. */
  cardFace: string | null;
  /** status / combat status only */
  buffIcon: string | null;
  buffIconHash: string | null;
}
export interface KeywordRawData {
  id: number;
  rawName: string;
  name: string;
  rawDescription: string;
  description: string;
}

/** @deprecated Use EntityRawData instead. */
export type ActionCardRawData = EntityRawData;

export const ALL_CATEGORIES = ["characters", "entities", "keywords"] as const;
/** Includes the deprecated action_cards compatibility category. */
export type Category = (typeof ALL_CATEGORIES)[number] | "action_cards";
