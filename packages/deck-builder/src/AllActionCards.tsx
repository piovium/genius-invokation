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

const AC_TYPE_TEXT = {
  GCG_CARD_MODIFY: {
    name: "装备牌",
    tags: {
      GCG_TAG_WEAPON: "武器",
      GCG_TAG_WEAPON_BOW: "弓",
      GCG_TAG_WEAPON_SWORD: "单手剑",
      GCG_TAG_WEAPON_CLAYMORE: "双手剑",
      GCG_TAG_WEAPON_POLE: "长柄武器",
      GCG_TAG_WEAPON_CATALYST: "法器",
      GCG_TAG_ARTIFACT: "圣遗物",
      GCG_TAG_VEHICLE: "特技",
      GCG_TAG_TALENT: "天赋",
    },
  },
  GCG_CARD_EVENT: {
    name: "事件牌",
    tags: {
      GCG_TAG_LEGEND: "秘传",
      GCG_TAG_FOOD: "食物",
      GCG_TAG_RESONANCE: "元素共鸣",
      GCG_TAG_TALENT: "天赋",
    },
  },
  GCG_CARD_ASSIST: {
    name: "支援牌",
    tags: {
      GCG_TAG_PLACE: "场地",
      GCG_TAG_ALLY: "伙伴",
      GCG_TAG_ITEM: "道具",
      GCG_TAG_CARD_BLESSING: "元素幻变",
    },
  },
};

const SINGLETON_REQUIRED_TAGS = [
  "GCG_TAG_LEGEND",
  "GCG_TAG_CARD_BLESSING",
];

export function AllActionCards(props: AllCardsProps) {
  const [acType, setAcType] =
    createSignal<keyof typeof AC_TYPE_TEXT>("GCG_CARD_MODIFY");
  const [acTag, setAcTag] = createSignal<string>("");

  const availableTags = () => AC_TYPE_TEXT[acType()].tags as Record<string, string>;

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
      (c) => props.characters.get(c)?.tags ?? [],
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

  const shown = (ac: DeckDataActionCardInfo) => {
    const ty = acType();
    const tag = acTag();
    if (ac.version > props.version) {
      return false;
    }
    if (ty !== null && ac.type !== ty) {
      return false;
    }
    if (tag !== "" && !ac.tags.includes(tag)) {
      return false;
    }
    return valid(ac);
  };

  const selected = (id: number) => maxCount(id) === count(id);
  const partialSelected = (id: number) =>
    !!count(id) && count(id) !== maxCount(id);

  return (
    <div class="h-full flex flex-col">
      <div class="flex flex-row gap-2 mb-2">
        <For each={Object.keys(AC_TYPE_TEXT)}>
          {(ty, i) => (
            <button
              onClick={() => (
                setAcType(ty as keyof typeof AC_TYPE_TEXT), setAcTag("")
              )}
              data-selected={acType() === ty}
              class="flex-shrink-0 data-[selected=true]:font-bold"
            >
              {AC_TYPE_TEXT[ty as keyof typeof AC_TYPE_TEXT].name}
            </button>
          )}
        </For>
        <select
          class="flex-grow border-black border-1px"
          value={acTag()}
          onChange={(e) => setAcTag(e.target.value)}
        >
          <option value="">不限标签</option>
          <For each={Object.keys(availableTags())}>
            {(tag) => (
              <option value={tag}>{availableTags()[(tag)]}</option>
            )}
          </For>
        </select>
      </div>
      <ul class="flex-grow overflow-auto flex flex-row flex-wrap gap-2">
        <Key each={props.actionCards.values().toArray()} by="id">
          {(ac) => (
            <li
              class="hidden data-[shown=true]-block relative cursor-pointer data-[disabled=true]:cursor-not-allowed data-[disabled=true]:opacity-60 data-[disabled=true]:filter-none hover:brightness-110"
              data-shown={shown(ac())}
              data-disabled={fullCards() && !count(ac().id)}
              onClick={() => toggleCard(ac().id)}
            >
              <div class="w-[60px]">
                <Card
                  id={ac().id}
                  type="actionCard"
                  name={ac().name}
                  selected={selected(ac().id)}
                  partialSelected={partialSelected(ac().id)}
                />
                <Show when={count(ac().id)}>
                  <Show
                    when={selected(ac().id)}
                    fallback={
                      <div class="absolute left-1/2 top-1/2 translate-x--1/2 translate-y--1/2 text-2xl z-1 pointer-events-none">
                        &#128993;
                      </div>
                    }
                  >
                    <div class="absolute left-1/2 top-1/2 translate-x--1/2 translate-y--1/2 text-2xl z-1 pointer-events-none">
                      &#9989;
                    </div>
                  </Show>
                </Show>
              </div>
            </li>
          )}
        </Key>
      </ul>
    </div>
  );
}
