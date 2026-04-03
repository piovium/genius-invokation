import { createSignal, For } from "solid-js";
import type {
  EntityDefinition,
  EntityState,
  EntityTag,
  GameState,
} from "@gi-tcg/core";
import { SectionTitle } from "./Fields";
import { ListItem, type ListItemButton } from "./ListItem";
import { ConfirmModal } from "./ConfirmModal";
import { AddCardModal } from "./AddCardModal";
import { AddButton } from "./AddButton";
import type { Draft } from "immer";
import { useStateEditorContext } from "./GameStateEditor";
import { EntityModal } from "./EntityModal";
import {
  getDefinitionName,
  getEntityItemDescription,
  getEntityVisibleVarBadges,
} from "../state/catalog";
import { getEquipmentInvalidity, getEquipmentType, moveInArray } from "../utils";
import { allocateId, createEntityState } from "../state/factory";
import { getImageUrl } from "../state/assets";
import { getCharacter } from "../state/common";
import { createDuplicateEntityCheck } from "../hooks/createDuplicateEntityCheck";

interface CharacterEntitySectionProps {
  character: {
    id: number;
    entities: readonly EntityState[];
    definition: { id: number; tags: readonly string[] };
  };
  who: 0 | 1;
  characterId: number;
  defeated: boolean;
}

const ENTITY_CATEGORY_LABELS: Record<string, string> = {
  weapon: "武器",
  artifact: "圣遗物",
  talent: "天赋",
  technique: "特技",
};

export function CharacterEntitySection(props: CharacterEntitySectionProps) {
  const { openModal, updateState } = useStateEditorContext();

  const [pendingCategoryReplace, setPendingCategoryReplace] = createSignal<{
    definition: EntityDefinition;
    existingIndex: number;
    category: string;
  } | null>(null);

  const [invalidEntityWarning, setInvalidEntityWarning] = createSignal<{
    type: "weapon" | "talent" | "other";
    entityName: string;
  } | null>(null);

  const checkSameCategoryEntity = (
    definition: EntityDefinition,
  ): { index: number; category: string } | null => {
    const category = getEquipmentType(definition);
    if (category === "other") return null;

    const index = props.character.entities.findIndex(
      (item) => getEquipmentType(item.definition) === category,
    );

    return index !== -1 ? { index, category } : null;
  };

  const doAdd = (definition: EntityDefinition) => {
    const chId = props.characterId;
    updateState((draft) => {
      const target = getCharacter(draft, chId);
      if (!target) return;
      target.entities.push(createEntityState(definition, allocateId(draft)));
    });
  };

  const doReplace = (definition: EntityDefinition, index: number) => {
    const chId = props.characterId;
    updateState((draft) => {
      const target = getCharacter(draft, chId);
      if (!target) return;
      target.entities[index] = createEntityState(definition, allocateId(draft));
    });
  };

  const { checkDuplicate, confirmOverride } = createDuplicateEntityCheck({
    items: () => props.character.entities,
    onReplace: doReplace,
  });

  const confirmReplace = (done: () => void) => {
    openModal(() => (
      <ConfirmModal
        title={`${(() => {
          const pending = pendingCategoryReplace();
          return pending
            ? `已存在${ENTITY_CATEGORY_LABELS[pending.category] ?? pending.category}`
            : "替换确认";
        })()}`}
        message={(() => {
          const pending = pendingCategoryReplace();
          if (!pending) return "";
          const existingEntity =
            props.character.entities[pending.existingIndex];
          const label =
            ENTITY_CATEGORY_LABELS[pending.category] ?? pending.category;
          return `角色区域中已存在${label}「${existingEntity ? getDefinitionName(existingEntity.definition) : ""}」，是否替换为新${label}「${getDefinitionName(pending.definition)}」？`;
        })()}
        confirmText="确认替换"
        cancelText="取消"
        onConfirm={() => {
          handleConfirmCategoryReplace();
          done();
        }}
        onCancel={handleCancelCategoryReplace}
      />
    ));
  };

  const confirmInvalidEntity = () => {
    openModal(() => (
      <ConfirmModal
        title="实体不合法"
        message={(() => {
          const warning = invalidEntityWarning();
          if (!warning) return "";
          if (warning.type === "weapon") {
            return `「${warning.entityName}」的武器类型与当前角色不匹配，无法装备。`;
          }
          if (warning.type === "talent") {
            return `「${warning.entityName}」不属于当前角色，无法装备。`;
          }
          return `「${warning.entityName}」不适合当前角色。`;
        })()}
        confirmText="知道了"
      />
    ));
  };

  const handleAddCheck = (definition: EntityDefinition, done: () => void) => {
    const invalidity = getEquipmentInvalidity(
      definition,
      props.character.definition,
    );
    if (invalidity) {
      setInvalidEntityWarning({
        type: invalidity,
        entityName: getDefinitionName(definition),
      });
      confirmInvalidEntity();
      return;
    }

    const duplicateIndex = checkDuplicate(definition);
    if (duplicateIndex !== -1) {
      confirmOverride(done);
      return;
    }

    const sameCategory = checkSameCategoryEntity(definition);
    if (sameCategory) {
      setPendingCategoryReplace({
        definition,
        existingIndex: sameCategory.index,
        category: sameCategory.category,
      });
      confirmReplace(done);
      return;
    }

    doAdd(definition);
    done();
  };

  const appendEntity = () => {
    openModal(() => {
      // eslint-disable-next-line no-unassigned-vars
      let ref!: HTMLDialogElement;
      return (
        <AddCardModal
          ref={ref}
          onSelect={(definition) => {
            handleAddCheck(definition, () => ref.close());
          }}
          showTypeFilter={true}
          showTagFilter={true}
          type="characterEntities"
          availableTags={
            [
              "shield",
              "barrier",
              "preparingSkill",
              "nightsoulsBlessing",
              "talent",
              "artifact",
              "technique",
              "weapon",
              "sword",
              "claymore",
              "pole",
              "catalyst",
              "bow",
            ] satisfies EntityTag<"status" | "equipment">[]
          }
          maxResults={60}
        />
      );
    });
  };

  const handleConfirmCategoryReplace = () => {
    const pending = pendingCategoryReplace();
    if (pending) {
      doReplace(pending.definition, pending.existingIndex);
    }
    setPendingCategoryReplace(null);
  };

  const handleCancelCategoryReplace = () => {
    setPendingCategoryReplace(null);
  };

  return (
    <div class="rounded-2xl border border-white/10 bg-slate-950/30 p-4">
      <SectionTitle
        title="角色区域实体"
        description="※ 角色身上的装备和状态，顺序为入场顺序"
      />
      <div class="mt-4 space-y-3">
        <For each={props.character.entities}>
          {(entity, index) => (
            <CharacterEntityListItem
              who={props.who}
              characterId={props.characterId}
              entity={entity}
              index={index()}
            />
          )}
        </For>
        <AddButton
          label="追加实体"
          disabled={props.defeated}
          onClick={() => appendEntity()}
        />
      </div>
    </div>
  );
}

