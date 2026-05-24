// Copyright (C) 2024-2025 Guyutongxue
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

import { DiceType } from "@gi-tcg/typings";
import {
  Show,
  splitProps,
  type Component,
  type ComponentProps,
} from "solid-js";
import { StrokedTextContent } from "./StrokedText";
import { Dynamic } from "solid-js/web";

import DiceCryoS from "../svg/DiceCryoS.svg?fb";
import DiceHydroS from "../svg/DiceHydroS.svg?fb";
import DicePyroS from "../svg/DicePyroS.svg?fb";
import DiceElectroS from "../svg/DiceElectroS.svg?fb";
import DiceAnemoS from "../svg/DiceAnemoS.svg?fb";
import DiceGeoS from "../svg/DiceGeoS.svg?fb";
import DiceDendroS from "../svg/DiceDendroS.svg?fb";
import DiceOmniS from "../svg/DiceOmniS.svg?fb";

import DiceVoid from "../svg/DiceVoid.svg?fb";
import DiceCryo from "../svg/DiceCryo.svg?fb";
import DiceHydro from "../svg/DiceHydro.svg?fb";
import DicePyro from "../svg/DicePyro.svg?fb";
import DiceElectro from "../svg/DiceElectro.svg?fb";
import DiceAnemo from "../svg/DiceAnemo.svg?fb";
import DiceGeo from "../svg/DiceGeo.svg?fb";
import DiceDendro from "../svg/DiceDendro.svg?fb";
import DiceSame from "../svg/DiceSame.svg?fb";
import DiceEnergyNormal from "../svg/DiceEnergyNormal.svg?fb";
import DiceLegend from "../svg/DiceLegend.svg?fb";
import DiceEnergyMavuika from "../svg/DiceEnergyMavuika.svg?fb";
import DiceEnergySkirk from "../svg/DiceEnergySkirk.svg?fb";

import SelectingDice from "../svg/SelectingDice.svg?fb";

export type CostTextColor = "normal" | "increased" | "decreased";

export const DICE_COLOR: Record<number, string> = {
  [DiceType.Void]: "void",
  [DiceType.Cryo]: "cryo",
  [DiceType.Hydro]: "hydro",
  [DiceType.Pyro]: "pyro",
  [DiceType.Electro]: "electro",
  [DiceType.Anemo]: "anemo",
  [DiceType.Geo]: "geo",
  [DiceType.Dendro]: "dendro",
  [DiceType.Omni]: "omni",
  // [DiceType.Aligned]: "",
  // [DiceType.Energy]: "",
  // [DiceType.Legend]: "",
};

export const DICE_COMPONENT_MAP: Record<number, Component> = {
  // [DiceType.Void]: ,
  [DiceType.Cryo]: DiceCryoS,
  [DiceType.Hydro]: DiceHydroS,
  [DiceType.Pyro]: DicePyroS,
  [DiceType.Electro]: DiceElectroS,
  [DiceType.Anemo]: DiceAnemoS,
  [DiceType.Geo]: DiceGeoS,
  [DiceType.Dendro]: DiceDendroS,
  [DiceType.Omni]: DiceOmniS,
  // [DiceType.Aligned]: ,
  // [DiceType.Energy]: ,
  // [DiceType.Legend]: ,
};

export const COST_COMPONENT_MAP: Record<number, Component> = {
  [DiceType.Void]: DiceVoid,
  [DiceType.Cryo]: DiceCryo,
  [DiceType.Hydro]: DiceHydro,
  [DiceType.Pyro]: DicePyro,
  [DiceType.Electro]: DiceElectro,
  [DiceType.Anemo]: DiceAnemo,
  [DiceType.Geo]: DiceGeo,
  [DiceType.Dendro]: DiceDendro,
  [DiceType.Omni]: DiceSame,
  // [DiceType.Aligned]: ,
  [DiceType.Energy]: DiceEnergyNormal,
  [DiceType.Legend]: DiceLegend,

  // https://github.com/piovium/genius-invokation/issues/715
  // 12: DiceEnergyMavuika,
  // 13: DiceEnergySkirk,
};

export interface DiceProps extends ComponentProps<"div"> {
  class?: string;
  type: number;
  selected?: boolean;
}

export function Dice(props: DiceProps) {
  const [local, rest] = splitProps(props, ["class", "type", "selected"]);
  return (
    <div class={`grid ${local.class ?? "w-6 h-6"}`} {...rest}>
      <DiceContent
        class="w-full h-full"
        type={local.type}
        selected={local.selected}
        col={1}
        row={1}
      />
    </div>
  );
}

export interface DiceContentProps {
  class?: string;
  type: number;
  selected?: boolean;
  col: number;
  row: number;
}

/** You can only use this component within a **grid** container. Otherwise, please use ```<Dice/>``` instead. */
export function DiceContent(props: DiceContentProps) {
  return (
    <>
      <Dynamic<Component<ComponentProps<"div">>>
        component={DICE_COMPONENT_MAP[props.type]}
        class={props.class ?? "w-6 h-6"}
        style={{ "grid-column": props.col, "grid-row": props.row }}
      />
      <Show when={props.selected}>
        <SelectingDice
          class={props.class ?? "w-6 h-6"}
          style={{ "grid-column": props.col, "grid-row": props.row }}
        />
      </Show>
    </>
  );
}

export interface CostProps {
  class: string;
  type: number;
  count: number;
  color: CostTextColor;
}

export function Cost(props: CostProps) {
  return (
    <div class={`grid children:grid-area-[1/1] ${props.class}`}>
      <Dynamic<Component<ComponentProps<"div">>>
        component={COST_COMPONENT_MAP[props.type]}
        class="w-full h-full"
      />
      <Show when={props.type !== DiceType.Legend}>
        <StrokedTextContent
          class={`place-self-center
          text-center font-bold text-white
          data-[color=increased]:text-red-500
          data-[color=decreased]:text-green-500`}
          strokeWidth={2}
          strokeColor="#000000B0"
          text={props.count.toString()}
          data-color={props.color}
        />
      </Show>
    </div>
  );
}

export interface InlineDiceProps {
  class: string;
  type: number;
}

export function InlineDice(props: InlineDiceProps) {
  return (
    <Dynamic<Component<ComponentProps<"div">>>
      component={DICE_COMPONENT_MAP[props.type]}
      class={props.class}
    />
  );
}
