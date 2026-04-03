import type {
  AttachmentDefinition,
  CharacterDefinition,
  CharacterState,
  EntityDefinition,
  EntityType,
  GameState,
  PlayerState,
} from "@gi-tcg/core";
import type { Draft } from "immer";

export type EditorEntityArea =
  | "combatStatuses"
  | "supports"
  | "summons"
  | "hands"
  | "pile"
  | "characterEntities";

export type EditorModal =
  | { kind: "pile"; who: 0 | 1 }
  | { kind: "hands"; who: 0 | 1 }
  | { kind: "character"; who: 0 | 1; characterId: number }
  | {
      kind: "entity";
      who: 0 | 1;
      area: EditorEntityArea;
      entityId: number;
      characterId?: number;
    }
  | {
      kind: "attachment";
      who: 0 | 1;
      area: "hands" | "pile";
      entityId: number;
      attachmentId: number;
    }
  | { kind: "extension"; index: number };

export type EditorSection =
  | { kind: "global" }
  | { kind: "pile"; who: 0 | 1 }
  | { kind: "hands"; who: 0 | 1 }
  | { kind: "character"; who: 0 | 1; characterIndex: number }
  | { kind: "supports"; who: 0 | 1 }
  | { kind: "summons"; who: 0 | 1 }
  | { kind: "combatStatuses"; who: 0 | 1 }
  | { kind: "dice"; who: 0 | 1 }
  | { kind: "playerInfo"; who: 0 | 1 }
  | { kind: "deckImport"; who: 0 | 1 };

export type UpdateGameState = (
  updater: (draft: Draft<GameState>) => void,
) => void;

export interface AssetOption<TDefinition> {
  id: number;
  name: string;
  search: string;
  definition: TDefinition;
}

export interface InitiativeSkillOption extends AssetOption<{ id: number }> {
  id: number;
  name: string;
}

export interface EditorCatalog {
  characters: AssetOption<CharacterDefinition>[];
  attachments: AssetOption<AttachmentDefinition>[];
  entitiesByType: Record<
    EntityType | "characterEntities" | "cardEntities",
    AssetOption<EntityDefinition>[]
  >;
  initiativeSkillsByCharacterId: Map<number, InitiativeSkillOption[]>;
  allInitiativeSkills: InitiativeSkillOption[];
}

export interface LoosePlayerState extends Omit<PlayerState, "characters"> {
  readonly characters: readonly (CharacterState | null)[];
}
