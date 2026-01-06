// Copyright (C) 2024-2025 Guyutongxue
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

import { type Draft, produce, enableMapSet } from "immer";

import { DiceType } from "@gi-tcg/typings";
import { flip } from "@gi-tcg/utils";
import {
  type PhaseType,
  type CharacterState,
  type EntityState,
  type GameState,
  type PlayerState,
  stringifyState,
  type AnyState,
  StateSymbol,
  type StateKind,
} from "./state";
import { removeEntity, getEntityById, sortDice, getEntityArea } from "../utils";
import {
  type EntityArea,
  type EntityDefinition,
  stringifyEntityArea,
  USAGE_PER_ROUND_VARIABLE_NAMES,
} from "./entity";
import type { CharacterDefinition } from "./character";
import { GiTcgCoreInternalError } from "../error";
import { nextRandom } from "../random";

enableMapSet();

type IdWritable<T extends { readonly id: number }> = Omit<
  T,
  "id" | StateSymbol
> & {
  id: number;
};

export interface StepRandomM {
  readonly type: "stepRandom";
  value: number; // output
}

export interface StepIdM {
  readonly type: "stepId";
  value: number; // output
}

export interface ChangePhaseM {
  readonly type: "changePhase";
  readonly newPhase: PhaseType;
}

export interface StepRoundM {
  readonly type: "stepRound";
}

export interface SwitchTurnM {
  readonly type: "switchTurn";
}

export interface SetWinnerM {
  readonly type: "setWinner";
  readonly winner: 0 | 1;
}

export interface SwitchActiveM {
  readonly type: "switchActive";
  readonly who: 0 | 1;
  readonly value: CharacterState;
}

export interface SwapCharacterPositionM {
  readonly type: "swapCharacterPosition";
  readonly who: 0 | 1;
  readonly characters: readonly [CharacterState, CharacterState];
}

export interface CreateCharacterM {
  readonly type: "createCharacter";
  readonly who: 0 | 1;
  readonly value: IdWritable<CharacterState>;
}

export interface CreateEntityM {
  readonly type: "createEntity";
  readonly target: EntityArea;
  readonly targetIndex?: number;
  readonly value: IdWritable<EntityState>;
}

export interface MoveEntityM {
  readonly type: "moveEntity";
  readonly value: EntityState;
  /** A display hint, not for applying mutation */
  readonly from: EntityArea;
  readonly target: EntityArea;
  readonly targetIndex?: number;
  readonly reason:
    | "switch"
    | "draw"
    | "undraw"
    | "steal"
    | "swap"
    | "equip"
    | "createSupport"
    | "unequip"
    | "unsupport"
    | "other";
}

export interface RemoveEntityM {
  readonly type: "removeEntity";
  /** A display hint, not for applying mutation */
  readonly from: EntityArea;
  readonly oldState: AnyState;
  readonly reason:
    | "cardDisposed" // 舍弃
    | "eventCardPlayed"
    | "eventCardDrawn"
    | "elementalTuning"
    | "overflow"
    | "eventCardPlayNoEffect"
    | "other";
}

export interface ModifyEntityVarM {
  readonly type: "modifyEntityVar";
  state: AnyState;
  readonly varName: string;
  readonly value: number;
  readonly direction: "increase" | "decrease" | null;
}

export interface TransformDefinitionM {
  readonly type: "transformDefinition";
  state: AnyState;
  readonly newDefinition: CharacterDefinition | EntityDefinition;
}

export interface ResetVariablesM {
  readonly type: "resetVariables";
  state: AnyState;
  readonly scope: "all" | "usagePerRound";
}

export type ResetDiceReason =
  | "roll"
  | "consume"
  | "elementalTuning"
  | "generate"
  | "convert"
  | "absorb"
  | "other";

export interface ResetDiceM {
  readonly type: "resetDice";
  readonly who: 0 | 1;
  readonly value: readonly DiceType[];
  readonly reason: ResetDiceReason;
  readonly conversionTargetHint?: DiceType;
}

