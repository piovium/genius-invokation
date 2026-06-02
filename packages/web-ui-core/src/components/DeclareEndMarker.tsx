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

import { PbPhaseType } from "@gi-tcg/typings";
import { Button } from "./Button";
import { useUiContext } from "../hooks/context";
import { createEffect, createMemo, createSignal, on } from "solid-js";
import RoundButton from "../svg/RoundButton.svg?fb";
import RoundTurnYellow from "../svg/RoundTurnYellow.svg?fb";
import RoundTurnBlue from "../svg/RoundTurnBlue.svg?fb";

export interface DeclareEndMarkerProps {
  class?: string;
  markerClickable: boolean;
  showButton: boolean;
  roundNumber: number;
  phase: PbPhaseType;
  currentTime: number;
  totalTime: number;
  timingMine: boolean;
  willGetFirst: boolean;
  onClick: (e: MouseEvent) => void;
}

export interface TimerBarProps {
  currentTime: number;
  totalTime: number;
  timingMine: boolean;
}

export function TimerBar(props: TimerBarProps) {
  const RADIUS = 40;
  const CENTER = 50;
  const BORDER_WIDTH = 6;
  const circumference = 2 * Math.PI * RADIUS;
  const colorBg = () => (props.timingMine ? "#ebd29a" : "#c2d8f3");
  const colorFg = () => (props.timingMine ? "#ec8831" : "#5a9bef");
  const offsetFg = () =>
    circumference * Math.max(1 - props.currentTime / 100, 0.55);
  const offsetBg = createMemo(() => {
    if (props.totalTime > 45 && props.currentTime > 45) {
      return (
        circumference *
        0.55 *
        Math.max(1 - (props.currentTime - 45) / (props.totalTime - 45), 0)
      );
    } else {
      return offsetFg();
    }
  });
  const [transition, setTransition] = createSignal(
    "stroke-dashoffset 1s linear",
  );
  const timingMine = createMemo(() => props.timingMine);
  createEffect(
    on(timingMine, () => {
      setTransition("none");
      setTimeout(() => setTransition("stroke-dashoffset 1s linear"), 100);
    }),
  );
  return (
    <svg
      viewBox="0 0 100 100"
      class="grid-area-[1/1] w-14 h-14 self-center rotate-90"
    >
      <circle
        cx={CENTER}
        cy={CENTER}
        r={RADIUS}
        fill="none"
        stroke="#FFFFFF"
        stroke-width={BORDER_WIDTH}
        stroke-dasharray={`4 ${circumference - 5}`}
        stroke-dashoffset={offsetBg()}
        stroke-linecap="butt"
        transform="scale(-1,1) translate(-100,0)"
        style={{ transition: transition() }}
      />
      <circle
        cx={CENTER}
        cy={CENTER}
        r={RADIUS}
        fill="none"
        stroke={colorBg()}
        stroke-width={BORDER_WIDTH}
        stroke-dasharray={`${circumference}`}
        stroke-dashoffset={offsetBg()}
        stroke-linecap="butt"
        transform="scale(-1,1) translate(-100,0)"
        style={{ transition: transition() }}
      />
      <circle
        cx={CENTER}
        cy={CENTER}
        r={RADIUS}
        fill="none"
        stroke={colorFg()}
        stroke-width={BORDER_WIDTH}
        stroke-dasharray={`${circumference}`}
        stroke-dashoffset={offsetFg()}
        stroke-linecap="butt"
        transform="scale(-1,1) translate(-100,0)"
        style={{ transition: transition() }}
      />
    </svg>
  );
}

export function DeclareEndMarker(props: DeclareEndMarkerProps) {
  const { t } = useUiContext();
  const onClick = (e: MouseEvent) => {
    e.stopPropagation();
    props.onClick(e);
  };
  const currentTime = () => Math.min(props.currentTime, props.totalTime);
  return (
    <div
      class={`grid grid-cols-[4.5rem_10rem] grid-rows-1 w-58 h-22 pointer-events-none select-none justify-items-center ${
        props.class ?? ""
      }`}
    >
      <RoundButton class="grid-area-[1/1] w-18 h-18 self-center" />
      <RoundTurnBlue
        class="grid-area-[1/1] w-16 h-8.4 self-start hidden data-[shown]:block"
        bool:data-shown={!props.timingMine && props.phase !== PbPhaseType.END}
      />
      <RoundTurnYellow
        class="grid-area-[1/1] w-16 h-8.4 self-end hidden data-[shown]:block"
        bool:data-shown={props.timingMine && props.phase !== PbPhaseType.END}
      />
      <TimerBar
        currentTime={currentTime()}
        totalTime={props.totalTime}
        timingMine={props.timingMine}
      />
      <button
        class={`grid-area-[1/1] self-center
          hidden data-[clickable]:block pointer-events-auto
          h-9 w-9 rounded-full b-2.5
          b-#f3ca58 bg-#ebb145
          hover:b-#fffd79 hover:bg-#ffd954
          active:b-#ef9b32 active:bg-#ba6c10`}
        onClick={onClick}
        bool:data-clickable={props.markerClickable}
      />
      <div
        class="grid-area-[1/1] self-center text-3 font-bold line-height-none text-white/60 data-[button]:text-black/60"
        bool:data-button={props.markerClickable}
      >
        T{props.roundNumber}
      </div>
      <Button
        class="hidden data-[shown]:grid pointer-events-auto grid-area-[1/2] self-center"
        bool:data-shown={props.showButton}
        onClick={onClick}
      >
        {t("ui.buttonDeclareEnd")}
      </Button>
      <div
        class={`grid-area-[1/2] self-start hidden data-[shown]:block
          bg-#71553f rounded-2 px-3 py-0.5 b-#816246 b-2
          text-white/80 text-2.5 font-bold select-none`}
        bool:data-shown={props.showButton && props.willGetFirst}
      >
        {t("ui.willGetFirst")}
      </div>
    </div>
  );
}
