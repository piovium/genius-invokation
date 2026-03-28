import { createMemo, createSignal, For, Show } from "solid-js";

import type {
  AttachmentState,
  CharacterState,
  EntityState,
  GameState,
} from "@gi-tcg/core";

import {
  ActionButton,
  NumberField,
  SearchableSelect,
  SelectField,
  SectionTitle,
  Surface,
} from "./Fields";
import { JsonSchemaEditor } from "./JsonSchemaEditor";
import { Modal } from "./Modal";
import { Badge, PreviewTile, SummaryLine } from "./Previews";
import { ListItem, type ListItemButton } from "./ListItem";
import { ConfirmModal } from "./ConfirmModal";
import {
  allocateId,
  AURA_LABELS,
  AURA_OPTIONS,
  createAttachmentState,
  createEntityState,
  getAttachment,
  getCharacter,
  getCharacterEnergyLabel,
  getCharacterMaxEnergyLabel,
  getDefinitionName,
  getEntity,
  getPlayer,
  moveInArray,
  type Mutable,
  type EditorCatalog,
  type EditorEntityArea,
  type EditorModal,
  type UpdateGameState,
  getImageUrl,
} from "../state";

function VariableGrid(props: {
  entries: readonly [string, number][];
  disabled?: boolean;
  readOnlyKeys?: readonly string[];
  onChange: (key: string, value: number) => void;
}) {
  const readOnly = new Set(props.readOnlyKeys ?? []);
  return (
    <div class="grid gap-3 sm:grid-cols-2">
      <For each={props.entries}>
        {([key, value]) => (
          <NumberField
            label={key}
            value={value}
            disabled={props.disabled}
            readOnly={readOnly.has(key)}
            onChange={(nextValue) => props.onChange(key, nextValue)}
          />
        )}
      </For>
    </div>
  );
}

// Content version (non-modal) for Character
interface CharacterContentProps {
  state: GameState;
  who: 0 | 1;
  characterIndex: number;
  catalog: EditorCatalog;
  updateState: UpdateGameState;
  openModal: (modal: EditorModal) => void;
}

