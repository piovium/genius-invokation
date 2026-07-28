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

import type { EntityArea } from "../base/entity";
import type { EntityState, GameState } from "../base/state";
import type { ExtensionHandle } from "../data/type";

/** A GTS definition's lazy description replacement. */
export type EntityDescriptionDictionaryGetter<
  AssociatedExt extends ExtensionHandle,
> = (
  state: GameState,
  self: EntityState & { readonly area: EntityArea },
  extensionState: AssociatedExt["type"],
) => string | number;
