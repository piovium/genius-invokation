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
import { Card } from "./Card";
import type { AllCardsProps } from "./AllCards";
import {
  ELEMENT_TAG_IMG_NAME_MAP,
  NATION_TAG_IMG_NAME_MAP,
  TagIcon,
  WEAPON_TAG_IMG_NAME_MAP,
} from "./TagIcon";
import { Key } from "@solid-primitives/keyed";
import type { DeckDataCharacterInfo } from "@gi-tcg/assets-manager";

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
      <div class="flex-shrink-0 h-12 flex flex-row overflow-x-auto overflow-y-hidden gap-1 mb-2 [scrollbar-width:thin]">
        <For each={Object.keys(ELEMENT_TAG_IMG_NAME_MAP)}>
          {(tag) => (
            <button
              onClick={() => toggleElementTag(tag)}
              data-selected={elementTag() === tag}
              class="flex-shrink-0 bg-gray-100 data-[selected=true]:bg-black w-10 h-full flex flex-col items-center justify-center"
            >
              <TagIcon tagName={tag} />
            </button>
          )}
        </For>
        <For each={Object.keys(WEAPON_TAG_IMG_NAME_MAP)}>
          {(tag) => (
            <button
              onClick={() => toggleWeaponTag(tag)}
              data-selected={weaponTag() === tag}
              class="flex-shrink-0 bg-gray-900 data-[selected=false]:filter-invert w-10 h-full flex flex-col items-center justify-center"
            >
              <TagIcon tagName={tag} />
            </button>
          )}
        </For>
        <For each={Object.keys(NATION_TAG_IMG_NAME_MAP)}>
          {(tag) => (
            <button
              onClick={() => toggleNationTag(tag)}
              data-selected={nationTag() === tag}
              class="flex-shrink-0 bg-gray-900 data-[selected=false]:filter-invert w-10 h-full flex flex-col items-center justify-center"
            >
              <TagIcon tagName={tag} />
            </button>
          )}
        </For>
      </div>
      <ul class="flex-grow overflow-auto flex flex-row flex-wrap gap-2">
        <Key each={props.characters.values().toArray()} by="id">
          {(ch) => (
            <li
              class="hidden data-[shown=true]-block relative cursor-pointer data-[disabled=true]:cursor-not-allowed data-[disabled=true]:opacity-60 data-[disabled=true]:filter-none hover:brightness-110 transition-all"
              data-shown={shown(ch())}
              data-disabled={fullCharacters() && !selected(ch().id)}
              onClick={() => toggleCharacter(ch().id)}
            >
              <div class="w-[60px]">
                <Card
                  id={ch().id}
                  type="character"
                  name={ch().name}
                  selected={selected(ch().id)}
                />
                <Show when={selected(ch().id)}>
                  <div class="absolute left-1/2 top-1/2 translate-x--1/2 translate-y--1/2 text-2xl z-1 pointer-events-none">
                    &#9989;
                  </div>
                </Show>
              </div>
            </li>
          )}
        </Key>
      </ul>
    </div>
  );
}
