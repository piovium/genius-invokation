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

import { defineViewModel, type AR } from "@gi-tcg/core/gts/runtime";
import {
  AttachmentModel,
  AttachmentViewModel,
  CardModel,
  CardViewModel,
  CharacterModel,
  CharacterSkillModel,
  CharacterSkillViewModel,
  CharacterViewModel,
  EntityModel,
  EntityViewModel,
  type CharacterSkillVMMeta,
  type DefaultEntityVMMeta,
  type EntityVMMeta,
} from "@gi-tcg/core/gts/vm";
import {
  registerAttachment,
  registerCharacter,
  registerEntity,
  registerInitiativeSkill,
  registerPassiveSkill,
  type AttachmentHandle,
  type CardHandle,
  type CharacterHandle,
  type CharacterInitiativeSkillEntry,
  type CharacterPassiveSkillEntry,
  type EntityDefinition,
  type ExEntityType,
  type HandleT,
  type PassiveSkillHandle,
  type SkillHandle,
} from "@gi-tcg/core/data";
import type {
  AttachmentDefinition,
  EntityType,
  VersionInfo,
} from "@gi-tcg/core";
import { CustomMetadata, getCustomDataRegistration } from "./context";

declare global {
  namespace GiTcg {
    interface VersionMetadata {
      customData: {};
    }
  }
}

const CUSTOM_DATA_VERSION_INFO: VersionInfo = {
  from: "customData",
  value: {},
};

function registerMetadata(md: CustomMetadata) {
  getCustomDataRegistration().registerMetadata(md);
}

export class CustomCharacterModel extends CharacterModel {
  readonly metadata = CustomMetadata.create();

  override set id(id: number) {
    throw new Error(
      `Cannot set id directly here, please use metadata's method`,
    );
  }
  override get id() {
    return this.metadata.id;
  }

  constructor() {
    super();
    this.versionInfo = CUSTOM_DATA_VERSION_INFO;
  }
}

export class CustomCardModel extends CardModel {
  readonly metadata = CustomMetadata.create();

  override set cardId(id: number) {
    throw new Error(
      `Cannot set id directly here, please use metadata's method`,
    );
  }
  override get cardId() {
    return this.metadata.id;
  }

  #skillId: number | null = null;
  override get id() {
    return this.#skillId ??= this.getSubId();
  }
  override set id(id: number) {
    throw new Error(`Cannot set id directly here`);
  }

  constructor() {
    super();
    this.versionInfo = CUSTOM_DATA_VERSION_INFO;
  }
}

export class CustomCharacterSkillModel extends CharacterSkillModel {
  readonly metadata = CustomMetadata.create();

  override set id(id: number) {
    throw new Error(
      `Cannot set id directly here, please use metadata's method`,
    );
  }
  override get id() {
    return this.metadata.id;
  }

  constructor() {
    super();
    this.versionInfo = CUSTOM_DATA_VERSION_INFO;
  }
}

export class CustomEntityModel extends EntityModel {
  readonly metadata = CustomMetadata.create();

  override set id(id: number) {
    throw new Error(
      `Cannot set id directly here, please use metadata's method`,
    );
  }
  override get id() {
    return this.metadata.id;
  }
  constructor(type: ExEntityType) {
    super(type);
    this.versionInfo = CUSTOM_DATA_VERSION_INFO;
  }
}

export class CustomAttachmentModel extends AttachmentModel {
  readonly metadata = CustomMetadata.create();

  override set id(id: number) {
    throw new Error(
      `Cannot set id directly here, please use metadata's method`,
    );
  }
  override get id() {
    return this.metadata.id;
  }

  constructor() {
    super("attachment");
    this.versionInfo = CUSTOM_DATA_VERSION_INFO;
  }
}

