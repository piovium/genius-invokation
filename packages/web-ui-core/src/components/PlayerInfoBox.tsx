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

import { PbPlayerStatus } from "@gi-tcg/typings";
import { createMemo, Show } from "solid-js";
import { StrokedText } from "./StrokedText";
import { useUiContext } from "../hooks/context";
import { AutoResizeText } from "./AutoResizeText";
import DiceCountYellow from "../svg/DiceCountYellow.svg?fb";
import DiceCountBlue from "../svg/DiceCountBlue.svg?fb";
import DiceLegend from "../svg/DiceLegend.svg?fb";
import DiceLegendBg from "../svg/DiceLegendBg.svg?fb";
import { Dynamic } from "solid-js/web";

export interface PlayerInfoProps {
  class?: string;
  opp?: boolean;
  diceCount: number;
  legendUsed: boolean;
  declaredEnd: boolean;
  status: PbPlayerStatus; // TODO
  name?: string;
  avatarUrl?: string;
}

export function PlayerInfoBox(props: PlayerInfoProps) {
  const { t } = useUiContext();
  const statusTextMap = createMemo<Record<PbPlayerStatus, string>>(() => ({
    [PbPlayerStatus.UNSPECIFIED]: t("player.waiting"),
    [PbPlayerStatus.ACTING]: t("player.acting"),
    [PbPlayerStatus.CHOOSING_ACTIVE]: t("player.choosingActive"),
    [PbPlayerStatus.REROLLING]: t("player.rerolling"),
    [PbPlayerStatus.SWITCHING_HANDS]: t("player.switchingHands"),
    [PbPlayerStatus.SELECTING_CARDS]: t("player.selectingCards"),
  }));
  return (
    <div
      class={`pointer-events-none select-none h-50% py-2 gap-1
        flex flex-col data-[opp]:flex-col-reverse items-start ${
          props.class ?? ""
        }`}
      bool:data-opp={!!props.opp}
    >
      <div class="grid place-items-center w-18 h-9 my-9 children:grid-area-[1/1] info-dice-count">
        <Dynamic
          component={props.opp ? DiceCountBlue : DiceCountYellow}
          class="h-9 w-9"
        />
        <StrokedText
          text={String(props.diceCount)}
          strokeWidth={2}
          strokeColor="#000000B0"
          class="text-center text-white font-bold text-4.5"
        />
      </div>
      <div class="grow-1" />
      <div
        class={`hidden data-[shown]block py-0.5 pr-3 pl-3.5 ml-7
          bg-#e9e1d3 b-1 b-#403f44 text-#403f44 text-3 font-bold
           rounded-r-3 rounded-lb-0 rounded-lt-4 data-[opp]:rounded-lb-4 data-[opp]:rounded-lt-0`}
        bool:data-shown={props.declaredEnd}
        bool:data-opp={props.opp}
      >
        {t("player.declaredEndStatus")}
      </div>
      <div class="h-10 w-44 grid grid-cols-[2.5rem_6rem_2rem] grid-rows-1 isolate ml-2">
        <div
          class="grid-area-[1/1/2/4] rounded-l-full rounded-r-0 border-1.5 playerinfo-box z--1"
          data-opp={props.opp}
        />
        <Show when={props.avatarUrl} fallback={<div class="w-2" />}>
          <div
            class="grid-area-[1/1] place-self-center h-8 w-8 rounded-full b-3 b-#9f6939 data-[opp]:b-#415671 bg-white/70"
            data-opp={props.opp}
          />
          <img
            src={props.avatarUrl}
            class="grid-area-[1/1] place-self-center w-6.5 h-6.5 rounded-full object-cover"
          />
        </Show>
        <div class="grid-area-[1/2] flex flex-col">
          <span class="text-3 leading-tight text-white w-24 overflow-hidden text-nowrap text-ellipsis mt-1">
            {props.name || <>&nbsp;</>}
          </span>
          <AutoResizeText
            minFontSize={8}
            class="text-2.5 h-5 w-24 text-white/40 text-start items-center"
          >
            {statusTextMap()[props.status]}
          </AutoResizeText>
        </div>
        <Show
          when={props.legendUsed}
          fallback={<DiceLegend class="grid-area-[1/3] h-8 w-8 self-center" />}
        >
          <DiceLegendBg class="grid-area-[1/3] h-8 w-8 self-center" />
        </Show>
      </div>
    </div>
  );
}
