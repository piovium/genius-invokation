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

import type { PlayCost } from "@gi-tcg/assets-manager";

function costMap(s: string) {
  if (s === "GCG_COST_ENERGY") return "Energy";
  if (s === "GCG_COST_DICE_SAME") return "Aligned";
  return s[14] + s.substring(15).toLowerCase();
}

export function inlineCostDescription(cost: PlayCost[]): string {
  return cost.map((c) => `${c.count}*${costMap(c.type)}`).join(", ");
}

export function isLegend(playcost: PlayCost[]) {
  return playcost.find((c) => c.type === "GCG_COST_LEGEND");
}

export function getCostCode(playCost: PlayCost[]): string {
  let resultArr = playCost
    .filter((c) => c.type !== "GCG_COST_LEGEND")
    .map((c) => `cost DiceType.${costMap(c.type)}, ${c.count};`);
  if (isLegend(playCost)) {
    resultArr.push("legend;");
  }
  if (resultArr.length > 0) {
    return `\n  ${resultArr.join("\n  ")}`;
  } else {
    return "";
  }
}
