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
import type { TypingInfoBase } from "../../utils";
import type { RxEntityState } from ".";

class ReadonlyEntity<
  Meta extends ContextMetaBase,
  Info extends TypingInfoBase<EntityType>,
>
  extends ReactiveStateBase<Info>
  implements PlainEntityState
{
  override get [ReactiveStateSymbol](): Info["type"] {
    return this.definition.type;
  }
  declare [RawStateSymbol]: EntityState<Info["type"]>;
  override get [LatestStateSymbol](): EntityState<Info["type"]> {
    const state = getEntityById(
      this.skillContext.rawState,
      this.id,
    ) as EntityState<Info["type"]>;
    return state;
  }

  constructor(
    protected readonly skillContext: SkillContext<Meta>,
    public readonly id: number,
  ) {
    super();
  }

  protected get state(): EntityState<Info["type"]> {
    return this[LatestStateSymbol];
  }
  get definition(): EntityDefinition<Info["type"]> {
    return this.state.definition as EntityDefinition<Info["type"]>;
  }
  get variables(): EntityVariables {
    return this.state.variables;
  }
  get attachments(): AttachmentState[] {
    return this.state.attachments;
  }
  get area(): EntityArea & { type: Info["areaType"] } {
    return this.skillContext._getEntityArea(this.id) as EntityArea & {
      type: Info["areaType"];
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

  get master(): RxEntityState<Meta, TypingInfoBase<"character">> {
    const area = this.area as EntityArea;
    if (area.type !== "characters") {
      throw new GiTcgDataError("master expect a character area");
    }
    return this.skillContext.get<"character">(area.characterId);
  }
}

export class Entity<
  Meta extends ContextMetaBase,
  Info extends TypingInfoBase<EntityType>,
> extends ReadonlyEntity<Meta, Info> {
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
  Info extends TypingInfoBase<EntityType>,
> extends Omit<ReadonlyEntity<Meta, Info>, "master"> {}

export interface EntityWithoutMaster<
  Meta extends ContextMetaBase,
  Info extends TypingInfoBase<EntityType>,
> extends Omit<Entity<Meta, Info>, "master"> {}

export type TypedEntity<
  Meta extends ContextMetaBase,
  Info extends TypingInfoBase<EntityType>,
> = Info["areaType"] extends "characters"
  ? Meta["readonly"] extends true
    ? ReadonlyEntity<Meta, Info>
    : Entity<Meta, Info>
  : Meta["readonly"] extends true
    ? ReadonlyEntityWithoutMaster<Meta, Info>
    : EntityWithoutMaster<Meta, Info>;
