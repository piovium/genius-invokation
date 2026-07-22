import {
  defineViewModel,
  extendViewModel,
  type AR,
  type IViewModel,
} from "@gi-tcg/core/gts/runtime";
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
  type EntityDefinition,
  type ExEntityType,
  type HandleT,
  type PassiveSkillHandle,
  type SkillHandle,
} from "@gi-tcg/core/builder";
import type { AttachmentDefinition, VersionInfo } from "@gi-tcg/core";
import { getCustomDataRegistration } from "./context";

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

interface CustomMetadataModel {
  readonly customDefinitionId: number;
  customName: string | null;
  customDescription: string;
  customImage: string;
}

function registerMetadata(model: CustomMetadataModel) {
  if (model.customName === null) {
    throw new Error(`Definition #${model.customDefinitionId} is missing name`);
  }
  getCustomDataRegistration().registerMetadata({
    id: model.customDefinitionId,
    name: model.customName,
    description: model.customDescription,
    image: model.customImage,
  });
}

function definitionId(view: { _node: object }) {
  return getCustomDataRegistration().allocateId(view._node);
}

export class CustomCharacterModel
  extends CharacterModel
  implements CustomMetadataModel
{
  readonly customDefinitionId: number;
  customName: string | null = null;
  customDescription = "";
  customImage = "";

  constructor(id: number) {
    super();
    this.customDefinitionId = id;
    this.id = this.customDefinitionId;
    this.versionInfo = CUSTOM_DATA_VERSION_INFO;
  }
}

export class CustomCardModel extends CardModel implements CustomMetadataModel {
  readonly customDefinitionId: number;
  customName: string | null = null;
  customDescription = "";
  customImage = "";

  constructor(id: number) {
    super();
    this.customDefinitionId = id;
    this.cardId = this.customDefinitionId;
    this.id = this.getSubId();
    this.versionInfo = CUSTOM_DATA_VERSION_INFO;
  }
}

export class CustomCharacterSkillModel
  extends CharacterSkillModel
  implements CustomMetadataModel
{
  readonly customDefinitionId: number;
  customName: string | null = null;
  customDescription = "";
  customImage = "";

  constructor(id: number) {
    super();
    this.customDefinitionId = id;
    this.id = this.customDefinitionId;
    this.versionInfo = CUSTOM_DATA_VERSION_INFO;
  }
}

export class CustomEntityModel
  extends EntityModel
  implements CustomMetadataModel
{
  readonly customDefinitionId: number;
  customName: string | null = null;
  customDescription = "";
  customImage = "";

  constructor(type: ExEntityType, id: number) {
    super(type);
    this.customDefinitionId = id;
    this.id = this.customDefinitionId;
    this.versionInfo = CUSTOM_DATA_VERSION_INFO;
  }
}

export class CustomAttachmentModel
  extends AttachmentModel
  implements CustomMetadataModel
{
  readonly customDefinitionId: number;
  customName: string | null = null;
  customDescription = "";
  customImage = "";

  constructor(id: number) {
    super("attachment");
    this.customDefinitionId = id;
    this.id = this.customDefinitionId;
    this.versionInfo = CUSTOM_DATA_VERSION_INFO;
  }
}

const CustomCharacterViewModel = CharacterViewModel.extend(
  CustomCharacterModel,
  (h) => ({
    id: undefined,
    name: h.attribute<{
      (name: string): AR.Done;
      required(): true;
      uniqueKey(): "name";
      as(): CharacterHandle;
    }>(
      (model, [name]) => {
        model.customName = name;
      },
      (model) => model.id as CharacterHandle,
    ),
    description: h.simpleAttribute({
      uniqueKey: "description",
    })(function (description: string) {
      this.customDescription = description;
    }),
    image: h.simpleAttribute({
      uniqueKey: "image",
    })(function (image: string) {
      this.customImage = image;
    }),
  }),
);

const CustomCardViewModel = CardViewModel.extend(
  CustomCardModel,
  (h) => ({
    id: undefined,
    name: h.attribute<{
      (name: string): AR.Done;
      required(): true;
      uniqueKey(): "name";
      as(): CardHandle;
    }>(
      (model, [name]) => {
        model.customName = name;
      },
      (model) => model.cardId as CardHandle,
    ),
    description: h.simpleAttribute({
      uniqueKey: "description",
    })(function (description: string) {
      this.customDescription = description;
    }),
    image: h.simpleAttribute({
      uniqueKey: "image",
    })(function (image: string) {
      this.customImage = image;
    }),
  }),
);

const CustomCharacterSkillViewModel = CharacterSkillViewModel.extend(
  CustomCharacterSkillModel,
  (h) => ({
    id: undefined,
    name: h.attribute<{
      <Meta extends CharacterSkillVMMeta>(
        this: AR.This<Meta>,
        name: string,
      ): AR.Done;
      required(): true;
      uniqueKey(): "name";
      as(): SkillHandle | PassiveSkillHandle;
    }>(
      (model, [name]) => {
        model.customName = name;
      },
      (model) => model.id as SkillHandle,
    ),
    description: h.simpleAttribute({
      uniqueKey: "description",
    })(function (description: string) {
      this.customDescription = description;
    }),
    image: h.simpleAttribute({
      uniqueKey: "image",
    })(function (image: string) {
      this.customImage = image;
    }),
  }),
);

