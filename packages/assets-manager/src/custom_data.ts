import type { DiceRequirement } from "@gi-tcg/typings";
import type {
  AttachmentTag,
  CharacterTag,
  CommonSkillType,
  EntityTag,
  EntityType,
} from "@gi-tcg/core";
export interface CustomActionCard {
  id: number;
  name: string;
  rawDescription: string;
  cardFaceUrl: string;
  obtainable: boolean;
  type: EntityType;
  tags: EntityTag[];
  playCost: DiceRequirement;
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
  playCost: DiceRequirement;
}

export interface CustomEntity {
  id: number;
  name: string;
  rawDescription: string;
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
  iconUrl: string;
  tags: AttachmentTag[];
  skills: CustomSkill[];
}

export interface CustomData {
  actionCards: CustomActionCard[];
  characters: CustomCharacter[];
  entities: CustomEntity[];
  /** Standalone skills, including overrides whose character is official. */
  skills?: CustomSkill[];
  /** Optional to keep existing custom-data payloads compatible. */
  attachments?: CustomAttachment[];
}
