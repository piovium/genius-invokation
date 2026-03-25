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

import { For, Match, Show, Switch } from "solid-js";
import { CardFace } from "./Card";
import { DiceType } from "@gi-tcg/typings";
import { DiceCostAsync } from "./SelectCardView";
import { Dice } from "./Dice";
import type { PbPlayerState } from "@gi-tcg/core";
import type { ChessboardViewType } from "./Chessboard";
import { useUiContext } from "../hooks/context";

export interface MiniSpecialViewProps {
  viewType: "switching" | "selecting" | "rerolling";
  ids: number[] | DiceType[];
  nameGetter: (id: number) => string | undefined;
  opp?: boolean;
}

function MiniView(props: MiniSpecialViewProps) {
  const { t } = useUiContext();
  return (
    <div class="absolute aspect-ratio-[16/9] w-full max-h-full top-50% translate-y--50% pointer-events-none">
      <div
        class="absolute w-91.5 h-43 right--66.5 flex flex-col items-center justify-center gap-4 select-none mini-view bg-green-50 b-5 b-#443322 rounded-4"
        data-opp={!!props.opp}
      >
        <Switch>
          <Match when={props.viewType === "switching"}>
            <h3 class="font-bold text-4">
              {t(
                props.opp
                  ? "mini.oppSwitchingHands"
                  : "mini.mySwitchingHands",
              )}
            </h3>
            <ul class="flex flex-row w-80 justify-evenly">
              <For each={props.ids}>
                {(cardId) => (
                  <div class="relative h-24 w-4.5">
                    <li class="flex flex-col items-center absolute top-0 left--3">
                      <div class="h-18 w-10.5 relative">
                        <CardFace definitionId={cardId} />
                        <DiceCostAsync
                          cardDefinitionId={cardId}
                          size={18}
                          class="top-0 left-0.8"
                        />
                      </div>
                    </li>
                  </div>
                )}
              </For>
            </ul>
          </Match>
          <Match when={props.viewType === "selecting"}>
            <h3 class="font-bold text-4">
              {t(
                props.opp
                  ? "mini.oppSelectingCards"
                  : "mini.mySelectingCards",
              )}
            </h3>
            <ul class="flex flex-row w-80 justify-evenly">
              <For each={props.ids}>
                {(cardId) => (
                  <div class="relative h-24 w-4.5">
                    <li class="flex flex-col items-center absolute top-0 left--3">
                      <div class="h-18 w-10.5 relative">
                        <CardFace definitionId={cardId} />
                        <DiceCostAsync
                          cardDefinitionId={cardId}
                          size={18}
                          class="top-0 left-0.8"
                        />
                      </div>
                      <div class="mt-1 w-10.5 text-2 text-center color-black/60 font-bold whitespace-nowrap">
                        {props.nameGetter(cardId)}
                      </div>
                    </li>
                  </div>
                )}
              </For>
            </ul>
          </Match>
          <Match when={props.viewType === "rerolling"}>
            <h3 class="font-bold text-4">
              {t(
                props.opp
                  ? "mini.oppRerolling"
                  : "mini.myRerolling",
              )}
            </h3>
            <ul class="grid grid-rows-2 grid-flow-col gap-2">
              <For each={props.ids}>
                {(dice) => (
                  <li>
                    <div class="relative">
                      <Dice type={dice} size={42} />
                    </div>
                  </li>
                )}
              </For>
            </ul>
          </Match>
        </Switch>
      </div>
    </div>
  );
}

export interface MiniSpecialViewGroupProps {
  opp?: boolean;
  viewType: ChessboardViewType;
  player: PbPlayerState;
  selectCardCandidates: number[];
}

export function MiniSpecialViewGroup(props: MiniSpecialViewGroupProps) {
  const { assetsManager } = useUiContext();
  return (
    <>
      <Show when={props.viewType === "switchHands"}>
        <MiniView
          viewType="switching"
          ids={props.player.handCard.map((card) => card.definitionId)}
          nameGetter={() => void 0}
          opp={props.opp}
        />
      </Show>
      <Show when={props.viewType === "selectCard"}>
        <MiniView
          viewType="selecting"
          ids={props.selectCardCandidates}
          nameGetter={(name) => assetsManager().getNameSync(name)}
          opp={props.opp}
        />
      </Show>
      <Show
        when={
          props.viewType === "rerollDice" || props.viewType === "rerollDiceEnd"
        }
      >
        <MiniView
          viewType="rerolling"
          ids={props.player.dice}
          nameGetter={() => void 0}
          opp={props.opp}
        />
      </Show>
    </>
  );
}
