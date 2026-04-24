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
  CharacterState,
  CharacterVariables,
  EntityState,
  GameState,
  StateKind,
} from "../../base/state";
import { GiTcgCoreInternalError, GiTcgDataError } from "../../error";
import type {
  CharacterDefinition,
  NationTag,
  WeaponTag,
} from "../../base/character";
import type { EntityArea, EntityTag } from "../../base/entity";
import {
  getEntityArea,
  getEntityById,
  elementOfCharacter,
  getActiveCharacterIndex,
  nationOfCharacter,
  weaponOfCharacter,
  type PlainEntityState,
} from "./utils";
import { isSkillDisabled, type CreateEntityOptions } from "../../utils";
import type { ContextMetaBase, HealOption, SkillContext } from "./skill";
import { Aura, DamageType, DiceType } from "@gi-tcg/typings";
import type {
  AppliableDamageType,
  EquipmentHandle,
  StatusHandle,
} from "../type";
import {
  LatestStateSymbol,
  RawStateSymbol,
  ReactiveStateBase,
  ReactiveStateSymbol,
} from "./reactive_base";
import {
  applyReactive,
  type ApplyReactive,
  type RxEntityState,
} from "./reactive";
import type { GuessedTypeOfQuery } from "../../query-legacy/types";

export type CharacterPosition = "active" | "next" | "prev" | "standby";

/**
 * 提供一些针对角色的便利方法，不需要 SkillContext 参与。
 * 仅当保证 GameState 不发生变化时使用。
 */
export class CharacterBase extends ReactiveStateBase {
  override get [ReactiveStateSymbol](): "character" {
    return "character";
  }
  override get [LatestStateSymbol](): CharacterState {
    return (this._state ??= getEntityById(
      this._gameState,
      this._id,
    ) as CharacterState);
  }
  declare [RawStateSymbol]: CharacterState;

  private _area: EntityArea | undefined;
  private _state: CharacterState | undefined;
  constructor(
    private _gameState: GameState,
    protected readonly _id: number,
  ) {
    super();
  }
  protected get gameState() {
    return this._gameState;
  }
  get area() {
    return (this._area ??= getEntityArea(this._gameState, this._id));
  }
  protected get state() {
    return this[LatestStateSymbol];
  }

  get who() {
    return this.area.who;
  }
  get id() {
    return this._id;
  }
  positionIndex() {
    const player = this.gameState.players[this.who];
    const thisIdx = player.characters.findIndex((ch) => ch.id === this._id);
    if (thisIdx === -1) {
      throw new GiTcgCoreInternalError("Invalid character index");
    }
    return thisIdx;
  }
  satisfyPosition(pos: CharacterPosition) {
    const player = this.gameState.players[this.who];
    const activeIdx = getActiveCharacterIndex(player);
    const length = player.characters.length;
    const isActive = player.activeCharacterId === this.id;
    let dx;
    switch (pos) {
      case "active":
        return isActive;
      case "standby":
        return !isActive;
      case "next":
        if (isActive) {
          return false;
        }
        dx = 1;
        break;
      case "prev":
        if (isActive) {
          return false;
        }
        dx = -1;
        break;
      default: {
        const _: never = pos;
        throw new GiTcgDataError(`Invalid position ${pos}`);
      }
    }
    // find correct next and prev index
    let currentIdx = activeIdx;
    do {
      currentIdx = (currentIdx + dx + length) % length;
    } while (!player.characters[currentIdx].variables.alive);
    return player.characters[currentIdx].id === this._id;
  }
  get definition(): CharacterDefinition {
    return this.state.definition;
  }
  get health(): number {
    return this.getVariable("health");
  }
  get energy(): number {
    return this.getVariable("energy");
  }
  get aura(): Aura {
    return this.getVariable("aura");
  }
  get maxHealth(): number {
    return this.getVariable("maxHealth");
  }
  get maxEnergy(): number {
    return this.getVariable("maxEnergy");
  }
  isActive() {
    return this.satisfyPosition("active");
  }
  fullEnergy() {
    return this.getVariable("energy") === this.getVariable("maxEnergy");
  }
  element(): DiceType {
    return elementOfCharacter(this.definition);
  }
  weaponTag(): WeaponTag {
    return weaponOfCharacter(this.definition);
  }
  nationTags(): NationTag[] {
    return nationOfCharacter(this.definition);
  }
  getVariable<Name extends string>(name: Name): CharacterVariables[Name] {
    return this.state.variables[name];
  }
}

