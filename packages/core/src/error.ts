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

import { getAsyncContextValue } from "./async_context";
import type { GameState } from "./base/state";
import type { DetailLogEntry } from "./log";
import type { QueryArgs } from "./query-legacy/semantic";

declare global {
  // V8 and JSC only
  interface ErrorConstructor {
    captureStackTrace?(targetObject: object, constructorOpt?: Function): void;
  }
}

function detailLogToString(logs: readonly DetailLogEntry[]) {
  const lines: string[] = [];
  let entries = logs;
  while (true) {
    if (entries.length === 0) {
      break;
    }
    const lastEntry = entries.at(-1)!;
    const envStr = lastEntry.env !== "normal" ? `[${lastEntry.env}]` : "";
    lines.push(`    when ${lastEntry.value} ${envStr}`);
    entries = lastEntry.children ?? [];
  }
  return lines.toReversed().join("\n");
}

export interface GiTcgErrorOptions extends ErrorOptions {
  omitLogs?: boolean;
}

export abstract class GiTcgError extends Error {
  constructor(message?: string, options?: GiTcgErrorOptions) {
    let errorMessage = message || "(no message)";
    const logs: DetailLogEntry[] = [];
    const ctx = options?.omitLogs ? void 0 : getAsyncContextValue();
    if (ctx?.gameLogger) {
      logs.push(...(ctx.gameLogger.getLogs?.() ?? []));
    }
    if (ctx?.previewLogger) {
      logs.push(...(ctx.previewLogger.getLogs?.() ?? []));
    }
    errorMessage += `\n${detailLogToString(logs)}`;
    super(errorMessage, options);

    if (typeof Error.captureStackTrace === "function") {
      Error.captureStackTrace(this, GiTcgError);
    } else if (
      options?.cause &&
      typeof options.cause === "object" &&
      "stack" in options.cause
    ) {
      this.stack += `\nCaused by: ${options.cause.stack}`;
    }
  }
}

export class GiTcgCoreInternalError extends GiTcgError {}

export class GiTcgCoreInternalEntityNotFoundError extends GiTcgCoreInternalError {
  constructor(
    public readonly state: GameState,
    public readonly id: number,
  ) {
    super(`Cannot found entity ${id}`);
  }
}

export class GiTcgDataError extends GiTcgError {}

export class GiTcgQueryError extends GiTcgDataError {
  constructor(
    public readonly source: string,
    public readonly args: QueryArgs,
    message?: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
  }
}

export class GiTcgIoError extends GiTcgError {
  constructor(
    public readonly who: 0 | 1,
    message?: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
  }
}

export class GiTcgPreviewAbortedError extends GiTcgCoreInternalError {
  constructor(message?: string) {
    super(`${message ?? "Preview aborted."} This error should be caught.`, {
      omitLogs: true,
    });
  }
}

export class GiTcgIoNotProvideError extends GiTcgPreviewAbortedError {
  constructor() {
    super("IO is not provided.");
  }
}
