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

import { For, Index, Show, createEffect, createSignal } from "solid-js";
import type { AllCardsProps } from "./AllCards";
import { Card } from "./Card";
import { createStore, produce } from "solid-js/store";
import type {
  DeckDataActionCardInfo,
  DeckDataCharacterInfo,
} from "@gi-tcg/assets-manager";
import type { b } from "../../core/dist/log-QibsbrKo";

export function CurrentDeck(props: AllCardsProps) {
  const [current, setCurrent] = createStore({
    characters: Array.from(
      { length: 3 },
      () => null,
    ) as (DeckDataCharacterInfo | null)[],
    cards: Array.from(
      { length: 30 },
      () => null,
    ) as (DeckDataActionCardInfo | null)[],
  });

  const [deckPage, setDeckPage] = createSignal<boolean>(false);

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
      }),
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
    <div 
      class="flex-shrink-0 flex flex-col items-center justify-center gap-3 fixed left-0 bottom-0 w-100vw h-60 z-2 bg-white b-t-1 data-[deck-page=true]:h-160 md:relative md:w-auto md:h-auto md:b-0"
      data-deck-page={deckPage()}
      onClick={(e) => {
        if (e.currentTarget === e.target) {
          setDeckPage(!deckPage());
        }
      }}
    >
      <div>
        <ul class="flex flex-row gap-3">
          <For each={current.characters}>
            {(ch, idx) => (
              <li
                class="w-8 h-8 relative group data-[deck-page=true]:w-75px data-[deck-page=true]:h-auto data-[deck-page=true]:aspect-ratio-[7/12] md:w-75px md:h-auto md:aspect-ratio-[7/12]"
                data-deck-page={deckPage()}
                data-warn={ch && ch.version > props.version}
                onClick={() => ch && removeCharacter(idx())}
              >
                <Show
                  when={ch}
                  fallback={
                    <div class="w-full h-full rounded-lg bg-gray-200" />
                  }
                >
                  {(ch) => (
                    <>
                      <Card id={ch().id} type="character" name={ch().name} />
                      <div class="absolute left-1/2 top-1/2 translate-x--1/2 translate-y--1/2 text-2xl group-data-[warn=true]:block hidden pointer-events-none">
                        &#9888;
                      </div>
                      <div class="absolute left-1/2 top-1/2 translate-x--1/2 translate-y--1/2 text-2xl group-hover:block hidden pointer-events-none text-red-500">
                        &#10060;
                      </div>
                    </>
                  )}
                </Show>
              </li>
            )}
          </For>
        </ul>
      </div>
      <div>
        <ul 
          class="grid grid-cols-10 gap-1 data-[deck-page=true]:grid-cols-6 data-[deck-page=true]:gap-2 md:grid-cols-6 md:gap-2"
          data-deck-page={deckPage()}
        >
          <For each={current.cards}>
            {(ac, idx) => (
              <li
                class="w-8 aspect-ratio-[7/12] relative group data-[deck-page=true]:w-50px md:w-50px"
                data-deck-page={deckPage()}
                data-warn={ac && ac.version > props.version}
                onClick={() => ac && removeActionCard(idx())}
              >
                <Show
                  when={ac}
                  fallback={
                    <div class="w-full h-full rounded-lg bg-gray-200" />
                  }
                >
                  {(ac) => (
                    <>
                      <Card id={ac().id} type="actionCard" name={ac().name} />
                      <div class="absolute left-1/2 top-1/2 translate-x--1/2 translate-y--1/2 text-2xl group-data-[warn=true]:block hidden pointer-events-none">
                        &#9888;
                      </div>
                      <div class="absolute left-1/2 top-1/2 translate-x--1/2 translate-y--1/2 text-2xl group-hover:block hidden pointer-events-none text-red-500">
                        &#10060;
                      </div>
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
