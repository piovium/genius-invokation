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
import NumberHintBlue from "../svg/NumberHintBlue.svg?fb";
import NumberHintYellow from "../svg/NumberHintYellow.svg?fb";
import type { Component, ComponentProps } from "solid-js";
import { Dynamic } from "solid-js/web";

export interface CardCountHintProps extends CardCountHintInfo {
  shown: boolean;
}

export const HINT_STYLE_MAP: Record<
  CardArea,
  { component: Component; rotate: number }
> = {
  myHand: { component: NumberHintYellow, rotate: 0 },
  oppHand: { component: NumberHintBlue, rotate: 180 },
  myPile: { component: NumberHintYellow, rotate: 90 },
  oppPile: { component: NumberHintBlue, rotate: 90 },
};

export function CardCountHint(props: CardCountHintProps) {
  const hintStyle = () => HINT_STYLE_MAP[props.area];
  return (
    <div
      class="pointer-events-none absolute left-0 top-0 h-9 w-9 hidden data-[shown]:grid isolate"
      style={cssPropertyOfTransform(props.transform)}
      bool:data-shown={props.shown}
    >
      <Dynamic<Component<ComponentProps<"div">>>
        component={hintStyle().component}
        class={`grid-area-[1/1] w-9 h-9`}
        style={{ transform: `rotate(${hintStyle().rotate}deg)` }}
      />
      <div
        class={`grid-area-[1/1] z-1 text-white font-bold text-3 line-height-none place-self-center select-none`}
      >
        {props.value}
      </div>
    </div>
  );
}
