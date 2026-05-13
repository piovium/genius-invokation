
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
  keyMap?: Record<string, any>;
  iconHash?: string;
  icon?: string;
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
  id: number;
  /** @deprecated use `shareId` instead */
  obtainable: boolean;
  shareId?: number;
  sinceVersion?: string;
  name: string;
  englishName: string;
  tags: string[];
  storyTitle?: string;
  storyText?: string;
  skills: SkillRawData[];
  hp: number;
  maxEnergy: number;
  cardFace: string;
  icon: string;
}

export interface EntityRawData {
  id: number;
  type: string;
  name: string;
  englishName: string;
  tags: string[];
  skills: SkillRawData[];
  rawDescription: string;
  description: string;
  rawPlayingDescription?: string;
  playingDescription?: string;
  hidden: boolean;
  remainAfterDie: boolean;
  persistEffectType?: string;
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
  buffType?: string;
  hintType?: string;
  shownToken?: string;
  shownIcon?: string;
  /** summons only */
  cardFace?: string;
  /** status / combat status only */
  buffIcon?: string;
  buffIconHash?: string;
}

export interface ActionCardRawData {
  id: number;
  type: string;
  /** @deprecated use `shareId` instead */
  obtainable: boolean;
  shareId?: number;
  sinceVersion?: string;
  name: string;
  englishName: string;
  tags: string[];
  targetList: ChooseTarget[];
  relatedCharacterId: number | null;
  relatedCharacterTags: string[];
  storyTitle?: string;
  storyText?: string;
  rawDescription: string;
  description: string;
  rawPlayingDescription?: string;
  playingDescription?: string;
  rawDynamicDescription?: string;
  dynamicDescription?: string;
  playCost: PlayCost[];
  cardFace: string;
}

export interface KeywordRawData {
  id: number;
  rawName: string;
  name: string;
  rawDescription: string;
  description: string;
}

export const ALL_CATEGORIES = [
  "action_cards",
  "characters",
  "entities",
  "keywords",
] as const;

export type Category = (typeof ALL_CATEGORIES)[number];
