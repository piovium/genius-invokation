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
import type { GameData } from "./builder";
import { CORE_VERSION, StateSymbol } from "./index";

export interface GameStateLogEntry {
  readonly state: GameState;
  readonly canResume: boolean;
}

interface StoreEntry {
  key: any;
  value: any;
}

function serializeImpl(store: StoreEntry[], v: unknown): any {
  if (
    typeof v === "number" ||
    typeof v === "string" ||
    typeof v === "boolean" ||
    v === null
  ) {
    return v;
  }
  const index = store.findIndex((entry) => entry.key === v);
  if (index !== -1) {
    return { $: index };
  }
  if (Array.isArray(v)) {
    const result = v.map((obj) => serializeImpl(store, obj));
    if (result.length >= 2) {
      store.push({ key: v, value: result });
      return { $: store.length - 1 };
    } else {
      return result;
    }
  }
  if (v instanceof Map) {
    return {
      __type: "map",
      entries: Array.from(v.entries()).map(([key, value]) => [
        serializeImpl(store, key),
        serializeImpl(store, value),
      ]),
    };
  }
  if (v instanceof Set) {
    return {
      __type: "set",
      values: Array.from(v).map((value) => serializeImpl(store, value)),
    };
  }
  if (typeof v === "object") {
    const proto = Object.getPrototypeOf(v);
    if (proto !== Object.prototype && proto !== null) {
      return null; // Non-plain objects are not serialized
    }
    if ("__definition" in v && "id" in v) {
      const result: any = {
        $$: v.__definition,
        id: v.id,
      };
      store.push({ key: v, value: result });
      return { $: store.length - 1 };
    }
    const result: any = {};
    for (const key in v) {
      result[key] = serializeImpl(store, (v as Record<any, any>)[key]);
    }
    store.push({ key: v, value: result });
    return { $: store.length - 1 };
  } else {
    return v;
  }
}

type MakePropPartial<T, K extends PropertyKey> = Omit<T, K> & {
  [K2 in K]?: unknown;
};

interface SerializedLogEntry {
  s: unknown;
  e: readonly []; // reserved
  r: boolean;
}

export interface SerializedLog {
  v: string; // 模拟核心库版本
  store: any[];
  log: SerializedLogEntry[];
}

export function serializeGameStateLog(
  log: readonly GameStateLogEntry[],
): SerializedLog {
  const logResult: SerializedLogEntry[] = [];
  const store: StoreEntry[] = [];
  for (const entry of log) {
    const omittedState: MakePropPartial<GameState, "data"> = {
      ...entry.state,
    };
    delete omittedState.data;
    const stateResult = serializeImpl(store, omittedState);
    logResult.push({
      s: stateResult,
      e: [],
      r: entry.canResume,
    });
  }
  return {
    v: CORE_VERSION,
    store: store.map(({ value }) => value),
    log: logResult,
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
  return ["characters", "entities", "extensions", "attachments"].includes(
    defKey as string,
  );
}

function deserializeImpl(
  data: GameData,
  store: readonly any[],
  restoredStore: Record<number, any>,
  v: unknown,
): any {
  if (Array.isArray(v)) {
    return v.map((x) => deserializeImpl(data, store, restoredStore, x));
  } else if (typeof v === "object" && v !== null) {
    if ("$" in v && typeof v.$ === "number") {
      if (!(v.$ in restoredStore)) {
        const refTarget = store[v.$];
        const restoredTarget = deserializeImpl(
          data,
          store,
          restoredStore,
          refTarget,
        );
        restoredStore[v.$] = restoredTarget;
      }
      return restoredStore[v.$];
    }
    if (
      "$$" in v &&
      "id" in v &&
      typeof v.id === "number" &&
      isValidDefKey(v.$$)
    ) {
      return data[v.$$].get(v.id);
    }
    if ("__type" in v) {
      if (v.__type === "map" && "entries" in v && Array.isArray(v.entries)) {
        return new Map(
          v.entries.map(
            ([key, value]: [any, any]) =>
              [
                deserializeImpl(data, store, restoredStore, key),
                deserializeImpl(data, store, restoredStore, value),
              ] as const,
          ),
        );
      }
      if (v.__type === "set" && "values" in v && Array.isArray(v.values)) {
        return new Set(
          v.values.map((value: any) =>
            deserializeImpl(data, store, restoredStore, value),
          ),
        );
      }
    }
    const result: any = {};
    for (const key in v) {
      result[key] = deserializeImpl(
        data,
        store,
        restoredStore,
        (v as Record<any, any>)[key],
      );
    }
    return result;
  } else {
    return v;
  }
}

export function deserializeGameStateLog(
  data: GameData,
  { store, log }: SerializedLog,
): GameStateLogEntry[] {
  const restoredStore: Record<number, any> = {};
  const result: GameStateLogEntry[] = [];
  for (const entry of log) {
    const restoredState: Draft<GameState> = deserializeImpl(
      data,
      store,
      restoredStore,
      entry.s,
    );
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
  value: string;
  children?: DetailLogEntry[];
}

export interface IDetailLogger {
  log(type: DetailLogType, value: string): void;
  /**
   * Enter next level of log until the return value is disposed
   * @returns A `Disposable` object that will return to the previous level of log when disposed
   */
  subLog(type: DetailLogType, value: string): Disposable;
}

export class DetailLogger implements IDetailLogger {
  private logs: DetailLogEntry[] = [];
  _currentLogs: DetailLogEntry[] = this.logs;
  _parentLogs: DetailLogEntry[][] = [];

  public log(type: DetailLogType, value: string): void {
    this._currentLogs.push({ type, value });
  }

  public subLog(type: DetailLogType, value: string): DetailSubLogger {
    const entry = { type, value, children: [] };
    this._currentLogs.push(entry);
    this._parentLogs.push(this._currentLogs);
    this._currentLogs = entry.children;
    const subLogger = new DetailSubLogger(this);
    return subLogger;
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
