import { createMemo, createSignal, For, Show } from "solid-js";
import type {
  CharacterState,
  EntityDefinition,
  EntityState,
  GameState,
  CharacterDefinition,
  CharacterTag,
} from "@gi-tcg/core";
import {
  ActionButton,
  NumberField,
  SelectField,
  SectionTitle,
  Surface,
} from "./Fields";
import { Modal } from "./Modal";
import { ListItem, type ListItemButton } from "./ListItem";
import { ConfirmModal } from "./ConfirmModal";
import { AddCardModal } from "./AddCardModal";
import {
  allocateId,
  AURA_LABELS,
  AURA_OPTIONS,
  createCharacterState,
  createEntityState,
  getCharacterEnergyLabel,
  getDefinitionName,
  getPlayer,
  moveInArray,
  type EditorSection,
  getImageUrl,
} from "../state";
import type { Draft } from "immer";
import { VariableGrid } from "./VariableGrid";
import { useStateEditorContext } from "./GameStateEditor";
import { EntityModal } from "./EntityModal";

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

interface CharacterEditorProps {
  who: 0 | 1;
  characterIndex: number;
  onSelectSection: (section: EditorSection) => void;
}

export function CharacterEditor(props: CharacterEditorProps) {
  const { openModal, catalog, gameState, updateState } =
    useStateEditorContext();
  const player = () => getPlayer(gameState(), props.who);
  const character = () => player().characters[props.characterIndex];
  const characterId = () => character()?.id ?? 0;
  const defeated = () => (character()?.variables.alive ?? 1) === 0;
  const isActive = () => player().activeCharacterId === characterId();

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
    const allCharacters = catalog().characters.sort((a, b) => a.id - b.id);
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
    updater: (target: Draft<CharacterState>) => void,
  ) => {
    const who = props.who;
    const chId = characterId();
    updateState((draft) => {
      const target = draft.players[who].characters.find(
        (item) => item.id === chId,
      );
      if (target) {
        updater(target);
      }
    });
  };

  // 移动角色位置
  const moveCharacter = (delta: number) => {
    const who = props.who;
    const chars = gameState().players[who].characters;
    const currentIndex = props.characterIndex;
    const newIndex = currentIndex + delta;
    if (newIndex < 0 || newIndex >= chars.length) return;

    updateState((draft) => {
      const draftChars = draft.players[who].characters;
      // 交换位置
      const temp = draftChars[currentIndex];
      draftChars[currentIndex] = draftChars[newIndex];
      draftChars[newIndex] = temp;
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
    openModal(() => (
      <ConfirmModal
        title="确认击倒角色"
        message="确定要将该角色设为已击倒吗？击倒后角色将失去所有装备和状态。"
        confirmText="确认击倒"
        cancelText="取消"
        onConfirm={handleConfirmDefeat}
      />
    ));
  };

  // 确认击倒
  const handleConfirmDefeat = () => {
    const who = props.who;
    const chId = characterId();
    updateState((draft) => {
      const target = draft.players[who].characters.find(
        (item) => item.id === chId,
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
    const who = props.who;
    const chId = characterId();
    updateState((draft) => {
      const target = draft.players[who].characters.find(
        (item) => item.id === chId,
      );
      if (!target) return;
      target.variables.health = 1;
      target.variables.alive = 1;
    });
  };

  // 设为出战
  const setAsActive = () => {
    const who = props.who;
    const chId = characterId();
    updateState((draft) => {
      draft.players[who].activeCharacterId = chId;
    });
  };

  // 校验实体合法性（武器标签和天赋关联角色）
  const validateAndCleanEntities = (
    entities: Draft<EntityState>[],
    newCharDef: CharacterDefinition,
  ): Draft<EntityState>[] => {
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
    openModal(() => (
      <Modal title="选择角色" description="从列表中选择一个角色">
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
          <div class="h-40vh overflow-y-auto pr-2 gi-editor-scroll">
            {/* 结果统计 */}
            <div class="text-xs text-slate-400 mb-2">
              找到 {filteredCharacters().length} 个角色
            </div>

            <div class="grid grid-cols-8 gap-3">
              <For each={filteredCharacters()}>
                {(char) => (
                  <button
                    type="button"
                    data-close-dialog
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
    ));
  };

  // 处理角色选择
  const handleSelectCharacter = (charDef: CharacterDefinition) => {
    const who = props.who;
    const chIdx = props.characterIndex;
    updateState((draft) => {
      const player = draft.players[who];
      const existingChar = player.characters[chIdx];

      // 保留现有实体，但需要进行合法性校验
      const existingEntities = existingChar?.entities ?? [];
      const validEntities = validateAndCleanEntities(existingEntities, charDef);

      // 创建新角色
      const newCharacter = createCharacterState(charDef, allocateId(draft));

      // 保留合法的实体
      newCharacter.entities = validEntities;

      // 替换或添加角色
      if (chIdx < player.characters.length) {
        // 替换现有角色
        player.characters[chIdx] = newCharacter;
      } else {
        // 在末尾添加新角色（避免创建空槽位）
        player.characters.push(newCharacter);
      }

      // 如果这是第一个角色，设为出战
      if (player.characters.length === 1) {
        player.activeCharacterId = newCharacter.id;
      } else if (existingChar?.id === player.activeCharacterId) {
        // 如果替换的是出战角色，更新activeCharacterId
        player.activeCharacterId = newCharacter.id;
      }
    });
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
                onClick={() => reselectCharacter()}
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
                            {
                              currentCharacter().variables[
                                currentCharacter().definition.specialEnergy
                                  ?.variableName ?? "energy"
                              ]
                            }
                            /
                            {currentCharacter().definition.specialEnergy
                              ?.slotSize ??
                              currentCharacter().variables.maxEnergy}
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
                        currentCharacter().variables[
                          currentCharacter().definition.specialEnergy
                            ?.variableName ?? "energy"
                        ]
                      }
                      disabled={defeated()}
                      onChange={(value) =>
                        updateCharacter((target) => {
                          if (target.definition.specialEnergy?.variableName) {
                            target.variables[
                              target.definition.specialEnergy?.variableName
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
                  defeated={defeated()}
                />
              </div>
            </Surface>
          );
        }}
      </Show>
    </>
  );
}

// 角色区域实体信息组件（参照出战状态编辑面板复刻）
interface CharacterEntitySectionProps {
  character: CharacterState;
  who: 0 | 1;
  characterId: number;
  defeated: boolean;
}

function CharacterEntitySection(props: CharacterEntitySectionProps) {
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

  // 武器/天赋不合法警告弹窗状态
  const [invalidEntityWarning, setInvalidEntityWarning] = createSignal<{
    type: "weapon" | "talent" | "other";
    entityName: string;
  } | null>(null);

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

  const appendEntity = () => {
    openModal(() => {
      let ref!: HTMLDialogElement;
      return <AddCardModal
        ref={ref}
        onSelect={(definition) => {
          handleAddCheck(definition, () => ref.close());
        }}
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
    });
  };

  /* 确认覆盖弹窗 - 相同 definition.id */
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

  /* 确认替换弹窗 - 同类别实体（武器、圣遗物、天赋、特技） */
  const confirmReplace = (done: () => void) => {
    openModal(() => (
      <ConfirmModal
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
        onConfirm={() => {
          handleConfirmCategoryReplace();
          done();
        }}
        onCancel={handleCancelCategoryReplace}
      />
    ));
  };

  /* 不合法实体警告弹窗 - 武器/天赋不合法 */
  const confirmInvalidEntity = () => {
    openModal(() => (
      <ConfirmModal
        title="实体不合法"
        message={(() => {
          const warning = invalidEntityWarning();
          if (!warning) return "";
          if (warning.type === "weapon") {
            return `「${warning.entityName}」的武器类型与当前角色不匹配，无法装备。`;
          } else if (warning.type === "talent") {
            return `「${warning.entityName}」不属于当前角色，无法装备。`;
          } else {
            return `「${warning.entityName}」不适合当前角色。`;
          }
        })()}
        confirmText="知道了"
      />
    ));
  };

  // 处理添加前的检查
  const handleAddCheck = (definition: EntityDefinition, done: () => void) => {
    // 1. 首先检查合法性
    if (!isEntityValidForCharacter(definition)) {
      const tags = definition.tags;
      const weaponTags = ["sword", "claymore", "pole", "catalyst", "bow"];
      const entityWeaponTag = tags.find((tag) => weaponTags.includes(tag));

      setInvalidEntityWarning({
        type: entityWeaponTag
          ? "weapon"
          : tags.includes("talent")
            ? "talent"
            : "other",
        entityName: getDefinitionName(definition),
      });
      confirmInvalidEntity();
      return;
    }

    // 2. 检查是否存在相同 definition.id 的实体
    const duplicateIndex = checkDuplicate(definition);
    if (duplicateIndex !== -1) {
      setPendingDefinition(definition);
      setExistingEntityIndex(duplicateIndex);
      confirmOverride(done);
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
      confirmReplace(done);
      return;
    }

    // 4. 直接添加
    doAdd(definition);
    done();
  };

  // 执行添加
  const doAdd = (definition: EntityDefinition) => {
    const who = props.who;
    const chId = props.characterId;
    updateState((draft) => {
      const target = draft.players[who].characters.find(
        (item) => item.id === chId,
      );
      if (!target) return;

      target.entities.push(createEntityState(definition, allocateId(draft)));
    });
  };

  // 执行覆盖
  const doReplace = (definition: EntityDefinition, index: number) => {
    const who = props.who;
    const chId = props.characterId;
    updateState((draft) => {
      const target = draft.players[who].characters.find(
        (item) => item.id === chId,
      );
      if (!target) return;

      target.entities[index] = createEntityState(definition, allocateId(draft));
    });
  };

  // 确认覆盖
  const handleConfirmReplace = () => {
    const definition = pendingDefinition();
    const index = existingEntityIndex();
    if (definition && index !== -1) {
      doReplace(definition, index);
    }
    setPendingDefinition(void 0);
    setExistingEntityIndex(-1);
  };

  // 取消覆盖
  const handleCancelReplace = () => {
    setPendingDefinition(void 0);
    setExistingEntityIndex(-1);
  };

  // 确认同类替换
  const handleConfirmCategoryReplace = () => {
    const pending = pendingCategoryReplace();
    if (pending) {
      doReplace(pending.definition, pending.existingIndex);
    }
    setPendingCategoryReplace(null);
  };

  // 取消同类替换
  const handleCancelCategoryReplace = () => {
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
                    const who = props.who;
                    const chId = props.characterId;
                    const i = index();
                    updateState((draft) => {
                      const target = draft.players[who].characters.find(
                        (item) => item.id === chId,
                      );
                      if (!target) return;
                      target.entities = moveInArray(target.entities, i, -1);
                    });
                  },
                },
                {
                  content: "下移",
                  col: 0,
                  onClick: () => {
                    const who = props.who;
                    const chId = props.characterId;
                    const i = index();
                    updateState((draft) => {
                      const target = draft.players[who].characters.find(
                        (item) => item.id === chId,
                      );
                      if (!target) return;
                      target.entities = moveInArray(target.entities, i, 1);
                    });
                  },
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
                        entityId={entity.id}
                      />
                    ));
                  },
                },
                {
                  content: "移除",
                  col: 1,
                  variant: "danger",
                  onClick: () => {
                    const who = props.who;
                    const chId = props.characterId;
                    const i = index();
                    updateState((draft) => {
                      const target = draft.players[who].characters.find(
                        (item) => item.id === chId,
                      );
                      if (!target) return;
                      target.entities.splice(i, 1);
                    });
                  },
                },
              ];
              const imageMode = () =>
                entity.definition.type === "status" ? "icon" : "card";

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
            onClick={() => appendEntity()}
            disabled={props.defeated}
            class="w-full flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-white/20 bg-transparent px-3 py-3 text-sm text-slate-400 hover:border-white/40 hover:text-slate-300 hover:bg-white/5 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span class="text-lg">+</span>
            <span>追加实体</span>
          </button>
        </div>
      </div>
    </>
  );
}
