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

import { DiceType, PbPlayerStatus } from "@gi-tcg/typings";
import { Dice } from "./Dice";
import { createMemo, Show } from "solid-js";
import { WithDelicateUi } from "../primitives/delicate_ui";
import { StrokedText } from "./StrokedText";
import { useUiContext } from "../hooks/context";

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
      class={`pointer-events-none select-none m-2 gap-1 flex items-start data-[opp=true]:flex-col-reverse data-[opp=false]:flex-col ${
        props.class ?? ""
      }`}
      data-opp={!!props.opp}
    >
      <div>
        <WithDelicateUi
          assetId={
            props.opp ? "UI_Gcg_DiceL_Count_02" : "UI_Gcg_DiceL_Count_01"
          }
          fallback={
            <div class="relative flex items-center justify-center ml-2.8">
              <Dice
                type={DiceType.Omni}
                size={40}
                text={String(props.diceCount)}
              />
            </div>
          }
        >
          {(image) => (
            <div class="relative flex items-center justify-center ml-2.5">
              <div class="h-9 w-9">{image}</div>
              <StrokedText
                text={String(props.diceCount)}
                strokeWidth={2}
                strokeColor="#000000B0"
                class="absolute inset-0 text-center text-white font-bold text-4.5 line-height-9"
              />
            </div>
          )}
        </WithDelicateUi>
      </div>
      <div class="flex-grow-1" />
      <div
        class="opacity-0 data-[shown]:opacity-100 bg-#e9e1d3 text-#403f44 text-3 font-bold b-1 b-#403f44 py-0.5 pr-3 pl-3.5 ml-7 rounded-r-3 transition-opacity rounded-lb-0 rounded-lt-4 data-[opp]:rounded-lb-4 data-[opp]:rounded-lt-0"
        bool:data-shown={props.declaredEnd}
        data-opp={props.opp}
      >
        {t("player.declaredEndStatus")}
      </div>
      <div class="relative inline-block h-10 w-44">
        <div
          class="absolute inset-0 rounded-l-full rounded-r-0 border-1.5 playerinfo-box h-full w-full"
          data-opp={props.opp}
        />
        <div class="relative flex items-center p-1">
          <Show when={props.avatarUrl} fallback={<div class="w-2" />}>
            <div
              class="absolute h-8 w-8 rounded-full border-3 border-#9f6939 data-[opp]:border-#415671"
              data-opp={props.opp}
            />
            <div class="relative h-8 w-8 shrink-0 p-0.5">
              <img
                src={props.avatarUrl}
                class="w-7 h-7 rounded-full border-1.5 border-white/70 object-cover"
              />
            </div>
          </Show>
          <div class="flex flex-col ml-2 flex-1 gap-0.2 text-stroke-0.3">
            <span class="text-3 leading-tight text-white w-24 overflow-hidden text-nowrap text-ellipsis">
              {props.name || <>&nbsp;</>}
            </span>
            <div class="text-2.5 h-3 w-24 text-white/40" data-opp={props.opp}>
              {statusTextMap()[props.status]}
            </div>
          </div>
          <WithDelicateUi
            assetId={
              props.legendUsed ? "UI_Gcg_Esoteric_Bg" : "UI_Gcg_DiceL_Legend"
            }
            fallback={
              <div
                class="h-6 w-6 b-gray-400 b-2 rounded-md rotate-45 bg-gradient-to-r from-purple-500 to-blue-500 data-[used]:bg-gray-300 data-[used]:bg-none"
                bool:data-used={props.legendUsed}
              />
            }
          >
            {(image) => <div class="h-8 w-8">{image}</div>}
          </WithDelicateUi>
        </div>
      </div>
    </div>
  );
}
