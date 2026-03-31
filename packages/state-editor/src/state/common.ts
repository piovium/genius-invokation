import {
  getEntityById,
  type AttachmentState,
  type CharacterState,
  type EntityState,
  type GameState,
} from "@gi-tcg/core";
import type { LoosePlayerState } from "../types";
import type { Draft } from "immer";

export function getPlayer(state: GameState, who: 0 | 1): LoosePlayerState {
  return state.players[who];
}

const safeGetEntityById = (state: GameState, id: number) => {
  try {
    return getEntityById(state, id);
  } catch {
    return null;
  }
};

export function getCharacter(
  state: Draft<GameState>,
  id: number,
): Draft<CharacterState | null>;
export function getCharacter(
  state: GameState,
  id: number,
): CharacterState | null;
export function getCharacter(state: GameState, id: number): unknown {
  const target = safeGetEntityById(state, id);
  if (target?.definition.type !== "character") {
    return null;
  }
  return target;
}

export function getEntity(
  state: Draft<GameState>,
  id: number,
): Draft<EntityState | null>;
export function getEntity(state: GameState, id: number): EntityState | null;
export function getEntity(state: GameState, id: number): unknown {
  const target = safeGetEntityById(state, id);
  if (
    !target ||
    target.definition.type === "character" ||
    target.definition.type === "attachment"
  ) {
    return null;
  }
  return target;
}

export function getAttachment(
  state: Draft<GameState>,
  id: number,
): Draft<AttachmentState | null>;
export function getAttachment(
  state: GameState,
  id: number,
): AttachmentState | null;
export function getAttachment(state: GameState, id: number): unknown {
  const target = safeGetEntityById(state, id);
  if (target?.definition.type !== "attachment") {
    return null;
  }
  return target;
}
