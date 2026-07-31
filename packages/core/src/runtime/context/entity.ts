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

import type { EntityState, EntityVariables } from "../../base/state";
import { GiTcgDataError } from "../../error";
import { type EntityArea, type EntityDefinition } from "../../base/entity";
import { diceCostSizeOfCard, getEntityById } from "./utils";
import type { ContextMetaBase, SkillContext } from "./skill";
import {
  LatestStateSymbol,
  RawStateSymbol,
  ReactiveStateBase,
  ReactiveStateSymbol,
} from "./reactive_base";
import type { AttachmentHandle } from "../../data/type";

class ReadonlyEntity<Meta extends ContextMetaBase> extends ReactiveStateBase {
  override get [ReactiveStateSymbol](): "entity" {
    return "entity";
  }
  declare [RawStateSymbol]: EntityState;
  override get [LatestStateSymbol](): EntityState {
    const state = getEntityById(
      this.skillContext.rawState,
      this.id,
    ) as EntityState;
    return state;
  }

  constructor(
    protected readonly skillContext: SkillContext<Meta>,
    public readonly id: number,
  ) {
    super();
  }

  protected get state(): EntityState {
    return this[LatestStateSymbol];
  }
  get definition(): EntityDefinition {
    return this.state.definition;
  }
  get area(): EntityArea {
    return this.skillContext._getEntityArea(this.id);
  }
  get who() {
    return this.area.who;
  }
  isMine() {
    return this.area.who === this.skillContext.self.who;
  }
  getVariable<Name extends string>(
    name: Name,
  ): NonNullable<EntityVariables[Name]> {
    return this.state.variables[name];
  }

  /** 当前元素骰费用 */
  diceCost() {
    return diceCostSizeOfCard(this.skillContext.rawState, this.latest());
  }

  withAttachment(id: AttachmentHandle) {
    return this.state.attachments.some(att => att.definition.id === id);
  }
  empowered() {
    // Empowerment: 206
    return this.withAttachment(206 as AttachmentHandle);
  }


  get master() {
    if (this.area.type !== "characters") {
      throw new GiTcgDataError("master expect a character area");
    }
    return this.skillContext.get<"character">(this.area.characterId);
  }
}

export class Entity<Meta extends ContextMetaBase> extends ReadonlyEntity<Meta> {
  setVariable(prop: string, value: number) {
    this.skillContext.setVariable(prop, value, this.state);
  }
  addVariable(prop: string, value: number) {
    this.skillContext.addVariable(prop, value, this.state);
  }
  addVariableWithMax(prop: string, value: number, maxLimit: number) {
    this.skillContext.addVariableWithMax(prop, value, maxLimit, this.state);
  }
  consumeUsage(count = 1) {
    this.skillContext.consumeUsage(count, this.state);
  }
  resetUsagePerRound() {
    this.skillContext.mutate({
      type: "resetVariables",
      scope: "usagePerRound",
      state: this.state,
    });
  }
  dispose() {
    this.skillContext.dispose(this.state);
  }
}

export type TypedEntity<Meta extends ContextMetaBase> =
  Meta["readonly"] extends true ? ReadonlyEntity<Meta> : Entity<Meta>;
