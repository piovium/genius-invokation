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

import type { PlayCost } from "@gi-tcg/assets-manager";
import { For, Show } from "solid-js";
import { UI_ASSET_URL_BASE } from "./CardFace";

export interface PlayCostProps {
  playCost: PlayCost[];
}

export const COST_ICON_MAP: Record<string, string> = {
  GCG_COST_DICE_VOID: "DiceVoid",
  GCG_COST_DICE_CRYO: "DiceCryo",
  GCG_COST_DICE_HYDRO: "DiceHydro",
  GCG_COST_DICE_PYRO: "DicePyro",
  GCG_COST_DICE_ELECTRO: "DiceElectro",
  GCG_COST_DICE_ANEMO: "DiceAnemo",
  GCG_COST_DICE_GEO: "DiceGeo",
  GCG_COST_DICE_DENDRO: "DiceDendro",
  GCG_COST_DICE_SAME: "DiceSame",
  GCG_COST_ENERGY: "DiceEnergyNormal",
  GCG_COST_LEGEND: "DiceLegend",
  GCG_COST_SPECIAL_ENERGY: "DiceEnergyMavuika",
  GCG_COST_SKIRK_SPECIAL_ENERGY: "DiceEnergySkirk",
};

export function PlayCostList(props: PlayCostProps) {
  const getIconUrl = (type: string) =>
    `${UI_ASSET_URL_BASE}${COST_ICON_MAP[type]}.svg.webp`;

  const renderCost = () => {
    const result = [...props.playCost];
    if (result.length === 0 || result[0].type === "GCG_COST_LEGEND") {
      result.unshift({ type: "GCG_COST_DICE_SAME", count: 0 });
    }
    return result;
  };

  return (
    <>
      <For each={renderCost()}>
        {(item) => (
          <div class="grid place-items-center children:grid-area-[1/1]">
            <img class="w-[1.5em] h-[1.5em]" src={getIconUrl(item.type)} />
            <Show when={item.type !== "GCG_COST_LEGEND"}>
              <div class="play-cost">{item.count}</div>
            </Show>
          </div>
        )}
      </For>
    </>
  );
}
