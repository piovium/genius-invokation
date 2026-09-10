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

import type { Draft } from "immer";
import type { GameState } from "./base/state";
import type { GameData } from "./data";
import { CORE_VERSION, StateSymbol } from "./index";
import type { SkillEnvironment } from "./base/skill";

export interface GameStateLogEntry {
  readonly state: GameState;
  readonly canResume: boolean;
}

/**
 * Markers of the persisted log format. They are a compatibility contract:
 * logs written by older versions must keep decoding, so neither these key
 * names nor the `map` / `set` tags may change.
 */
const REF_MARKER = "$";
const DEFINITION_REF_MARKER = "$$";
const DEFINITION_FIELD = "__definition";
const TYPE_MARKER = "__type";
const ID_FIELD = "id";
const MAP_TAG = "map";
const SET_TAG = "set";

/**
 * Persisted shape of one log entry: `s` is the encoded state snapshot, `e` is
 * reserved for future data, and `r` marks snapshots the engine can resume from.
 */
interface SerializedLogEntry {
  s: unknown;
  e: readonly [];
  r: boolean;
}

export interface SerializedLog {
  v: string; // Core library version that produced this log
  store: any[];
  log: SerializedLogEntry[];
}

export function serializeGameStateLog(
  log: readonly GameStateLogEntry[],
): SerializedLog {
  const serializer = createGameStateLogSerializer();
  for (const entry of log) serializer.append(entry);
  return serializer.serialize();
}

/**
 * Append immutable engine snapshots without retaining the original states.
 * Weak keys preserve the existing reference encoding while allowing obsolete
 * state graphs to be collected. Returned logs remain readable after later
 * appends.
 */
export function createGameStateLogSerializer() {
  const serializedEntries: SerializedLogEntry[] = [];
  const store: any[] = [];
  const indices = new WeakMap<object, number>();

  const encode = (value: unknown): any => {
    if (
      typeof value === "number" ||
      typeof value === "string" ||
      typeof value === "boolean" ||
      value === null
    ) {
      return value;
    }
    const index = typeof value === "object" ? indices.get(value) : undefined;
    if (index !== undefined) return { [REF_MARKER]: index };
    if (Array.isArray(value)) {
      const result = value.map(encode);
      // Short arrays are inlined verbatim; longer ones go through the store so
      // that shared references survive a round trip.
      if (result.length < 2) return result;
      indices.set(value, store.length);
      store.push(result);
      return { [REF_MARKER]: store.length - 1 };
    }
    if (value instanceof Map) {
      return {
        [TYPE_MARKER]: MAP_TAG,
        entries: Array.from(value.entries(), ([key, entryValue]) => [
          encode(key),
          encode(entryValue),
        ]),
      };
    }
    if (value instanceof Set) {
      return {
        [TYPE_MARKER]: SET_TAG,
        values: Array.from(value, encode),
      };
    }
    if (typeof value !== "object") return value;
    const proto = Object.getPrototypeOf(value);
    if (proto !== Object.prototype && proto !== null) {
      return null; // Non-plain objects are not serialized
    }
    if (DEFINITION_FIELD in value && ID_FIELD in value) {
      const ref: any = {
        [DEFINITION_REF_MARKER]: value[DEFINITION_FIELD],
        [ID_FIELD]: value[ID_FIELD],
      };
      indices.set(value, store.length);
      store.push(ref);
      return { [REF_MARKER]: store.length - 1 };
    }
    const plain: any = {};
    for (const key in value) {
      plain[key] = encode((value as Record<string, unknown>)[key]);
    }
    indices.set(value, store.length);
    store.push(plain);
    return { [REF_MARKER]: store.length - 1 };
  };

  const append = (entry: GameStateLogEntry): void => {
    const { data: _data, ...stateWithoutData } = entry.state;
    serializedEntries.push({
      s: encode(stateWithoutData),
      e: [],
      r: entry.canResume,
    });
  };

  return {
    append,
    serialize: (): SerializedLog => ({
      v: CORE_VERSION,
      store: store.slice(),
      log: serializedEntries.slice(),
    }),
  };
}

const VALID_DEF_KEYS = [
  "characters",
  "entities",
  "extensions",
  "attachments",
] as const;
type ValidDefKeys = (typeof VALID_DEF_KEYS)[number];

function isValidDefKey(defKey: unknown): defKey is ValidDefKeys {
  return (
    typeof defKey === "string" && VALID_DEF_KEYS.some((key) => key === defKey)
  );
}

