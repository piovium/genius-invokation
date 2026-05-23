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
import type { RpcTimer } from "./Chessboard";

export interface TimerProps {
  timer: RpcTimer | null;
}

function parseTime(time: number) {
  return `${Math.max(Math.floor(time / 60), 0)
    .toString()
    .padStart(2, "0")} : ${Math.max(time % 60, 0)
    .toString()
    .padStart(2, "0")}`;
}

export function TimerCapsule(props: TimerProps) {
  return (
    <Show when={props.timer && props.timer.current > 20}>
      <div class="h-6 min-w-20 px-3 rounded-full text-3.5 text-center line-height-6 font-bold bg-#e9e2d3/70 text-black/70 pointer-events-none select-none">
        {parseTime(props.timer!.current)}
      </div>
    </Show>
  );
}

export function TimerAlert(props: TimerProps) {
  return (
    <Show when={props.timer && props.timer.current <= 20}>
      <div
        class="self-start mt-6 bg-black/80 text-white py-2 px-4 rounded-lg z-7 font-bold data-[alert]:text-red pointer-events-none select-none"
        bool:data-alert={props.timer!.current <= 10}
      >
        {parseTime(props.timer!.current)}
      </div>
    </Show>
  );
}