const CustomEntityViewModel = EntityViewModel.extend(
  CustomEntityModel,
  (h) => ({
    id: undefined,
    name: h.attribute<{
      <Meta extends EntityVMMeta>(this: AR.This<Meta>, name: string): AR.Done;
      required(): true;
      uniqueKey(): "name";
      as<Meta extends EntityVMMeta>(this: AR.This<Meta>): HandleT<Meta["type"]>;
    }>(
      (model, [name]) => {
        model.customName = name;
      },
      (model) => model.id as any,
    ),
    description: h.simpleAttribute({
      uniqueKey: "description",
    })(function (description: string) {
      this.customDescription = description;
    }),
    image: h.simpleAttribute({
      uniqueKey: "image",
    })(function (image: string) {
      this.customImage = image;
    }),
  }),
);

const CustomAttachmentViewModel = AttachmentViewModel.extend(
  CustomAttachmentModel,
  (h) => ({
    id: undefined,
    name: h.attribute<{
      (name: string): AR.Done;
      required(): true;
      uniqueKey(): "name";
      as(): AttachmentHandle;
    }>(
      (model, [name]) => {
        model.customName = name;
      },
      (model) => model.id as AttachmentHandle,
    ),
    description: h.simpleAttribute({
      uniqueKey: "description",
    })(function (description: string) {
      this.customDescription = description;
    }),
    image: h.simpleAttribute({
      uniqueKey: "image",
    })(function (image: string) {
      this.customImage = image;
    }),
  }),
);

export default defineViewModel(class CustomDataRootModel {}, (h) => ({
  character: h.attribute<{
    (): AR.With<typeof CustomCharacterViewModel>;
  }>(
    (_, [], subView) => {
      const model = CustomCharacterViewModel.parse(
        subView,
        definitionId(subView),
      );
      registerMetadata(model);
      registerCharacter(model.getEntry());
    },
    (_, [], subView) =>
      CustomCharacterViewModel.parse(subView, definitionId(subView)),
  ),
  skill: h.attribute<{
    (): AR.With<typeof CustomCharacterSkillViewModel>;
  }>(
    (_, [], subView) => {
      const model = CustomCharacterSkillViewModel.parse(
        subView,
        definitionId(subView),
      );
      const entry = model.getEntry();
      if (typeof entry === "symbol") {
        return;
      }
      registerMetadata(model);
      if (entry.type === "initiativeSkill") {
        registerInitiativeSkill(entry);
      } else {
        registerPassiveSkill(entry);
      }
    },
    (_, [], subView) =>
      CustomCharacterSkillViewModel.parse(subView, definitionId(subView)),
  ),
  status: h.attribute<{
    (): AR.With<typeof CustomEntityViewModel, DefaultEntityVMMeta<"status">>;
  }>(
    (_, [], subView) => {
      const model = CustomEntityViewModel.parse(
        subView,
        "status",
        definitionId(subView),
      );
      const entry = model.getEntry();
      if (typeof entry === "symbol") {
        return;
      }
      registerMetadata(model);
      registerEntity(entry as EntityDefinition);
    },
    (_, [], subView) =>
      CustomEntityViewModel.parse(subView, "status", definitionId(subView)),
  ),
  combatStatus: h.attribute<{
    (): AR.With<
      typeof CustomEntityViewModel,
      DefaultEntityVMMeta<"combatStatus">
    >;
  }>(
    (_, [], subView) => {
      const model = CustomEntityViewModel.parse(
        subView,
        "combatStatus",
        definitionId(subView),
      );
      const entry = model.getEntry();
      if (typeof entry === "symbol") {
        return;
      }
      registerMetadata(model);
      registerEntity(entry as EntityDefinition);
    },
    (_, [], subView) =>
      CustomEntityViewModel.parse(
        subView,
        "combatStatus",
        definitionId(subView),
      ),
  ),
  summon: h.attribute<{
    (): AR.With<typeof CustomEntityViewModel, DefaultEntityVMMeta<"summon">>;
  }>(
    (_, [], subView) => {
      const model = CustomEntityViewModel.parse(
        subView,
        "summon",
        definitionId(subView),
      );
      const entry = model.getEntry();
      if (typeof entry === "symbol") {
        return;
      }
      registerMetadata(model);
      registerEntity(entry as EntityDefinition);
    },
    (_, [], subView) =>
      CustomEntityViewModel.parse(subView, "summon", definitionId(subView)),
  ),
  card: h.attribute<{
    (): AR.With<typeof CustomCardViewModel>;
  }>(
    (_, [], subView) => {
      const model = CustomCardViewModel.parse(subView, definitionId(subView));
      const entry = model.getEntry();
      if (typeof entry === "symbol") {
        return;
      }
      registerMetadata(model);
      registerEntity(entry);
    },
    (_, [], subView) =>
      CustomCardViewModel.parse(subView, definitionId(subView)),
  ),
  attachment: h.attribute<{
    (): AR.With<typeof CustomAttachmentViewModel>;
  }>(
    (_, [], subView) => {
      const model = CustomAttachmentViewModel.parse(
        subView,
        definitionId(subView),
      );
      const entry = model.getEntry();
      if (typeof entry === "symbol") {
        return;
      }
      registerMetadata(model);
      registerAttachment(entry as AttachmentDefinition);
    },
    (_, [], subView) =>
      CustomAttachmentViewModel.parse(subView, definitionId(subView)),
  ),
}));
