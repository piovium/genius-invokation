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

import type { DetailLogger, IDetailLogger } from "./log";

export interface AsyncContext<T> {
  run: <R>(value: T, fn: () => Promise<R>) => Promise<R>;
  get: () => T | undefined;
}

export interface GiTcgAsyncContextValue {
  previewLogger?: DetailLogger;
  gameLogger: DetailLogger;
}

export type GiTcgAsyncContext = AsyncContext<GiTcgAsyncContextValue>;

let activeContext: GiTcgAsyncContext = createNoopAsyncContext();

export const runWithAsyncContext = <R>(
  value: GiTcgAsyncContextValue,
  fn: () => Promise<R>,
): Promise<R> => {
  return activeContext.run(value, fn);
};

export const getAsyncContextValue = (): GiTcgAsyncContextValue | undefined => {
  return activeContext.get();
};

function createNoopAsyncContext(): GiTcgAsyncContext {
  return {
    run<R>(value: GiTcgAsyncContextValue, fn: () => Promise<R>): Promise<R> {
      return fn();
    },
    get() {
      return;
    },
  };
}

async function createNodeAsyncContext(): Promise<GiTcgAsyncContext> {
  // @ts-expect-error No typings for node since we are env-agnostic
  const { AsyncLocalStorage } = await import("node:async_hooks");
  const asyncLocalStorage = new AsyncLocalStorage();
  return {
    run<R>(value: GiTcgAsyncContextValue, fn: () => Promise<R>): Promise<R> {
      return asyncLocalStorage.run(value, fn);
    },
    get() {
      return asyncLocalStorage.getStore();
    },
  };
}

async function createBrowserAsyncContext(): Promise<GiTcgAsyncContext> {
  const { callWithContext, tryGetContext } = (await import(
    // @ts-expect-error No typings from esm.sh
    "https://esm.sh/@beaker73/async-context"
  )) as typeof import("@beaker73/async-context");
  return {
    run<R>(value: GiTcgAsyncContextValue, fn: () => Promise<R>): Promise<R> {
      return callWithContext(fn, value);
    },
    get() {
      return tryGetContext<GiTcgAsyncContextValue>();
    },
  };
}

async function enableAsyncContext(): Promise<void> {
  // @ts-expect-error No `window`'s typings
  if (typeof window !== "undefined") {
    activeContext = await createBrowserAsyncContext();
    // @ts-expect-error No `process`'s typings
  } else if (typeof process !== "undefined") {
    activeContext = await createNodeAsyncContext();
  }
}

function disableAsyncContext(): void {
  activeContext = createNoopAsyncContext();
}

export async function setAsyncContext(value?: boolean | GiTcgAsyncContext) {
  if (!value) {
    disableAsyncContext();
  } else if (value === true) {
    await enableAsyncContext().catch((e) => {
      console?.warn?.(
        "Failed to enable async context, falling back to noop context",
        e,
      );
      disableAsyncContext();
    });
  } else {
    activeContext = value;
  }
}
