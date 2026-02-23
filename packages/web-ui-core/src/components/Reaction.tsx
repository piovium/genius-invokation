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
import { createEffect } from "solid-js";

interface ReactionRenderingData {
  elements: D[];
  name: string;
  fgColor: string;
  bgColor: string;
}

export const REACTION_TEXT_MAP: Record<number, ReactionRenderingData> = {
  [R.Melt]: {
    elements: [D.Cryo, D.Pyro],
    name: "融化",
    fgColor: "#ffcc66",
    bgColor: "#994b22",
  },
  [R.Vaporize]: {
    elements: [D.Hydro, D.Pyro],
    name: "蒸发",
    fgColor: "#ffcc66",
    bgColor: "#994b22",
  },
  [R.Overloaded]: {
    elements: [D.Electro, D.Pyro],
    name: "超载",
    fgColor: "#ff809b",
    bgColor: "#802d55",
  },
  [R.Superconduct]: {
    elements: [D.Cryo, D.Electro],
    name: "超导",
    fgColor: "#b4b4ff",
    bgColor: "#5511ee",
  },
  [R.ElectroCharged]: {
    elements: [D.Electro, D.Hydro],
    name: "感电",
    fgColor: "#e19bff",
    bgColor: "#7f2dee",
  },
  [R.Frozen]: {
    elements: [D.Cryo, D.Hydro],
    name: "冻结",
    fgColor: "#99ffff",
    bgColor: "#1199ee",
  },
  [R.SwirlCryo]: {
    elements: [D.Cryo, D.Anemo],
    name: "扩散",
    fgColor: "#66ffcc",
    bgColor: "#406d6d",
  },
  [R.SwirlHydro]: {
    elements: [D.Hydro, D.Anemo],
    name: "扩散",
    fgColor: "#66ffcc",
    bgColor: "#406d6d",
  },
  [R.SwirlPyro]: {
    elements: [D.Pyro, D.Anemo],
    name: "扩散",
    fgColor: "#66ffcc",
    bgColor: "#406d6d",
  },
  [R.SwirlElectro]: {
    elements: [D.Electro, D.Anemo],
    name: "扩散",
    fgColor: "#66ffcc",
    bgColor: "#406d6d",
  },
  [R.CrystallizeCryo]: {
    elements: [D.Cryo, D.Geo],
    name: "结晶",
    fgColor: "#ffd766",
    bgColor: "#664408",
  },
  [R.CrystallizeHydro]: {
    elements: [D.Hydro, D.Geo],
    name: "结晶",
    fgColor: "#ffd766",
    bgColor: "#664408",
  },
  [R.CrystallizePyro]: {
    elements: [D.Pyro, D.Geo],
    name: "结晶",
    fgColor: "#ffd766",
    bgColor: "#664408",
  },
  [R.CrystallizeElectro]: {
    elements: [D.Electro, D.Geo],
    name: "结晶",
    fgColor: "#ffd766",
    bgColor: "#664408",
  },
  [R.Burning]: {
    elements: [D.Dendro, D.Pyro],
    name: "燃烧",
    fgColor: "#ff9c00",
    bgColor: "#843e11",
  },
  [R.Bloom]: {
    elements: [D.Dendro, D.Hydro],
    name: "绽放",
    fgColor: "#00ea55",
    bgColor: "#3b6208",
  },
  [R.Quicken]: {
    elements: [D.Dendro, D.Electro],
    name: "原激化",
    fgColor: "#00ea55",
    bgColor: "#3b6208",
  },
  [R.LunarElectroCharged]: {
    elements: [D.Electro, D.Hydro],
    name: "月感电",
    fgColor: "#e19bff",
    bgColor: "#7f2dee",
  },
  [R.LunarBloom]: {
    elements: [D.Dendro, D.Hydro],
    name: "月绽放",
    fgColor: "#00ea55",
    bgColor: "#3b6208",
  },
  [R.LunarCrystallizeHydro]: {
    elements: [D.Hydro, D.Geo],
    name: "月结晶",
    fgColor: "#ffd766",
    bgColor: "#664408",
  },
};

export interface ReactionProps {
  info: ReactionInfo;
}

export function Reaction(props: ReactionProps) {
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
          text={data().name}
          strokeColor="var(--bg-color)"
          strokeWidth={2.5}
        />          
      </div>
    </div>
  );
}