export function CharacterModalContent(props: CharacterContentProps) {
  const player = () => getPlayer(props.state, props.who);
  const characterId = () => player().characters[props.characterIndex]?.id ?? 0;
  const character = () => getCharacter(player(), characterId());
  const defeated = () => (character()?.variables.alive ?? 1) === 0;

  const updateCharacter = (
    updater: (target: Mutable<CharacterState>) => void,
  ) => {
    props.updateState((draft) => {
      const target = draft.players[props.who].characters.find(
        (item) => item.id === characterId(),
      );
      if (target) {
        updater(target as unknown as Mutable<CharacterState>);
      }
    });
  };

  const current = () => character();

  return (
    <Show when={current()}>
      {(resolvedCharacter) => {
        const currentCharacter = () => resolvedCharacter();
        const specialEnergyLabel = () =>
          getCharacterEnergyLabel(currentCharacter());
        const otherVariables = () =>
          Object.entries(currentCharacter().variables).filter(
            ([key]) =>
              ![
                "health",
                "energy",
                "maxHealth",
                "maxEnergy",
                "aura",
                "alive",
              ].includes(key),
          );

        return (
          <Surface
            title={`角色编辑 - ${getDefinitionName(currentCharacter().definition)}`}
          >
            <div class="space-y-5">
              <div class="grid gap-4 lg:grid-cols-[280px,1fr]">
                <PreviewTile
                  definition={currentCharacter().definition}
                  mode="card"
                  active={player().activeCharacterId === currentCharacter().id}
                  subtitle={`状态 ID #${currentCharacter().id}`}
                  badges={[
                    player().activeCharacterId === currentCharacter().id
                      ? "当前出战"
                      : "后台角色",
                    defeated() ? "已击倒" : "存活中",
                  ]}
                  actions={
                    <ActionButton
                      label="设为出战"
                      disabled={
                        player().activeCharacterId === currentCharacter().id
                      }
                      tone="accent"
                      onClick={() => {
                        props.updateState((draft) => {
                          draft.players[props.who].activeCharacterId =
                            characterId();
                        });
                      }}
                    />
                  }
                />
                <div class="space-y-4">
                  <SectionTitle title="基础状态" />
                  <div class="grid gap-3 sm:grid-cols-2">
                    <NumberField
                      label="生命值"
                      value={currentCharacter().variables.health}
                      disabled={defeated()}
                      onChange={(value) =>
                        updateCharacter((target) => {
                          target.variables.health = value;
                        })
                      }
                    />
                    <NumberField
                      label={specialEnergyLabel()}
                      value={currentCharacter().variables.energy}
                      disabled={defeated()}
                      onChange={(value) =>
                        updateCharacter((target) => {
                          target.variables.energy = value;
                        })
                      }
                    />
                    <NumberField
                      label="最大生命值"
                      value={currentCharacter().variables.maxHealth}
                      disabled={defeated()}
                      onChange={(value) =>
                        updateCharacter((target) => {
                          target.variables.maxHealth = value;
                        })
                      }
                    />
                    <NumberField
                      label={getCharacterMaxEnergyLabel(currentCharacter())}
                      value={currentCharacter().variables.maxEnergy}
                      readOnly
                      onChange={() => undefined}
                    />
                    <SelectField
                      label="元素附着"
                      value={currentCharacter().variables.aura}
                      disabled={defeated()}
                      options={AURA_OPTIONS.map((value) => ({
                        value,
                        label: AURA_LABELS[value],
                      }))}
                      onChange={(value) =>
                        updateCharacter((target) => {
                          target.variables.aura = Number(
                            value,
                          ) as CharacterState["variables"]["aura"];
                        })
                      }
                    />
                  </div>
                  <div class="flex flex-wrap gap-2">
                    <ActionButton
                      label="标记为击倒"
                      tone="danger"
                      disabled={defeated()}
                      onClick={() => {
                        if (!window.confirm("确定要将该角色设为已击倒吗？")) {
                          return;
                        }
                        props.updateState((draft) => {
                          const target = draft.players[
                            props.who
                          ].characters.find(
                            (item) => item.id === characterId(),
                          );
                          if (!target) {
                            return;
                          }
                          target.variables.health = 0;
                          target.variables.energy = 0;
                          target.variables.aura =
                            0 as CharacterState["variables"]["aura"];
                          target.variables.alive = 0;
                          target.entities = [];
                        });
                      }}
                    />
                    <ActionButton
                      label="恢复存活"
                      disabled={!defeated()}
                      onClick={() => {
                        props.updateState((draft) => {
                          const target = draft.players[
                            props.who
                          ].characters.find(
                            (item) => item.id === characterId(),
                          );
                          if (!target) {
                            return;
                          }
                          target.variables.health = 1;
                          target.variables.alive = 1;
                        });
                      }}
                    />
                  </div>
                </div>
              </div>

              <Show when={otherVariables().length > 0}>
                <div class="space-y-3">
                  <SectionTitle title="额外变量" />
                  <VariableGrid
                    entries={otherVariables()}
                    disabled={defeated()}
                    onChange={(key, value) =>
                      updateCharacter((target) => {
                        target.variables[key] = value;
                      })
                    }
                  />
                </div>
              </Show>

              <div class="space-y-3">
                <SectionTitle
                  title="角色区域实体"
                  description="可追加状态与装备，并调整顺序。"
                />
                <SearchableSelect
                  label="追加实体"
                  options={props.catalog.characterEntities}
                  buttonText="加入角色区"
                  disabled={defeated()}
                  onSelect={(option) => {
                    props.updateState((draft) => {
                      const target = draft.players[props.who].characters.find(
                        (item) => item.id === characterId(),
                      );
                      if (!target) {
                        return;
                      }
                      target.entities.push(
                        createEntityState(
                          option.definition,
                          allocateId(draft),
                        ) as unknown as (typeof target.entities)[number],
                      );
                    });
                  }}
                />
                <div class="gi-editor-preview-grid">
                  <For each={currentCharacter().entities}>
                    {(entity, index) => (
                      <PreviewTile
                        definition={entity.definition}
                        mode="icon"
                        subtitle={`状态 ID #${entity.id}`}
                        badges={[
                          `变量 ${Object.keys(entity.variables).length}`,
                        ]}
                        onClick={() =>
                          props.openModal({
                            kind: "entity",
                            who: props.who,
                            area: "characterEntities",
                            entityId: entity.id,
                            characterId: characterId(),
                          })
                        }
                        actions={
                          <>
                            <ActionButton
                              label="详情"
                              onClick={() =>
                                props.openModal({
                                  kind: "entity",
                                  who: props.who,
                                  area: "characterEntities",
                                  entityId: entity.id,
                                  characterId: characterId(),
                                })
                              }
                            />
                            <ActionButton
                              label="上移"
                              disabled={index() === 0}
                              onClick={() => {
                                props.updateState((draft) => {
                                  const target = draft.players[
                                    props.who
                                  ].characters.find(
                                    (item) => item.id === characterId(),
                                  );
                                  if (!target) {
                                    return;
                                  }
                                  target.entities = moveInArray(
                                    target.entities,
                                    index(),
                                    -1,
                                  );
                                });
                              }}
                            />
                            <ActionButton
                              label="下移"
                              disabled={
                                index() ===
                                currentCharacter().entities.length - 1
                              }
                              onClick={() => {
                                props.updateState((draft) => {
                                  const target = draft.players[
                                    props.who
                                  ].characters.find(
                                    (item) => item.id === characterId(),
                                  );
                                  if (!target) {
                                    return;
                                  }
                                  target.entities = moveInArray(
                                    target.entities,
                                    index(),
                                    1,
                                  );
                                });
                              }}
                            />
                            <ActionButton
                              label="移除"
                              tone="danger"
                              onClick={() => {
                                props.updateState((draft) => {
                                  const target = draft.players[
                                    props.who
                                  ].characters.find(
                                    (item) => item.id === characterId(),
                                  );
                                  if (!target) {
                                    return;
                                  }
                                  target.entities.splice(index(), 1);
                                });
                              }}
                            />
                          </>
                        }
                      />
                    )}
                  </For>
                </div>
              </div>
            </div>
          </Surface>
        );
      }}
    </Show>
  );
}