export class ReadonlyCharacter<
  Meta extends ContextMetaBase,
> extends CharacterBase {
  constructor(
    protected readonly skillContext: SkillContext<Meta>,
    id: number,
  ) {
    super(skillContext.rawState, id);
  }
  protected override get gameState(): GameState {
    return this.skillContext.rawState;
  }

  override get [LatestStateSymbol](): CharacterState {
    const state = getEntityById(
      this.skillContext.rawState,
      this._id,
    ) as CharacterState;
    return state;
  }

  get entities(): ApplyReactive<Meta, EntityState[]> {
    return applyReactive(this.skillContext, this.state.entities);
  }

  $$<const Q extends string>(
    arg: Q,
  ): RxEntityState<Meta, GuessedTypeOfQuery<Q>>[] {
    return this.skillContext.$$(`(${arg}) at (with id ${this._id})`);
  }

  isMine() {
    return this.area.who === this.skillContext.callerArea.who;
  }
  private hasEquipmentWithTag(tag: EntityTag) {
    return (
      this.entities.find(
        (v) =>
          v.definition.type === "equipment" && v.definition.tags.includes(tag),
      ) ?? null
    );
  }
  hasArtifact() {
    return this.hasEquipmentWithTag("artifact");
  }
  hasWeapon() {
    return this.hasEquipmentWithTag("weapon");
  }
  hasTechnique() {
    return this.hasEquipmentWithTag("technique");
  }
  hasEquipment(id: EquipmentHandle) {
    return (
      this.entities.find(
        (v) => v.definition.type === "equipment" && v.definition.id === id,
      ) ?? null
    );
  }
  hasStatus(id: StatusHandle) {
    return (
      this.entities.find(
        (v) => v.definition.type === "status" && v.definition.id === id,
      ) ?? null
    );
  }
  hasNightsoulsBlessing() {
    return (
      this.entities.find((v) =>
        v.definition.tags.includes("nightsoulsBlessing"),
      ) ?? null
    );
  }
  isSkillDisabled(): boolean {
    return isSkillDisabled(this.state);
  }
}

export class Character<
  Meta extends ContextMetaBase,
> extends ReadonlyCharacter<Meta> {
  gainEnergy(value = 1) {
    this.skillContext.gainEnergy(value, this.state);
  }
  heal(value: number, opt?: HealOption) {
    this.skillContext.heal(value, this.state, opt);
  }
  damage(type: DamageType, value: number) {
    this.skillContext.damage(type, value, this.state);
  }
  apply(type: AppliableDamageType) {
    this.skillContext.apply(type, this.state);
  }
  addStatus(status: StatusHandle, opt?: CreateEntityOptions) {
    this.skillContext.createEntity("status", status, this.area, opt);
  }
  equip(
    equipment: EquipmentHandle | PlainEntityState,
    opt?: CreateEntityOptions,
  ) {
    this.skillContext.equip(equipment, this.state, opt);
  }
  private unequip(state: EntityState) {
    this.skillContext.unequip(state);
  }
  unequipArtifact() {
    const artifact = this.state.entities.find((et) =>
      et.definition.tags.includes("artifact"),
    );
    if (!artifact) {
      return;
    }
    this.unequip(artifact);
  }
  unequipWeapon() {
    const weapon = this.state.entities.find((et) =>
      et.definition.tags.includes("weapon"),
    );
    if (!weapon) {
      return;
    }
    this.unequip(weapon);
  }
  loseEnergy(count = 1): number {
    const originalValue = this.state.variables.energy;
    const finalValue = Math.max(0, originalValue - count);
    this.skillContext.setVariable("energy", finalValue, this.state);
    return originalValue - finalValue;
  }
  setVariable(prop: string, value: number) {
    this.skillContext.setVariable(prop, value, this.state);
  }
  addVariable(prop: string, value: number) {
    this.skillContext.addVariable(prop, value, this.state);
  }
  addVariableWithMax(prop: string, value: number, maxLimit: number) {
    this.skillContext.addVariableWithMax(prop, value, maxLimit, this.state);
  }
  dispose(): never {
    throw new GiTcgDataError(`Cannot dispose character (or passive skill)`);
  }
}

export type TypedCharacter<Meta extends ContextMetaBase> =
  Meta["readonly"] extends true ? ReadonlyCharacter<Meta> : Character<Meta>;
