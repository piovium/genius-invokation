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
  EntityType,
  EntityVariables,
} from "../../base/state";
import { GiTcgDataError } from "../../error";
import { type EntityArea, type EntityDefinition } from "../../base/entity";
import {
  diceCostSizeOfCard,
  getEntityById,
  type PlainEntityState,
} from "./utils";
import type { ContextMetaBase, SkillContext } from "../skill_context";
import {
  LatestStateSymbol,
  RawStateSymbol,
  ReactiveStateBase,
  ReactiveStateSymbol,
} from "./base";
import type { AttachmentHandle } from "../../data/type";
import type { ExtraInfo } from "./base";
import type { RxEntityState } from ".";

class ReadonlyEntity<
  Meta extends ContextMetaBase,
  Ty extends EntityType,
  Extra extends ExtraInfo<EntityType>,
>
  extends ReactiveStateBase<{
    readonly type: Ty;
    readonly areaType: Extra["areaType"];
    readonly variables: Extra["variables"];
  }>
  implements PlainEntityState
{
  override get [ReactiveStateSymbol](): Ty {
    return this.definition.type;
  }
  declare [RawStateSymbol]: EntityState<Ty>;
  override get [LatestStateSymbol](): EntityState<Ty> {
    const state = getEntityById(
      this.skillContext.rawState,
      this.id,
    ) as EntityState<Ty>;
    return state;
  }

  constructor(
    protected readonly skillContext: SkillContext<Meta>,
    public readonly id: number,
  ) {
    super();
  }

  protected get state(): EntityState<Ty> {
    return this[LatestStateSymbol];
  }
  get definition(): EntityDefinition<Ty> {
    return this.state.definition as EntityDefinition<Ty>;
  }
  get variables(): EntityVariables {
    return this.state.variables;
  }
  get attachments(): AttachmentState[] {
    return this.state.attachments;
  }
  get area(): EntityArea & { type: Extra["areaType"] } {
    return this.skillContext._getEntityArea(this.id) as EntityArea & {
      type: Extra["areaType"];
    };
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
    return this.state.attachments.some((att) => att.definition.id === id);
  }
  empowered() {
    // Empowerment: 206
    return this.withAttachment(206 as AttachmentHandle);
  }

  get master(): RxEntityState<Meta, "character"> {
    const area = this.area as EntityArea;
    if (area.type !== "characters") {
      throw new GiTcgDataError("master expect a character area");
    }
    return this.skillContext.get<"character">(area.characterId);
  }
}

export class Entity<
  Meta extends ContextMetaBase,
  Ty extends EntityType,
  Extra extends ExtraInfo<EntityType>,
> extends ReadonlyEntity<Meta, Ty, Extra> {
  setVariable(prop: string, value: number) {
    this.skillContext.setVariable(prop, value, this.state);
  }
  addVariable(prop: string, value: number) {
    this.skillContext.addVariable(prop, value, this.state);
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

export interface ReadonlyEntityWithoutMaster<
  Meta extends ContextMetaBase,
  Ty extends EntityType,
  Extra extends ExtraInfo<EntityType>,
> extends Omit<ReadonlyEntity<Meta, Ty, Extra>, "master"> {}

export interface EntityWithoutMaster<
  Meta extends ContextMetaBase,
  Ty extends EntityType,
  Extra extends ExtraInfo<EntityType>,
> extends Omit<Entity<Meta, Ty, Extra>, "master"> {}

export type TypedEntity<
  Meta extends ContextMetaBase,
  Ty extends EntityType,
  Extra extends ExtraInfo<EntityType>,
> = Extra["areaType"] extends "characters"
  ? Meta["readonly"] extends true
    ? ReadonlyEntity<Meta, Ty, Extra>
    : Entity<Meta, Ty, Extra>
  : Meta["readonly"] extends true
    ? ReadonlyEntityWithoutMaster<Meta, Ty, Extra>
    : EntityWithoutMaster<Meta, Ty, Extra>;
