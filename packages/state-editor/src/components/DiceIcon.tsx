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
import { createMemo } from "solid-js";
import { DICE_LABELS } from "../constants";

export interface DiceIconProps {
  type: number;
}

const UI_ASSET_URL_BASE = "https://ui.assets.gi-tcg.guyutongxue.site/";

// 骰子类型到颜色名称的映射
const DICE_TYPE_TO_COLOR: Record<number, string> = {
  [DiceType.Cryo]: "cryo",
  [DiceType.Hydro]: "hydro",
  [DiceType.Pyro]: "pyro",
  [DiceType.Electro]: "electro",
  [DiceType.Anemo]: "anemo",
  [DiceType.Geo]: "geo",
  [DiceType.Dendro]: "dendro",
  [DiceType.Omni]: "omni",
};

export function DiceIcon(props: DiceIconProps) {
  const imageSrc = createMemo(() => {
    const colorName = DICE_TYPE_TO_COLOR[props.type];
    if (!colorName) {
      return void 0;
    }
    return `${UI_ASSET_URL_BASE}UI_Gcg_DiceL_${colorName}_Glow_02.webp`;
  });

  return (
    <img
      src={imageSrc()}
      alt={getDiceTypeName(props.type)}
      class="w-full aspect-ratio-square h-auto object-contain"
      title={getDiceTypeName(props.type)}
      draggable={false}
      loading="lazy"
    />
  );
}

export function getDiceTypeName(type: number): string {
  return DICE_LABELS[type] ?? "未知";
}
