// Copyright (C) 2025 Guyutongxue
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

import { StateSymbol, type StateKind } from "../../base/state";
import { Character, type TypedCharacter } from "./character";
import { Entity, type TypedEntity } from "./entity";
import type { ContextMetaBase, SkillContext } from "./skill";
import {
  LatestStateSymbol,
  RawStateSymbol,
  ReactiveStateBase,
  ReactiveStateSymbol,
} from "./reactive_base";
import type { ExEntityState, ExEntityType } from "../type";
import { Attachment, type TypedAttachment } from "./attachment";

type ReactiveClassMap<Meta extends ContextMetaBase> = {
  character: TypedCharacter<Meta>;
  entity: TypedEntity<Meta>;
  attachment: TypedAttachment<Meta>;
};
type ReactiveClassCtor = new (
  skillContext: SkillContext<any>,
  id: number,
) => ReactiveStateBase;

export const NoReactiveSymbol = Symbol("GiTcgCoreStateNoReactive");
export type NoReactiveSymbol = typeof NoReactiveSymbol;

type ReactiveState<Meta extends ContextMetaBase, State> = State extends {
  readonly [StateSymbol]: infer S extends keyof ReactiveClassMap<Meta>;
}
  ? Omit<State, StateSymbol> & ReactiveClassMap<Meta>[S]
  : never;

export type RxEntityState<
  Meta extends ContextMetaBase,
  T extends ExEntityType,
> = ReactiveState<Meta, ExEntityState<T>>;

type Primitive = string | number | boolean | bigint | symbol | null | undefined;
type AtomicObject =
  | Primitive
  | Date
  | RegExp
  | Function
  | Promise<any>
  | { readonly [NoReactiveSymbol]: true };

type ReadonlyPair<T, U> = readonly [T, U];

export type ApplyReactive<
  Meta extends ContextMetaBase,
  A,
> = A extends AtomicObject
  ? A
  : A extends {
        readonly [StateSymbol]: keyof ReactiveClassMap<Meta>;
      }
    ? ReactiveState<Meta, A>
    : A extends ReadonlyMap<infer K, infer V>
      ? A // ReadonlyMap<K, ApplyReactive<Meta, V>>
      : A extends ReadonlySet<infer V>
        ? A // ReadonlySet<ApplyReactive<Meta, V>>
        : A extends ReadonlyPair<infer E1, infer E2>
          ? ReadonlyPair<ApplyReactive<Meta, E1>, ApplyReactive<Meta, E2>>
          : A extends readonly (infer E)[]
            ? readonly ApplyReactive<Meta, E>[]
            : A extends object
              ? A extends {
                  readonly [K in keyof A]: ApplyReactive<Meta, A[K]>;
                }
                ? A
                : {
                    [K in keyof A]: ApplyReactive<Meta, A[K]>;
                  }
              : A;

export function getRaw<T>(state: T, getLatest = false): T {
  if (state === null || typeof state !== "object") {
    return state;
  }
  if (RawStateSymbol in state) {
    if (getLatest && LatestStateSymbol in state) {
      return state[LatestStateSymbol] as T;
    }
    return state[RawStateSymbol] as T;
  }
  return state;
}

export function applyReactive<Meta extends ContextMetaBase, T>(
  skillContext: SkillContext<Meta>,
  value: T,
): ApplyReactive<Meta, T> {
  if (value === null) {
    return null as ApplyReactive<Meta, T>;
  }
  if (typeof value !== "object") {
    return value as ApplyReactive<Meta, T>;
  }
  if (ReactiveStateSymbol in value) {
    return value as ApplyReactive<Meta, T>;
  }
  if (
    value instanceof Date ||
    value instanceof RegExp ||
    value instanceof Promise
  ) {
    return value as ApplyReactive<Meta, T>;
  }
  if (value instanceof Map || value instanceof Set) {
    return value as ApplyReactive<Meta, T>;
  }
  if (NoReactiveSymbol in value && value[NoReactiveSymbol]) {
    return value as ApplyReactive<Meta, T>;
  }
  const reactiveProxies = skillContext._reactiveProxies;
  if (reactiveProxies.has(value)) {
    return reactiveProxies.get(value)!.proxy as ApplyReactive<Meta, T>;
  }
  const REACTIVE_CLASS_MAP: Partial<Record<StateKind, ReactiveClassCtor>> = {
    character: Character,
    entity: Entity,
    attachment: Attachment,
  };
  if (
    StateSymbol in value &&
    typeof value[StateSymbol] === "string" &&
    value[StateSymbol] in REACTIVE_CLASS_MAP &&
    "id" in value &&
    typeof value.id === "number"
  ) {
    const Ctor = REACTIVE_CLASS_MAP[value[StateSymbol] as StateKind]!;
    const instance = new Ctor(skillContext, value.id);
    const proxyAndRevoke = Proxy.revocable(instance, {
      get(target, prop, receiver) {
        if (prop === RawStateSymbol) {
          return value;
        }
        if (prop in target) {
          return Reflect.get(target, prop, target);
        } else {
          return Reflect.get(target[LatestStateSymbol], prop, receiver);
        }
      },
      has(target, prop) {
        if (prop === RawStateSymbol) {
          return true;
        }
        return Reflect.has(target, prop) || Reflect.has(Ctor.prototype, prop);
      },
    });
    reactiveProxies.set(value, proxyAndRevoke);
    return proxyAndRevoke.proxy as ApplyReactive<Meta, T>;
  }
  // Proxy 不变式要求 value 的只读属性不可以被 trap，故浅拷贝取消之
  let clone: T & {} = value;
  if (Array.isArray(value)) {
    clone = [...value] as T & {};
  } else if (Object.getPrototypeOf(value) === Object.prototype) {
    clone = { ...value } as T & {};
  }
  const proxyAndRevoke = Proxy.revocable(clone, {
    get(target, prop, receiver) {
      if (prop === RawStateSymbol) {
        return value;
      }
      if (typeof prop === "string" && prop.startsWith("_")) {
        return Reflect.get(target, prop, receiver);
      }
      return applyReactive(skillContext, Reflect.get(target, prop, receiver));
    },
    has(target, prop) {
      if (prop === RawStateSymbol) {
        return true;
      }
      return Reflect.has(target, prop);
    },
  });
  reactiveProxies.set(value, proxyAndRevoke);
  return proxyAndRevoke.proxy as ApplyReactive<Meta, T>;
}
