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
import { createResource, Show } from "solid-js";

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

  // 构建图片 URL
  const imageUrl = () => {
    const colorName = DICE_TYPE_TO_COLOR[props.type];
    if (!colorName) return null;
    return `${UI_ASSET_URL_BASE}UI_Gcg_DiceL_${colorName}_Glow_02.webp`;
  };

  // 使用 createResource 加载图片
  const [imageSrc] = createResource(imageUrl, async (url) => {
    if (!url) return null;
    try {
      const response = await fetch(url);
      if (!response.ok) return null;
      const blob = await response.blob();
      return URL.createObjectURL(blob);
    } catch {
      return null;
    }
  });

  return (
    <Show
      when={imageSrc.state === "ready" && imageSrc()}
      fallback={<span>{getDiceTypeName(props.type)}</span>}
    >
      <img
        src={imageSrc()!}
        alt={getDiceTypeName(props.type)}
        class="w-full h-auto object-contain"
        title={getDiceTypeName(props.type)}
        draggable={false}
      />
    </Show>
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
