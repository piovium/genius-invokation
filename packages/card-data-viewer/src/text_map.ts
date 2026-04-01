// Copyright (C) 2025 Guyutongxue
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

import type { I18nKey } from "./locales";

const TEXT_MAP_KEYS: Record<string, I18nKey> = {
  GCG_SKILL_TAG_A: "skillNormal",
  GCG_SKILL_TAG_E: "skillElemental",
  GCG_SKILL_TAG_Q: "skillBurst",
  GCG_SKILL_TAG_PASSIVE: "skillPassive",
  GCG_SKILL_TAG_VEHICLE: "skillTechnique",
  GCG_CARD_EVENT: "cardEvent",
  GCG_CARD_MODIFY: "cardModify",
  GCG_CARD_ASSIST: "cardAssist",
  GCG_CARD_SUMMON: "cardSummon",
  GCG_CARD_STATE: "cardState",
  GCG_CARD_ONSTAGE: "cardOnstage",
  GCG_CARD_ATTACHMENT: "cardAttachment",
  GCG_TAG_UNIQUE: "unique",
  GCG_TAG_SLOWLY: "slowly",
  GCG_TAG_FORBIDDEN_ATTACK: "forbiddenAttack",
  GCG_TAG_IMMUNE_FREEZING: "immuneFreezing",
  GCG_TAG_IMMUNE_CONTROL: "immuneControl",
  GCG_TAG_FALL_ATTACK: "fallAttack",
  GCG_TAG_NATION_MONDSTADT: "mondstadt",
  GCG_TAG_NATION_LIYUE: "liyue",
  GCG_TAG_NATION_INAZUMA: "inazuma",
  GCG_TAG_NATION_SUMERU: "sumeru",
  GCG_TAG_NATION_FONTAINE: "fontaine",
  GCG_TAG_NATION_NATLAN: "natlan",
  GCG_TAG_NATION_NODKRAI: "nodkrai",
  GCG_TAG_NATION_SNEZHNAYA: "snezhnaya",
  GCG_TAG_NATION_KHAENRIAH: "khaenriah",
  GCG_TAG_NATION_COSMIC_CALAMITY: "cosmicCalamity",
  GCG_TAG_CAMP_FATUI: "fatui",
  GCG_TAG_CAMP_HILICHURL: "hilichurl",
  GCG_TAG_CAMP_MONSTER: "monster",
  GCG_TAG_CAMP_KAIRAGI: "kairagi",
  GCG_TAG_CAMP_EREMITE: "eremite",
  GCG_TAG_CAMP_SACREAD: "sacred",
  GCG_TAG_WEAPON_NONE: "weaponNone",
  GCG_TAG_WEAPON_CATALYST: "catalyst",
  GCG_TAG_WEAPON_BOW: "bow",
  GCG_TAG_WEAPON_CLAYMORE: "claymore",
  GCG_TAG_WEAPON_POLE: "pole",
  GCG_TAG_WEAPON_SWORD: "sword",
  GCG_TAG_ELEMENT_NONE: "elementNone",
  GCG_TAG_ELEMENT_CRYO: "cryo",
  GCG_TAG_ELEMENT_HYDRO: "hydro",
  GCG_TAG_ELEMENT_PYRO: "pyro",
  GCG_TAG_ELEMENT_ELECTRO: "electro",
  GCG_TAG_ELEMENT_ANEMO: "anemo",
  GCG_TAG_ELEMENT_GEO: "geo",
  GCG_TAG_ELEMENT_DENDRO: "dendro",
  GCG_TAG_WEAPON: "weapon",
  GCG_TAG_ARTIFACT: "artifact",
  GCG_TAG_TALENT: "talent",
  GCG_TAG_SHEILD: "shield",
  GCG_TAG_VEHICLE: "vehicle",
  GCG_TAG_PLACE: "place",
  GCG_TAG_ALLY: "ally",
  GCG_TAG_ITEM: "item",
  GCG_TAG_RESONANCE: "resonance",
  GCG_TAG_FOOD: "food",
  GCG_TAG_LEGEND: "legend",
  GCG_TAG_DENDRO_PRODUCE: "dendroProduce",
  GCG_TAG_ARKHE_PNEUMA: "pneuma",
  GCG_TAG_ARKHE_OUSIA: "ousia",
  GCG_TAG_CARD_BLESSING: "blessing",
  GCG_TAG_NYX_STATE: "nyxState",
  GCG_TAG_NATION_SIMULANKA: "simulanka",
  GCG_TAG_ADVENTURE_PLACE: "adventurePlace",
  GCG_TAG_PREPARE_SKILL: "prepareSkill",  
};

export const typeTagText = (
  type: string,
  t: (key: I18nKey) => string,
): string | undefined => {
  const key = TEXT_MAP_KEYS[type];
  return key ? t(key) : void 0;
};
