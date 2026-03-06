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

import type { GameState } from "./base/state";
import type { QueryArgs } from "./query-legacy/semantic";

export abstract class GiTcgError extends Error {}

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
