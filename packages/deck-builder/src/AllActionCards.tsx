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

import { createEffect, createMemo, createSignal } from "solid-js";
import { PoolCard } from "./Card";
import type { AllCardsProps } from "./AllCards";
import { Key } from "@solid-primitives/keyed";
import type { DeckDataActionCardInfo } from "@gi-tcg/assets-manager";
import { CARD_TAG_IMG_NAME_MAP, CARD_TYPE_TEXT_MAP, TagIcon } from "./TagIcon";
import { FilterBar } from "./FilterBar";

const SINGLETON_REQUIRED_TAGS = [
  "GCG_TAG_LEGEND",
  "GCG_TAG_CARD_BLESSING",
];

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
    return props.actionCards.get(id)?.tags.some(
      (tag) => SINGLETON_REQUIRED_TAGS.includes(tag)
    ) ? 1 : 2;
  };

  const toggleCard = (id: number) => {
    const cnt = count(id);
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

  const toggleType = (tag: string | null) => {
    if (acType() === tag) {
      setAcType(null);
    } else {
      setAcType(tag);
    }
  };
  const toggleTag = (tag: string | null) => {
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
    return true;
  };

  const sortedActionCards = createMemo(() => {
    return props.actionCards.values().toArray().toSorted((a, b) => {
      const aValid = valid(a);
      const bValid = valid(b);
      if (aValid && !bValid) return -1;
      if (!aValid && bValid) return 1;
      return 0;
    });
  });

  const selected = (id: number) => maxCount(id) === count(id);
  const partialSelected = (id: number) =>
    !!count(id) && count(id) !== maxCount(id);

  return (
    <div class="h-full flex flex-col">
      <FilterBar
        filterSelections={[
          {
            name: "卡牌类型",
            selected: acType,
            onSelect: (value) => toggleType(value),
            option: CARD_TYPE_TEXT_MAP,
          },
          {
            name: "卡牌标签",
            selected: acTag,
            onSelect: (value) => toggleTag(value),
            option: CARD_TAG_IMG_NAME_MAP,
          },
        ]}
      />
      <ul class="flex-grow overflow-auto grid grid-cols-[repeat(auto-fill,minmax(60px,1fr))] gap-2 pb-2 @3xl:pb-0 [scrollbar-width:thin]">
        <Key each={sortedActionCards()} by="id">
          {(ac) => (
            <li
              class="hidden data-[shown]-block relative cursor-pointer data-[disabled]:cursor-not-allowed data-[disabled]:opacity-60 data-[disabled]:filter-none hover:brightness-110"
              bool:data-shown={shown(ac())}
              bool:data-disabled={fullCards() && !count(ac().id)}
              onClick={() => {
                if (valid(ac())) {
                  toggleCard(ac().id)
                }
              }}
            >
              <PoolCard
                id={ac().id}
                type="actionCard"
                name={ac().name}
                valid={valid(ac())}
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
