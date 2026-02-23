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

import { Reaction as R, Aura as A, DamageType as D } from "@gi-tcg/typings";
import type { DamageInfo } from "../base/skill";
import type { LunarReaction } from "@gi-tcg/typings";

export type NontrivialDamageType = Exclude<
  D,
  typeof D.Physical | typeof D.Piercing | typeof D.Heal
>;

export type ReactionMap = Record<
  A,
  Record<NontrivialDamageType, [A, R | null]>
>;

const REACTION_MAP: ReactionMap = {
  [A.None]: {
    [D.Cryo]: [A.Cryo, null],
    [D.Hydro]: [A.Hydro, null],
    [D.Pyro]: [A.Pyro, null],
    [D.Electro]: [A.Electro, null],
    [D.Anemo]: [A.None, null],
    [D.Geo]: [A.None, null],
    [D.Dendro]: [A.Dendro, null],
  },
  [A.Cryo]: {
    [D.Cryo]: [A.Cryo, null],
    [D.Hydro]: [A.None, R.Frozen],
    [D.Pyro]: [A.None, R.Melt],
    [D.Electro]: [A.None, R.Superconduct],
    [D.Anemo]: [A.None, R.SwirlCryo],
    [D.Geo]: [A.None, R.CrystallizeCryo],
    [D.Dendro]: [A.CryoDendro, null],
  },
  [A.Hydro]: {
    [D.Cryo]: [A.None, R.Frozen],
    [D.Hydro]: [A.Hydro, null],
    [D.Pyro]: [A.None, R.Vaporize],
    [D.Electro]: [A.None, R.ElectroCharged],
    [D.Anemo]: [A.None, R.SwirlHydro],
    [D.Geo]: [A.None, R.CrystallizeHydro],
    [D.Dendro]: [A.None, R.Bloom],
  },
  [A.Pyro]: {
    [D.Cryo]: [A.None, R.Melt],
    [D.Hydro]: [A.None, R.Vaporize],
    [D.Pyro]: [A.Pyro, null],
    [D.Electro]: [A.None, R.Overloaded],
    [D.Anemo]: [A.None, R.SwirlPyro],
    [D.Geo]: [A.None, R.CrystallizePyro],
    [D.Dendro]: [A.None, R.Burning],
  },
  [A.Electro]: {
    [D.Cryo]: [A.None, R.Superconduct],
    [D.Hydro]: [A.None, R.ElectroCharged],
    [D.Pyro]: [A.None, R.Overloaded],
    [D.Electro]: [A.Electro, null],
    [D.Anemo]: [A.None, R.SwirlElectro],
    [D.Geo]: [A.None, R.CrystallizeElectro],
    [D.Dendro]: [A.None, R.Quicken],
  },
  [A.Dendro]: {
    [D.Cryo]: [A.CryoDendro, null],
    [D.Hydro]: [A.None, R.Bloom],
    [D.Pyro]: [A.None, R.Burning],
    [D.Electro]: [A.None, R.Quicken],
    [D.Anemo]: [A.Dendro, null],
    [D.Geo]: [A.Dendro, null],
    [D.Dendro]: [A.Dendro, null],
  },
  [A.CryoDendro]: {
    [D.Cryo]: [A.CryoDendro, null],
    [D.Hydro]: [A.Dendro, R.Frozen],
    [D.Pyro]: [A.Dendro, R.Melt],
    [D.Electro]: [A.Dendro, R.Superconduct],
    [D.Anemo]: [A.Dendro, R.SwirlCryo],
    [D.Geo]: [A.Dendro, R.CrystallizeCryo],
    [D.Dendro]: [A.CryoDendro, null],
  },
};

export const REACTION_RELATIVES: Record<R, readonly [D, D]> = {
  [R.Melt]: [D.Pyro, D.Cryo],
  [R.Vaporize]: [D.Pyro, D.Hydro],
  [R.Overloaded]: [D.Pyro, D.Electro],
  [R.Superconduct]: [D.Cryo, D.Electro],
  [R.ElectroCharged]: [D.Hydro, D.Electro],
  [R.Frozen]: [D.Cryo, D.Hydro],
  [R.SwirlCryo]: [D.Cryo, D.Anemo],
  [R.SwirlHydro]: [D.Hydro, D.Anemo],
  [R.SwirlPyro]: [D.Pyro, D.Anemo],
  [R.SwirlElectro]: [D.Electro, D.Anemo],
  [R.CrystallizeCryo]: [D.Cryo, D.Geo],
  [R.CrystallizeHydro]: [D.Hydro, D.Geo],
  [R.CrystallizePyro]: [D.Pyro, D.Geo],
  [R.CrystallizeElectro]: [D.Electro, D.Geo],
  [R.Burning]: [D.Pyro, D.Dendro],
  [R.Bloom]: [D.Dendro, D.Hydro],
  [R.Quicken]: [D.Dendro, D.Electro],
  [R.LunarElectroCharged]: [D.Hydro, D.Electro],
  [R.LunarBloom]: [D.Dendro, D.Hydro],
  [R.LunarCrystallizeHydro]: [D.Hydro, D.Geo],
};

const LUNA_REMAPPING: Partial<Record<R, R>> = {
  [R.ElectroCharged]: R.LunarElectroCharged,
  [R.Bloom]: R.LunarBloom,
  [R.CrystallizeHydro]: R.LunarCrystallizeHydro,
};

interface ReactionQuery extends Pick<DamageInfo, "type" | "targetAura"> {
  enabledLunarReactions?: readonly LunarReaction[];
}

export function getReaction(info: Required<ReactionQuery>): {
  newAura: A;
  reaction: R | null;
} {
  if (info.type === D.Physical || info.type === D.Piercing) {
    return { newAura: info.targetAura, reaction: null };
  }
  const [newAura, r] = REACTION_MAP[info.targetAura][info.type];
  if (!r) {
    return { newAura, reaction: null };
  }
  const lunarizedReactionType = LUNA_REMAPPING[r] ?? r;
  const reaction = ((info.enabledLunarReactions ?? []) as R[]).includes(
    lunarizedReactionType,
  )
    ? lunarizedReactionType
    : r;
  return { newAura, reaction };
}

export function isReactionRelatedTo(info: ReactionQuery, target: D): boolean {
  const { reaction } = getReaction({ ...info, enabledLunarReactions: [] });
  if (reaction === null) return false;
  return REACTION_RELATIVES[reaction].includes(target);
}

export type SwirlableElement =
  | typeof D.Cryo
  | typeof D.Hydro
  | typeof D.Pyro
  | typeof D.Electro;

export function isReactionSwirl(info: ReactionQuery): SwirlableElement | null {
  switch (getReaction({ ...info, enabledLunarReactions: [] }).reaction) {
    case R.SwirlCryo:
      return D.Cryo;
    case R.SwirlElectro:
      return D.Electro;
    case R.SwirlHydro:
      return D.Hydro;
    case R.SwirlPyro:
      return D.Pyro;
    default:
      return null;
  }
}
