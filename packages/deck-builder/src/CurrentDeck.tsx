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
import DeleteIcon from "./Delete.svg";

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

  const deckPage = () => props.deckPage ?? false;

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
    <div
      class="flex-shrink-0 flex flex-col items-center justify-center gap-3 group-[xxx.mobile]:data-[deck-page=false]:gap-1"
      data-deck-page={deckPage()}
    >
      <ul
        class="flex flex-row gap-3 group-[xxx.mobile]:data-[deck-page=false]:hidden"
        data-deck-page={deckPage()}
      >
        <For each={current.characters}>
          {(ch, idx) => (
            <li
              class="relative group data-[deck-page=true]:w-70px w-75px"
              data-deck-page={deckPage()}
              onClick={() => ch && removeCharacter(idx())}
            >
              <Show
                when={ch}
                fallback={
                  <div class="w-full b-gray-3! border-2 rounded-lg overflow-clip">
                    <div class="w-full aspect-ratio-[7/12] bg-gray-200" />
                  </div>
                }
              >
                {(ch) => (
                  <DeckCard
                    id={ch().id}
                    type="character"
                    name={ch().name}
                    warn={ch().version > props.version}
                  />
                )}
              </Show>
            </li>
          )}
        </For>
      </ul>
      <ul
        class="grid grid-cols-6 gap-2 group-[xxx.mobile]:data-[deck-page=false]:hidden"
        data-deck-page={deckPage()}
      >
        <For each={current.cards}>
          {(ac, idx) => (
            <li
              class="relative group data-[deck-page=true]:w-45px w-50px"
              data-deck-page={deckPage()}
              onClick={() => ac && removeActionCard(idx())}
            >
              <Show
                when={ac}
                fallback={
                  <div class="w-full b-gray-3! border-2 rounded-lg overflow-clip">
                    <div class="w-full aspect-ratio-[7/12] bg-gray-200" />
                  </div>
                }
              >
                {(ac) => (
                  <DeckCard
                    id={ac().id}
                    type="actionCard"
                    name={ac().name}
                    warn={ac().version > props.version}
                  />
                )}
              </Show>
            </li>
          )}
        </For>
      </ul>
      <ul
        class="hidden flex-row gap-2 group-[xxx.mobile]:data-[deck-page=false]:flex"
        data-deck-page={deckPage()}
      >
        <For each={current.characters}>
          {(ch, idx) => (
            <li
              class="w-10 h-10 rounded-full relative group"
              onClick={() => ch && removeCharacter(idx())}
            >
              <Show
                when={ch}
                fallback={
                  <div class="w-full h-full rounded-full b-gray-3! border-2 bg-gray-200 overflow-clip" />
                }
              >
                {(ch) => (
                  <TinyCharacterCard
                    id={ch().id}
                    warn={ch().version > props.version}
                  />
                )}
              </Show>
            </li>
          )}
        </For>
      </ul>
      <ul
        class="hidden grid-cols-15 gap-1 group-[xxx.mobile]:data-[deck-page=false]:grid"
        data-deck-page={deckPage()}
      >
        <For each={current.cards}>
          {(ac, idx) => (
            <li
              class="w-7 relative group"
              data-deck-page={deckPage()}
              onClick={() => ac && removeActionCard(idx())}
            >
              <Show
                when={ac}
                fallback={
                  <div class="w-full b-gray-3! border-2 rounded-md overflow-clip">
                    <div class="w-full aspect-ratio-[7/12] bg-gray-200" />
                  </div>
                }
              >
                {(ac) => (
                  <TinyActionCard
                    id={ac().id}
                    warn={ac().version > props.version}
                  />
                )}
              </Show>
            </li>
          )}
        </For>
      </ul>
    </div>
  );
}
