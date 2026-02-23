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

import { createSignal, createUniqueId, onMount } from "solid-js";

export interface ElectricShocksProps {
  class?: string;
}

export function ElectricShocks(props: ElectricShocksProps) {
  const filterId = createUniqueId();
  const [seed, setSeed] = createSignal<number>();
  onMount(() => {
    setSeed(Math.random() * (1 << 30));
  });
  return (
    <div
      class={`electric-shocks-debuff ${props.class || ""}`}
      style={{ "--filter-electric-shocks": `url(#${filterId})` }}
    >
      <div class="electric-shocks-debuff-inner" />
      <svg width="0" height="0">
        <defs>
          <filter
            id={filterId}
            color-interpolation-filters="sRGB"
            x="-20%"
            y="-20%"
            width="140%"
            height="140%"
          >
            <feTurbulence
              type="turbulence"
              baseFrequency="0.02"
              numOctaves="5"
              seed={seed()}
              result="verticalNoise"
            />
            <feOffset in="verticalNoise" result="animeVertical1">
              <animate
                attributeName="dy"
                values="221; 0"
                dur="4s"
                repeatCount="indefinite"
              />
            </feOffset>
            <feOffset in="verticalNoise" result="animeVertical2">
              <animate
                attributeName="dy"
                values="0; -221"
                dur="4s"
                repeatCount="indefinite"
              />
            </feOffset>
            <feComposite
              in="animeVertical1"
              in2="animeVertical2"
              operator="over"
              result="seamlessVerticalNoise"
            />
            <feTurbulence
              type="turbulence"
              baseFrequency="0.02"
              numOctaves="5"
              seed={(seed() ?? 0) + 1}
              result="horizontalNoise"
            />
            <feOffset in="horizontalNoise" result="animeHorizontal1">
              <animate
                attributeName="dx"
                values="132; 0"
                dur="4s"
                repeatCount="indefinite"
              />
            </feOffset>
            <feOffset in="horizontalNoise" result="animeHorizontal2">
              <animate
                attributeName="dx"
                values="0; -132"
                dur="4s"
                repeatCount="indefinite"
              />
            </feOffset>
            <feComposite
              in="animeHorizontal1"
              in2="animeHorizontal2"
              operator="over"
              result="seamlessHorizontalNoise"
            />
            <feBlend
              in="seamlessVerticalNoise"
              in2="seamlessHorizontalNoise"
              mode="lighten"
              result="finalBlendedNoise"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="finalBlendedNoise"
              scale="20"
              xChannelSelector="R"
              yChannelSelector="B"
            />
          </filter>
        </defs>
      </svg>
    </div>
  );
}
