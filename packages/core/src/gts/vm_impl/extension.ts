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

import { defineViewModel, type AR, type Meta } from "@gi-tcg/gts-runtime";
import type { TypeInfer, TypeValidate } from "@gi-tcg/utils";
import type { ExtensionDefinition } from "../../base/extension";
import type { GameState, TriggeredSkillDefinition } from "../../base/state";
import { EXTENSION_ID_OFFSET } from "../../builder/extension";
import type { ExtensionHandle } from "../../builder";
import type { Computed } from "../../query/utils";
import type {
  EventArgOf,
  EventNames,
  SkillDescription,
} from "../../base/skill";
import type { Draft } from "immer";
import { SkillContext } from "../../builder/internal_exports";
import { wrapSkillInfoWithExt } from "../../builder/skill";
import { DEFAULT_VERSION_INFO } from "../../base/version";
import { getSubId } from "./sub_id";

class ExtensionModel {
  skillIndex = 0;

  id!: number;
  description = "";
  schema: unknown;
  initialState: unknown;

  skillList: TriggeredSkillDefinition[] = [];

  getSubId(): number {
    return getSubId(this.id);
  }

  getEntry(): ExtensionDefinition {
    return {
      __definition: "extensions",
      type: "extension",
      id: this.id,
      description: this.description,
      version: DEFAULT_VERSION_INFO,
      schema: this.schema,
      initialState: this.initialState,
      skills: [...this.skillList],
    };
  }
}

type ExtensionVMMeta = {
  stateType: unknown;
};
const DEFAULT_EXTENSION_VM_META = {
  stateType: null as unknown,
} as const;

export const ExtensionViewModel = defineViewModel(
  ExtensionModel,
  (h) => ({
    idHint: h.attribute<{
      (idHint: number): AR.Done;
      as<Meta extends ExtensionVMMeta>(
        this: AR.This<Meta>,
      ): ExtensionHandle<Meta["stateType"]>;
      required(): true;
      uniqueKey(): "idHint";
    }>(
      (model, [id]) => {
        model.id = EXTENSION_ID_OFFSET + id;
      },
      (_, [id]) => {
        return (EXTENSION_ID_OFFSET + id) as ExtensionHandle;
      },
    ),
    schema: h.attribute<{
      <Meta extends ExtensionVMMeta, const Def, R = TypeInfer<Def>>(
        this: AR.This<Meta>,
        schema: TypeValidate<Def>,
      ): AR.DoneRewriteMeta<
        Computed<
          Meta & {
            stateType: R;
          }
        >
      >;
      required(): true;
      uniqueKey(): "schema";
    }>((model, schema: unknown) => {
      model.schema = schema;
    }),
    initialState: h.attribute<{
      <Meta extends ExtensionVMMeta>(
        this: AR.This<Meta>,
        initialState: Meta["stateType"],
      ): AR.Done;
      required(): true;
      uniqueKey(): "initialState";
    }>((model, [initialState]) => {
      model.initialState = initialState;
    }),

    description: h.simpleAttribute({
      uniqueKey: "description",
    })(function (description: string) {
      this.description = description;
    }),

    mutateWhen: h.attribute<{
      <Meta extends ExtensionVMMeta, E extends EventNames>(
        this: AR.This<Meta>,
        event: E,
        operation: (
          extensionState: Draft<Meta["stateType"]>,
          eventArg: EventArgOf<E>,
          currentGameState: GameState,
        ) => void,
      ): AR.Done;
    }>((model, [event, operation]) => {
      const extId = model.id;
      const action: SkillDescription<any> = (state, skillInfo, arg) => {
        const ctx = new SkillContext<any>(
          state,
          wrapSkillInfoWithExt(skillInfo, extId),
          arg,
        );
        ctx.setExtensionState((st) => operation(st, arg, state));
        return ctx._terminate();
      };
      const def: TriggeredSkillDefinition = {
        type: "skill",
        initiativeSkillConfig: null,
        id: model.getSubId(),
        ownerType: "extension",
        skillType: null,
        triggerOn: event,
        filter: () => true,
        action,
        usagePerRoundVariableName: null,
      };
      model.skillList.push(def);
    }),
  }),
  DEFAULT_EXTENSION_VM_META,
);
