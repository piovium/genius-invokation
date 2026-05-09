// Copyright (C) 2026 Piovium Labs
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

import enNames from "./data/EN/names.json";
import chsNames from "./data/CHS/names.json";
import type { Language } from "./manager";

export function getNameSync(language: Language, id: number): string | undefined {
  const namesJson = language === "CHS" ? chsNames : enNames;
  const name = (namesJson as Record<number, string>)[id];
  return name;
}

export function getAllNamesSync(language: Language): Record<number, string> {
  const namesJson = language === "CHS" ? chsNames : enNames;
  return namesJson as Record<number, string>;
}
