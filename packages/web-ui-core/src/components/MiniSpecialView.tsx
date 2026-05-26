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

import { createEffect, createSignal, For, Match, Show, Switch } from "solid-js";
import { InlineDice } from "./Dice";
import { StaticCard } from "./SelectCardView";
import type { PbEntityState, PbPlayerState } from "@gi-tcg/core";
import type { ChessboardViewType } from "./Chessboard";
import { useUiContext } from "../hooks/context";
import { SpecialViewToggleButton } from "./FunctionButtonGroup";
import { flip } from "@gi-tcg/utils";

export interface MiniSpecialViewProps {
  opp?: boolean;
  viewType: ChessboardViewType;
  player: PbPlayerState;
  selectCardCandidates: number[];
  visible: boolean;
  isSelectingItem: (defIdOrState: number | PbEntityState) => boolean;
  onCardClick: (card: number | PbEntityState) => void;
  onBackDropClick: () => void;
}

export function MiniView(props: MiniSpecialViewProps) {
  const { t, assetsManager } = useUiContext();
  const title = () => {
    const prefix = props.opp ? `mini.opp` : `mini.my`;
    switch (props.viewType) {
      case "switchHands":
        return t(`${prefix}SwitchingHands`);
      case "selectCard":
        return t(`${prefix}SelectingCards`);
      default:
        return t(`${prefix}Rerolling`);
    }
  };
  return (
    <div
      class={`place-self-center ml-152 w-80 h-48 data-[fold]:h-8 contain-strict
          translate-y-50% data-[opp]:translate-y--50% transition-all-300
          flex flex-col items-center justify-start py-4 data-[fold]:py-2
          select-none bg-black/60 text-white/80`}
      bool:data-opp={!!props.opp}
      bool:data-fold={!props.visible}
      onClick={() => {
        props.onBackDropClick();
      }}
    >
      <h3 class="font-bold text-4 line-height-none">{title()}</h3>
      <Switch>
        <Match when={props.viewType === "switchHands"}>
          <div class="flex flex-row w-full justify-around px-5">
            <For each={props.player.handCard}>
              {(card) => (
                <StaticCard
                  class="scale-50 shrink-0 mx--7"
                  cardDefinitionId={card.definitionId}
                  selected={props.isSelectingItem(card)}
                  onClick={(e) => {
                    e.stopPropagation();
                    props.onCardClick(card);
                  }}
                />
              )}
            </For>
          </div>
        </Match>
        <Match when={props.viewType === "selectCard" && props.visible}>
          <div class="flex flex-row w-full justify-around px-5">
            <For each={props.selectCardCandidates}>
              {(cardId) => (
                <StaticCard
                  class="scale-50 shrink-0 mx--7"
                  cardDefinitionId={cardId}
                  selected={props.isSelectingItem(cardId)}
                  onClick={(e) => {
                    e.stopPropagation();
                    props.onCardClick(cardId);
                  }}
                >
                  <div class="self-end w-35 mx--7 max-w-35 py-1 text-3 text-center text-white/80 line-height-tight translate-y-100%">
                    {assetsManager().getNameSync(cardId)}
                  </div>
                </StaticCard>
              )}
            </For>
          </div>
        </Match>
        <Match
          when={
            (props.viewType === "rerollDice" ||
              props.viewType === "rerollDiceEnd") &&
            props.visible
          }
        >
          <div class="grid grid-rows-2 grid-flow-col h-20 my-8">
            <For each={props.player.dice}>
              {(dice) => <InlineDice type={dice} class="w-10 h-10" />}
            </For>
          </div>
        </Match>
      </Switch>
    </div>
  );
}

export interface MiniSpecialViewGroupProps {
  who: 0 | 1;
  myViewType: ChessboardViewType;
  oppViewType: ChessboardViewType;
  players: PbPlayerState[];
  mySelectCardCandidates: number[];
  oppSelectCardCandidates: number[];
  showMyView: boolean;
  showOppView: boolean;
  isSelectingItem: (defIdOrState: number | PbEntityState) => boolean;
  onCardClick: (card: number | PbEntityState) => void;
  onBackDropClick: () => void;
}

export function MiniSpecialViewGroup(props: MiniSpecialViewGroupProps) {
  const [miniViewVisible, setMiniViewVisible] = createSignal(false);
  createEffect(() => {
    setMiniViewVisible(
      props.myViewType === "selectCard" || props.oppViewType === "selectCard",
    );
  });
  return (
    <>
      <Show when={props.showMyView || props.showOppView}>
        <SpecialViewToggleButton
          class="place-self-center ml-72 z-1"
          onClick={() => setMiniViewVisible((v) => !v)}
        />
      </Show>
      <Show when={props.showMyView}>
        <MiniView
          player={props.players[props.who]}
          selectCardCandidates={props.mySelectCardCandidates}
          viewType={props.myViewType}
          visible={miniViewVisible()}
          isSelectingItem={props.isSelectingItem}
          onCardClick={props.onCardClick}
          onBackDropClick={props.onBackDropClick}
        />
      </Show>
      <Show when={props.showOppView}>
        <MiniView
          opp
          player={props.players[flip(props.who)]}
          selectCardCandidates={props.oppSelectCardCandidates}
          viewType={props.oppViewType}
          visible={miniViewVisible()}
          isSelectingItem={props.isSelectingItem}
          onCardClick={props.onCardClick}
          onBackDropClick={props.onBackDropClick}
        />
      </Show>
    </>
  );
}
