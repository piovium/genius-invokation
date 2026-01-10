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

import { For, Show, createEffect, createMemo, createSignal } from "solid-js";
import { Card } from "./Card";
import type { AllCardsProps } from "./AllCards";
import { Key } from "@solid-primitives/keyed";
import type { DeckData, DeckDataActionCardInfo } from "@gi-tcg/assets-manager";
import FilterIcon from "./Filter.svg";
import DeleteIcon from "./Delete.svg";
import { CARD_TAG_IMG_NAME_MAP, TagIcon } from "./TagIcon";

const AC_TYPE_TEXT = {
  GCG_CARD_MODIFY: "装备牌",
  GCG_CARD_EVENT: "事件牌",
  GCG_CARD_ASSIST: "支援牌",
};

const LEGEND_TAG = "GCG_TAG_LEGEND";

export function AllActionCards(props: AllCardsProps) {
  const [acType, setAcType] = createSignal<string | null>(null);
  const [acTag, setAcTag] = createSignal<string | null>(null);

  const count = (id: number) => {
    return props.deck.cards.filter((c) => c === id).length;
  };
  const fullCards = () => {
    return props.deck.cards.length >= 30;
  };

  // Remove invalid action cards
  createEffect(() => {
    const currentCards = props.deck.cards;
    const result = currentCards.filter((c) => valid(props.actionCards.get(c)!));
    if (result.length < currentCards.length) {
      props.onChangeDeck?.({
        ...props.deck,
        cards: result,
      });
    }
  });
  const maxCount = (id: number) => {
    return props.actionCards.get(id)?.tags.includes(LEGEND_TAG) ? 1 : 2;
  };

  const toggleCard = (id: number) => {
    const cnt = count(id);
    console.log(id);
    if (cnt >= maxCount(id)) {
      props.onChangeDeck?.({
        ...props.deck,
        cards: props.deck.cards.filter((c) => c !== id),
      });
    } else if (!fullCards()) {
      props.onChangeDeck?.({
        ...props.deck,
        cards: [...props.deck.cards, id],
      });
    } else if (cnt) {
      props.onChangeDeck?.({
        ...props.deck,
        cards: props.deck.cards.filter((c) => c !== id),
      });
    }
  };

  const valid = (actionCard: DeckDataActionCardInfo) => {
    const currentCharacters = props.deck.characters;
    const currentChTags = currentCharacters.flatMap(
      (c) => props.characters.get(c)?.tags ?? []
    );
    if (actionCard.relatedCharacterId !== null) {
      return currentCharacters.includes(actionCard.relatedCharacterId);
    }
    if (actionCard.relatedCharacterTag !== null) {
      return (
        currentChTags.filter((t) => t === actionCard.relatedCharacterTag)
          .length >= 2
      );
    }
    return true;
  };

  const toggleType = (tag: string) => {
    if (acType() === tag) {
      setAcType(null);
    } else {
      setAcType(tag);
    }
  };
  const toggleTag = (tag: string) => {
    if (acTag() === tag) {
      setAcTag(null);
    } else {
      setAcTag(tag);
    }
  };

  const shown = (ac: DeckDataActionCardInfo) => {
    const ty = acType();
    const tag = acTag();
    if (ac.version > props.version) {
      return false;
    }
    if (ty !== null && ac.type !== ty) {
      return false;
    }
    if (tag !== null && !ac.tags.includes(tag)) {
      return false;
    }
    return valid(ac);
  };

  const selected = (id: number) => maxCount(id) === count(id);
  const partialSelected = (id: number) =>
    !!count(id) && count(id) !== maxCount(id);

  return (
    <div class="h-full flex flex-col">
      <div class="h-8 w-full flex-row mb-2 flex relative">
        <Show
          when={acType() || acTag()}
          fallback={
            <div class="mr--2 pl-1.5 h-8 w-22 rounded-full bg-purple-300 text-white flex items-center justify-center flex-shrink-0 z-1">
              <span class="text-4 font-bold">筛选</span>
              <img src={FilterIcon} class="w-5 h-5" />
            </div>
          }
        >
          <div
            class="mr--2 pl-1.5 h-8 w-22 rounded-full bg-red-300 text-white flex items-center justify-center flex-shrink-0 z-1 relative"
            onClick={() => {
              setAcType(null);
              setAcTag(null);
            }}
          >
            <span class="text-4 font-bold">清除</span>
            <img src={DeleteIcon} class="w-5 h-5" />
            <div class="absolute bottom-0 left-50% translate-x--50% translate-y-50% flex-shrink-0 rounded-full h-3 flex flex-row gap-1 items-center">
              <For each={Object.keys(AC_TYPE_TEXT)}>
                {(tag) => (
                  <div
                    data-selected={acType() === tag}
                    class="flex-shrink-0 bg-gray-100 w-7 h-3 hidden data-[selected=true]:flex flex-col items-center justify-center rounded-full text-black/50 text-2 text-center"
                  >
                    {AC_TYPE_TEXT[tag as keyof typeof AC_TYPE_TEXT]}
                  </div>
                )}
              </For>
              <For each={Object.keys(CARD_TAG_IMG_NAME_MAP)}>
                {(tag) => (
                  <div
                    data-selected={acTag() === tag}
                    class="flex-shrink-0 bg-gray-100 children:opacity-50 children:filter-invert w-3 h-3 hidden data-[selected=true]:flex flex-col items-center justify-center rounded-full"
                  >
                    <TagIcon tagName={tag} />
                  </div>
                )}
              </For>
            </div>
          </div>
        </Show>
        <div class="h-8 flex-1 rounded-r-full b-purple-200! b-2 b-l-0 b-solid flex-grow overflow-hidden">
          <div class="flex-shrink-0 h-full flex flex-row overflow-x-auto overflow-y-hidden gap-1 mb-2 p-l-3 p-r-1 items-center box-border scrollbar-hidden">
            <For each={Object.keys(AC_TYPE_TEXT)}>
              {(tag) => (
                <button
                  onClick={() => toggleType(tag)}
                  data-selected={acType() === tag}
                  class="flex-shrink-0 bg-gray-100 opacity-25 data-[selected=true]:opacity-100 w-12 h-7 flex flex-col items-center justify-center rounded-full font-bold text-3.5 text-gray-700"
                >
                  {AC_TYPE_TEXT[tag as keyof typeof AC_TYPE_TEXT]}
                </button>
              )}
            </For>
            <For each={Object.keys(CARD_TAG_IMG_NAME_MAP)}>
              {(tag) => (
                <button
                  onClick={() => toggleTag(tag)}
                  bool:data-selected={acTag() === tag}
                  class="flex-shrink-0 bg-gray-100 opacity-25 children:filter-invert data-[selected]:opacity-100 w-7 h-7 flex flex-col items-center justify-center rounded-full"
                >
                  <TagIcon tagName={tag} />
                </button>
              )}
            </For>
          </div>
        </div>
      </div>
      <ul class="flex-grow overflow-auto grid grid-cols-[repeat(auto-fill,minmax(60px,1fr))] gap-2 group-[xxx.mobile]:pb-2! [scrollbar-width:thin]">
        <Key each={props.actionCards.values().toArray()} by="id">
          {(ac) => (
            <li
              class="hidden data-[shown=true]-block relative cursor-pointer data-[disabled=true]:cursor-not-allowed data-[disabled=true]:opacity-60 data-[disabled=true]:filter-none hover:brightness-110"
              data-shown={shown(ac())}
              data-disabled={fullCards() && !count(ac().id)}
              onClick={() => toggleCard(ac().id)}
            >
              <Card
                id={ac().id}
                type="actionCard"
                name={ac().name}
                selected={selected(ac().id)}
                partialSelected={partialSelected(ac().id)}
                selectedCount={count(ac().id)}
              />
            </li>
          )}
        </Key>
      </ul>
    </div>
  );
}