export function deserializeGameStateLog(
  data: GameData,
  { store, log }: SerializedLog,
): GameStateLogEntry[] {
  const restoredStore = new Map<number, any>();

  const decode = (v: unknown): any => {
    if (Array.isArray(v)) return v.map(decode);
    if (typeof v !== "object" || v === null) return v;
    if (REF_MARKER in v && typeof v[REF_MARKER] === "number") {
      const index = v[REF_MARKER];
      if (!restoredStore.has(index)) {
        restoredStore.set(index, decode(store[index]));
      }
      return restoredStore.get(index);
    }
    if (
      DEFINITION_REF_MARKER in v &&
      ID_FIELD in v &&
      typeof v[ID_FIELD] === "number" &&
      isValidDefKey(v[DEFINITION_REF_MARKER])
    ) {
      return data[v[DEFINITION_REF_MARKER]].get(v[ID_FIELD]);
    }
    if (TYPE_MARKER in v) {
      if (
        v[TYPE_MARKER] === MAP_TAG &&
        "entries" in v &&
        Array.isArray(v.entries)
      ) {
        return new Map(
          v.entries.map(
            ([key, entryValue]: [any, any]) =>
              [decode(key), decode(entryValue)] as const,
          ),
        );
      }
      if (
        v[TYPE_MARKER] === SET_TAG &&
        "values" in v &&
        Array.isArray(v.values)
      ) {
        return new Set(v.values.map(decode));
      }
    }
    const result: any = {};
    for (const key in v) {
      result[key] = decode((v as Record<string, unknown>)[key]);
    }
    return result;
  };

  const result: GameStateLogEntry[] = [];
  for (const entry of log) {
    const restoredState: Draft<GameState> = decode(entry.s);
    // StateSymbol is transient and never serialized, so re-tag every restored
    // node with the role the engine expects.
    for (const player of restoredState.players) {
      player[StateSymbol] = "player";
      for (const ch of player.characters) {
        ch[StateSymbol] = "character";
        for (const e of ch.entities) {
          e[StateSymbol] = "entity";
        }
      }
      for (const e of [
        ...player.combatStatuses,
        ...player.supports,
        ...player.summons,
        ...player.hands,
        ...player.pile,
      ]) {
        e[StateSymbol] = "entity";
        for (const att of e.attachments) {
          att[StateSymbol] = "attachment";
        }
      }
    }
    for (const ext of restoredState.extensions) {
      ext[StateSymbol] = "extension";
    }
    result.push({
      state: {
        ...restoredState,
        data,
      },
      canResume: entry.r,
    });
  }
  return result;
}

export enum DetailLogType {
  Phase = "phase",
  Skill = "skill",
  Event = "event",
  Primitive = "primitive",
  Mutation = "mutation",
  Other = "other",
}

export interface DetailLogEntry {
  type: DetailLogType;
  env: SkillEnvironment;
  value: string;
  children?: DetailLogEntry[];
}

export interface IDetailLogger {
  log(type: DetailLogType, value: string): void;
  /**
   * Enter a nested log level until the returned `Disposable` is disposed.
   * @returns A `Disposable` that returns to the previous level when disposed.
   */
  subLog(type: DetailLogType, value: string): Disposable;
}

export class DetailLogger implements IDetailLogger {
  public environment: SkillEnvironment = "normal";
  private logs: DetailLogEntry[] = [];
  _currentLogs: DetailLogEntry[] = this.logs;
  _parentLogs: DetailLogEntry[][] = [];

  public log(type: DetailLogType, value: string): void {
    this._currentLogs.push({ type, env: this.environment, value });
  }

  public subLog(type: DetailLogType, value: string): DetailSubLogger {
    const entry = { type, env: this.environment, value, children: [] };
    this._currentLogs.push(entry);
    this._parentLogs.push(this._currentLogs);
    this._currentLogs = entry.children;
    return new DetailSubLogger(this);
  }

  public getLogs(): DetailLogEntry[] {
    return this.logs;
  }
  public clearLogs(): void {
    this.logs = [];
    this._currentLogs = this.logs;
    this._parentLogs = [];
  }
}

class DetailSubLogger implements IDetailLogger, Disposable {
  constructor(private readonly parent: DetailLogger) {}

  public log(type: DetailLogType, value: string): void {
    this.parent.log(type, value);
  }
  public subLog(type: DetailLogType, value: string): DetailSubLogger {
    return this.parent.subLog(type, value);
  }

  [Symbol.dispose]() {
    this.parent._currentLogs = this.parent._parentLogs.pop()!;
  }
}
