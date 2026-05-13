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

import {
  SkillContext,
  CardBuilder,
  CharacterBuilder,
  EntityBuilder,
  ExtensionBuilder,
  InitiativeSkillBuilder,
  TechniqueBuilder,
  TriggeredSkillBuilder,
  EVENT_MAP,
} from "@gi-tcg/core/builder/internal";
import { writeFile } from "node:fs/promises";

const OUTPUT_FILE = `${import.meta.dirname}/../src/names.json`;

const propFilter = (name: string) =>
  name !== "constructor" && !name.startsWith("_");

const builder = new Set(
  [
    CardBuilder,
    CharacterBuilder,
    EntityBuilder,
    ExtensionBuilder,
    InitiativeSkillBuilder,
    TechniqueBuilder,
    TriggeredSkillBuilder,
  ]
    .flatMap((cls) => Object.getOwnPropertyNames(cls.prototype))
    .filter(propFilter),
)
  .values()
  .toArray();

const context = new Set(
  Object.getOwnPropertyNames(SkillContext.prototype).filter(propFilter),
)
  .values()
  .toArray();

const event = new Set(
  Object.values(EVENT_MAP)
    .flatMap((cls) => Object.getOwnPropertyNames(cls.prototype))
    .filter(propFilter),
)
  .values()
  .toArray();

await writeFile(
  OUTPUT_FILE,
  JSON.stringify({ builder, context, event }, null, 2),
);