// Modal version (keeping for backwards compatibility)
interface CharacterModalProps {
  open: boolean;
  state: GameState;
  who: 0 | 1;
  characterId: number;
  catalog: EditorCatalog;
  updateState: UpdateGameState;
  openModal: (modal: EditorModal) => void;
  onClose: () => void;
}

export function CharacterModal(props: CharacterModalProps) {
  // Find character index from characterId
  const characterIndex = () => {
    const player = getPlayer(props.state, props.who);
    return player.characters.findIndex((c) => c.id === props.characterId);
  };

  return (
    <Modal open={props.open} title={`角色编辑`} onClose={props.onClose}>
      <CharacterModalContent
        state={props.state}
        who={props.who}
        characterIndex={characterIndex()}
        catalog={props.catalog}
        updateState={props.updateState}
        openModal={props.openModal}
      />
    </Modal>
  );
}

// Content component for Entity (non-modal version)
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
  updater: (entity: Mutable<EntityState>) => void,
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
        updater(entity as unknown as Mutable<EntityState>);
      }
      return;
    }
    const entity = player[props.area].find(
      (item) => item.id === props.entityId,
    );
    if (entity) {
      updater(entity as unknown as Mutable<EntityState>);
    }
  });
}

export function EntityModalContent(props: EntityContentProps) {
  const [query, setQuery] = createSignal("");
  const [confirmModalOpen, setConfirmModalOpen] = createSignal(false);
  const [pendingAttachment, setPendingAttachment] = createSignal<any | null>(null);
  const [existingAttachmentIndex, setExistingAttachmentIndex] = createSignal(-1);

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
  const checkDuplicateAttachment = (attachmentDef: typeof props.catalog.attachments[0]['definition']) => {
    const currentEntity = entity();
    if (!currentEntity) return -1;
    const index = currentEntity.attachments.findIndex(
      att => att.definition.id === attachmentDef.id
    );
    return index;
  };

  // 处理添加附着前的检查
  const handleAddAttachmentCheck = (option: typeof props.catalog.attachments[0]) => {
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
  const doAddAttachment = (option: typeof props.catalog.attachments[0]) => {
    props.updateState((draft) => {
      const targetPlayer = draft.players[props.who];
      const targetEntity = targetPlayer[
        props.area as "hands" | "pile"
      ].find(
        (item) => item.id === props.entityId,
      );
      if (!targetEntity) {
        return;
      }
      targetEntity.attachments.push(
        createAttachmentState(
          option.definition,
          allocateId(draft),
        ) as unknown as (typeof targetEntity.attachments)[number],
      );
    });
  };

  // 执行覆盖（替换）附着
  const doReplaceAttachment = (option: typeof props.catalog.attachments[0], index: number) => {
    props.updateState((draft) => {
      const targetPlayer = draft.players[props.who];
      const targetEntity = targetPlayer[
        props.area as "hands" | "pile"
      ].find(
        (item) => item.id === props.entityId,
      );
      if (!targetEntity) {
        return;
      }
      // 替换指定位置的附着
      targetEntity.attachments[index] = createAttachmentState(
        option.definition,
        allocateId(draft),
      ) as unknown as (typeof targetEntity.attachments)[number];
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
                                onClick={() => handleAddAttachmentCheck(option)}
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
                          const isFirst = index() === 0;
                          const isLast =
                            index() === currentEntity().attachments.length - 1;

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
                                if (isFirst) return;
                                props.updateState((draft) => {
                                  const targetPlayer = draft.players[props.who];
                                  const targetEntity = targetPlayer[
                                    props.area as "hands" | "pile"
                                  ].find((item) => item.id === props.entityId);
                                  if (!targetEntity) return;
                                  targetEntity.attachments = moveInArray(
                                    targetEntity.attachments,
                                    index(),
                                    -1,
                                  );
                                });
                              },
                            },
                            {
                              content: "下移",
                              col: 0,
                              onClick: () => {
                                if (isLast) return;
                                props.updateState((draft) => {
                                  const targetPlayer = draft.players[props.who];
                                  const targetEntity = targetPlayer[
                                    props.area as "hands" | "pile"
                                  ].find((item) => item.id === props.entityId);
                                  if (!targetEntity) return;
                                  targetEntity.attachments = moveInArray(
                                    targetEntity.attachments,
                                    index(),
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
                                props.updateState((draft) => {
                                  const targetPlayer = draft.players[props.who];
                                  const targetEntity = targetPlayer[
                                    props.area as "hands" | "pile"
                                  ].find((item) => item.id === props.entityId);
                                  if (!targetEntity) return;
                                  targetEntity.attachments.splice(index(), 1);
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
interface EntityModalProps {
  open: boolean;
  state: GameState;
  who: 0 | 1;
  area: EditorEntityArea;
  entityId: number;
  characterId?: number;
  catalog: EditorCatalog;
  updateState: UpdateGameState;
  openModal: (modal: EditorModal) => void;
  onClose: () => void;
}

export function EntityModal(props: EntityModalProps) {
  const player = () => getPlayer(props.state, props.who);
  const entity = () =>
    getEntity(player(), props.area, props.entityId, props.characterId);
  const title = () =>
    entity()
      ? `实体编辑 - ${getDefinitionName(entity()!.definition)}`
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

// Content component for Attachment (non-modal version)
interface AttachmentContentProps {
  state: GameState;
  who: 0 | 1;
  area: "hands" | "pile";
  entityId: number;
  attachmentId: number;
  updateState: UpdateGameState;
}

export function AttachmentModalContent(props: AttachmentContentProps) {
  const player = () => getPlayer(props.state, props.who);
  const attachment = () =>
    getAttachment(player(), props.area, props.entityId, props.attachmentId);
  return (
    <Show when={attachment()}>
      {(resolvedAttachment) => {
        const currentAttachment = () => resolvedAttachment();
        return (
          <div class="space-y-2">
            <div class="flex gap-4">
              <div class="shrink-0 w-1/5">
                <PreviewTile
                  definition={currentAttachment().definition}
                  mode="icon"
                  subtitle={`状态 ID #${currentAttachment().id}`}
                  badges={[
                    `变量 ${Object.keys(currentAttachment().variables).length}`,
                  ]}
                />
              </div>
              <div class="flex-1 space-y-4 min-w-0">
                <SectionTitle title="变量编辑" />
                <VariableGrid
                  entries={Object.entries(currentAttachment().variables)}
                  onChange={(key, value) => {
                    props.updateState((draft) => {
                      const targetPlayer = draft.players[props.who];
                      const targetEntity = targetPlayer[props.area].find(
                        (item) => item.id === props.entityId,
                      );
                      const targetAttachment = targetEntity?.attachments.find(
                        (item) => item.id === props.attachmentId,
                      );
                      if (!targetAttachment) {
                        return;
                      }
                      (
                        targetAttachment as unknown as Mutable<AttachmentState>
                      ).variables[key] = value;
                    });
                  }}
                />
              </div>
            </div>
          </div>
        );
      }}
    </Show>
  );
}

// Modal version (keeping for backwards compatibility)
interface AttachmentModalProps {
  open: boolean;
  state: GameState;
  who: 0 | 1;
  area: "hands" | "pile";
  entityId: number;
  attachmentId: number;
  updateState: UpdateGameState;
  onClose: () => void;
}

export function AttachmentModal(props: AttachmentModalProps) {
  const player = () => getPlayer(props.state, props.who);
  const attachment = () =>
    getAttachment(player(), props.area, props.entityId, props.attachmentId);
  const title = () =>
    attachment()
      ? `附着编辑 - ${getDefinitionName(attachment()!.definition)}`
      : "附着编辑";
  return (
    <Modal open={props.open} title={title()} onClose={props.onClose}>
      <AttachmentModalContent
        state={props.state}
        who={props.who}
        area={props.area}
        entityId={props.entityId}
        attachmentId={props.attachmentId}
        updateState={props.updateState}
      />
    </Modal>
  );
}

// Content component for Extension (non-modal version)
interface ExtensionContentProps {
  state: GameState;
  index: number;
  updateState: UpdateGameState;
}

export function ExtensionModalContent(props: ExtensionContentProps) {
  const extension = () => props.state.extensions[props.index];
  return (
    <Show when={extension()}>
      {(resolvedExtension) => {
        const currentExtension = () => resolvedExtension();
        return (
          <div class="space-y-4">
            <div class="grid gap-3 sm:grid-cols-2">
              <SummaryLine
                label="扩展编号"
                value={String(currentExtension().definition.id)}
              />
              <SummaryLine
                label="说明"
                value={currentExtension().definition.description || "无"}
              />
            </div>
            <JsonSchemaEditor
              schema={currentExtension().definition.schema}
              value={currentExtension().state}
              onChange={(value) => {
                props.updateState((draft) => {
                  draft.extensions[props.index].state = value;
                });
              }}
            />
          </div>
        );
      }}
    </Show>
  );
}

// Modal version (keeping for backwards compatibility)
interface ExtensionModalProps {
  open: boolean;
  state: GameState;
  index: number;
  updateState: UpdateGameState;
  onClose: () => void;
}

export function ExtensionModal(props: ExtensionModalProps) {
  return (
    <Modal open={props.open} title={`扩展编辑`} onClose={props.onClose}>
      <ExtensionModalContent
        state={props.state}
        index={props.index}
        updateState={props.updateState}
      />
    </Modal>
  );
}