const CustomCharacterViewModel = CharacterViewModel.extend(
  CustomCharacterModel,
  (h) => ({
    id: h.attribute<{
      (id: number): AR.Done;
      uniqueKey(): "id";
      as(): CharacterHandle;
    }>(
      () => {},
      (model, [id]) => {
        model.metadata.specifyId(id);
        return id as CharacterHandle;
      },
    ),
    name: h.attribute<{
      (name: string): AR.Done;
      uniqueKey(): "name";
      as(): CharacterHandle;
    }>(
      (model, [name]) => {
        model.metadata.customName = name;
      },
      (model) => model.id as CharacterHandle,
    ),
    description: h.simpleAttribute({
      uniqueKey: "description",
    })(function (description: string) {
      this.metadata.customDescription = description;
    }),
    image: h.simpleAttribute({
      uniqueKey: "image",
    })(function (image: string) {
      this.metadata.customImage = image;
    }),
  }),
);

const CustomCardViewModel = CardViewModel.extend(CustomCardModel, (h) => ({
  id: h.attribute<{
    (id: number): AR.Done;
    uniqueKey(): "id";
    as(): CardHandle;
  }>(
      () => {},
      (model, [id]) => {
        model.metadata.specifyId(id);
        return id as CardHandle;
      },
  ),
  name: h.attribute<{
    (name: string): AR.Done;
    uniqueKey(): "name";
    as(): CardHandle;
  }>(
    (model, [name]) => {
      model.metadata.customName = name;
    },
    (model) => model.cardId as CardHandle,
  ),
  description: h.simpleAttribute({
    uniqueKey: "description",
  })(function (description: string) {
    this.metadata.customDescription = description;
  }),
  image: h.simpleAttribute({
    uniqueKey: "image",
  })(function (image: string) {
    this.metadata.customImage = image;
  }),
}));

const CustomCharacterSkillViewModel = CharacterSkillViewModel.extend(
  CustomCharacterSkillModel,
  (h) => ({
    id: h.attribute<{
      (id: number): AR.Done;
      uniqueKey(): "id";
      as(): SkillHandle | PassiveSkillHandle;
    }>(
      () => {},
      (model, [id]) => {
        model.metadata.specifyId(id);
        return id as SkillHandle;
      },
    ),
    name: h.attribute<{
      <Meta extends CharacterSkillVMMeta>(
        this: AR.This<Meta>,
        name: string,
      ): AR.Done;
      uniqueKey(): "name";
      as(): SkillHandle | PassiveSkillHandle;
    }>(
      (model, [name]) => {
        model.metadata.customName = name;
      },
      (model) => model.id as SkillHandle,
    ),
    description: h.simpleAttribute({
      uniqueKey: "description",
    })(function (description: string) {
      this.metadata.customDescription = description;
    }),
    image: h.simpleAttribute({
      uniqueKey: "image",
    })(function (image: string) {
      this.metadata.customImage = image;
    }),
  }),
);

const CustomEntityViewModel = EntityViewModel.extend(
  CustomEntityModel,
  (h) => ({
    id: h.attribute<{
      <Meta extends EntityVMMeta>(this: AR.This<Meta>, id: number): AR.Done;
      uniqueKey(): "id";
      as<Meta extends EntityVMMeta>(this: AR.This<Meta>): HandleT<Meta["type"]>;
    }>(
      () => {},
      (model, [id]) => {
        model.metadata.specifyId(id);
        return id as HandleT<EntityType>;
      },
    ),
    name: h.attribute<{
      <Meta extends EntityVMMeta>(this: AR.This<Meta>, name: string): AR.Done;
      uniqueKey(): "name";
      as<Meta extends EntityVMMeta>(this: AR.This<Meta>): HandleT<Meta["type"]>;
    }>(
      (model, [name]) => {
        model.metadata.customName = name;
      },
      (model) => model.id as any,
    ),
    description: h.simpleAttribute({
      uniqueKey: "description",
    })(function (description: string) {
      this.metadata.customDescription = description;
    }),
    image: h.simpleAttribute({
      uniqueKey: "image",
    })(function (image: string) {
      this.metadata.customImage = image;
    }),
  }),
);

