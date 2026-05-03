// Copyright (C) 2025 Guyutongxue
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

import type { PbPhaseType } from "@gi-tcg/typings";
import { Button } from "./Button";
import { useUiContext } from "../hooks/context";
import { WithDelicateUi } from "../primitives/delicate_ui";
import { createEffect, createMemo, createSignal, on } from "solid-js";

export interface DeclareEndMarkerProps {
  class?: string;
  markerClickable: boolean;
  showButton: boolean;
  opp: boolean;
  roundNumber: number;
  phase: PbPhaseType;
  currentTime: number;
  totalTime: number;
  timingMine: boolean;
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
    circumference *
    (props.currentTime > 45 ? 0.55 : 1 - props.currentTime / 100);
  const offsetBg = createMemo(() => {
    if (props.totalTime > 45) {
      return props.currentTime > 45
        ? circumference *
            ((1 - (props.currentTime - 45) / (props.totalTime - 45)) * 0.55)
        : offsetFg();
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
    <svg viewBox="0 0 100 100" class="w-full h-full rotate-90">
      <circle
        cx={CENTER}
        cy={CENTER}
        r={RADIUS}
        fill="none"
        stroke="#ffffff00"
        stroke-width={BORDER_WIDTH}
      />
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
        style={{
          filter: "drop-shadow(0 0 6px #ffffff)",
          transition: transition(),
        }}
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
      class={`flex flex-row items-center pointer-events-none select-none ${
        props.class ?? ""
      }`}
    >
      <WithDelicateUi
        assetId={[
          "UI_Gcg_Round_Button_01",
          "UI_Gcg_Round_Button_02",
          "UI_Gcg_Round_Button_03",
          "UI_Gcg_Round_Button_04",
        ]}
        dataUri
        fallback={
          <div
            class="pointer-events-auto ml-3 h-14 w-14 rounded-full data-[opp=true]:bg-blue-300 data-[opp=false]:bg-yellow-300 b-white b-3 flex flex-col items-center justify-center cursor-not-allowed data-[clickable]:cursor-pointer data-[clickable]:hover:bg-yellow-400 transition-colors"
            data-opp={props.opp}
            onClick={onClick}
            bool:data-clickable={props.markerClickable}
          >
            T{props.roundNumber}
            <div class="w-19 h-19 absolute pointer-events-none">
              <TimerBar
                currentTime={currentTime()}
                totalTime={props.totalTime}
                timingMine={props.timingMine}
              />
            </div>
          </div>
        }
      >
        {(opp, normal, hover, active) => (
          <div
            class="relative h-24 w-20 flex items-center justify-center declare-end-marker-img"
            style={{
              "--img-url": `url("${
                props.opp ? opp : props.showButton ? hover : normal
              }")`,
              "--img-hover-url": `url("${props.opp ? opp : hover}")`,
              "--img-active-url": `url("${props.opp ? opp : active}")`,
            }}
          >
            <div class="w-13.8 h-13.8 absolute">
              <TimerBar
                currentTime={currentTime()}
                totalTime={props.totalTime}
                timingMine={props.timingMine}
              />
            </div>
            <button
              class="block pointer-events-auto h-12 w-12 rounded-full declare-end-marker-img-button data-[opp=true]:color-white"
              data-opp={props.opp}
              onClick={onClick}
              bool:data-clickable={props.markerClickable}
            >
              T{props.roundNumber}
            </button>
          </div>
        )}
      </WithDelicateUi>
      <div
        class="opacity-0 data-[shown]:pointer-events-auto data-[shown]:opacity-100 transition-opacity"
        bool:data-shown={props.showButton}
      >
        <Button onClick={onClick}>{t("ui.buttonDeclareEnd")}</Button>
      </div>
    </div>
  );
}
