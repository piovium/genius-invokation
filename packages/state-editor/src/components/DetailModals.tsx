import { createMemo, createSignal, For, Show } from "solid-js";

import type {
  AttachmentState,
  CharacterState,
  EntityDefinition,
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
  const character = () => player().characters[props.characterIndex];
  const characterId = () => character()?.id ?? 0;
  const defeated = () => (character()?.variables.alive ?? 1) === 0;
  const isActive = () => player().activeCharacterId === characterId();

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

  // 移动角色位置
  const moveCharacter = (delta: number) => {
    props.updateState((draft) => {
      const chars = draft.players[props.who].characters;
      const currentIndex = props.characterIndex;
      const newIndex = currentIndex + delta;
      if (newIndex < 0 || newIndex >= chars.length) return;

      // 交换位置
      const temp = chars[currentIndex];
      chars[currentIndex] = chars[newIndex]!;
      chars[newIndex] = temp!;
    });
  };

  // 标记为击倒
  const defeatCharacter = () => {
    if (!window.confirm("确定要将该角色设为已击倒吗？")) {
      return;
    }
    props.updateState((draft) => {
      const target = draft.players[props.who].characters.find(
        (item) => item.id === characterId(),
      );
      if (!target) return;
      target.variables.health = 0;
      target.variables.energy = 0;
      target.variables.aura = 0 as CharacterState["variables"]["aura"];
      target.variables.alive = 0;
      target.entities = [];
    });
  };

  // 恢复存活
  const reviveCharacter = () => {
    props.updateState((draft) => {
      const target = draft.players[props.who].characters.find(
        (item) => item.id === characterId(),
      );
      if (!target) return;
      target.variables.health = 1;
      target.variables.alive = 1;
    });
  };

  // 设为出战
  const setAsActive = () => {
    props.updateState((draft) => {
      draft.players[props.who].activeCharacterId = characterId();
    });
  };

  // 删除角色
  const removeCharacter = () => {
    if (!window.confirm("确定要删除该角色吗？")) {
      return;
    }
    props.updateState((draft) => {
      const player = draft.players[props.who];
      const removedChar = player.characters.splice(props.characterIndex, 1)[0];
      // 如果删除的是当前出战角色，重置activeCharacterId
      if (removedChar?.id === player.activeCharacterId) {
        player.activeCharacterId =
          player.characters.length > 0 ? player.characters[0]!.id : -1;
      }
    });
  };

  return (
    <Show
      when={character()}
      fallback={
        <Surface title={`角色${props.characterIndex + 1} - 未选择`}>
          <div class="text-center py-8 text-slate-400">
            该角色区域暂无角色，请先在主界面点击"选择角色"按钮
          </div>
        </Surface>
      }
    >
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
                currentCharacter().definition.specialEnergy?.variableName,
              ].includes(key),
          );

        return (
          <Surface
            title={`角色${props.characterIndex + 1} - ${getDefinitionName(currentCharacter().definition)}`}
          >
            <div class="space-y-6">
              {/* ========== 第一部分：预览信息 ========== */}
              <div class="rounded-2xl border border-white/10 bg-slate-950/30 p-4">
                <div class="flex gap-4">
                  <div class="shrink-0 w-28">
                    <img
                      src={getImageUrl(currentCharacter().definition)}
                      alt={getDefinitionName(currentCharacter().definition)}
                      class={`w-full rounded-xl`}
                    />
                  </div>
                  <div class="flex-1 space-y-3">
                    <div class="grid grid-cols-2 gap-3 text-sm">
                      <div class="rounded-xl border border-white/10 bg-slate-900/50 px-3 py-2">
                        <span class="text-slate-400">定义ID: </span>
                        <span class="text-slate-200">
                          {currentCharacter().definition.id}
                        </span>
                      </div>
                      <div class="rounded-xl border border-white/10 bg-slate-900/50 px-3 py-2">
                        <span class="text-slate-400">实体ID: </span>
                        <span class="text-slate-200">
                          {currentCharacter().id}
                        </span>
                      </div>
                      <div class="rounded-xl border border-white/10 bg-slate-900/50 px-3 py-2">
                        <span class="text-slate-400">生命值: </span>
                        <span class="text-rose-300">
                          {currentCharacter().variables.health}/
                          {currentCharacter().variables.maxHealth}
                        </span>
                      </div>
                      <div class="rounded-xl border border-white/10 bg-slate-900/50 px-3 py-2">
                        <span class="text-slate-400">
                          {specialEnergyLabel()}:{" "}
                        </span>
                        <span class="text-cyan-300">
                          {currentCharacter().definition.specialEnergy
                            ?.variableName
                            ? currentCharacter().variables[
                                currentCharacter().definition.specialEnergy
                                  ?.variableName!
                              ]
                            : `${currentCharacter().variables.energy}/${currentCharacter().variables.maxEnergy}`}
                        </span>
                      </div>
                      <div class="rounded-xl border border-white/10 bg-slate-900/50 px-3 py-2">
                        <span class="text-slate-400">元素附着: </span>
                        <span class="text-amber-300">
                          {AURA_LABELS[currentCharacter().variables.aura]}
                        </span>
                      </div>
                      <div class="rounded-xl border border-white/10 bg-slate-900/50 px-3 py-2">
                        <span class="text-slate-400">区域实体数量: </span>
                        <span class="text-slate-200">
                          {currentCharacter().entities.length}
                        </span>
                      </div>
                      <div class="rounded-xl border border-white/10 bg-slate-900/50 px-3 py-2">
                        <span class="text-slate-400">是否出战: </span>
                        <span class="text-slate-200">
                          {isActive() ? "当前出战" : "后台角色"}
                        </span>
                      </div>
                      <div class="rounded-xl border border-white/10 bg-slate-900/50 px-3 py-2">
                        <span class="text-slate-400">是否存活: </span>
                        <span class="text-slate-200">
                          {defeated() ? "已击倒" : "存活中"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              {/* ========== 第二部分：可选操作 ========== */}
              <div class="rounded-2xl border border-white/10 bg-slate-950/30 p-4">
                <SectionTitle
                  title="可选操作"
                  description="切换出战状态、移动位置、击倒或复活角色"
                />
                <div class="mt-4 flex flex-wrap gap-2">
                  <ActionButton
                    label="设为出战"
                    disabled={isActive() || defeated()}
                    tone="accent"
                    onClick={setAsActive}
                  />
                  <ActionButton
                    label="前移"
                    disabled={props.characterIndex === 0}
                    onClick={() => moveCharacter(-1)}
                  />
                  <ActionButton
                    label="后移"
                    disabled={
                      props.characterIndex >= player().characters.length - 1
                    }
                    onClick={() => moveCharacter(1)}
                  />
                  <ActionButton
                    label="标记为击倒"
                    tone="danger"
                    disabled={defeated()}
                    onClick={defeatCharacter}
                  />
                  <ActionButton
                    label="恢复存活"
                    disabled={!defeated()}
                    onClick={reviveCharacter}
                  />
                  <ActionButton
                    label="删除角色"
                    tone="danger"
                    onClick={removeCharacter}
                  />
                </div>
              </div>
              {/* ========== 第三部分：基础信息编辑 ========== */}
              <div class="rounded-2xl border border-white/10 bg-slate-950/30 p-4">
                <SectionTitle
                  title="基础信息编辑"
                  description="修改角色的基础属性"
                />
                <div class="mt-4 grid gap-3 sm:grid-cols-2">
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
                    label={specialEnergyLabel()}
                    value={
                      currentCharacter().definition.specialEnergy?.variableName
                        ? currentCharacter().variables[
                            currentCharacter().definition.specialEnergy
                              ?.variableName!
                          ]
                        : currentCharacter().variables.energy
                    }
                    disabled={defeated()}
                    onChange={(value) =>
                      updateCharacter((target) => {
                        if (target.definition.specialEnergy?.variableName) {
                          target.variables[
                            target.definition.specialEnergy?.variableName!
                          ] = value;
                        } else {
                          target.variables.energy = value;
                        }
                      })
                    }
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
              </div>
              <Show when={otherVariables().length > 0}>
                <div class="rounded-2xl border border-white/10 bg-slate-950/30 p-4">
                  <SectionTitle title="额外变量" />
                  <div class="mt-4">
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
                </div>
              </Show>

              {/* ========== 第四部分：角色区域实体信息（参照出战状态编辑面板） ========== */}
              <CharacterEntitySection
                character={currentCharacter()}
                who={props.who}
                characterId={characterId()}
                catalog={props.catalog}
                updateState={props.updateState}
                openModal={props.openModal}
                defeated={defeated()}
              />
            </div>
          </Surface>
        );
      }}
    </Show>
  );
}

