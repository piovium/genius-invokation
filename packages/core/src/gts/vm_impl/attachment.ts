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

import type {
  AttachmentDefinition,
  AttachmentModification,
} from "../../base/attachment";
import type { GameState } from "../../base/state";
import {
  EntityModel,
  EntityViewModel,
  type DefaultEntityVMMeta,
} from "./entity";

class AttachmentModel extends EntityModel {
  modifications: (
    | AttachmentModification
    | ((state: GameState, id: number) => AttachmentModification)
  )[] = [];
  getEntry(): AttachmentDefinition {
    // TODO
    throw new Error("Method not implemented.");
  }
}

export const AttachmentViewModel = EntityViewModel
  //
  .extend(AttachmentModel, (h) => ({
    // TODO
  }))
  .bind<DefaultEntityVMMeta<"attachment">>("attachment");
