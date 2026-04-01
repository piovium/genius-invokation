// Copyright (C) 2025 Guyutongxue
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

import { DamageType as D, Reaction as R } from "@gi-tcg/typings";
import type { ReactionInfo } from "./Chessboard";
import { StrokedText } from "./StrokedText";
import { Image } from "./Image";
import { useUiContext } from "../hooks/context";

interface ReactionRenderingData {
  elements: D[];
  nameKey:
    | "reaction.Melt"
    | "reaction.Vaporize"
    | "reaction.Overloaded"
    | "reaction.Superconduct"
    | "reaction.ElectroCharged"
    | "reaction.Frozen"
    | "reaction.Swirl"
    | "reaction.Crystallize"
    | "reaction.Burning"
    | "reaction.Bloom"
    | "reaction.Quicken"
    | "reaction.LunarElectroCharged"
    | "reaction.LunarBloom"
    | "reaction.LunarCrystallizeHydro";
  fgColor: string;
  bgColor: string;
}

export const REACTION_TEXT_MAP: Record<number, ReactionRenderingData> = {
  [R.Melt]: {
    elements: [D.Cryo, D.Pyro],
    nameKey: "reaction.Melt",
    fgColor: "#ffcc66",
    bgColor: "#994b22",
  },
  [R.Vaporize]: {
    elements: [D.Hydro, D.Pyro],
    nameKey: "reaction.Vaporize",
    fgColor: "#ffcc66",
    bgColor: "#994b22",
  },
  [R.Overloaded]: {
    elements: [D.Electro, D.Pyro],
    nameKey: "reaction.Overloaded",
    fgColor: "#ff809b",
    bgColor: "#802d55",
  },
  [R.Superconduct]: {
    elements: [D.Cryo, D.Electro],
    nameKey: "reaction.Superconduct",
    fgColor: "#b4b4ff",
    bgColor: "#5511ee",
  },
  [R.ElectroCharged]: {
    elements: [D.Electro, D.Hydro],
    nameKey: "reaction.ElectroCharged",
    fgColor: "#e19bff",
    bgColor: "#7f2dee",
  },
  [R.Frozen]: {
    elements: [D.Cryo, D.Hydro],
    nameKey: "reaction.Frozen",
    fgColor: "#99ffff",
    bgColor: "#1199ee",
  },
  [R.SwirlCryo]: {
    elements: [D.Cryo, D.Anemo],
    nameKey: "reaction.Swirl",
    fgColor: "#66ffcc",
    bgColor: "#406d6d",
  },
  [R.SwirlHydro]: {
    elements: [D.Hydro, D.Anemo],
    nameKey: "reaction.Swirl",
    fgColor: "#66ffcc",
    bgColor: "#406d6d",
  },
  [R.SwirlPyro]: {
    elements: [D.Pyro, D.Anemo],
    nameKey: "reaction.Swirl",
    fgColor: "#66ffcc",
    bgColor: "#406d6d",
  },
  [R.SwirlElectro]: {
    elements: [D.Electro, D.Anemo],
    nameKey: "reaction.Swirl",
    fgColor: "#66ffcc",
    bgColor: "#406d6d",
  },
  [R.CrystallizeCryo]: {
    elements: [D.Cryo, D.Geo],
    nameKey: "reaction.Crystallize",
    fgColor: "#ffd766",
    bgColor: "#664408",
  },
  [R.CrystallizeHydro]: {
    elements: [D.Hydro, D.Geo],
    nameKey: "reaction.Crystallize",
    fgColor: "#ffd766",
    bgColor: "#664408",
  },
  [R.CrystallizePyro]: {
    elements: [D.Pyro, D.Geo],
    nameKey: "reaction.Crystallize",
    fgColor: "#ffd766",
    bgColor: "#664408",
  },
  [R.CrystallizeElectro]: {
    elements: [D.Electro, D.Geo],
    nameKey: "reaction.Crystallize",
    fgColor: "#ffd766",
    bgColor: "#664408",
  },
  [R.Burning]: {
    elements: [D.Dendro, D.Pyro],
    nameKey: "reaction.Burning",
    fgColor: "#ff9c00",
    bgColor: "#843e11",
  },
  [R.Bloom]: {
    elements: [D.Dendro, D.Hydro],
    nameKey: "reaction.Bloom",
    fgColor: "#00ea55",
    bgColor: "#3b6208",
  },
  [R.Quicken]: {
    elements: [D.Dendro, D.Electro],
    nameKey: "reaction.Quicken",
    fgColor: "#00ea55",
    bgColor: "#3b6208",
  },
  [R.LunarElectroCharged]: {
    elements: [D.Electro, D.Hydro],
    nameKey: "reaction.LunarElectroCharged",
    fgColor: "#e19bff",
    bgColor: "#7f2dee",
  },
  [R.LunarBloom]: {
    elements: [D.Dendro, D.Hydro],
    nameKey: "reaction.LunarBloom",
    fgColor: "#00ea55",
    bgColor: "#3b6208",
  },
  [R.LunarCrystallizeHydro]: {
    elements: [D.Hydro, D.Geo],
    nameKey: "reaction.LunarCrystallizeHydro",
    fgColor: "#ffd766",
    bgColor: "#664408",
  },
};

export interface ReactionProps {
  info: ReactionInfo;
}

export function Reaction(props: ReactionProps) {
  const { t } = useUiContext();
  const data = () => REACTION_TEXT_MAP[props.info.reactionType];
  const applyElement = () => props.info.incoming;
  const baseElement = () => data().elements.find((e)=> e !== applyElement())!;
  return (
    <div class="h-5 w-21 flex flex-row items-center justify-center relative">
      <div class="absolute top-0 left-8 w-5 h-5 reaction-base-animation" >
        <Image imageId={baseElement()} class="h-5 w-5" fallback="aura" />
      </div>
      <div class="absolute top-0 left-8 w-5 h-5 reaction-apply-animation">
        <Image imageId={applyElement()} class="h-5 w-5" fallback="aura" />
      </div>
      <div
        class="reaction-text-animation grid grid-cols-[max-content] grid-rows-[max-content] place-items-center"
        style={{
          "--fg-color": data().fgColor,
          "--bg-color": data().bgColor,
        }}
      >
          <div class="grid-area-[1/1] h-5 w-full reaction-text-shadow"/>
          <StrokedText
            class="text-3.5 font-bold text-[var(--fg-color)] grid-area-[1/1] mx-2"
            text={t(data().nameKey)}
            strokeColor="var(--bg-color)"
            strokeWidth={2.5}
          />          
      </div>
    </div>
  );
}