export type PlayerFlag = {
  [P in keyof PlayerState]: PlayerState[P] extends boolean ? P : never;
}[keyof PlayerState];

export interface SetPlayerFlagM {
  readonly type: "setPlayerFlag";
  readonly who: 0 | 1;
  readonly flagName: PlayerFlag;
  readonly value: boolean;
}

export interface MutateExtensionStateM {
  readonly type: "mutateExtensionState";
  readonly extensionId: number;
  readonly newState: unknown;
}

export interface PushRoundSkillLogM {
  readonly type: "pushRoundSkillLog";
  readonly caller: CharacterState;
  readonly skillId: number;
}
export interface ClearRoundSkillLogM {
  readonly type: "clearRoundSkillLog";
  readonly who: 0 | 1;
}
export interface ClearRemovedEntitiesM {
  readonly type: "clearRemovedEntities";
}
export interface PushDelayingEventM {
  readonly type: "pushDelayingEvent";
  readonly eventName: string;
  readonly eventArg: unknown;
}
export interface ClearDelayingEventM {
  readonly type: "clearDelayingEvent";
}

export type Mutation =
  | StepRandomM
  | StepIdM
  | ChangePhaseM
  | StepRoundM
  | SwitchTurnM
  | SetWinnerM
  | SwitchActiveM
  | SwapCharacterPositionM
  | CreateCharacterM
  | CreateEntityM
  | MoveEntityM
  | RemoveEntityM
  | ModifyEntityVarM
  | TransformDefinitionM
  | ResetVariablesM
  | ResetDiceM
  | SetPlayerFlagM
  | MutateExtensionStateM
  | PushRoundSkillLogM
  | ClearRoundSkillLogM
  | ClearRemovedEntitiesM
  | PushDelayingEventM
  | ClearDelayingEventM;

function createDraft<T extends { readonly id: number }>(
  sym: StateKind,
  value: Omit<T, StateSymbol>,
): Draft<T> {
  return {
    ...value,
    [StateSymbol]: sym,
  } as unknown as Draft<T>;
}

