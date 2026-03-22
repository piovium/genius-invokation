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

import { createResource, Switch, Match } from "solid-js";
import { useDeckBuilderContext } from "./DeckBuilder";
import { cardTypeText } from "./i18n";

export interface DiceIconProps {
  tagName: string;
}

export const ELEMENT_TAG_IMG_NAME_MAP: Record<string, string> = {
  GCG_TAG_ELEMENT_CRYO: "Element_Ice",
  GCG_TAG_ELEMENT_HYDRO: "Element_Water",
  GCG_TAG_ELEMENT_PYRO: "Element_Fire",
  GCG_TAG_ELEMENT_ELECTRO: "Element_Electric",
  GCG_TAG_ELEMENT_ANEMO: "Element_Wind",
  GCG_TAG_ELEMENT_GEO: "Element_Rock",
  GCG_TAG_ELEMENT_DENDRO: "Element_Grass",
};

export const WEAPON_TAG_IMG_NAME_MAP: Record<string, string> = {
  GCG_TAG_WEAPON_BOW: "Weapon_Bow",
  GCG_TAG_WEAPON_SWORD: "Weapon_Sword",
  GCG_TAG_WEAPON_CLAYMORE: "Weapon_Claymore",
  GCG_TAG_WEAPON_POLE: "Weapon_Polearm",
  GCG_TAG_WEAPON_CATALYST: "Weapon_Catalyst",
  GCG_TAG_WEAPON_NONE: "Weapon_None",
};

export const NATION_TAG_IMG_NAME_MAP: Record<string, string> = {
  GCG_TAG_NATION_MONDSTADT: "Faction_Mondstadt",
  GCG_TAG_NATION_LIYUE: "Faction_Liyue",
  GCG_TAG_NATION_INAZUMA: "Faction_Inazuma",
  GCG_TAG_NATION_SUMERU: "Faction_Sumeru",
  GCG_TAG_NATION_FONTAINE: "Faction_Fontaine",
  GCG_TAG_NATION_NATLAN: "Faction_Natlan",
  GCG_TAG_NATION_NODKRAI: "Faction_NodKrai",
  // GCG_TAG_NATION_SNEZHNAYA: "Faction_Snezhnaya",
  GCG_TAG_NATION_COSMIC_CALAMITY: "Faction_CosmicCalamity",
  GCG_TAG_CAMP_EREMITE: "Faction_Eremite",
  GCG_TAG_CAMP_FATUI: "Faction_Fatui",
  GCG_TAG_CAMP_MONSTER: "Faction_Monster",
  GCG_TAG_CAMP_SACREAD: "Faction_Sacred",
  GCG_TAG_CAMP_HILICHURL: "Faction_Hili",
};

export const CARD_TAG_IMG_NAME_MAP: Record<string, string> = {
  GCG_TAG_WEAPON: "Card_Weapon",
  GCG_TAG_ARTIFACT: "Card_Relic",
  GCG_TAG_TALENT: "Card_Talent",
  GCG_TAG_VEHICLE: "Card_Vehicle",
  GCG_TAG_LEGEND: "Card_Legend",
  GCG_TAG_FOOD: "Card_Food",
  GCG_TAG_RESONANCE: "Card_Sync",
  GCG_TAG_PLACE: "Card_Location",
  GCG_TAG_ALLY: "Card_Ally",
  GCG_TAG_ITEM: "Card_Item",
  GCG_TAG_CARD_BLESSING: "Card_Blessing",
};

export const CARD_TYPE_TEXT_MAP: Record<string, string> = {
  GCG_CARD_MODIFY: "GCG_CARD_MODIFY",
  GCG_CARD_EVENT: "GCG_CARD_EVENT",
  GCG_CARD_ASSIST: "GCG_CARD_ASSIST",
};

const ALL_TAG_IMG_NAME_MAP: Record<string, string> = {
  ...ELEMENT_TAG_IMG_NAME_MAP,
  ...WEAPON_TAG_IMG_NAME_MAP,
  ...NATION_TAG_IMG_NAME_MAP,
  ...CARD_TAG_IMG_NAME_MAP,
};

export function TagIcon(props: DiceIconProps) {
  const { assetsManager, t } = useDeckBuilderContext();
  return (
    <Switch
      fallback={
        <img
          src={`https://piovium.github.io/new-card-img-gen/assets/tags/UI_Gcg_Tag_${
            ALL_TAG_IMG_NAME_MAP[props.tagName]
          }.png`}
          class="object-contain filter-invert"
        />
      }
    >
      <Match when={props.tagName.startsWith("GCG_TAG_ELEMENT_")}>
        <img
          src={assetsManager().getRawImageUrlSync(
            "UI_Gcg_Buff_Common_" + ALL_TAG_IMG_NAME_MAP[props.tagName]
          )}
          draggable="false"
          class="object-contain"
        />
      </Match>
      <Match when={props.tagName.startsWith("GCG_CARD_")}>
        <span class="text-gray-700 text-center text-nowrap">
          {cardTypeText(props.tagName, t)}
        </span>
      </Match>
    </Switch>
  );
}
