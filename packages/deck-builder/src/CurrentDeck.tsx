// Copyright (C) 2024-2025 Guyutongxue
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

import { For, Index, Show, createEffect } from "solid-js";
import type { AllCardsProps } from "./AllCards";
import { DeckCard, TinyActionCard, TinyCharacterCard } from "./Card";
import { createStore, produce } from "solid-js/store";
import type {
  DeckDataActionCardInfo,
  DeckDataCharacterInfo,
} from "@gi-tcg/assets-manager";

export function CurrentDeck(props: AllCardsProps) {
  const [current, setCurrent] = createStore({
    characters: Array.from(
      { length: 3 },
      () => null
    ) as (DeckDataCharacterInfo | null)[],
    cards: Array.from(
      { length: 30 },
      () => null
    ) as (DeckDataActionCardInfo | null)[],
  });

  createEffect(() => {
    const selectedChs = props.deck.characters
      .map((id) => props.characters.get(id))
      .filter((ch): ch is DeckDataCharacterInfo => typeof ch !== "undefined");
    const selectedAcs = props.deck.cards
      .map((id) => props.actionCards.get(id))
      .filter((ac): ac is DeckDataActionCardInfo => typeof ac !== "undefined")
      .toSorted((a, b) => a.id - b.id);
    setCurrent(
      produce((prev) => {
        for (let i = 0; i < 3; i++) {
          prev.characters[i] = selectedChs[i] ?? null;
        }
        for (let i = 0; i < 30; i++) {
          prev.cards[i] = selectedAcs[i] ?? null;
        }
      })
    );
  });

  const removeCharacter = (idx: number) => {
    setCurrent(produce((prev) => (prev.characters[idx] = null)));
    props.onChangeDeck?.({
      ...props.deck,
      characters: current.characters
        .filter((ch): ch is DeckDataCharacterInfo => ch !== null)
        .map((ch) => ch.id),
    });
  };
  const removeActionCard = (idx: number) => {
    setCurrent(produce((prev) => (prev.cards[idx] = null)));
    props.onChangeDeck?.({
      ...props.deck,
      cards: current.cards
        .filter((ac): ac is DeckDataActionCardInfo => ac !== null)
        .map((ac) => ac.id),
    });
  };

  return (
    // <div
    //   class="flex-shrink-0 flex flex-col flex-grow items-center justify-center gap-1 data-[deck-page]:gap-3 @3xl:gap-3"
    //   bool:data-deck-page={deckPage()}
    // >
    <div
      // the DP:max-h-[calc(100%-25px)] is calculated by subtracting b-t-1 of split line, mt-3 of split line, h-3 of toggle button and mb-2 of toggle button
      class={`relative min-w-0
        flex flex-col justify-center
        w-full @3xl:w-auto DP:w-auto
        flex-shrink-0 @3xl:flex-shrink-1
        DP:flex-1 DP:self-center DP:max-h-[calc(100%-33px)]
        @3xl:aspect-[4/7] DP:aspect-[4/7]
        @3xl:h-full DP:h-[calc(100%-33px)]
        @3xl:max-w-100 DP:max-w-[min(100%,25rem)]`}
    >
      <div 
        class={`relative
          @3xl:aspect-[4/7] DP:aspect-[4/7]
          w-full h-auto max-h-full
          flex flex-col items-center
          DP:px-2% DP:py-2% @3xl:px-2 @3xl:py-3.5`}
      >
        <ul
          class={`flex justify-between gap-3 @3xl:w-[75%] DP:w-[75%] mb-2 @3xl:mb-2% DP:mb-2%`}
        >
          <For each={current.characters}>
            {(ch, idx) => (
              <li
                class={`relative z-20 @3xl:z-0
                  aspect-square w-10 h-10 flex-shrink-0
                  min-w-10
                  @3xl:w-auto DP:w-auto
                  @3xl:h-auto DP:h-auto
                  @3xl:aspect-[7/12] DP:aspect-[7/12]
                  @3xl:flex-1 DP:flex-1`}
                onClick={() => ch && removeCharacter(idx())}
              >
                <Show
                  when={ch}
                  fallback={
                    <div class="w-full b-gray-3 border-2 overflow-clip rounded-full @3xl:rounded-xl DP:rounded-xl">
                      <div class="w-full aspect-square @3xl:aspect-[7/12] DP:aspect-[7/12] bg-gray-200" />
                    </div>
                  }
                >
                  {(ch) => (
                    <>
                      <DeckCard
                        class="rounded-xl hidden @3xl:block DP:block"
                        id={ch().id}
                        type="character"
                        name={ch().name}
                        warn={ch().version > props.version}
                      />
                      <TinyCharacterCard
                        id={ch().id}
                        warn={ch().version > props.version}
                      />
                    </>
                  )}
                </Show>
              </li>
            )}
          </For>
        </ul>
        <ul
          class={`grid w-full
          grid-cols-15
          @3xl:grid-cols-6 DP:grid-cols-6
          gap-x-0 gap-y-1
          @3xl:gap-x-1.5% @3xl:gap-y-0.5% DP:gap-x-1.5% DP:gap-y-0.5%
          pr-[calc(100%-calc(calc(100%-2rem)/14*15))]
          @3xl:pr-0 DP:pr-0`}
        >
          <For each={current.cards}>
            {(ac, idx) => (
              <li
                class={`relative z-20 @3xl:z-0 aspect-[7/12] min-w-8 @3xl:w-full DP:w-full`}
                onClick={() => ac && removeActionCard(idx())}
              >
                <Show
                  when={ac}
                  fallback={
                    <div class="w-full b-gray-3! border-2 overflow-clip rounded-md @3xl:rounded-lg DP:rounded-lg">
                      <div class="w-full aspect-ratio-[7/12] bg-gray-200" />
                    </div>
                  }
                >
                  {(ac) => (
                    <>
                      <DeckCard
                        class="rounded-lg hidden @3xl:block DP:block"
                        id={ac().id}
                        type="actionCard"
                        name={ac().name}
                        warn={ac().version > props.version}
                      />
                      <TinyActionCard
                        id={ac().id}
                        warn={ac().version > props.version}
                      />
                    </>
                  )}
                </Show>
              </li>
            )}
          </For>
        </ul>
      </div>
    </div>
  );
}
