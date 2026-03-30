import { createMemo, createSignal, For, Show } from "solid-js";

import type {
  AttachmentDefinition,
  EntityState,
  GameState,
} from "@gi-tcg/core";

import { SectionTitle } from "./Fields";
import { Modal } from "./Modal";
import { ListItem, type ListItemButton } from "./ListItem";
import { ConfirmModal } from "./ConfirmModal";
import {
  allocateId,
  getDefinitionName,
  getPlayer,
  moveInArray,
  type EditorCatalog,
  type EditorModal,
  type UpdateGameState,
  getImageUrl,
  type EditorEntityArea,
  type AssetOption,
  getEntity,
  createAttachmentState,
} from "../state";
import type { Draft } from "immer";
import { VariableGrid } from "./VariableGrid";
import { PreviewTile } from "./Previews";

interface EntityContentProps {
  state: GameState;
  who: 0 | 1;
  area: EditorEntityArea;
  entityId: number;
  characterId?: number;
  catalog: EditorCatalog;
  updateState: UpdateGameState;
  openModal: (modal: EditorModal) => void;
}

function updateEntityByAreaContent(
  props: EntityContentProps,
  updater: (entity: Draft<EntityState>) => void,
) {
  props.updateState((draft) => {
    const player = draft.players[props.who];
    if (props.area === "characterEntities") {
      const character = player.characters.find(
        (item) => item.id === props.characterId,
      );
      const entity = character?.entities.find(
        (item) => item.id === props.entityId,
      );
      if (entity) {
        updater(entity);
      }
      return;
    }
    const entity = player[props.area].find(
      (item) => item.id === props.entityId,
    );
    if (entity) {
      updater(entity);
    }
  });
}

