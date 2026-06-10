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
import { CardViewModel, EntityViewModel } from "./entity";
import { AttachmentViewModel } from "./attachment";
import { ExtensionViewModel } from "./extension";
import { CharacterSkillViewModel } from "./skill";

export default defineViewModel(class RootModel {}, (h) => ({
  character: h.attribute<{
    (): AR.With<typeof CharacterViewModel>;
  }>((_, [], subView) => {
    const character = CharacterViewModel.parse(subView).getEntry();
    registerCharacter(character);
  }),
  skill: h.attribute<{
    (): AR.With<typeof CharacterSkillViewModel>;
  }>((_, [], subView) => {
    const skill = CharacterSkillViewModel.parse(subView).getEntry();
    if (skill.type === "initiativeSkill") {
      registerInitiativeSkill(skill);
    } else {
      registerPassiveSkill(skill);
    }
  }),
  status: h.attribute<{
    (): AR.With<typeof EntityViewModel>;
  }>((_, [], subView) => {
    const entity = EntityViewModel.parse(subView, "status").getEntry();
    registerEntity(entity);
  }),
  combatStatus: h.attribute<{
    (): AR.With<typeof EntityViewModel>;
  }>((_, [], subView) => {
    const entity = EntityViewModel.parse(subView, "combatStatus").getEntry();
    registerEntity(entity);
  }),
  summon: h.attribute<{
    (): AR.With<typeof EntityViewModel>;
  }>((_, [], subView) => {
    const entity = EntityViewModel.parse(subView, "summon").getEntry();
    registerEntity(entity);
  }),
  card: h.attribute<{
    (): AR.With<typeof CardViewModel>;
  }>((_, [], subView) => {
    const entity = CardViewModel.parse(subView).getEntry();
    registerEntity(entity);
  }),
  attachment: h.attribute<{
    (): AR.With<typeof AttachmentViewModel>;
  }>((_, [], subView) => {
    const attachment = AttachmentViewModel.parse(subView).getEntry();
    registerAttachment(attachment);
  }),
  extension: h.attribute<{
    (): AR.With<typeof ExtensionViewModel>;
  }>((_, [], subView) => {
    const extension = ExtensionViewModel.parse(subView).getEntry();
    registerExtension(extension);
  }),
}));
