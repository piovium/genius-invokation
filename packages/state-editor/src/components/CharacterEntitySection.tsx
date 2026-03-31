import { createSignal, For } from "solid-js";
import type { EntityDefinition, EntityState, EntityTag, GameState } from "@gi-tcg/core";
import { SectionTitle } from "./Fields";
import { ListItem, type ListItemButton } from "./ListItem";
import { ConfirmModal } from "./ConfirmModal";
import { AddCardModal } from "./AddCardModal";
import type { Draft } from "immer";
import { useStateEditorContext } from "./GameStateEditor";
import { EntityModal } from "./EntityModal";
import { getDefinitionName, getEntityVisibleVarBadges } from "../state/catalog";
import { getEquipmentInvalidity, moveInArray } from "../utils";
import { allocateId, createEntityState } from "../state/factory";
import { getImageUrl } from "../state/assets";
import { getCharacter } from "../state/common";

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

function getEntityCategory(definition: EntityDefinition): string | null {
  const tags = definition.tags;
  if (tags.includes("weapon")) return "weapon";
  if (tags.includes("artifact")) return "artifact";
  if (tags.includes("talent")) return "talent";
  if (tags.includes("technique")) return "technique";
  return null;
}

export function CharacterEntitySection(props: CharacterEntitySectionProps) {
  const { openModal, updateState } = useStateEditorContext();

  const [pendingDefinition, setPendingDefinition] = createSignal<
    EntityDefinition | undefined
  >(void 0);
  const [existingEntityIndex, setExistingEntityIndex] =
    createSignal<number>(-1);

  const [pendingCategoryReplace, setPendingCategoryReplace] = createSignal<{
    definition: EntityDefinition;
    existingIndex: number;
    category: string;
  } | null>(null);

  const [invalidEntityWarning, setInvalidEntityWarning] = createSignal<{
    type: "weapon" | "talent" | "other";
    entityName: string;
  } | null>(null);

  const checkDuplicate = (definition: EntityDefinition) => {
    return props.character.entities.findIndex(
      (item) => item.definition.id === definition.id,
    );
  };

  const checkSameCategoryEntity = (
    definition: EntityDefinition,
  ): { index: number; category: string } | null => {
    const category = getEntityCategory(definition);
    if (!category) return null;

    const index = props.character.entities.findIndex(
      (item) => getEntityCategory(item.definition) === category,
    );

    return index !== -1 ? { index, category } : null;
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

  const confirmOverride = (done: () => void) => {
    openModal(() => (
      <ConfirmModal
        title="检测到重复实体"
        message={
          pendingDefinition()
            ? `角色区域中已存在相同类型的实体「${getDefinitionName(pendingDefinition())}」，是否覆盖？`
            : ""
        }
        confirmText="确认覆盖"
        cancelText="取消"
        onConfirm={() => {
          handleConfirmReplace();
          done();
        }}
        onCancel={handleCancelReplace}
      />
    ));
  };

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
      setPendingDefinition(definition);
      setExistingEntityIndex(duplicateIndex);
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

  const handleConfirmReplace = () => {
    const definition = pendingDefinition();
    const index = existingEntityIndex();
    if (definition && index !== -1) {
      doReplace(definition, index);
    }
    setPendingDefinition(void 0);
    setExistingEntityIndex(-1);
  };

  const handleCancelReplace = () => {
    setPendingDefinition(void 0);
    setExistingEntityIndex(-1);
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
        <button
          type="button"
          onClick={() => appendEntity()}
          disabled={props.defeated}
          class="w-full flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-white/20 bg-transparent px-3 py-3 text-sm text-slate-400 hover:border-white/40 hover:text-slate-300 hover:bg-white/5 transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <span class="text-lg">+</span>
          <span>追加实体</span>
        </button>
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
      description={`ID: ${props.entity.id}`}
      definition={props.entity.definition}
      tags={getEntityVisibleVarBadges(props.entity)}
      buttonColumns={2}
      buttons={buttons}
    />
  );
}
