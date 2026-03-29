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
import { AddCardModal } from "./AddCardModal";
import type { CharacterDefinition } from "@gi-tcg/core";
import type { CharacterTag } from "@gi-tcg/core";
import {
  allocateId,
  AURA_LABELS,
  AURA_OPTIONS,
  createAttachmentState,
  createCharacterState,
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
  type EditorSection,
  type UpdateGameState,
  getImageUrl,
} from "../state";

// 角色标签分类
const CHARACTER_TAG_CATEGORIES = {
  element: [
    { tag: "cryo", label: "冰" },
    { tag: "hydro", label: "水" },
    { tag: "pyro", label: "火" },
    { tag: "electro", label: "雷" },
    { tag: "anemo", label: "风" },
    { tag: "geo", label: "岩" },
    { tag: "dendro", label: "草" },
  ] as const,
  weapon: [
    { tag: "sword", label: "单手剑" },
    { tag: "claymore", label: "双手剑" },
    { tag: "pole", label: "长柄武器" },
    { tag: "catalyst", label: "法器" },
    { tag: "bow", label: "弓" },
    { tag: "otherWeapon", label: "其他武器" },
  ] as const,
  nation: [
    { tag: "mondstadt", label: "蒙德" },
    { tag: "liyue", label: "璃月" },
    { tag: "inazuma", label: "稻妻" },
    { tag: "sumeru", label: "须弥" },
    { tag: "fontaine", label: "枫丹" },
    { tag: "natlan", label: "纳塔" },
    { tag: "nodkrai", label: "挪德卡莱" },
    { tag: "fatui", label: "愚人众" },
    { tag: "eremite", label: "镀金旅团" },
    { tag: "monster", label: "魔物" },
    { tag: "hilichurl", label: "丘丘人" },
    { tag: "sacread", label: "圣骸兽" },
    { tag: "calamity", label: "寰宇劫灭" },
  ] as const,
};

// 所有角色标签
const ALL_CHARACTER_TAGS = [
  ...CHARACTER_TAG_CATEGORIES.element,
  ...CHARACTER_TAG_CATEGORIES.weapon,
  ...CHARACTER_TAG_CATEGORIES.nation,
] as const;

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
  onSelectSection: (section: EditorSection) => void;
}