function doMutation(state: GameState, m: Mutation): GameState {
  switch (m.type) {
    case "stepRandom": {
      const next = nextRandom(state.iterators.random);
      m.value = next;
      return produce(state, (draft) => {
        draft.iterators.random = next;
      });
    }
    case "stepId": {
      m.value = state.iterators.id;
      return produce(state, (draft) => {
        draft.iterators.id--;
      });
    }
    case "changePhase": {
      return produce(state, (draft) => {
        draft.phase = m.newPhase;
      });
    }
    case "stepRound": {
      return produce(state, (draft) => {
        draft.roundNumber++;
      });
    }
    case "switchTurn": {
      return produce(state, (draft) => {
        draft.currentTurn = flip(draft.currentTurn);
      });
    }
    case "setWinner": {
      return produce(state, (draft) => {
        draft.winner = m.winner;
      });
    }
    case "switchActive": {
      return produce(state, (draft) => {
        const player = draft.players[m.who];
        player.activeCharacterId = m.value.id;
      });
    }
    case "swapCharacterPosition": {
      return produce(state, (draft) => {
        const player = draft.players[m.who];
        const [c1, c2] = m.characters;
        const idx1 = player.characters.findIndex((c) => c.id === c1.id);
        const idx2 = player.characters.findIndex((c) => c.id === c2.id);
        if (idx1 === -1 || idx2 === -1) {
          throw new GiTcgCoreInternalError(
            `Character not found in player ${m.who}`,
          );
        }
        [player.characters[idx1], player.characters[idx2]] = [
          player.characters[idx2],
          player.characters[idx1],
        ];
      });
    }
    case "createCharacter": {
      return produce(state, (draft) => {
        if (m.value.id === 0) {
          m.value.id = draft.iterators.id--;
        }
        const value = createDraft<CharacterState>("character", m.value);
        draft.players[m.who].characters.push(value);
      });
    }
    case "createEntity": {
      const { target: where, value, targetIndex } = m;
      if (where.type === "characters") {
        return produce(state, (draft) => {
          const character = draft.players[where.who].characters.find(
            (c) => c.id === where.characterId,
          );
          if (!character) {
            throw new GiTcgCoreInternalError(
              `Character ${where.characterId} not found`,
            );
          }
          if (value.id === 0) {
            value.id = draft.iterators.id--;
          }
          const draftedValue = createDraft<EntityState>("entity", value);
          character.entities.push(draftedValue);
        });
      } else {
        const type = where.type;
        return produce(state, (draft) => {
          const area = draft.players[where.who][type];
          if (value.id === 0) {
            value.id = draft.iterators.id--;
          }
          const draftedValue = createDraft<EntityState>("entity", value);
          if (
            typeof targetIndex !== "number" ||
            targetIndex < 0 ||
            targetIndex > area.length
          ) {
            area.push(draftedValue);
          } else {
            area.splice(targetIndex, 0, draftedValue);
          }
        });
      }
    }
    case "moveEntity": {
      return produce(state, (draft) => {
        const latestState = removeEntity(draft, m.value.id);
        const { target: to, targetIndex } = m;
        let area: Draft<EntityState[]>;
        if (to.type === "characters") {
          const character = draft.players[to.who].characters.find(
            (c) => c.id === to.characterId,
          );
          if (!character) {
            throw new GiTcgCoreInternalError(
              `Character ${to.characterId} not found`,
            );
          }
          area = character.entities as Draft<EntityState[]>;
        } else {
          area = draft.players[to.who][to.type] as Draft<EntityState[]>;
        }
        if (
          typeof targetIndex !== "number" ||
          targetIndex < 0 ||
          targetIndex > area.length
        ) {
          area.push(latestState as Draft<EntityState>);
        } else {
          area.splice(targetIndex, 0, latestState as Draft<EntityState>);
        }
      });
    }
    case "removeEntity": {
      return produce(state, (draft) => {
        const removed = removeEntity(draft, m.oldState.id);
        draft.players[m.from.who].removedEntities.push(
          removed as Draft<AnyState>,
        );
      });
    }
    case "modifyEntityVar": {
      const newState = produce(state, (draft) => {
        const entity = getEntityById(draft, m.state.id) as Draft<EntityState>;
        entity.variables[m.varName] = m.value;
      });
      m.state = getEntityById(newState, m.state.id) as EntityState;
      return newState;
    }
    case "transformDefinition": {
      if (m.state.definition.type !== m.newDefinition.type) {
        throw new GiTcgCoreInternalError(
          `Cannot transform definition from different types: ${m.state.definition.type} -> ${m.newDefinition.type}`,
        );
      }
      const newState = produce(state, (draft) => {
        const entity = getEntityById(
          draft,
          m.state.id,
        ) as Draft<CharacterState>;
        entity.definition = m.newDefinition as Draft<CharacterDefinition>;
        // 如果是转换角色形态，则移动 skillLog 到新的定义 id 下
        if (m.state.definition.type === "character") {
          const { who } = getEntityArea(draft, m.state.id);
          const player = draft.players[who];
          player.roundSkillLog.set(
            m.newDefinition.id,
            player.roundSkillLog.get(m.state.definition.id) ?? [],
          );
          player.roundSkillLog.delete(m.state.definition.id);
        }
      });
      m.state = getEntityById(newState, m.state.id) as CharacterState;
      return newState;
    }
    case "resetVariables": {
      const newState = produce(state, (draft) => {
        const entity = getEntityById(draft, m.state.id) as Draft<AnyState>;
        const varConfigs = entity.definition.varConfigs;
        for (const key in varConfigs) {
          if (
            m.scope === "usagePerRound" &&
            !(USAGE_PER_ROUND_VARIABLE_NAMES as readonly string[]).includes(key)
          ) {
            continue;
          }
          const config = varConfigs[key];
          entity.variables[key] = config.initialValue;
        }
      });
      m.state = getEntityById(newState, m.state.id) as AnyState;
      return newState;
    }
    case "resetDice": {
      return produce(state, (draft) => {
        draft.players[m.who].dice = sortDice(state.players[m.who], m.value);
      });
    }
    case "setPlayerFlag": {
      return produce(state, (draft) => {
        draft.players[m.who][m.flagName] = m.value;
      });
    }
    case "mutateExtensionState": {
      return produce(state, (draft) => {
        const extension = draft.extensions.find(
          (e) => e.definition.id === m.extensionId,
        );
        if (!extension) {
          throw new GiTcgCoreInternalError(
            `Extension ${m.extensionId} not found in state`,
          );
        }
        extension.state = m.newState;
      });
    }
    case "pushRoundSkillLog": {
      const key = m.caller.definition.id;
      const { who } = getEntityArea(state, m.caller.id);
      return produce(state, (draft) => {
        const player = draft.players[who];
        if (!player.roundSkillLog.has(key)) {
          player.roundSkillLog.set(key, []);
        }
        player.roundSkillLog.get(key)!.push(m.skillId);
      });
    }
    case "clearRoundSkillLog": {
      return produce(state, (draft) => {
        draft.players[m.who].roundSkillLog.clear();
      });
    }
    case "clearRemovedEntities": {
      return produce(state, (draft) => {
        draft.players[0].removedEntities = [];
        draft.players[1].removedEntities = [];
      });
    }
    case "pushDelayingEvent": {
      return produce(state, (draft) => {
        draft.delayingEventArgs.push([m.eventName, m.eventArg]);
      });
    }
    case "clearDelayingEvent": {
      return produce(state, (draft) => {
        draft.delayingEventArgs = [];
      });
    }
    default: {
      const _: never = m;
      throw new GiTcgCoreInternalError(
        `Unknown mutation type: ${JSON.stringify(m)}`,
      );
    }
  }
}

