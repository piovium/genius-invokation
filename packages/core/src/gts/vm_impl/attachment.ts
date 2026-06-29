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

import { getEntityById } from "../../utils";
import type {
  AttachmentModification,
  AttachmentTag,
  ModificationGetter,
} from "../../base/attachment";
import type { AttachmentState, GameState } from "../../base/state";
import {
  EntityModel,
  EntityViewModel,
  type DefaultEntityVMMeta,
} from "./entity";
import type { DiceType } from "@gi-tcg/typings";

export type CostCountFn = (state: GameState, self: AttachmentState) => number;

class AttachmentModel extends EntityModel {
  modifications: (
    | AttachmentModification
    | ((state: GameState, id: number) => AttachmentModification)
  )[] = [];

  protected override getAttachmentModifications(): ModificationGetter {
    const modifications = this.modifications;
    return function (state, id) {
      return modifications.map((mod) =>
        typeof mod === "function" ? mod(state, id) : mod,
      );
    };
  }
}

export const AttachmentViewModel = EntityViewModel
  //
  .extend(AttachmentModel, (h) => ({
    tags: h.simpleAttribute()(function (...tags: AttachmentTag[]) {
      this.tags.push(...tags);
    }),

    addCost: h.simpleAttribute({
      uniqueKey: "cost",
    })(function (value: number | CostCountFn) {
      this.modifications.push(
        typeof value === "number"
          ? {
              type: "increaseCardCost",
              value,
            }
          : (st, id) => {
              const self = getEntityById(st, id) as AttachmentState;
              return {
                type: "increaseCardCost",
                value: value(st, self),
              };
            },
      );
    }),
    deductCost: h.simpleAttribute({
      uniqueKey: "cost",
    })(function (value: number | CostCountFn) {
      this.modifications.push(
        typeof value === "number"
          ? {
              type: "decreaseCardCost",
              value,
            }
          : (st, id) => {
              const self = getEntityById(st, id) as AttachmentState;
              return {
                type: "decreaseCardCost",
                value: value(st, self),
              };
            },
      );
    }),
    changeCostType: h.simpleAttribute({
      uniqueKey: "costType",
    })(function (toType: DiceType) {
      this.modifications.push({
        type: "changeCardCostType",
        toType,
      });
    }),
    changeTuningTarget: h.simpleAttribute({
      uniqueKey: "tuningTarget",
    })(function (tuningTarget: DiceType) {
      this.modifications.push({
        type: "changeCardTuningTarget",
        tuningTarget,
      });
    }),
    makeEffectless: h.simpleAttribute({
      uniqueKey: "effectless",
    })(function () {
      this.modifications.push({
        type: "makeEffectless",
      });
    }),
    disableTuning: h.simpleAttribute({
      uniqueKey: "disableTuning",
    })(function () {
      this.modifications.push({
        type: "disableCardTuning",
      });
    }),
  }))
  .bind<DefaultEntityVMMeta<"attachment">>("attachment");
