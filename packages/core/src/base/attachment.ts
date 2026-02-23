import type { SkillDefinition } from "./skill";
import type { VersionInfo } from "./version";
import type { DescriptionDictionary, EntityVariableConfigs } from "./entity";
import type { GameState } from "..";
import type { DiceType } from "@gi-tcg/typings";

export type AttachmentTag = "conductive";

export interface IncreaseCardCostModification {
  type: "increaseCardCost";
  value: number;
}
export interface DecreaseCardCostModification {
  type: "decreaseCardCost";
  value: number;
}
export interface ChangeCardCostTypeModification {
  type: "changeCardCostType";
  toType: DiceType;
}
export interface ChangeCardTuningTargetModification {
  type: "changeCardTuningTarget";
  tuningTarget: DiceType;
}
export interface DisableCardTuningModification {
  type: "disableCardTuning";
}
export interface MakeEffectlessModification {
  type: "makeEffectless";
}
export type AttachmentModification =
  | IncreaseCardCostModification
  | DecreaseCardCostModification
  | ChangeCardCostTypeModification
  | ChangeCardTuningTargetModification
  | DisableCardTuningModification
  | MakeEffectlessModification;

export type ModificationGetter = (
  st: GameState,
  id: number,
) => AttachmentModification[];

export interface AttachmentDefinition {
  readonly __definition: "attachments";
  readonly type: "attachment";
  readonly id: number;
  readonly tags: AttachmentTag[];
  readonly version: VersionInfo;
  readonly visibleVarName: string | null;
  readonly varConfigs: EntityVariableConfigs;
  readonly descriptionDictionary: DescriptionDictionary;
  readonly skills: readonly SkillDefinition[];
  readonly modifications: ModificationGetter;
}
