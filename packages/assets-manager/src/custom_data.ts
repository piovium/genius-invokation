import type { DiceType } from "@gi-tcg/typings";
import type {
  AttachmentTag,
  CharacterTag,
  CommonSkillType,
  EntityTag,
  EntityType,
} from "@gi-tcg/core";

export interface CustomPlayCost {
  type: DiceType;
  count: number;
}

export interface CustomActionCard {
  id: number;
  name: string;
  rawDescription: string;
  rawPlayingDescription?: string;
  rawDynamicDescription?: string;
  cardFaceUrl: string;
  obtainable: boolean;
  type: EntityType;
  tags: EntityTag[];
  playCost: CustomPlayCost[];
}

export interface CustomCharacter {
  id: number;
  name: string;
  rawDescription: string;
  cardFaceUrl: string;
  obtainable: boolean;
  hp: number;
  maxEnergy: number;
  tags: CharacterTag[];
  skills: CustomSkill[];
}

export interface CustomSkill {
  id: number;
  name: string;
  rawDescription: string;
  skillIconUrl: string;
  type: CommonSkillType | "passive";
  playCost: CustomPlayCost[];
}

export interface CustomEntity {
  id: number;
  name: string;
  rawDescription: string;
  rawPlayingDescription?: string;
  type: EntityType;
  cardFaceOrBuffIconUrl: string;
  // tags: EntityTag[];
  // hidden: boolean;
  skills: CustomSkill[];
}

export interface CustomAttachment {
  id: number;
  name: string;
  rawDescription: string;
  rawPlayingDescription?: string;
  iconUrl: string;
  tags: AttachmentTag[];
  skills: CustomSkill[];
}

export interface CustomData {
  actionCards: CustomActionCard[];
  characters: CustomCharacter[];
  entities: CustomEntity[];
  /** Standalone skills, including overrides whose character is official. */
  skills: CustomSkill[];
  attachments: CustomAttachment[];
}
