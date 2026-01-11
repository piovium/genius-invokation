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

import { For, Show, createSignal } from "solid-js";
import { PoolCard } from "./Card";
import type { AllCardsProps } from "./AllCards";
import {
  ELEMENT_TAG_IMG_NAME_MAP,
  NATION_TAG_IMG_NAME_MAP,
  TagIcon,
  WEAPON_TAG_IMG_NAME_MAP,
} from "./TagIcon";
import { Key } from "@solid-primitives/keyed";
import type { DeckDataCharacterInfo } from "@gi-tcg/assets-manager";
import FilterIcon from "./Filter.svg";
import DeleteIcon from "./Delete.svg";

export function AllCharacterCards(props: AllCardsProps) {
  const [elementTag, setElementTag] = createSignal<string | null>(null);
  const [weaponTag, setWeaponTag] = createSignal<string | null>(null);
  // 还是做成单选吧
  const [nationTag, setNationTag] = createSignal<string | null>(null);
  const shown = (ch: DeckDataCharacterInfo) => {
    const element = elementTag();
    const weapon = weaponTag();
    const nation = nationTag();
    const tags: string[] = [];
    if (element) {
      tags.push(element);
    }
    if (weapon) {
      tags.push(weapon);
    }
    if (nation) {
      tags.push(nation);
    }
    return (
      ch.version <= props.version && tags.every((t) => ch.tags.includes(t))
    );
  };

  const toggleElementTag = (tag: string) => {
    if (elementTag() === tag) {
      setElementTag(null);
    } else {
      setElementTag(tag);
    }
  };
  const toggleWeaponTag = (tag: string) => {
    if (weaponTag() === tag) {
      setWeaponTag(null);
    } else {
      setWeaponTag(tag);
    }
  };
  const toggleNationTag = (tag: string) => {
    if (nationTag() === tag) {
      setNationTag(null);
    } else {
      setNationTag(tag);
    }
  };

  const selected = (id: number) => {
    return props.deck.characters.includes(id);
  };
  const fullCharacters = () => {
    return props.deck.characters.length >= 3;
  };

  const toggleCharacter = (id: number) => {
    if (selected(id)) {
      props.onChangeDeck?.({
        ...props.deck,
        characters: props.deck.characters.filter((ch) => ch !== id),
      });
    } else if (!fullCharacters()) {
      const newChs = [...props.deck.characters, id];
      props.onChangeDeck?.({
        ...props.deck,
        characters: newChs,
      });
      // Automatically switch to action card tab
      if (newChs.length === 3) {
        setTimeout(() => props.onSwitchTab?.(1), 100);
      }
    }
  };
  return (
    <div class="h-full flex flex-col">
      <div class="h-8 w-full flex-row mb-2 flex relative">
        <Show
          when={elementTag() || weaponTag() || nationTag()}
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
              setElementTag(null);
              setWeaponTag(null);
              setNationTag(null);
            }}
          >
            <span class="text-4 font-bold">清除</span>
            <img src={DeleteIcon} class="w-5 h-5" />
            <div class="absolute bottom-0 left-50% translate-x--50% translate-y-50% flex-shrink-0 rounded-full h-3 flex flex-row gap-1 items-center">
              <For each={Object.keys(ELEMENT_TAG_IMG_NAME_MAP)}>
                {(tag) => (
                  <div
                    data-selected={elementTag() === tag}
                    class="flex-shrink-0 bg-gray-100 children:opacity-50 w-3 h-3 hidden data-[selected=true]:flex flex-col items-center justify-center rounded-full"
                  >
                    <TagIcon tagName={tag} />
                  </div>
                )}
              </For>
              <For each={Object.keys(WEAPON_TAG_IMG_NAME_MAP)}>
                {(tag) => (
                  <div
                    data-selected={weaponTag() === tag}
                    class="flex-shrink-0 bg-gray-100 children:opacity-50 children:filter-invert w-3 h-3 hidden data-[selected=true]:flex flex-col items-center justify-center rounded-full"
                  >
                    <TagIcon tagName={tag} />
                  </div>
                )}
              </For>
              <For each={Object.keys(NATION_TAG_IMG_NAME_MAP)}>
                {(tag) => (
                  <div
                    data-selected={nationTag() === tag}
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
            <For each={Object.keys(ELEMENT_TAG_IMG_NAME_MAP)}>
              {(tag) => (
                <button
                  onClick={() => toggleElementTag(tag)}
                  bool:data-selected={elementTag() === tag}
                  class="flex-shrink-0 bg-gray-100 opacity-25 data-[selected]:opacity-100 w-7 h-7 flex flex-col items-center justify-center rounded-full"
                >
                  <TagIcon tagName={tag} />
                </button>
              )}
            </For>
            <For each={Object.keys(WEAPON_TAG_IMG_NAME_MAP)}>
              {(tag) => (
                <button
                  onClick={() => toggleWeaponTag(tag)}
                  bool:data-selected={weaponTag() === tag}
                  class="flex-shrink-0 bg-gray-100 opacity-25 children:filter-invert data-[selected]:opacity-100 w-7 h-7 flex flex-col items-center justify-center rounded-full"
                >
                  <TagIcon tagName={tag} />
                </button>
              )}
            </For>
            <For each={Object.keys(NATION_TAG_IMG_NAME_MAP)}>
              {(tag) => (
                <button
                  onClick={() => toggleNationTag(tag)}
                  bool:data-selected={nationTag() === tag}
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
        <Key each={props.characters.values().toArray()} by="id">
          {(ch) => (
            <li
              class="hidden data-[shown=true]-block relative cursor-pointer data-[disabled=true]:cursor-not-allowed data-[disabled=true]:opacity-60 data-[disabled=true]:filter-none hover:brightness-110 transition-all"
              data-shown={shown(ch())}
              data-disabled={fullCharacters() && !selected(ch().id)}
              onClick={() => toggleCharacter(ch().id)}
            >
              <PoolCard
                id={ch().id}
                type="character"
                name={ch().name}
                selected={selected(ch().id)}
              />
            </li>
          )}
        </Key>
      </ul>
    </div>
  );
}
