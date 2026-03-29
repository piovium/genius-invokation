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

import { DiceType } from "@gi-tcg/typings";
import { createResource } from "solid-js";

export interface DiceIconProps {
  type: number;
}

const UI_ASSET_URL_BASE = "https://ui.assets.gi-tcg.guyutongxue.site/";

const urlCache = new Map<string, string>();

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
  // 使用 createResource 加载图片
  const [imageSrc] = createResource(
    () => props.type,
    async (diceType) => {
      const colorName = DICE_TYPE_TO_COLOR[diceType];
      if (!colorName) {
        return;
      }
      const url = urlCache.get(colorName);
      if (url) {
        return url;
      }
      try {
        const response = await fetch(
          `${UI_ASSET_URL_BASE}UI_Gcg_DiceL_${colorName}_Glow_02.webp`,
        );
        if (!response.ok) return;
        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        urlCache.set(colorName, objectUrl);
        return objectUrl;
      } catch {
        return;
      }
    },
  );

  return (
    <img
      src={imageSrc()}
      alt={getDiceTypeName(props.type)}
      class="w-full h-auto object-contain"
      title={getDiceTypeName(props.type)}
      draggable={false}
      loading="lazy"
    />
  );
}

export function getDiceTypeName(type: number): string {
  const names: Record<number, string> = {
    [DiceType.Cryo]: "冰",
    [DiceType.Hydro]: "水",
    [DiceType.Pyro]: "火",
    [DiceType.Electro]: "雷",
    [DiceType.Anemo]: "风",
    [DiceType.Geo]: "岩",
    [DiceType.Dendro]: "草",
    [DiceType.Omni]: "万能",
  };
  return names[type];
}
