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

import { version } from "../package.json" /*  with { type: "json" } */;
export { version as CORE_VERSION };
export {
  Game,
  type DeckConfig,
  type CreateInitialStateConfig,
  mergeGameConfigWithDefault,
} from "./game";
export { type Player, type PlayerConfig } from "./player";
export {
  type GameStateLogEntry,
  DetailLogType,
  type DetailLogEntry,
  serializeGameStateLog,
  deserializeGameStateLog,
} from "./log";
export type * from "./base/state";
export { StateSymbol, getVersionBehavior } from "./base/state";
export { type Mutation } from "./base/mutation";
export { type CommonSkillType } from "./base/skill";
export {
  type Version,
  type VersionInfo,
  VERSIONS,
  CURRENT_VERSION,
  resolveOfficialVersion,
  resolveManuallySelectedOfficialVersion,
} from "./base/version";
export { runLegacyQuery } from "./query-legacy";
export * from "./query";
export {
  type PlayerIO,
  type CancellablePlayerIO,
  exposeState,
  exposeCharacter,
  exposeEntity,
  exposeAttachment,
  mergeIo,
} from "./io";
export * from "./error";
export { getEntityById, getEntityArea, playSkillOfCard } from "./utils";
export * from "@gi-tcg/typings";

import type {
  ExEntityType,
  HandleT,
  ExEntityState,
  ExTag,
} from "./builder/type";
export declare namespace BuilderTypes {
  export type { ExEntityType, HandleT, ExEntityState, ExTag };
}