export function CharacterModalContent(props: CharacterContentProps) {
  const player = () => getPlayer(props.state, props.who);
  const character = () => player().characters[props.characterIndex];
  const characterId = () => character()?.id ?? 0;
  const defeated = () => (character()?.variables.alive ?? 1) === 0;
  const isActive = () => player().activeCharacterId === characterId();

  // 角色选择弹窗状态
  const [selectCharacterModalOpen, setSelectCharacterModalOpen] =
    createSignal(false);
  // 角色标签筛选状态
  const [selectedCharacterTags, setSelectedCharacterTags] = createSignal<
    CharacterTag[]
  >([]);

  // 切换角色标签筛选
  const toggleCharacterTag = (tag: CharacterTag) => {
    setSelectedCharacterTags((prev) => {
      if (prev.includes(tag)) {
        return prev.filter((t) => t !== tag);
      }
      return [...prev, tag];
    });
  };

  // 获取当前玩家已选择的角色ID列表
  const existingCharacterIds = createMemo(() => {
    return new Set(player().characters.map((c) => c.definition.id));
  });

  // 根据标签筛选角色，并排除已选择的角色
  const filteredCharacters = createMemo(() => {
    const allCharacters = props.catalog.characters.sort((a, b) => a.id - b.id);
    const tags = selectedCharacterTags();
    const existingIds = existingCharacterIds();

    return allCharacters.filter((char) => {
      // 排除已选择的角色（当前正在编辑的角色除外）
      if (
        existingIds.has(char.definition.id) &&
        char.definition.id !== character()?.definition.id
      ) {
        return false;
      }
      // 标签筛选
      if (tags.length === 0) {
        return true;
      }
      return tags.every((tag) => char.definition.tags.includes(tag));
    });
  });

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

  // 击倒确认弹窗状态
  const [defeatConfirmOpen, setDefeatConfirmOpen] = createSignal(false);

  // 武器/天赋不合法警告弹窗状态
  const [invalidEntityWarning, setInvalidEntityWarning] = createSignal<{
    open: boolean;
    type: "weapon" | "talent" | "other";
    entityName: string;
  }>({ open: false, type: "other", entityName: "" });

  // 移动角色位置
  const moveCharacter = (delta: number) => {
    const chars = props.state.players[props.who].characters;
    const currentIndex = props.characterIndex;
    const newIndex = currentIndex + delta;
    if (newIndex < 0 || newIndex >= chars.length) return;

    props.updateState((draft) => {
      const draftChars = draft.players[props.who].characters;
      // 交换位置
      const temp = draftChars[currentIndex];
      draftChars[currentIndex] = draftChars[newIndex]!;
      draftChars[newIndex] = temp!;
    });

    // 自动切换右侧面板跟随对应角色
    props.onSelectSection({
      kind: "character",
      who: props.who,
      characterIndex: newIndex,
    });
  };

  // 标记为击倒
  const defeatCharacter = () => {
    setDefeatConfirmOpen(true);
  };

  // 确认击倒
  const handleConfirmDefeat = () => {
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
    setDefeatConfirmOpen(false);
  };

  // 取消击倒
  const handleCancelDefeat = () => {
    setDefeatConfirmOpen(false);
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

  // 校验实体合法性（武器标签和天赋关联角色）
  const validateAndCleanEntities = (
    entities: EntityState[],
    newCharDef: CharacterDefinition,
  ): EntityState[] => {
    return entities.filter((entity) => {
      const def = entity.definition;
      const tags = def.tags;
      // 检查武器标签
      const weaponTags = ["sword", "claymore", "pole", "catalyst", "bow"];
      const entityWeaponTag = tags.find((tag) => weaponTags.includes(tag));
      const charWeaponTag = newCharDef.tags.find((tag) =>
        weaponTags.includes(tag),
      );
      // 如果实体有武器标签但角色没有对应的武器标签，不合法
      if (entityWeaponTag && entityWeaponTag !== charWeaponTag) {
        return false;
      }

      // 检查天赋关联角色（talent标签的实体需要关联特定角色）
      if (tags.includes("talent")) {
        // 天赋只能装备给对应的角色
        const relatedCharId = Number(def.id.toString().slice(1, -1));
        if (newCharDef.id !== relatedCharId) {
          return false;
        }
      }
      return true;
    });
  };

  // 重新选择角色（覆盖当前角色）
  const reselectCharacter = () => {
    setSelectCharacterModalOpen(true);
  };

  // 处理角色选择
  const handleSelectCharacter = (charDef: CharacterDefinition) => {
    props.updateState((draft) => {
      const player = draft.players[props.who];
      const existingChar = player.characters[props.characterIndex];

      // 保留现有实体，但需要进行合法性校验
      const existingEntities = (existingChar?.entities ||
        []) as unknown as EntityState[];
      const validEntities = validateAndCleanEntities(existingEntities, charDef);

      // 创建新角色
      const newCharacter = createCharacterState(
        charDef as any,
        allocateId(draft),
      );

      // 保留合法的实体
      (newCharacter as any).entities = validEntities;

      // 替换角色
      player.characters[props.characterIndex] = newCharacter as any;

      // 如果这是第一个角色，设为出战
      if (player.characters.length === 1) {
        player.activeCharacterId = newCharacter.id;
      } else if (existingChar?.id === player.activeCharacterId) {
        // 如果替换的是出战角色，更新activeCharacterId
        player.activeCharacterId = newCharacter.id;
      }
    });

    setSelectCharacterModalOpen(false);
  };

  return (
    <>
      <Show
        when={character()}
        fallback={
          <Surface title={`角色${props.characterIndex + 1} - 未选择`}>
            <div class="space-y-6">
              <button
                type="button"
                onClick={() => setSelectCharacterModalOpen(true)}
                class="w-full flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-amber-400/40 bg-transparent px-3 py-4 text-sm text-amber-300 hover:border-amber-400/70 hover:bg-amber-400/10 transition"
              >
                <span class="text-lg">+</span>
                <span>选择角色</span>
              </button>
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
                <div class="flex flex-col gap-2">
                  <div class="grid grid-cols-3 gap-2">
                    <ActionButton
                      label="左移"
                      disabled={props.characterIndex === 0}
                      onClick={() => moveCharacter(-1)}
                    />
                    <ActionButton
                      label="设为出战"
                      disabled={isActive() || defeated()}
                      tone="accent"
                      onClick={setAsActive}
                    />
                    <ActionButton
                      label="右移"
                      disabled={
                        props.characterIndex >= player().characters.length - 1
                      }
                      onClick={() => moveCharacter(1)}
                    />
                  </div>
                  <div class="grid grid-cols-2 gap-2">
                    <Show when={!defeated()}>
                      <ActionButton
                        label="标记为击倒"
                        tone="danger"
                        disabled={defeated()}
                        onClick={defeatCharacter}
                      />
                    </Show>
                    <Show when={defeated()}>
                      <ActionButton
                        label="复苏角色"
                        tone="danger"
                        disabled={!defeated()}
                        onClick={reviveCharacter}
                      />
                    </Show>
                    <ActionButton
                      label="重新选择角色"
                      tone="danger"
                      onClick={reselectCharacter}
                    />
                  </div>
                </div>
                {/* ========== 第三部分：基础信息编辑 ========== */}
                <div class="rounded-2xl border border-white/10 bg-slate-950/30 p-4">
                  <SectionTitle title="基础信息编辑" />
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
                        currentCharacter().definition.specialEnergy
                          ?.variableName
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
                  state={props.state}
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

      {/* 角色选择弹窗 */}
      <Modal
        open={selectCharacterModalOpen()}
        title="选择角色"
        description="从列表中选择一个角色"
        onClose={() => setSelectCharacterModalOpen(false)}
      >
        <div class="space-y-4">
          {/* 标签筛选区域 */}
          <div class="space-y-3 border-b border-white/10 pb-4">
            {/* 元素标签 */}
            <div class="space-y-2">
              <div class="text-xs text-slate-400">元素</div>
              <div class="flex flex-wrap gap-2">
                <For each={CHARACTER_TAG_CATEGORIES.element}>
                  {({ tag, label }) => (
                    <button
                      type="button"
                      onClick={() => toggleCharacterTag(tag)}
                      class={`px-2 py-1 rounded-full text-xs border transition ${
                        selectedCharacterTags().includes(tag)
                          ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-50"
                          : "bg-slate-800 border-white/10 text-slate-300 hover:bg-slate-700"
                      }`}
                    >
                      {label}
                    </button>
                  )}
                </For>
              </div>
            </div>

            {/* 武器标签 */}
            <div class="space-y-2">
              <div class="text-xs text-slate-400">武器</div>
              <div class="flex flex-wrap gap-2">
                <For each={CHARACTER_TAG_CATEGORIES.weapon}>
                  {({ tag, label }) => (
                    <button
                      type="button"
                      onClick={() => toggleCharacterTag(tag)}
                      class={`px-2 py-1 rounded-full text-xs border transition ${
                        selectedCharacterTags().includes(tag)
                          ? "bg-amber-500/20 border-amber-500/50 text-amber-50"
                          : "bg-slate-800 border-white/10 text-slate-300 hover:bg-slate-700"
                      }`}
                    >
                      {label}
                    </button>
                  )}
                </For>
              </div>
            </div>

            {/* 地区标签 */}
            <div class="space-y-2">
              <div class="text-xs text-slate-400">阵营</div>
              <div class="flex flex-wrap gap-2">
                <For each={CHARACTER_TAG_CATEGORIES.nation}>
                  {({ tag, label }) => (
                    <button
                      type="button"
                      onClick={() => toggleCharacterTag(tag)}
                      class={`px-2 py-1 rounded-full text-xs border transition ${
                        selectedCharacterTags().includes(tag)
                          ? "bg-purple-500/20 border-purple-500/50 text-purple-50"
                          : "bg-slate-800 border-white/10 text-slate-300 hover:bg-slate-700"
                      }`}
                    >
                      {label}
                    </button>
                  )}
                </For>
              </div>
            </div>
            {/* 已选标签和清除按钮 */}
            <Show when={selectedCharacterTags().length > 0}>
              <div class="flex items-center justify-between pt-2 border-t border-white/10">
                <div class="text-xs text-slate-400">
                  已选择 {selectedCharacterTags().length} 个标签
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedCharacterTags([])}
                  class="text-xs text-slate-400 hover:text-slate-200 transition"
                >
                  清除筛选
                </button>
              </div>
            </Show>
          </div>

          {/* 角色列表 */}
          <div
            class="h-40vh overflow-y-auto pr-2"
            style={{
              "scrollbar-width": "thin",
              "scrollbar-color": "rgba(255, 255, 255, 0.3) transparent",
            }}
          >
            <style>{`
              .scrollbar-thin::-webkit-scrollbar {
                width: 6px;
                height: 6px;
              }
              .scrollbar-thin::-webkit-scrollbar-track {
                background: transparent;
              }
              .scrollbar-thin::-webkit-scrollbar-thumb {
                background-color: rgba(255, 255, 255, 0.3);
                border-radius: 3px;
              }
              .scrollbar-thin::-webkit-scrollbar-thumb:hover {
                background-color: rgba(255, 255, 255, 0.5);
              }
            `}</style>

            {/* 结果统计 */}
            <div class="text-xs text-slate-400 mb-2">
              找到 {filteredCharacters().length} 个角色
            </div>

            <div class="grid grid-cols-8 gap-3">
              <For each={filteredCharacters()}>
                {(char) => (
                  <button
                    type="button"
                    onClick={() => handleSelectCharacter(char.definition)}
                    class="group flex flex-col items-center gap-2 p-3 rounded-xl border border-white/10 bg-slate-800/50 hover:bg-slate-700/50 hover:border-amber-500/50 transition"
                  >
                    {/* 角色头像 */}
                    <div class="w-full aspect-square rounded-full overflow-hidden border-2 border-white/20 group-hover:border-amber-500/50">
                      <img
                        src={getImageUrl(char, "icon")}
                        alt={char.name}
                        class="w-full h-full object-cover group-hover:scale-105 transition"
                        loading="lazy"
                      />
                    </div>
                    {/* 名称和ID */}
                    <div class="text-center w-full">
                      <div class="text-xs text-slate-200 truncate">
                        {char.name}
                      </div>
                      <div class="text-[10px] text-slate-500">#{char.id}</div>
                    </div>
                  </button>
                )}
              </For>
            </div>

            {/* 空状态 */}
            <Show when={filteredCharacters().length === 0}>
              <div class="text-center py-8 text-slate-500">
                没有找到匹配的角色
              </div>
            </Show>
          </div>
        </div>
      </Modal>

      {/* 击倒确认弹窗 */}
      <ConfirmModal
        open={defeatConfirmOpen()}
        title="确认击倒角色"
        message="确定要将该角色设为已击倒吗？击倒后角色将失去所有装备和状态。"
        confirmText="确认击倒"
        cancelText="取消"
        onConfirm={handleConfirmDefeat}
        onCancel={handleCancelDefeat}
      />
    </>
  );
}

// 角色区域实体信息组件（参照出战状态编辑面板复刻）
interface CharacterEntitySectionProps {
  character: CharacterState;
  who: 0 | 1;
  characterId: number;
  state: GameState;
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
  // 同类实体替换确认弹窗状态
  const [categoryReplaceModalOpen, setCategoryReplaceModalOpen] =
    createSignal(false);
  const [pendingCategoryReplace, setPendingCategoryReplace] = createSignal<{
    definition: EntityDefinition;
    existingIndex: number;
    category: string;
  } | null>(null);

  // 武器/天赋不合法警告弹窗状态
  const [invalidEntityWarning, setInvalidEntityWarning] = createSignal<{
    open: boolean;
    type: "weapon" | "talent" | "other";
    entityName: string;
  }>({ open: false, type: "other", entityName: "" });

  // 关闭不合法警告弹窗
  const closeInvalidEntityWarning = () => {
    setInvalidEntityWarning({ open: false, type: "other", entityName: "" });
  };

  // 检查实体类别（武器、圣遗物、天赋、特技）
  const getEntityCategory = (definition: EntityDefinition): string | null => {
    const tags = definition.tags;
    if (tags.includes("weapon")) return "weapon";
    if (tags.includes("artifact")) return "artifact";
    if (tags.includes("talent")) return "talent";
    if (tags.includes("technique")) return "technique";
    return null;
  };

  // 获取类别显示名称
  const getCategoryLabel = (category: string): string => {
    const labels: Record<string, string> = {
      weapon: "武器",
      artifact: "圣遗物",
      talent: "天赋",
      technique: "特技",
    };
    return labels[category] || category;
  };

  // 检查是否存在相同 definition.id 的实体
  const checkDuplicate = (definition: EntityDefinition) => {
    const currentItems = props.character.entities;
    const index = currentItems.findIndex(
      (item) => item.definition.id === definition.id,
    );
    return index;
  };

  // 检查是否存在同类别实体（武器、圣遗物、天赋、特技）
  const checkSameCategoryEntity = (
    definition: EntityDefinition,
  ): { index: number; category: string } | null => {
    const category = getEntityCategory(definition);
    if (!category) return null; // 状态类实体没有数量限制

    const currentItems = props.character.entities;
    const index = currentItems.findIndex((item) => {
      const itemCategory = getEntityCategory(item.definition);
      return itemCategory === category;
    });

    if (index !== -1) {
      return { index, category };
    }
    return null;
  };

  // 校验实体是否适合当前角色
  const isEntityValidForCharacter = (definition: EntityDefinition): boolean => {
    const tags = definition.tags;
    const charTags = props.character.definition.tags;

    // 检查武器标签
    const weaponTags = ["sword", "claymore", "pole", "catalyst", "bow"];
    const entityWeaponTag = tags.find((tag) => weaponTags.includes(tag));
    const charWeaponTag = charTags.find((tag) => weaponTags.includes(tag));

    // 如果实体有武器标签但角色没有对应的武器标签，不合法
    if (entityWeaponTag && entityWeaponTag !== charWeaponTag) {
      return false;
    }

    // 检查天赋关联角色
    if (tags.includes("talent")) {
      const relatedCharId = Number(definition.id.toString().slice(1, -1));
      if (props.character.definition.id !== relatedCharId) {
        return false;
      }
    }

    return true;
  };

  // 处理添加前的检查
  const handleAddCheck = (definition: EntityDefinition) => {
    // 1. 首先检查合法性
    if (!isEntityValidForCharacter(definition)) {
      const tags = definition.tags;
      const weaponTags = ["sword", "claymore", "pole", "catalyst", "bow"];
      const entityWeaponTag = tags.find((tag) => weaponTags.includes(tag));

      if (entityWeaponTag) {
        setInvalidEntityWarning({
          open: true,
          type: "weapon",
          entityName: getDefinitionName(definition),
        });
      } else if (tags.includes("talent")) {
        setInvalidEntityWarning({
          open: true,
          type: "talent",
          entityName: getDefinitionName(definition),
        });
      } else {
        setInvalidEntityWarning({
          open: true,
          type: "other",
          entityName: getDefinitionName(definition),
        });
      }
      return;
    }

    // 2. 检查是否存在相同 definition.id 的实体
    const duplicateIndex = checkDuplicate(definition);
    if (duplicateIndex !== -1) {
      setPendingDefinition(definition);
      setExistingEntityIndex(duplicateIndex);
      setConfirmModalOpen(true);
      return;
    }

    // 3. 检查是否存在同类别实体（武器、圣遗物、天赋、特技）
    const sameCategory = checkSameCategoryEntity(definition);
    if (sameCategory) {
      setPendingCategoryReplace({
        definition,
        existingIndex: sameCategory.index,
        category: sameCategory.category,
      });
      setCategoryReplaceModalOpen(true);
      return;
    }

    // 4. 直接添加
    doAdd(definition);
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

  // 确认同类替换
  const handleConfirmCategoryReplace = () => {
    const pending = pendingCategoryReplace();
    if (pending) {
      doReplace(pending.definition, pending.existingIndex);
    }
    setCategoryReplaceModalOpen(false);
    setPendingCategoryReplace(null);
  };

  // 取消同类替换
  const handleCancelCategoryReplace = () => {
    setCategoryReplaceModalOpen(false);
    setPendingCategoryReplace(null);
  };

  return (
    <>
      <div class="rounded-2xl border border-white/10 bg-slate-950/30 p-4">
        <SectionTitle
          title="角色区域实体"
          description="※ 角色身上的装备和状态，顺序为入场顺序"
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
              const imageMode = () =>
                entity.definition.type == "status" ? "icon" : "card";

              return (
                <ListItem
                  imageSrc={getImageUrl(entity.definition, imageMode())}
                  imageMode={imageMode()}
                  title={getDefinitionName(entity.definition)}
                  description={`ID: ${entity.id}`}
                  definition={entity.definition}
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

      {/* 添加实体弹窗 - 使用 AddCardModal */}
      <AddCardModal
        open={addModalOpen()}
        state={props.state}
        catalog={props.catalog}
        onSelect={(definition) => {
          handleAddCheck(definition);
          setAddModalOpen(false);
        }}
        onClose={() => setAddModalOpen(false)}
        showTypeFilter={true}
        showTagFilter={true}
        availableTypes={["equipment", "status"]}
        availableTags={[
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
        ]}
        maxResults={60}
      />

      {/* 确认覆盖弹窗 - 相同 definition.id */}
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

      {/* 确认替换弹窗 - 同类别实体（武器、圣遗物、天赋、特技） */}
      <ConfirmModal
        open={categoryReplaceModalOpen()}
        title={`${(() => {
          const pending = pendingCategoryReplace();
          return pending
            ? `已存在${getCategoryLabel(pending.category)}`
            : "替换确认";
        })()}`}
        message={(() => {
          const pending = pendingCategoryReplace();
          if (!pending) return "";
          const existingEntity =
            props.character.entities[pending.existingIndex];
          return `角色区域中已存在${getCategoryLabel(pending.category)}「${existingEntity ? getDefinitionName(existingEntity.definition) : ""}」，是否替换为新${getCategoryLabel(pending.category)}「${getDefinitionName(pending.definition)}」？`;
        })()}
        confirmText="确认替换"
        cancelText="取消"
        onConfirm={handleConfirmCategoryReplace}
        onCancel={handleCancelCategoryReplace}
      />

      {/* 不合法实体警告弹窗 - 武器/天赋不合法 */}
      <ConfirmModal
        open={invalidEntityWarning().open}
        title="实体不合法"
        message={(() => {
          const warning = invalidEntityWarning();
          if (!warning.open) return "";
          if (warning.type === "weapon") {
            return `「${warning.entityName}」的武器类型与当前角色不匹配，无法装备。`;
          } else if (warning.type === "talent") {
            return `「${warning.entityName}」不属于当前角色，无法装备。`;
          } else {
            return `「${warning.entityName}」不适合当前角色。`;
          }
        })()}
        confirmText="知道了"
        cancelText={null as unknown as string}
        onConfirm={closeInvalidEntityWarning}
        onCancel={closeInvalidEntityWarning}
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
        onSelectSection={() => {}}
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
                                definition={attachment.definition}
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