export function stringifyMutation(m: Mutation): string | null {
  switch (m.type) {
    case "stepRound": {
      return `Step round number`;
    }
    case "switchTurn": {
      return `Switch turn`;
    }
    case "setWinner": {
      return `Set winner to ${m.winner}`;
    }
    case "switchActive": {
      return `Switch active of player ${m.who} to ${stringifyState(m.value)}`;
    }
    case "swapCharacterPosition": {
      return `Swap character position of player ${m.who}: ${stringifyState(
        m.characters[0],
      )} and ${stringifyState(m.characters[1])}`;
    }
    case "createCharacter": {
      return `Create character ${stringifyState(m.value)} for player ${m.who}`;
    }
    case "createEntity": {
      return `Create entity ${stringifyState(m.value)} in ${stringifyEntityArea(
        m.target,
      )}`;
    }
    case "moveEntity": {
      return `Move entity ${stringifyState(m.value)} to ${stringifyEntityArea(
        m.target,
      )} (index: ${m.targetIndex ?? "end"}) because ${m.reason}`;
    }
    case "removeEntity": {
      return `Removed entity ${stringifyState(m.oldState)} because ${m.reason}`;
    }
    case "modifyEntityVar": {
      return `Modify variable ${m.varName} of ${stringifyState(m.state)} to ${
        m.value
      }`;
    }
    case "transformDefinition": {
      return `Transform definition of ${stringifyState(m.state)} to [${
        m.newDefinition.type
      }:${m.newDefinition.id}]`;
    }
    case "resetVariables": {
      return `Reset variables of ${stringifyState(m.state)} (${m.scope})`;
    }
    case "resetDice": {
      return `Reset dice of player ${m.who} to ${JSON.stringify(m.value)}`;
    }
    case "setPlayerFlag": {
      return `Set player ${m.who} flag ${m.flagName} to ${m.value}`;
    }
    case "pushRoundSkillLog": {
      return `Push round skill log ${m.skillId} into ${stringifyState(
        m.caller,
      )}`;
    }
    default: {
      return null;
    }
  }
}

export function applyMutation(state: GameState, m: Mutation): GameState {
  return doMutation(state, m);
}