// 角色区域实体信息组件（参照出战状态编辑面板复刻）
interface CharacterEntitySectionProps {
  character: CharacterState;
  who: 0 | 1;
  characterId: number;
  catalog: EditorCatalog;
  updateState: UpdateGameState;
  openModal: (modal: EditorModal) => void;
  defeated: boolean;
}

function CharacterEntitySection(props: CharacterEntitySectionProps) {
  const [addModalOpen, setAddModalOpen] = createSignal(false);
  const [confirmModalOpen, setConfirmModalOpen] = createSignal(false);
  const [pendingDefinition, setPendingDefinition] =
    createSignal<EntityDefinition | null>(null);
  const [existingEntityIndex, setExistingEntityIndex] =
    createSignal<number>(-1);

  // 检查是否存在相同 definition.id 的实体
  const checkDuplicate = (definition: EntityDefinition) => {
    const currentItems = props.character.entities;
    const index = currentItems.findIndex(
      (item) => item.definition.id === definition.id,
    );
    return index;
  };

  // 处理添加前的检查
  const handleAddCheck = (definition: EntityDefinition) => {
    const duplicateIndex = checkDuplicate(definition);

    if (duplicateIndex !== -1) {
      setPendingDefinition(definition);
      setExistingEntityIndex(duplicateIndex);
      setConfirmModalOpen(true);
    } else {
      doAdd(definition);
    }
  };

  // 执行添加
  const doAdd = (definition: EntityDefinition) => {
    props.updateState((draft) => {
      const target = draft.players[props.who].characters.find(
        (item) => item.id === props.characterId,
      );
      if (!target) return;

      target.entities.push(
        createEntityState(
          definition,
          allocateId(draft),
        ) as unknown as (typeof target.entities)[number],
      );
    });
  };

  // 执行覆盖
  const doReplace = (definition: EntityDefinition, index: number) => {
    props.updateState((draft) => {
      const target = draft.players[props.who].characters.find(
        (item) => item.id === props.characterId,
      );
      if (!target) return;

      target.entities[index] = createEntityState(
        definition,
        allocateId(draft),
      ) as unknown as (typeof target.entities)[number];
    });
  };

  // 确认覆盖
  const handleConfirmReplace = () => {
    const definition = pendingDefinition();
    const index = existingEntityIndex();
    if (definition && index !== -1) {
      doReplace(definition, index);
    }
    setConfirmModalOpen(false);
    setPendingDefinition(null);
    setExistingEntityIndex(-1);
  };

  // 取消覆盖
  const handleCancelReplace = () => {
    setConfirmModalOpen(false);
    setPendingDefinition(null);
    setExistingEntityIndex(-1);
  };

  return (
    <>
      <div class="rounded-2xl border border-white/10 bg-slate-950/30 p-4">
        <SectionTitle
          title="角色区域实体"
          description="角色身上的装备和状态"
        />
        <div class="mt-4 space-y-3">
          <For each={props.character.entities}>
            {(entity, index) => {
              const buttons: ListItemButton[] = [
                {
                  content: "上移",
                  col: 0,
                  onClick: () => {
                    props.updateState((draft) => {
                      const target = draft.players[props.who].characters.find(
                        (item) => item.id === props.characterId,
                      );
                      if (!target) return;
                      target.entities = moveInArray(
                        target.entities,
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
                    props.updateState((draft) => {
                      const target = draft.players[props.who].characters.find(
                        (item) => item.id === props.characterId,
                      );
                      if (!target) return;
                      target.entities = moveInArray(
                        target.entities,
                        index(),
                        1,
                      );
                    });
                  },
                },
                {
                  content: "详情",
                  col: 1,
                  variant: "primary",
                  onClick: () =>
                    props.openModal({
                      kind: "entity",
                      who: props.who,
                      area: "characterEntities",
                      entityId: entity.id,
                      characterId: props.characterId,
                    }),
                },
                {
                  content: "移除",
                  col: 1,
                  variant: "danger",
                  onClick: () => {
                    props.updateState((draft) => {
                      const target = draft.players[props.who].characters.find(
                        (item) => item.id === props.characterId,
                      );
                      if (!target) return;
                      target.entities.splice(index(), 1);
                    });
                  },
                },
              ];

              return (
                <ListItem
                  imageSrc={getImageUrl(entity.definition, "icon")}
                  imageMode="icon"
                  title={getDefinitionName(entity.definition)}
                  description={`ID: ${entity.id}`}
                  tags={[
                    `变量 ${Object.keys(entity.variables).length}`,
                    `附着 ${entity.attachments.length}`,
                  ]}
                  buttonColumns={2}
                  buttons={buttons}
                />
              );
            }}
          </For>
          {/* 新增按钮 */}
          <button
            type="button"
            onClick={() => setAddModalOpen(true)}
            disabled={props.defeated}
            class="w-full flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-white/20 bg-transparent px-3 py-3 text-sm text-slate-400 hover:border-white/40 hover:text-slate-300 hover:bg-white/5 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span class="text-lg">+</span>
            <span>追加实体</span>
          </button>
        </div>
      </div>

      {/* 添加实体弹窗 */}
      <Modal
        open={addModalOpen()}
        title="追加实体"
        description="选择要添加到角色区域的装备或状态"
        onClose={() => setAddModalOpen(false)}
      >
        <div class="space-y-4">
          <div
            class="h-50vh overflow-y-auto pr-2"
            style={{
              "scrollbar-width": "thin",
              "scrollbar-color": "rgba(255, 255, 255, 0.3) transparent",
            }}
          >
            <div class="grid grid-cols-[repeat(auto-fill,minmax(80px,1fr))] gap-3">
              <For each={props.catalog.characterEntities}>
                {(option) => (
                  <button
                    type="button"
                    class="flex flex-col items-center p-2 rounded-lg border border-white/10 bg-slate-800/30 hover:bg-slate-700/50 transition text-center"
                    onClick={() => {
                      handleAddCheck(option.definition);
                      setAddModalOpen(false);
                    }}
                  >
                    <div class="w-full rounded-lg overflow-hidden">
                      <img
                        src={getImageUrl(option, "icon")}
                        alt={option.name}
                        class="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                    <div class="text-xs text-slate-200 truncate w-full mt-1">
                      {option.name}
                    </div>
                    <div class="text-[10px] text-slate-500">#{option.id}</div>
                  </button>
                )}
              </For>
            </div>
          </div>
        </div>
      </Modal>

      {/* 确认覆盖弹窗 */}
      <ConfirmModal
        open={confirmModalOpen()}
        title="检测到重复实体"
        message={
          pendingDefinition()
            ? `角色区域中已存在相同类型的实体「${getDefinitionName(pendingDefinition()!)}」，是否覆盖？`
            : ""
        }
        confirmText="确认覆盖"
        cancelText="取消"
        onConfirm={handleConfirmReplace}
        onCancel={handleCancelReplace}
      />
    </>
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
  const [pendingAttachment, setPendingAttachment] = createSignal<any | null>(
    null,
  );
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
    option: (typeof props.catalog.attachments)[0],
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
  const doAddAttachment = (option: (typeof props.catalog.attachments)[0]) => {
    props.updateState((draft) => {
      const targetPlayer = draft.players[props.who];
      const targetEntity = targetPlayer[props.area as "hands" | "pile"].find(
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
  const doReplaceAttachment = (
    option: (typeof props.catalog.attachments)[0],
    index: number,
  ) => {
    props.updateState((draft) => {
      const targetPlayer = draft.players[props.who];
      const targetEntity = targetPlayer[props.area as "hands" | "pile"].find(
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
                            const isFirst = index() === 0;
                            const isLast =
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
                                  if (isFirst) return;
                                  props.updateState((draft) => {
                                    const targetPlayer =
                                      draft.players[props.who];
                                    const targetEntity = targetPlayer[
                                      props.area as "hands" | "pile"
                                    ].find(
                                      (item) => item.id === props.entityId,
                                    );
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
                                    const targetPlayer =
                                      draft.players[props.who];
                                    const targetEntity = targetPlayer[
                                      props.area as "hands" | "pile"
                                    ].find(
                                      (item) => item.id === props.entityId,
                                    );
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
                                    const targetPlayer =
                                      draft.players[props.who];
                                    const targetEntity = targetPlayer[
                                      props.area as "hands" | "pile"
                                    ].find(
                                      (item) => item.id === props.entityId,
                                    );
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
