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

import type {
  AttachmentState,
  EntityState,
  EntityVariables,
} from "../../base/state";
import { GiTcgDataError } from "../../error";
import { type EntityArea, type EntityDefinition } from "../../base/entity";
import { getEntityArea, getEntityById } from "./utils";
import type { ContextMetaBase, SkillContext } from "./skill";
import {
  LatestStateSymbol,
  RawStateSymbol,
  ReactiveStateBase,
  ReactiveStateSymbol,
} from "./reactive_base";
import type { AttachmentDefinition } from "../../base/attachment";
import type { RxEntityState } from "./reactive";

class ReadonlyAttachment<
  Meta extends ContextMetaBase,
> extends ReactiveStateBase {
  override get [ReactiveStateSymbol](): "attachment" {
    return "attachment";
  }
  declare [RawStateSymbol]: AttachmentState;
  override get [LatestStateSymbol](): AttachmentState {
    const state = getEntityById(
      this.skillContext.rawState,
      this.id,
    ) as AttachmentState;
    return state;
  }

  // protected _area: EntityArea | undefined;
  constructor(
    protected readonly skillContext: SkillContext<Meta>,
    public readonly id: number,
  ) {
    super();
  }

  protected get state(): AttachmentState {
    return this[LatestStateSymbol];
  }
  get definition(): AttachmentDefinition {
    return this.state.definition;
  }
  get area(): EntityArea {
    return getEntityArea(this.skillContext.rawState, this.id);
  }
  get who() {
    return this.area.who;
  }
  isMine() {
    return this.area.who === this.skillContext.callerArea.who;
  }
  getVariable<Name extends string>(
    name: Name,
  ): NonNullable<EntityVariables[Name]> {
    return this.state.variables[name];
  }

  get master(): RxEntityState<Meta, "eventCard" | "support" | "equipment"> {
    if (this.area.type !== "hands" && this.area.type !== "pile") {
      throw new GiTcgDataError("master expect a hands/pile area");
    }
    return this.skillContext.get<"eventCard" | "support" | "equipment">(
      this.area.cardId,
    );
  }
}

export class Attachment<
  Meta extends ContextMetaBase,
> extends ReadonlyAttachment<Meta> {
  setVariable(prop: string, value: number) {
    this.skillContext.setVariable(prop, value, this.state);
  }
  addVariable(prop: string, value: number) {
    this.skillContext.addVariable(prop, value, this.state);
  }
  addVariableWithMax(prop: string, value: number, maxLimit: number) {
    this.skillContext.addVariableWithMax(prop, value, maxLimit, this.state);
  }
  resetUsagePerRound() {
    this.skillContext.mutate({
      type: "resetVariables",
      scope: "usagePerRound",
      state: this.state,
    });
  }
  dispose(): never {
    throw new GiTcgDataError(
      "Attachment can not be disposed directly, for now",
    );
  }
}

export type TypedAttachment<Meta extends ContextMetaBase> =
  Meta["readonly"] extends true ? ReadonlyAttachment<Meta> : Attachment<Meta>;
