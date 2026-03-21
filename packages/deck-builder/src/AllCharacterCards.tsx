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

import { createSignal } from "solid-js";
import { PoolCard } from "./Card";
import type { AllCardsProps } from "./AllCards";
import {
  ELEMENT_TAG_IMG_NAME_MAP,
  NATION_TAG_IMG_NAME_MAP,
  WEAPON_TAG_IMG_NAME_MAP,
} from "./TagIcon";
import { FilterBar } from "./FilterBar";
import { Key } from "@solid-primitives/keyed";
import type { DeckDataCharacterInfo } from "@gi-tcg/assets-manager";
import { useDeckBuilderContext } from "./DeckBuilder";

export function AllCharacterCards(props: AllCardsProps) {
  const { t } = useDeckBuilderContext();
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

  const toggleElementTag = (tag: string | null) => {
    if (elementTag() === tag) {
      setElementTag(null);
    } else {
      setElementTag(tag);
    }
  };
  const toggleWeaponTag = (tag: string | null) => {
    if (weaponTag() === tag) {
      setWeaponTag(null);
    } else {
      setWeaponTag(tag);
    }
  };
  const toggleNationTag = (tag: string | null) => {
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
      <FilterBar
        filterSelections={[
          {
            name: t("elementType"),
            selected: elementTag,
            onSelect: (value) => toggleElementTag(value),
            option: ELEMENT_TAG_IMG_NAME_MAP,
          },
          {
            name: t("weaponType"),
            selected: weaponTag,
            onSelect: (value) => toggleWeaponTag(value),
            option: WEAPON_TAG_IMG_NAME_MAP,
          },
          {
            name: t("faction"),
            selected: nationTag,
            onSelect: (value) => toggleNationTag(value),
            option: NATION_TAG_IMG_NAME_MAP,
          },
        ]}
      />
      <ul class="flex-grow overflow-auto grid grid-cols-[repeat(auto-fill,minmax(60px,1fr))] gap-2 pb-2 @3xl:pb-0 [scrollbar-width:thin]">
        <Key each={props.characters.values().toArray()} by="id">
          {(ch) => (
            <li
              class="hidden data-[shown]-block relative cursor-pointer data-[disabled]:cursor-not-allowed data-[disabled]:opacity-60 data-[disabled]:filter-none hover:brightness-110 transition-all"
              bool:data-shown={shown(ch())}
              bool:data-disabled={fullCharacters() && !selected(ch().id)}
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
