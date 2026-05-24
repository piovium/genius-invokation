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

import { Show } from "solid-js";
import type { BottomHintConfig } from "../action";

export interface BottomHintProps extends BottomHintConfig {}

export function BottomHint(props: BottomHintProps) {
  return (
    <Show when={props.bottomHintType !== "none"}>
      <div
        class={`place-self-center mt-112
        text-center text-3.5 font-bold line-height-none px-1
        rounded-full pointer-events-none select-none bottom-hint`}
        data-bottom-hint-type={props.bottomHintType}
      >
        {props.bottomHintText}
      </div>
    </Show>
  );
}
