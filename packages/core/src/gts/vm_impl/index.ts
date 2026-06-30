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

import { defineViewModel, type AR } from "@gi-tcg/gts-runtime";
import { CharacterViewModel } from "./character";
import {
  registerAttachment,
  registerCharacter,
  registerEntity,
  registerExtension,
  registerInitiativeSkill,
  registerPassiveSkill,
} from "../../builder/registry";
import { EntityViewModel, type DefaultEntityVMMeta } from "./entity";
import { AttachmentViewModel } from "./attachment";
import { ExtensionViewModel } from "./extension";
import { CharacterSkillViewModel } from "./skill";
import type { AttachmentDefinition, EntityDefinition } from "../..";
import { CardViewModel } from "./card";
import { RESERVED } from "./reserved";

export default defineViewModel(class RootModel {}, (h) => ({
  character: h.attribute<{
    (): AR.With<typeof CharacterViewModel>;
  }>((_, [], subView) => {
    const character = CharacterViewModel.parse(subView).getEntry();
    registerCharacter(character);
  }, CharacterViewModel),
  skill: h.attribute<{
    (): AR.With<typeof CharacterSkillViewModel>;
  }>((_, [], subView) => {
    const skill = CharacterSkillViewModel.parse(subView).getEntry();
    if (skill === RESERVED) {
      return;
    } else if (skill.type === "initiativeSkill") {
      registerInitiativeSkill(skill);
    } else {
      registerPassiveSkill(skill);
    }
  }, CharacterSkillViewModel),
  status: h.attribute<{
    (): AR.With<typeof EntityViewModel, DefaultEntityVMMeta<"status">>;
  }>((_, [], subView) => {
    const entityModel = EntityViewModel.parse(subView, "status");
    const entry = entityModel.getEntry();
    if (entry !== RESERVED) {
      registerEntity(entry as EntityDefinition);
    }
  }, EntityViewModel.bind<DefaultEntityVMMeta<"status">>("status")),
  combatStatus: h.attribute<{
    (): AR.With<typeof EntityViewModel, DefaultEntityVMMeta<"combatStatus">>;
  }>((_, [], subView) => {
    const entityModel = EntityViewModel.parse(subView, "combatStatus");
    const entry = entityModel.getEntry();
    if (entry !== RESERVED) {
      registerEntity(entry as EntityDefinition);
    }
  }, EntityViewModel.bind<DefaultEntityVMMeta<"combatStatus">>("combatStatus")),
  summon: h.attribute<{
    (): AR.With<typeof EntityViewModel, DefaultEntityVMMeta<"summon">>;
  }>((_, [], subView) => {
    const entityModel = EntityViewModel.parse(subView, "summon");
    const entry = entityModel.getEntry();
    if (entry !== RESERVED) {
      registerEntity(entry as EntityDefinition);
    }
  }, EntityViewModel.bind<DefaultEntityVMMeta<"summon">>("summon")),
  card: h.attribute<{
    (): AR.With<typeof CardViewModel>;
  }>((_, [], subView) => {
    const cardModel = CardViewModel.parse(subView);
    const entry = cardModel.getEntry();
    if (entry !== RESERVED) {
      registerEntity(entry as EntityDefinition);
    }
  }, CardViewModel),
  attachment: h.attribute<{
    (): AR.With<typeof AttachmentViewModel>;
  }>((_, [], subView) => {
    const attachmentModel = AttachmentViewModel.parse(subView);
    const entry = attachmentModel.getEntry();
    if (entry !== RESERVED) {
      registerAttachment(entry as AttachmentDefinition);
    }
  }, AttachmentViewModel),
  extension: h.attribute<{
    (): AR.With<typeof ExtensionViewModel>;
  }>((_, [], subView) => {
    const extension = ExtensionViewModel.parse(subView).getEntry();
    registerExtension(extension);
  }, ExtensionViewModel),
}));
