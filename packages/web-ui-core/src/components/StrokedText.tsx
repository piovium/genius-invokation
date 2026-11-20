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

import { omit } from "solid-js";
import type { ComponentProps } from "@solidjs/web";

export interface StrokedTextProps extends ComponentProps<"div"> {
  text: string;
  strokeWidth: number;
  strokeColor: string;
}

export function StrokedText(props: StrokedTextProps) {
  const rest = omit(props, "text", "class", "strokeWidth", "strokeColor");
  return (
    <div
      class={["pointer-events-none select-none", props.class]}
      style={{
        "paint-order": "stroke fill",
        "-webkit-text-stroke-color": props.strokeColor,
        "-webkit-text-stroke-width": `${props.strokeWidth}px`,
      }}
      {...rest}
    >
      {props.text}
    </div>
  );
}
