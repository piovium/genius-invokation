// Copyright (C) 2025 Guyutongxue
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
import NightsoulsBlessingMask from "../svg/NightsoulsBlessingMask.svg?url";
import { createUniqueId } from "solid-js";

export interface NightsoulsBlessingProps {
  class?: string;
  element: DiceType;
}

const NIGHTSOUL_COLORS: Record<number, [string, string]> = {
  [DiceType.Cryo]: ["#36e4ff", "#dfb8ff"],
  [DiceType.Hydro]: ["#0077ff", "#80eeff"],
  [DiceType.Pyro]: ["#ff3300", "#ff7700"],
  [DiceType.Electro]: ["#b348ff", "#986fff"],
  [DiceType.Anemo]: ["#23d798", "#47fec4"],
  [DiceType.Geo]: ["#ffb700", "#ffe837"],
  [DiceType.Dendro]: ["#1a9813", "#6cd000"],
};

export interface BackgroundProps {
  color1: string;
  color2: string;
}

export function Background(props: BackgroundProps) {
  const gradientId = createUniqueId();
  const filterId = createUniqueId();
  const maskId = createUniqueId();
  const isMobileSafari = () => "GestureEvent" in window;
  const maskUrl = isMobileSafari()
    ? "https://ui-assets.piovium.org/NightsoulsBlessingMask.svg.webp"
    : NightsoulsBlessingMask;
  return (
    <svg
      class="h-full w-full"
      xmlns="http://www.w3.org/2000/svg"
      // version="1.1"
      xmlns:xlink="http://www.w3.org/1999/xlink"
      // xmlns:svgjs="http://svgjs.dev/svgjs"
      viewBox="0 0 420 800"
    >
      <defs>
        <linearGradient
          gradientTransform="rotate(150, 0.5, 0.5)"
          x1="50%"
          y1="0%"
          x2="50%"
          y2="25%"
          spreadMethod="reflect"
          id={gradientId}
        >
          <animate
            attributeName="y1"
            values="0%;100%"
            dur="4s"
            repeatCount="indefinite"
          />
          <animate
            attributeName="y2"
            values="25%;125%"
            dur="4s"
            repeatCount="indefinite"
          />
          <stop stop-color={props.color1} stop-opacity="1" offset="0%" />
          <stop stop-color={props.color2} stop-opacity="1" offset="100%" />
        </linearGradient>
        <filter
          id={filterId}
          x="-20%"
          y="-20%"
          width="140%"
          height="140%"
          filterUnits="objectBoundingBox"
          primitiveUnits="userSpaceOnUse"
          color-interpolation-filters="sRGB"
        >
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.005 0.003"
            numOctaves="2"
            seed="37"
            stitchTiles="stitch"
            x="0%"
            y="0%"
            width="100%"
            height="100%"
            result="turbulence"
          />
          <feGaussianBlur
            stdDeviation="20 0"
            x="0%"
            y="0%"
            width="100%"
            height="100%"
            in="turbulence"
            // @ts-expect-error idk why
            edgeMode="duplicate"
            result="blur"
          />
          <feBlend
            // @ts-expect-error idk why too
            mode="color-dodge"
            x="0%"
            y="0%"
            width="100%"
            height="100%"
            in="SourceGraphic"
            in2="blur"
            result="blend"
          />
        </filter>
      </defs>
      <g>
        <mask
          id={maskId}
          maskUnits="userSpaceOnUse"
          maskContentUnits="userSpaceOnUse"
          mask-type="luminance"
          x="0%"
          y="0%"
        >
          <image href={maskUrl} width="100%" height="100%" />
        </mask>
        <g mask={`url(#${maskId})`}>
          <rect
            width="100%"
            height="100%"
            fill={`url(#${gradientId})`}
            filter={`url(#${filterId})`}
          />
        </g>
      </g>
    </svg>
  );
}

export function NightsoulsBlessing(props: NightsoulsBlessingProps) {
  return (
    <div class={`rounded-lg ${props.class ?? ""}`}>
      <Background
        color1={NIGHTSOUL_COLORS[props.element]?.[0] ?? "white"}
        color2={NIGHTSOUL_COLORS[props.element]?.[1] ?? "white"}
      />
    </div>
  );
}
