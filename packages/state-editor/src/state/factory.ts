import {
  CURRENT_VERSION,
  StateSymbol,
  getVersionBehavior,
  type AttachmentDefinition,
  type AttachmentState,
  type CharacterDefinition,
  type CharacterState,
  type CharacterVariables,
  type EntityDefinition,
  type EntityState,
  type EntityVariables,
  type ExtensionState,
  type GameData,
  type GameState,
  type PlayerState,
} from "@gi-tcg/core";
import getData from "@gi-tcg/data";
import type { Draft } from "immer";
import { sortImportedCards } from "../utils";
import type { ExpressiveJSONSchema } from "ya-json-schema-types";

const DEFAULT_CHARACTER_DEFINITION_IDS: readonly number[] = [1301, 1103, 1501];
const ID_START = -500000;

function buildCharacterVariables(
  definition: CharacterDefinition,
): CharacterVariables {
  return Object.fromEntries(
    Object.entries(definition.varConfigs).map(([key, value]) => [
      key,
      value.initialValue,
    ]),
  ) as CharacterVariables;
}

function buildEntityVariables(
  definition: EntityDefinition | AttachmentDefinition,
): EntityVariables {
  return Object.fromEntries(
    Object.entries(definition.varConfigs).map(([key, value]) => [
      key,
      value.initialValue,
    ]),
  ) as EntityVariables;
}

export function createCharacterState(
  definition: CharacterDefinition,
  id: number,
): Draft<CharacterState> {
  return {
    [StateSymbol]: "character",
    id,
    definition: definition as Draft<CharacterDefinition>,
    entities: [],
    variables: buildCharacterVariables(definition),
  };
}

export function createEntityState(
  definition: EntityDefinition,
  id: number,
): Draft<EntityState> {
  return {
    [StateSymbol]: "entity",
    id,
    definition: definition as Draft<EntityDefinition>,
    variables: buildEntityVariables(definition),
    attachments: [],
  };
}

export function createAttachmentState(
  definition: AttachmentDefinition,
  id: number,
): Draft<AttachmentState> {
  return {
    [StateSymbol]: "attachment",
    id,
    definition: definition as Draft<AttachmentDefinition>,
    variables: buildEntityVariables(definition),
  };
}

function buildDefaultPlayerState(who: 0 | 1, data: GameData): PlayerState {
  const definitions = DEFAULT_CHARACTER_DEFINITION_IDS.map((id) => {
    const definition = data.characters.get(id);
    if (!definition) throw new Error(`Unknown default character id ${id}`);
    return definition;
  });
  const characters = definitions.map((definition, index) =>
    createCharacterState(definition, ID_START + 1 + who * 3 + index),
  );
  return {
    [StateSymbol]: "player",
    who,
    initialPile: [],
    pile: [],
    activeCharacterId: characters[0].id,
    hands: [],
    characters,
    combatStatuses: [],
    supports: [],
    summons: [],
    dice: [],
    declaredEnd: false,
    hasDefeated: false,
    canCharged: false,
    canPlunging: false,
    legendUsed: false,
    skipNextTurn: false,
    defeatedSwitching: false,
    roundSkillLog: new Map(),
    phaseDamageLog: [],
    phaseReactionLog: [],
    removedEntities: [],
  };
}

export function createDefaultGameState(): GameState {
  const data = getData(CURRENT_VERSION);
  const randomSeed = 0;
  const config = {
    errorLevel: "strict",
    initialDiceCount: 8,
    initialHandsCount: 5,
    maxDiceCount: 16,
    maxHandsCount: 10,
    maxPileCount: 200,
    maxRoundsCount: 15,
    maxSummonsCount: 4,
    maxSupportsCount: 4,
    randomSeed,
  } as const;
  const extensions: ExtensionState[] = Array.from(data.extensions.values()).map(
    (definition) => ({
      [StateSymbol]: "extension",
      definition,
      state: definition.initialState,
    }),
  );
  return {
    [StateSymbol]: "game",
    data,
    config,
    versionBehavior: getVersionBehavior(CURRENT_VERSION),
    iterators: { random: randomSeed, id: ID_START },
    phase: "action",
    roundNumber: 1,
    currentTurn: 0,
    winner: null,
    players: [
      buildDefaultPlayerState(0, data),
      buildDefaultPlayerState(1, data),
    ],
    extensions,
  };
}

export function allocateId(draft: Draft<GameState>) {
  const id = draft.iterators.id;
  draft.iterators.id -= 1;
  return id;
}

export function createSchemaDefault(schema: ExpressiveJSONSchema): unknown {
  if (!schema || typeof schema !== "object") {
    return null;
  }
  if (schema.type === "object") {
    const result: Record<string, unknown> = {};
    const properties = schema.properties as Record<string, unknown> | undefined;
    if (!properties) {
      return result;
    }
    for (const [key, childSchema] of Object.entries(properties)) {
      result[key] = createSchemaDefault(childSchema as ExpressiveJSONSchema);
    }
    return result;
  }
  if (schema.type === "array") {
    if (Array.isArray(schema.prefixItems)) {
      return schema.prefixItems.map((item: ExpressiveJSONSchema) =>
        createSchemaDefault(item),
      );
    }
    return [];
  }
  if (schema.type === "number") {
    return 0;
  }
  if (schema.type === "boolean") {
    return false;
  }
  return null;
}

export function buildImportedCharacterStates(
  draft: Draft<GameState>,
  characterIds: readonly number[],
): Draft<CharacterState>[] {
  return characterIds.map((id) => {
    const definition = draft.data.characters.get(id);
    if (!definition) {
      throw new Error(`角色 ${id} 不存在`);
    }
    return createCharacterState(definition, allocateId(draft));
  });
}

export function buildImportedPileDefinitions(
  data: GameData,
  cardIds: readonly number[],
): EntityDefinition[] {
  const definitions = cardIds.map((id) => {
    const definition = data.entities.get(id);
    if (!definition) {
      throw new Error(`卡牌 ${id} 不存在`);
    }
    return definition;
  });
  return sortImportedCards(definitions) as EntityDefinition[];
}

export function buildImportedPileStates(
  draft: Draft<GameState>,
  cardIds: readonly number[],
): Draft<EntityState>[] {
  return buildImportedPileDefinitions(draft.data, cardIds).map((definition) =>
    createEntityState(definition, allocateId(draft)),
  );
}
