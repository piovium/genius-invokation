// Copyright (C) 2024-2025 Guyutongxue
// Copyright (C) 2026 Piovium Labs
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as
// published by the Free Software Foundation, either version 3 of the
// License, or (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Affero General Public License for more details.
//
// You should have received a copy of the GNU Affero General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>.

import { DiceType } from "@gi-tcg/typings";

import type {
  CharacterDefinition,
  CharacterTag,
  CharacterVariableConfigs,
} from "./character";
import type {
  EntityDefinition,
  EntityTag,
  EntityType,
  EntityVariableConfigs,
  VariableOfConfig,
} from "./entity";
import type { GameData } from "../builder/registry";
import type { ExtensionDefinition } from "./extension";
import type {
  SkillDefinition,
  InitiativeSkillDefinition,
  TriggeredSkillDefinition,
} from "./skill";
import { randomSeed } from "../random";
import type { Version } from "..";
import { versionLt } from "./version";
import type { AttachmentDefinition } from "./attachment";

// 为不同层级的 state object 添加 marker symbol
export type StateKind =
  | "game"
  | "player"
  | "card"
  | "character"
  | "entity"
  | "extension"
  | "attachment";
export const StateSymbol: unique symbol = Symbol("GiTcgCoreState");
export type StateSymbol = typeof StateSymbol;

export type ErrorLevel = "strict" | "toleratePreview" | "skipPhase";

export interface GameConfig {
  readonly errorLevel: ErrorLevel;
  readonly randomSeed: number;
  readonly initialHandsCount: number;
  readonly maxHandsCount: number;
  readonly maxPileCount: number;
  readonly maxRoundsCount: number;
  readonly maxSupportsCount: number;
  readonly maxSummonsCount: number;
  readonly initialDiceCount: number;
  readonly maxDiceCount: number;
}

export const getDefaultGameConfig = (): GameConfig => ({
  errorLevel: "strict",
  initialDiceCount: 8,
  initialHandsCount: 5,
  maxDiceCount: 16,
  maxHandsCount: 10,
  maxPileCount: 200,
  maxRoundsCount: 15,
  maxSummonsCount: 4,
  maxSupportsCount: 4,
  randomSeed: randomSeed(),
});

/**
 * 记录不同版本的核心结算差异。
 */
export interface VersionBehavior {
  /**
   * 实体重复入场时，`default` 行为。
   * @note v3.5.0 起设置为 `takeMax`，此前为 `overwrite`
   */
  readonly defaultRecreateBehavior: "takeMax" | "overwrite";

  /**
   * 带有 `injuredOnly` 的食物事件牌，是否可以对满生命值角色使用。
   * @note v6.1.0 起设置为 `true`
   */
  readonly foodOmitInjuredOnly: boolean;

  /**
   * `disposeMaxCostHands` 是否终止预览。
   * @note v6.1.0 起设置为 `true`
   */
  readonly disposeMaxCostHandsAbortPreview: boolean;

  /**
   * 计算卡牌元素骰费用时，使用“原本元素骰费用”还是“当前元素骰费用”。
   * @note v6.4.0 起设置为 `true`
   */
  readonly diceCostApplyAttachments: boolean;
}

export const getVersionBehavior = (version: Version): VersionBehavior => ({
  defaultRecreateBehavior: versionLt(version, "v3.5.0")
    ? "overwrite"
    : "takeMax",
  foodOmitInjuredOnly: !versionLt(version, "v6.1.0"),
  disposeMaxCostHandsAbortPreview: !versionLt(version, "v6.1.0"),
  diceCostApplyAttachments: !versionLt(version, "v6.4.0"),
});

export interface IteratorState {
  readonly random: number;
  readonly id: number;
}

export type PhaseType =
  | "initActives"
  | "initHands"
  | "roll"
  | "action"
  | "end"
  | "gameEnd";

export interface GameState {
  readonly [StateSymbol]: "game";
  readonly data: GameData;
  readonly config: GameConfig;
  readonly versionBehavior: VersionBehavior;
  readonly iterators: IteratorState;
  readonly phase: PhaseType;
  readonly roundNumber: number;
  readonly currentTurn: 0 | 1;
  readonly winner: 0 | 1 | null;
  readonly players: readonly [PlayerState, PlayerState];
  readonly extensions: readonly ExtensionState[];
}

export interface PlayerState {
  readonly [StateSymbol]: "player";
  readonly who: 0 | 1;
  readonly initialPile: readonly EntityDefinition[];
  readonly pile: readonly EntityState[];
  readonly activeCharacterId: number;
  readonly hands: readonly EntityState[];
  readonly characters: readonly CharacterState[];
  readonly combatStatuses: readonly EntityState[];
  readonly supports: readonly EntityState[];
  readonly summons: readonly EntityState[];
  readonly dice: readonly DiceType[];
  readonly declaredEnd: boolean;
  readonly hasDefeated: boolean;
  readonly canCharged: boolean;
  readonly canPlunging: boolean;
  readonly legendUsed: boolean;
  readonly skipNextTurn: boolean;
  /**
   * 正在处于出战角色被击倒的重新选择角色的结算过程中。
   * 官方实现可能是作为 `phase` 的特殊值，这里我们令其正交。
   */
  readonly defeatedSwitching: boolean;
  /**
   * 每回合使用技能列表。
   * 键为技能发起者的角色定义 id，值为该定义下使用过的技能 id 列表
   */
  readonly roundSkillLog: ReadonlyMap<number, number[]>;
  /**
   * 我方在当前阶段造成的伤害 DamageEventArg 记录列表
   */
  readonly phaseDamageLog: unknown[];
  /**
   * 我方在当前阶段造成的反应 ReactionEventArg 记录列表
   */
  readonly phaseReactionLog: unknown[];
  readonly removedEntities: readonly AnyState[];
}

export interface CharacterState {
  readonly [StateSymbol]: "character";
  readonly id: number;
  readonly definition: CharacterDefinition;
  readonly entities: readonly EntityState[];
  readonly variables: CharacterVariables;
}

export type CharacterVariables = VariableOfConfig<CharacterVariableConfigs>;

export interface EntityState {
  readonly [StateSymbol]: "entity";
  readonly id: number;
  readonly definition: EntityDefinition;
  readonly variables: EntityVariables;
  readonly attachments: AttachmentState[];
}

export type EntityVariables = VariableOfConfig<EntityVariableConfigs>;

export interface AttachmentState {
  readonly [StateSymbol]: "attachment";
  readonly id: number;
  readonly definition: AttachmentDefinition;
  readonly variables: EntityVariables;
}

export type AnyState = CharacterState | EntityState | AttachmentState;

export interface ExtensionState {
  readonly [StateSymbol]: "extension";
  readonly definition: ExtensionDefinition;
  readonly state: unknown;
}

export function stringifyState(st: Omit<AnyState, StateSymbol>): string {
  const type = st.definition.type;
  return `[${type}:${st.definition.id}](${st.id})`;
}

export type {
  GameData,
  CharacterDefinition,
  CharacterTag,
  EntityDefinition,
  EntityType,
  EntityTag,
  ExtensionDefinition,
  SkillDefinition,
  InitiativeSkillDefinition,
  TriggeredSkillDefinition,
  AttachmentDefinition,
};
