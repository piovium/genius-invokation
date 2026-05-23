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

import { cssPropertyOfTransform } from "../ui_state";
import type { CardArea, CardCountHintInfo } from "./Chessboard";
import CardCountHintBlue from "../svg/CardCountHintBlue.svg?fb";
import CardCountHintYellow from "../svg/CardCountHintYellow.svg?fb";
import type { Component, ComponentProps } from "solid-js";
import { Dynamic } from "solid-js/web";
import { StrokedTextContent } from "./StrokedText";

export interface CardCountHintProps extends CardCountHintInfo {
  shown: boolean;
}

export const HINT_STYLE_MAP: Record<
  CardArea,
  { component: Component; rotate: number }
> = {
  myHand: { component: CardCountHintYellow, rotate: 0 },
  oppHand: { component: CardCountHintBlue, rotate: 180 },
  myPile: { component: CardCountHintYellow, rotate: 90 },
  oppPile: { component: CardCountHintBlue, rotate: 90 },
};

export function CardCountHint(props: CardCountHintProps) {
  const hintStyle = () => HINT_STYLE_MAP[props.area];
  return (
    <div
      class="pointer-events-none absolute left-0 top-0 h-9 w-9 hidden data-[shown]:grid isolate children:grid-area-[1/1]"
      style={cssPropertyOfTransform(props.transform)}
      bool:data-shown={props.shown}
    >
      <Dynamic<Component<ComponentProps<"div">>>
        component={hintStyle().component}
        class="w-9 h-9"
        style={{ transform: `rotate(${hintStyle().rotate}deg)` }}
      />
      <StrokedTextContent
        text={String(props.value)}
        strokeWidth={1}
        strokeColor="#000000B0"
        class="z-1 text-white font-bold place-self-center select-none"
      />
    </div>
  );
}