interface CharacterEntityListItemProps {
  who: 0 | 1;
  characterId: number;
  entity: EntityState;
  index: number;
}

export function CharacterEntityListItem(props: CharacterEntityListItemProps) {
  const { updateState, openModal } = useStateEditorContext();

  const moveUp = (draft: Draft<GameState>) => {
    const target = getCharacter(draft, props.characterId);
    if (!target) return;
    target.entities = moveInArray(target.entities, props.index, -1);
  };

  const moveDown = (draft: Draft<GameState>) => {
    const target = getCharacter(draft, props.characterId);
    if (!target) return;
    target.entities = moveInArray(target.entities, props.index, 1);
  };

  const remove = (draft: Draft<GameState>) => {
    const target = getCharacter(draft, props.characterId);
    if (!target) return;
    target.entities.splice(props.index, 1);
  };

  const imageMode = () =>
    props.entity.definition.type === "status" ? "icon" : "card";

  const buttons: ListItemButton[] = [
    {
      content: "上移",
      col: 0,
      onClick: () => updateState(moveUp),
    },
    {
      content: "下移",
      col: 0,
      onClick: () => updateState(moveDown),
    },
    {
      content: "详情",
      col: 1,
      variant: "primary",
      onClick: () => {
        openModal(() => (
          <EntityModal
            who={props.who}
            area="characterEntities"
            entity={props.entity}
            characterId={props.characterId}
          />
        ));
      },
    },
    {
      content: "移除",
      col: 1,
      variant: "danger",
      onClick: () => updateState(remove),
    },
  ];

  return (
    <ListItem
      imageSrc={getImageUrl(props.entity.definition, imageMode())}
      imageMode={imageMode()}
      title={getDefinitionName(props.entity.definition)}
      description={getEntityItemDescription(props.entity)}
      definition={props.entity.definition}
      tags={getEntityVisibleVarBadges(props.entity)}
      buttonColumns={2}
      buttons={buttons}
    />
  );
}