function EntityModalContent(props: EntityContentProps) {
  const [query, setQuery] = createSignal("");
  const [confirmModalOpen, setConfirmModalOpen] = createSignal(false);
  const [pendingAttachment, setPendingAttachment] =
    createSignal<AssetOption<AttachmentDefinition> | null>(null);
  const [existingAttachmentIndex, setExistingAttachmentIndex] =
    createSignal(-1);

  const player = () => getPlayer(props.state, props.who);
  const entity = () =>
    getEntity(player(), props.area, props.entityId, props.characterId);
  const allowAttachments = () =>
    props.area === "hands" || props.area === "pile";
  const imageMode = () =>
    ["status", "combatStatus"].includes(entity()?.definition.type ?? "")
      ? "icon"
      : "card";

  const filteredAttachments = createMemo(() => {
    const q = query().trim().toLowerCase();
    let results = props.catalog.attachments;
    if (q) {
      results = results.filter(
        (card) =>
          card.name.toLowerCase().includes(q) || String(card.id).includes(q),
      );
    }
    return results;
  });

  // 检查是否存在相同 definition.id 的附着
  const checkDuplicateAttachment = (
    attachmentDef: (typeof props.catalog.attachments)[0]["definition"],
  ) => {
    const currentEntity = entity();
    if (!currentEntity) return -1;
    const index = currentEntity.attachments.findIndex(
      (att) => att.definition.id === attachmentDef.id,
    );
    return index;
  };

  // 处理添加附着前的检查
  const handleAddAttachmentCheck = (
    option: AssetOption<AttachmentDefinition>,
  ) => {
    const duplicateIndex = checkDuplicateAttachment(option.definition);

    if (duplicateIndex !== -1) {
      // 存在重复，显示确认弹窗
      setPendingAttachment(option);
      setExistingAttachmentIndex(duplicateIndex);
      setConfirmModalOpen(true);
    } else {
      // 没有重复，直接添加
      doAddAttachment(option);
    }
  };

  // 执行添加附着
  const doAddAttachment = (option: AssetOption<AttachmentDefinition>) => {
    const who = props.who;
    const area = props.area as "hands" | "pile";
    const etId = props.entityId;
    props.updateState((draft) => {
      const targetPlayer = draft.players[who];
      const targetEntity = targetPlayer[area].find((item) => item.id === etId);
      if (!targetEntity) {
        return;
      }
      targetEntity.attachments.push(
        createAttachmentState(option.definition, allocateId(draft)),
      );
    });
  };

  // 执行覆盖（替换）附着
  const doReplaceAttachment = (
    option: (typeof props.catalog.attachments)[0],
    index: number,
  ) => {
    const who = props.who;
    const area = props.area as "hands" | "pile";
    const etId = props.entityId;
    props.updateState((draft) => {
      const targetPlayer = draft.players[who];
      const targetEntity = targetPlayer[area].find((item) => item.id === etId);
      if (!targetEntity) {
        return;
      }
      // 替换指定位置的附着
      targetEntity.attachments[index] = createAttachmentState(
        option.definition,
        allocateId(draft),
      );
    });
  };

  // 确认覆盖附着
  const handleConfirmReplaceAttachment = () => {
    const attachment = pendingAttachment();
    const index = existingAttachmentIndex();
    if (attachment && index !== -1) {
      doReplaceAttachment(attachment, index);
    }
    setConfirmModalOpen(false);
    setPendingAttachment(null);
    setExistingAttachmentIndex(-1);
  };

  // 取消覆盖附着，改为添加新的
  const handleCancelReplaceAttachment = () => {
    setConfirmModalOpen(false);
    setPendingAttachment(null);
    setExistingAttachmentIndex(-1);
  };

  return (
    <>
      <Show when={entity()}>
        {(resolvedEntity) => {
          const currentEntity = () => resolvedEntity();
          return (
            <div class="space-y-2">
              <div class="flex gap-4">
                <div class="shrink-0 w-1/5">
                  <PreviewTile
                    definition={currentEntity().definition}
                    mode={imageMode()}
                    subtitle={`状态 ID #${currentEntity().id}`}
                    badges={[
                      `变量 ${Object.keys(currentEntity().variables).length}`,
                    ]}
                  />
                </div>
                <div class="flex-1 space-y-4 min-w-0">
                  <SectionTitle title="变量编辑" />
                  <VariableGrid
                    entries={Object.entries(currentEntity().variables)}
                    onChange={(key, value) =>
                      updateEntityByAreaContent(props, (target) => {
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
                        <div class="text-sm font-medium text-amber-50">
                          追加附着
                        </div>
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
                                    handleAddAttachmentCheck(option)
                                  }
                                >
                                  {/* 卡牌图片 */}
                                  <div
                                    class={`w-full rounded-lg overflow-hidden`}
                                  >
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
                          已有附着 ({currentEntity().attachments.length})
                        </div>
                      </div>
                      <div class="flex-1 overflow-y-auto space-y-2">
                        <For each={currentEntity().attachments}>
                          {(attachment, index) => {
                            const isFirst = () => index() === 0;
                            const isLast = () =>
                              index() ===
                              currentEntity().attachments.length - 1;

                            const buttons: ListItemButton[] = [
                              {
                                content: "编辑",
                                col: 1,
                                variant: "primary",
                                onClick: () => {
                                  props.openModal({
                                    kind: "attachment",
                                    who: props.who,
                                    area: props.area as "hands" | "pile",
                                    entityId: props.entityId,
                                    attachmentId: attachment.id,
                                  });
                                },
                              },
                              {
                                content: "上移",
                                col: 0,
                                onClick: () => {
                                  if (isFirst()) return;
                                  const who = props.who;
                                  const area = props.area as "hands" | "pile";
                                  const etId = props.entityId;
                                  const i = index();
                                  props.updateState((draft) => {
                                    const targetPlayer = draft.players[who];
                                    const targetEntity = targetPlayer[
                                      area
                                    ].find((item) => item.id === etId);
                                    if (!targetEntity) return;
                                    targetEntity.attachments = moveInArray(
                                      targetEntity.attachments,
                                      i,
                                      -1,
                                    );
                                  });
                                },
                              },
                              {
                                content: "下移",
                                col: 0,
                                onClick: () => {
                                  if (isLast()) return;
                                  const who = props.who;
                                  const area = props.area as "hands" | "pile";
                                  const etId = props.entityId;
                                  const i = index();
                                  props.updateState((draft) => {
                                    const targetPlayer = draft.players[who];
                                    const targetEntity = targetPlayer[
                                      area
                                    ].find((item) => item.id === etId);
                                    if (!targetEntity) return;
                                    targetEntity.attachments = moveInArray(
                                      targetEntity.attachments,
                                      i,
                                      1,
                                    );
                                  });
                                },
                              },
                              {
                                content: "移除",
                                col: 1,
                                variant: "danger",
                                onClick: () => {
                                  const who = props.who;
                                  const area = props.area as "hands" | "pile";
                                  const etId = props.entityId;
                                  const i = index();
                                  props.updateState((draft) => {
                                    const targetPlayer = draft.players[who];
                                    const targetEntity = targetPlayer[
                                      area
                                    ].find((item) => item.id === etId);
                                    if (!targetEntity) return;
                                    targetEntity.attachments.splice(i, 1);
                                  });
                                },
                              },
                            ];

                            return (
                              <ListItem
                                imageSrc={getImageUrl(
                                  attachment.definition,
                                  "icon",
                                )}
                                imageMode="icon"
                                title={getDefinitionName(attachment.definition)}
                                description={`ID: ${attachment.id} · 变量: ${Object.keys(attachment.variables).length}`}
                                buttonColumns={2}
                                buttons={buttons}
                              />
                            );
                          }}
                        </For>
                        {currentEntity().attachments.length === 0 && (
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
        }}
      </Show>

      {/* Confirm Modal for duplicate attachments */}
      <ConfirmModal
        open={confirmModalOpen()}
        title="检测到重复附着"
        message={(() => {
          const att = pendingAttachment();
          return att ? `已存在相同类型的附着「${att.name}」，是否覆盖？` : "";
        })()}
        confirmText="确认覆盖"
        cancelText="取消"
        onConfirm={handleConfirmReplaceAttachment}
        onCancel={handleCancelReplaceAttachment}
      />
    </>
  );
}

// Modal version
interface EntityModalProps extends EntityContentProps {
  open: boolean;
  onClose: () => void;
}

export function EntityModal(props: EntityModalProps) {
  const player = () => getPlayer(props.state, props.who);
  const entity = () =>
    getEntity(player(), props.area, props.entityId, props.characterId);
  const title = () =>
    entity()
      ? `实体编辑 - ${getDefinitionName(entity()?.definition)}`
      : "实体编辑";

  return (
    <Modal open={props.open} title={title()} onClose={props.onClose}>
      <EntityModalContent
        state={props.state}
        who={props.who}
        area={props.area}
        entityId={props.entityId}
        characterId={props.characterId}
        catalog={props.catalog}
        updateState={props.updateState}
        openModal={props.openModal}
      />
    </Modal>
  );
}
