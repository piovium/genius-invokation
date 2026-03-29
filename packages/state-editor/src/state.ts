import { DEFAULT_ASSETS_MANAGER } from "@gi-tcg/assets-manager";
import {
  CURRENT_VERSION,
  StateSymbol,
  getVersionBehavior,
  type AttachmentState,
  type CharacterDefinition,
  type CharacterState,
  type EntityDefinition,
  type EntityState,
  type EntityType,
  type ExtensionState,
  type GameState,
  type InitiativeSkillDefinition,
  type PhaseType,
  type PlayerState,
} from "@gi-tcg/core";
import { Aura, DiceType } from "@gi-tcg/typings";
import getData from "@gi-tcg/data";
import type { Draft } from "immer";
import type { ExpressiveJSONSchema } from "ya-json-schema-types";

type AttachmentDefinition = AttachmentState["definition"];
type EditorGameData = ReturnType<typeof getData>;

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
  | { kind: "playerInfo"; who: 0 | 1 } // 合并玩家标记和技能记录
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

export interface InitiativeSkillOption {
  id: number;
  name: string;
  definitionId: number;
}

export interface EditorCatalog {
  characters: AssetOption<CharacterDefinition>[];
  attachments: AssetOption<AttachmentDefinition>[];
  entitiesByType: Record<EntityType, AssetOption<EntityDefinition>[]>;
  cardEntities: AssetOption<EntityDefinition>[];
  characterEntities: AssetOption<EntityDefinition>[];
  roundSkillCharacters: AssetOption<CharacterDefinition>[];
  initiativeSkillsByCharacterId: Map<number, InitiativeSkillOption[]>;
  allInitiativeSkills: InitiativeSkillOption[];
}

// 角色区域初始为空，需要通过选择角色来填充
const DEFAULT_CHARACTER_DEFINITION_IDS: readonly number[] = [];
const DEFAULT_CHARACTER_INSTANCE_IDS: readonly [
  readonly number[],
  readonly number[],
] = [[], []];

