import { createMemo, createSignal, For, Show } from "solid-js";

import type {
  AttachmentDefinition,
  AttachmentState,
  EntityState,
  GameState,
} from "@gi-tcg/core";

import { SectionTitle } from "./Fields";
import { Modal } from "./Modal";
import { ListItem, type ListItemButton } from "./ListItem";
import type { Draft } from "immer";
import { VariableGrid } from "./VariableGrid";
import { PreviewTile } from "./Previews";
import { useStateEditorContext } from "./GameStateEditor";
import { AttachmentModal } from "./AttachmentModal";
import type { EditorEntityArea } from "../types";
import {
  getDefinitionName,
  getEntityItemDescription,
  getEntityVisibleVarBadges,
} from "../state/catalog";
import { allocateId, createAttachmentState } from "../state/factory";
import { getImageUrl, matchesSearch } from "../state/assets";
import { moveInArray } from "../utils";
import { getEntity } from "../state/common";
import { createDuplicateEntityCheck } from "../hooks/createDuplicateEntityCheck";

interface EntityContentProps {
  who: 0 | 1;
  area: EditorEntityArea;
  entity: EntityState;
  characterId?: number;
}

function EntityModalContent(props: EntityContentProps) {
  const { updateState, catalog } = useStateEditorContext();

  const [query, setQuery] = createSignal("");

  const allowAttachments = () =>
    props.area === "hands" || props.area === "pile";
  const imageMode = () =>
    ["status", "combatStatus"].includes(props.entity.definition.type ?? "")
      ? "icon"
      : "card";

  const filteredAttachments = createMemo(() => {
    const q = query().trim();
    let results = catalog().attachments;
    if (q) {
      results = results.filter((card) => matchesSearch(card, q));
    }
    return results;
  });

  const doAddAttachment = (definition: AttachmentDefinition) => {
    const etId = props.entity.id;
    updateState((draft) => {
      const targetEntity = getEntity(draft, etId);
      if (!targetEntity) {
        return;
      }
      targetEntity.attachments.push(
        createAttachmentState(definition, allocateId(draft)),
      );
    });
  };

  const doReplaceAttachment = (
    definition: AttachmentDefinition,
    index: number,
  ) => {
    const etId = props.entity.id;
    updateState((draft) => {
      const targetEntity = getEntity(draft, etId);
      if (!targetEntity) {
        return;
      }
      targetEntity.attachments[index] = createAttachmentState(
        definition,
        allocateId(draft),
      );
    });
  };

  const { checkDuplicate, confirmOverride } =
    createDuplicateEntityCheck<AttachmentState>({
      items: () => props.entity.attachments,
      subject: "附着",
      onReplace: doReplaceAttachment,
    });

  const handleAddAttachmentCheck = (definition: AttachmentDefinition) => {
    const duplicateIndex = checkDuplicate(definition);
    if (duplicateIndex !== -1) {
      confirmOverride();
    } else {
      doAddAttachment(definition);
    }
  };

  const updateEntity = (updater: (entity: Draft<EntityState>) => void) => {
    const entityId = props.entity.id;
    updateState((draft) => {
      const entity = getEntity(draft, entityId);
      if (entity) {
        updater(entity);
      }
    });
  };

  return (
    <div class="space-y-2">
      <div class="flex gap-4">
        <div class="shrink-0 w-1/5">
          <PreviewTile
            definition={props.entity.definition}
            mode={imageMode()}
            subtitle={`状态 ID #${props.entity.id}`}
            badges={getEntityVisibleVarBadges(props.entity)}
          />
        </div>
        <div class="flex-1 space-y-4 min-w-0">
          <SectionTitle title="变量编辑" />
          <VariableGrid
            entries={Object.entries(props.entity.variables)}
            onChange={(key, value) =>
              updateEntity((target) => {
                target.variables[key] = value;
              })
            }
          />
        </div>
      </div>

      <Show when={allowAttachments()}>
        <div class="pt-4 border-t border-white/10">
          <SectionTitle title="附着" />

          {/* 左右两列布局 */}
          <div class="mt-3 flex gap-4 h-40vh">
            {/* 左侧：追加附着面板 */}
            <div class="flex-1 flex flex-col border border-white/10 rounded-xl overflow-hidden gap-3">
              <div class="p-3 bg-slate-800/50 border-b border-white/10">
                <div class="text-sm font-medium text-amber-50">追加附着</div>
              </div>
              <div class="flex-1 flex flex-col overflow-hidden">
                {/* 搜索框 */}
                <input
                  type="text"
                  value={query()}
                  onInput={(e) => setQuery(e.currentTarget.value)}
                  placeholder="输入名称或ID搜索"
                  class="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/20 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500/50 box-border"
                />
                <div class="flex-1 overflow-y-auto mt-3 pr-1">
                  <div class="grid grid-cols-[repeat(auto-fill,minmax(80px,1fr))] gap-2">
                    <For each={filteredAttachments()}>
                      {(option) => (
                        <button
                          type="button"
                          class="flex flex-col items-center p-2 rounded-lg border border-white/10 bg-slate-800/30 hover:bg-slate-700/50 transition text-center"
                          onClick={() =>
                            handleAddAttachmentCheck(option.definition)
                          }
                        >
                          {/* 卡牌图片 */}
                          <div class={`w-full rounded-lg overflow-hidden`}>
                            <img
                              src={getImageUrl(option, "icon")}
                              alt={option.name}
                              class="w-full h-full object-cover group-hover:scale-105 transition"
                              loading="lazy"
                            />
                          </div>
                          <div class="text-xs text-slate-200 truncate w-full">
                            {option.name}
                          </div>
                          <div class="text-[10px] text-slate-500">
                            #{option.id}
                          </div>
                        </button>
                      )}
                    </For>
                  </div>
                </div>
              </div>
            </div>

            {/* 右侧：已有附着列表 */}
            <div class="flex-1 flex flex-col border border-white/10 rounded-xl overflow-hidden gap-3">
              <div class="p-3 bg-slate-800/50 border-b border-white/10">
                <div class="text-sm font-medium text-amber-50">
                  已有附着 ({props.entity.attachments.length})
                </div>
              </div>
              <div class="flex-1 overflow-y-auto space-y-2">
                <For each={props.entity.attachments}>
                  {(attachment, index) => (
                    <AttachmentListItem
                      who={props.who}
                      area={props.area as "hands" | "pile"}
                      entity={props.entity}
                      attachment={attachment}
                      index={index()}
                    />
                  )}
                </For>
                {props.entity.attachments.length === 0 && (
                  <div class="text-center text-slate-500 py-8 text-sm">
                    暂无附着
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </Show>
    </div>
  );
}

interface AttachmentListItemProps {
  index: number;
  who: 0 | 1;
  area: "hands" | "pile";
  entity: EntityState;
  attachment: AttachmentState;
}

function AttachmentListItem(props: AttachmentListItemProps) {
  const { updateState, openModal } = useStateEditorContext();

  const isFirst = () => props.index === 0;
  const isLast = () => props.index === props.entity.attachments.length - 1;

  const moveUp = (draft: Draft<GameState>) => {
    const targetEntity = getEntity(draft, props.entity.id);
    if (!targetEntity) return;
    targetEntity.attachments = moveInArray(
      targetEntity.attachments,
      props.index,
      -1,
    );
  };

  const moveDown = (draft: Draft<GameState>) => {
    const targetEntity = getEntity(draft, props.entity.id);
    if (!targetEntity) return;
    targetEntity.attachments = moveInArray(
      targetEntity.attachments,
      props.index,
      1,
    );
  };

  const remove = (draft: Draft<GameState>) => {
    const targetEntity = getEntity(draft, props.entity.id);
    if (!targetEntity) return;
    targetEntity.attachments.splice(props.index, 1);
  };

  const buttons: ListItemButton[] = [
    {
      content: "编辑",
      col: 1,
      variant: "primary",
      onClick: () => {
        openModal(() => (
          <AttachmentModal
            who={props.who}
            area={props.area}
            entityId={props.entity.id}
            attachment={props.attachment}
          />
        ));
      },
    },
    {
      content: "上移",
      col: 0,
      onClick: () => {
        if (isFirst()) return;
        updateState(moveUp);
      },
    },
    {
      content: "下移",
      col: 0,
      onClick: () => {
        if (isLast()) return;
        updateState(moveDown);
      },
    },
    {
      content: "移除",
      col: 1,
      variant: "danger",
      onClick: () => {
        updateState(remove);
      },
    },
  ];

  return (
    <ListItem
      imageSrc={getImageUrl(props.attachment.definition, "icon")}
      imageMode="icon"
      title={getDefinitionName(props.attachment.definition)}
      description={getEntityItemDescription(props.attachment)}
      tags={getEntityVisibleVarBadges(props.attachment)}
      buttonColumns={2}
      buttons={buttons}
    />
  );
}

type EntityModalProps = EntityContentProps;

export function EntityModal(props: EntityModalProps) {
  return (
    <Modal title={`实体编辑 - ${getDefinitionName(props.entity.definition)}`}>
      <EntityModalContent
        who={props.who}
        area={props.area}
        entity={props.entity}
        characterId={props.characterId}
      />
    </Modal>
  );
}