const CustomAttachmentViewModel = AttachmentViewModel.extend(
  CustomAttachmentModel,
  (h) => ({
    id: h.attribute<{
      (id: number): AR.Done;
      uniqueKey(): "id";
      as(): AttachmentHandle;
    }>(
      () => {},
      (model, [id]) => {
        model.metadata.specifyId(id);
        return id as AttachmentHandle;
      },
    ),
    name: h.attribute<{
      (name: string): AR.Done;
      uniqueKey(): "name";
      as(): AttachmentHandle;
    }>(
      (model, [name]) => {
        model.metadata.customName = name;
      },
      (model) => model.id as AttachmentHandle,
    ),
    description: h.simpleAttribute({
      uniqueKey: "description",
    })(function (description: string) {
      this.metadata.customDescription = description;
    }),
    image: h.simpleAttribute({
      uniqueKey: "image",
    })(function (image: string) {
      this.metadata.customImage = image;
    }),
  }),
);

export default defineViewModel(class CustomDataRootModel {}, (h) => ({
  character: h.attribute<{
    (): AR.With<typeof CustomCharacterViewModel>;
  }>(
    (_, [], subView) => {
      const model = CustomCharacterViewModel.parse(subView);
      registerMetadata(model.metadata);
      registerCharacter(model.getEntry());
    },
    (_, [], subView) => CustomCharacterViewModel.parse(subView),
  ),
  skill: h.attribute<{
    (): AR.With<typeof CustomCharacterSkillViewModel>;
  }>(
    (_, [], subView) => {
      const model = CustomCharacterSkillViewModel.parse(subView);
      const entry = model.getEntry() as
        CharacterInitiativeSkillEntry | CharacterPassiveSkillEntry;
      registerMetadata(model.metadata);
      if (entry.type === "initiativeSkill") {
        registerInitiativeSkill(entry);
      } else {
        registerPassiveSkill(entry);
      }
    },
    (_, [], subView) => CustomCharacterSkillViewModel.parse(subView),
  ),
  status: h.attribute<{
    (): AR.With<typeof CustomEntityViewModel, DefaultEntityVMMeta<"status">>;
  }>(
    (_, [], subView) => {
      const model = CustomEntityViewModel.parse(subView, "status");
      const entry = model.getEntry() as EntityDefinition;
      registerMetadata(model.metadata);
      registerEntity(entry);
    },
    (_, [], subView) => CustomEntityViewModel.parse(subView, "status"),
  ),
  combatStatus: h.attribute<{
    (): AR.With<
      typeof CustomEntityViewModel,
      DefaultEntityVMMeta<"combatStatus">
    >;
  }>(
    (_, [], subView) => {
      const model = CustomEntityViewModel.parse(subView, "combatStatus");
      const entry = model.getEntry() as EntityDefinition;
      registerMetadata(model.metadata);
      registerEntity(entry);
    },
    (_, [], subView) => CustomEntityViewModel.parse(subView, "combatStatus"),
  ),
  summon: h.attribute<{
    (): AR.With<typeof CustomEntityViewModel, DefaultEntityVMMeta<"summon">>;
  }>(
    (_, [], subView) => {
      const model = CustomEntityViewModel.parse(subView, "summon");
      const entry = model.getEntry() as EntityDefinition;
      registerMetadata(model.metadata);
      registerEntity(entry);
    },
    (_, [], subView) => CustomEntityViewModel.parse(subView, "summon"),
  ),
  card: h.attribute<{
    (): AR.With<typeof CustomCardViewModel>;
  }>(
    (_, [], subView) => {
      const model = CustomCardViewModel.parse(subView);
      const entry = model.getEntry();
      if (typeof entry === "symbol") {
        return;
      }
      registerMetadata(model.metadata);
      registerEntity(entry);
    },
    (_, [], subView) => CustomCardViewModel.parse(subView),
  ),
  attachment: h.attribute<{
    (): AR.With<typeof CustomAttachmentViewModel>;
  }>(
    (_, [], subView) => {
      const model = CustomAttachmentViewModel.parse(subView);
      const entry = model.getEntry() as AttachmentDefinition;
      registerMetadata(model.metadata);
      registerAttachment(entry);
    },
    (_, [], subView) => CustomAttachmentViewModel.parse(subView),
  ),
}));