export const PHASE_LABELS: Record<PhaseType, string> = {
  initActives: "选择出战",
  initHands: "初始手牌",
  roll: "掷骰阶段",
  action: "行动阶段",
  end: "结束阶段",
  gameEnd: "对局结束",
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

const ENTITY_TYPE_LABELS: Record<EntityType, string> = {
  combatStatus: "出战状态",
  status: "状态",
  equipment: "装备",
  support: "支援",
  summon: "召唤物",
  eventCard: "事件牌",
};

const SPECIAL_ENERGY_LABELS: Record<string, string> = {
  fightingSpirit: "战意",
  serpentsSubtlety: "蛇之狡谋",
};

function sortOptions<T>(options: AssetOption<T>[]) {
  return [...options].sort((left, right) => {
    const nameCompare = left.name.localeCompare(right.name, "zh-Hans-CN");
    return nameCompare === 0 ? left.id - right.id : nameCompare;
  });
}

function getSafeName(id: number) {
  return DEFAULT_ASSETS_MANAGER.getNameSync(id) ?? `未命名 #${id}`;
}

function buildSearch(name: string, id: number) {
  return `${name} ${id}`.toLowerCase();
}

export function getDefinitionName(definition: { id: number } | undefined) {
  return definition ? getSafeName(definition.id) : "未知";
}

export function getDefinitionTypeLabel(definition: { type: string }) {
  if (definition.type === "character") {
    return "角色";
  }
  if (definition.type === "attachment") {
    return "附着";
  }
  return ENTITY_TYPE_LABELS[definition.type as EntityType] ?? definition.type;
}

export function getImageUrl(
  definition: { id: number },
  mode: "card" | "icon" = "card",
) {
  return DEFAULT_ASSETS_MANAGER.getImageUrlSync(definition.id, {
    type: mode === "card" ? "cardFace" : "icon",
    thumbnail: mode === "icon",
  });
}

function buildCharacterVariables(
  definition: CharacterDefinition,
): CharacterState["variables"] {
  const entries = Object.entries(definition.varConfigs).map(([key, value]) => [
    key,
    value.initialValue,
  ]);
  return Object.fromEntries(entries) as CharacterState["variables"];
}

function buildEntityVariables(
  definition: EntityDefinition | AttachmentDefinition,
): EntityState["variables"] {
  const entries = Object.entries(definition.varConfigs).map(([key, value]) => [
    key,
    value.initialValue,
  ]);
  return Object.fromEntries(entries) as EntityState["variables"];
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

function buildDefaultPlayerState(
  who: 0 | 1,
  data: EditorGameData,
): PlayerState {
  const definitions = DEFAULT_CHARACTER_DEFINITION_IDS.map((id) => {
    const definition = data.characters.get(id);
    if (!definition) {
      throw new Error(`Unknown default character id ${id}`);
    }
    return definition;
  });
  const instanceIds = DEFAULT_CHARACTER_INSTANCE_IDS[who];
  const characters = definitions.map((definition, index) =>
    createCharacterState(
      definition,
      instanceIds[index] ?? who * 100 + index + 1,
    ),
  );
  return {
    [StateSymbol]: "player",
    who,
    initialPile: [],
    pile: [],
    activeCharacterId: characters[0]?.id ?? -1,
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
  const extensions: ExtensionState[] = (
    Array.from(data.extensions.values()) as ExtensionState["definition"][]
  ).map((definition) => ({
    [StateSymbol]: "extension",
    definition,
    state: definition.initialState,
  }));
  return {
    [StateSymbol]: "game",
    data,
    config,
    versionBehavior: getVersionBehavior(CURRENT_VERSION),
    iterators: {
      random: randomSeed,
      id: -500000,
    },
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

export function buildEditorCatalog(data: EditorGameData): EditorCatalog {
  const characterOptions: AssetOption<CharacterDefinition>[] = [];
  const attachmentOptions: AssetOption<AttachmentDefinition>[] = [];
  const entityOptionsByType: Record<
    EntityType,
    AssetOption<EntityDefinition>[]
  > = {
    combatStatus: [],
    status: [],
    equipment: [],
    support: [],
    summon: [],
    eventCard: [],
  };
  for (const definition of Array.from(
    data.characters.values(),
  ) as CharacterDefinition[]) {
    const name = getSafeName(definition.id);
    characterOptions.push({
      id: definition.id,
      name,
      search: buildSearch(name, definition.id),
      definition,
    });
  }
  for (const definition of Array.from(
    data.entities.values(),
  ) as EntityDefinition[]) {
    const name = getSafeName(definition.id);
    entityOptionsByType[definition.type].push({
      id: definition.id,
      name,
      search: buildSearch(
        `${name} ${ENTITY_TYPE_LABELS[definition.type]}`,
        definition.id,
      ),
      definition,
    });
  }
  for (const definition of Array.from(
    data.attachments.values(),
  ) as AttachmentDefinition[]) {
    const name = getSafeName(definition.id);
    attachmentOptions.push({
      id: definition.id,
      name,
      search: buildSearch(name, definition.id),
      definition,
    });
  }
  const initiativeSkillsByCharacterId = new Map<
    number,
    InitiativeSkillOption[]
  >();
  const allInitiativeSkills: InitiativeSkillOption[] = [];
  for (const definition of Array.from(
    data.characters.values(),
  ) as CharacterDefinition[]) {
    const skills = definition.skills
      .filter(
        (
          skill: CharacterDefinition["skills"][number],
        ): skill is InitiativeSkillDefinition =>
          "triggerOn" in skill && skill.triggerOn === "initiative",
      )
      .map((skill) => ({
        id: skill.id,
        name: getSafeName(skill.id),
        definitionId: definition.id,
      }));
    initiativeSkillsByCharacterId.set(
      definition.id,
      [...skills].sort((left, right) =>
        left.name.localeCompare(right.name, "zh-Hans-CN"),
      ),
    );
    allInitiativeSkills.push(...skills);
  }
  allInitiativeSkills.sort((left, right) => {
    const nameCompare = left.name.localeCompare(right.name, "zh-Hans-CN");
    return nameCompare === 0 ? left.id - right.id : nameCompare;
  });
  return {
    characters: sortOptions(characterOptions),
    attachments: sortOptions(attachmentOptions),
    entitiesByType: {
      combatStatus: sortOptions(entityOptionsByType.combatStatus),
      status: sortOptions(entityOptionsByType.status),
      equipment: sortOptions(entityOptionsByType.equipment),
      support: sortOptions(entityOptionsByType.support),
      summon: sortOptions(entityOptionsByType.summon),
      eventCard: sortOptions(entityOptionsByType.eventCard),
    },
    cardEntities: sortOptions([
      ...entityOptionsByType.support,
      ...entityOptionsByType.equipment,
      ...entityOptionsByType.eventCard,
    ]),
    characterEntities: sortOptions([
      ...entityOptionsByType.status,
      ...entityOptionsByType.equipment,
    ]),
    roundSkillCharacters: sortOptions(characterOptions),
    initiativeSkillsByCharacterId,
    allInitiativeSkills,
  };
}

export function matchesSearch(option: { search: string }, query: string) {
  return option.search.includes(query.trim().toLowerCase());
}

export function allocateId(draft: Draft<GameState>) {
  const id = draft.iterators.id;
  draft.iterators.id -= 1;
  return id;
}

export function moveInArray<T>(
  items: readonly T[],
  index: number,
  delta: number,
) {
  const nextIndex = index + delta;
  if (nextIndex < 0 || nextIndex >= items.length) {
    return [...items];
  }
  const next = [...items];
  const [value] = next.splice(index, 1);
  next.splice(nextIndex, 0, value);
  return next;
}

export function shuffleList<T>(items: readonly T[]) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    const current = result[index];
    result[index] = result[swapIndex];
    result[swapIndex] = current;
  }
  return result;
}

export function sortImportedCards(definitions: readonly EntityDefinition[]) {
  return [...definitions].sort((left, right) => {
    const leftScore = left.tags.includes("legend") ? 0 : 1;
    const rightScore = right.tags.includes("legend") ? 0 : 1;
    return leftScore - rightScore;
  });
}

export function decodeDeckShareCode(code: string) {
  return DEFAULT_ASSETS_MANAGER.decode(code.trim());
}

export function buildImportedCharacterStates(
  draft: Draft<GameState>,
  characterIds: readonly number[],
) {
  return characterIds.map((id) => {
    const definition = draft.data.characters.get(id);
    if (!definition) {
      throw new Error(`角色 ${id} 不存在`);
    }
    return createCharacterState(definition, allocateId(draft));
  });
}

export function buildImportedPileDefinitions(
  data: EditorGameData,
  cardIds: readonly number[],
) {
  const definitions = cardIds.map((id) => {
    const definition = data.entities.get(id);
    if (!definition) {
      throw new Error(`卡牌 ${id} 不存在`);
    }
    return definition;
  });
  return sortImportedCards(definitions);
}

export function buildImportedPileStates(
  draft: Draft<GameState>,
  cardIds: readonly number[],
) {
  return buildImportedPileDefinitions(draft.data, cardIds).map((definition) =>
    createEntityState(definition, allocateId(draft)),
  );
}

export function getPlayer(state: GameState, who: 0 | 1) {
  return state.players[who];
}

export function getCharacter(player: PlayerState, characterId: number) {
  return (
    player.characters.find((character) => character.id === characterId) ?? null
  );
}

export function getEntity(
  player: PlayerState,
  area: EditorEntityArea,
  entityId: number,
  characterId?: number,
) {
  if (area === "characterEntities") {
    if (typeof characterId !== "number") {
      return null;
    }
    const character = getCharacter(player, characterId);
    return character?.entities.find((entity) => entity.id === entityId) ?? null;
  }
  return player[area].find((entity) => entity.id === entityId) ?? null;
}

export function getAttachment(
  player: PlayerState,
  area: "hands" | "pile",
  entityId: number,
  attachmentId: number,
) {
  const entity = player[area].find((item) => item.id === entityId);
  return (
    entity?.attachments.find((attachment) => attachment.id === attachmentId) ??
    null
  );
}

export function getCharacterEnergyLabel(character: CharacterState) {
  return (
    SPECIAL_ENERGY_LABELS[
      character.definition.specialEnergy?.variableName ?? ""
    ] ?? "能量"
  );
}

export function getCharacterMaxEnergyLabel(character: CharacterState) {
  return `最大${getCharacterEnergyLabel(character)}`;
}

function collectEntityIds(entity: EntityState, ids: number[]) {
  ids.push(entity.id);
  for (const attachment of entity.attachments) {
    ids.push(attachment.id);
  }
}

function validateSafeInteger(value: number, label: string, errors: string[]) {
  if (!Number.isSafeInteger(value)) {
    errors.push(`${label} 不是安全整数`);
  }
}

function validateExtensionValue(
  schema: ExpressiveJSONSchema,
  value: unknown,
  label: string,
  errors: string[],
) {
  if (!schema || typeof schema !== "object") {
    return;
  }
  if (schema.type === "object") {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      errors.push(`${label} 需要是对象`);
      return;
    }
    const properties = schema.properties as Record<string, unknown> | undefined;
    if (!properties) {
      return;
    }
    for (const [key, childSchema] of Object.entries(properties)) {
      validateExtensionValue(
        childSchema as ExpressiveJSONSchema,
        (value as Record<string, unknown>)[key],
        `${label}.${key}`,
        errors,
      );
    }
    return;
  }
  if (schema.type === "array") {
    if (!Array.isArray(value)) {
      errors.push(`${label} 需要是数组`);
      return;
    }
    const prefixItems = Array.isArray(schema.prefixItems)
      ? schema.prefixItems
      : null;
    if (prefixItems) {
      for (const [index, childSchema] of prefixItems.entries()) {
        validateExtensionValue(
          childSchema,
          value[index],
          `${label}[${index}]`,
          errors,
        );
      }
      return;
    }
    const items = schema.items as ExpressiveJSONSchema;
    if (!items) {
      return;
    }
    value.forEach((child, index) => {
      validateExtensionValue(items, child, `${label}[${index}]`, errors);
    });
    return;
  }
  if (schema.type === "number") {
    if (typeof value !== "number" || Number.isNaN(value)) {
      errors.push(`${label} 需要是数字`);
    }
    return;
  }
  if (schema.type === "boolean" && typeof value !== "boolean") {
    errors.push(`${label} 需要是布尔值`);
  }
}

export function validateGameState(state: GameState, catalog: EditorCatalog) {
  const errors: string[] = [];
  const validDiceTypes = new Set<number>(DICE_OPTIONS);
  validateSafeInteger(state.config.randomSeed, "随机种子", errors);
  validateSafeInteger(state.iterators.random, "随机迭代器", errors);
  validateSafeInteger(state.iterators.id, "下一个状态 ID", errors);
  validateSafeInteger(state.roundNumber, "回合数", errors);
  if (state.currentTurn !== 0 && state.currentTurn !== 1) {
    errors.push("当前行动方无效");
  }
  if (state.winner !== null) {
    errors.push("胜者必须为空");
  }
  const allIds: number[] = [];
  const validSkillIds = new Set(
    catalog.allInitiativeSkills.map((skill) => skill.id),
  );
  const validCharacterDefinitionIds = new Set(
    catalog.roundSkillCharacters.map((character) => character.id),
  );
  for (const [playerIndex, player] of state.players.entries()) {
    if (player.who !== playerIndex) {
      errors.push(`玩家 ${playerIndex} 的 who 不匹配`);
    }
    // 角色数量不再强制为3，可以为空
    if (
      player.characters.length > 0 &&
      !player.characters.some(
        (character) => character.id === player.activeCharacterId,
      )
    ) {
      errors.push(`玩家 ${playerIndex} 的出战角色不存在`);
    }
    if (player.hands.length > state.config.maxHandsCount) {
      errors.push(`玩家 ${playerIndex} 手牌超出上限`);
    }
    if (player.pile.length > state.config.maxPileCount) {
      errors.push(`玩家 ${playerIndex} 牌库超出上限`);
    }
    if (player.supports.length > state.config.maxSupportsCount) {
      errors.push(`玩家 ${playerIndex} 支援区超出上限`);
    }
    if (player.summons.length > state.config.maxSummonsCount) {
      errors.push(`玩家 ${playerIndex} 召唤区超出上限`);
    }
    if (player.dice.length > state.config.maxDiceCount) {
      errors.push(`玩家 ${playerIndex} 骰子超出上限`);
    }
    for (const dice of player.dice) {
      if (!validDiceTypes.has(dice)) {
        errors.push(`玩家 ${playerIndex} 存在无效骰子`);
      }
    }
    for (const [definitionId, skillIds] of player.roundSkillLog.entries()) {
      if (!validCharacterDefinitionIds.has(definitionId)) {
        errors.push(`玩家 ${playerIndex} 的回合技能记录角色定义不存在`);
      }
      for (const skillId of skillIds) {
        if (!validSkillIds.has(skillId)) {
          errors.push(`玩家 ${playerIndex} 的回合技能记录技能不存在`);
        }
      }
    }
    for (const character of player.characters) {
      if (!character) continue;
      allIds.push(character.id);
      for (const [key, value] of Object.entries(character.variables)) {
        validateSafeInteger(value, `角色变量 ${key}`, errors);
      }
      if (!AURA_OPTIONS.includes(character.variables.aura)) {
        errors.push(
          `玩家 ${playerIndex} 角色 ${character.definition.id} 的附着无效`,
        );
      }
      for (const entity of character.entities) {
        collectEntityIds(entity, allIds);
        for (const [key, value] of Object.entries(entity.variables)) {
          validateSafeInteger(value, `实体变量 ${key}`, errors);
        }
      }
    }
    for (const entity of [
      ...player.combatStatuses,
      ...player.supports,
      ...player.summons,
      ...player.hands,
      ...player.pile,
    ]) {
      collectEntityIds(entity, allIds);
      for (const [key, value] of Object.entries(entity.variables)) {
        validateSafeInteger(value, `实体变量 ${key}`, errors);
      }
    }
  }
  const uniqueIds = new Set(allIds);
  if (uniqueIds.size !== allIds.length) {
    errors.push("状态 ID 出现重复");
  }
  state.extensions.forEach((extension) => {
    validateExtensionValue(
      extension.definition.schema as ExpressiveJSONSchema,
      extension.state,
      `扩展 ${extension.definition.id}`,
      errors,
    );
  });
  return errors;
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
