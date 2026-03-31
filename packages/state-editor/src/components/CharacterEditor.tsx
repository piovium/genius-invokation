import { createMemo, createSignal, For, Show } from "solid-js";
import type {
  CharacterState,
  CharacterDefinition,
  CharacterTag,
  Aura,
  EntityState,
} from "@gi-tcg/core";
import {
  ActionButton,
  NumberField,
  SelectField,
  SectionTitle,
  Surface,
} from "./Fields";
import { Modal } from "./Modal";
import { ConfirmModal } from "./ConfirmModal";
import type { Draft } from "immer";
import { VariableGrid } from "./VariableGrid";
import { useStateEditorContext } from "./GameStateEditor";
import { CharacterEntitySection } from "./CharacterEntitySection";
import type { EditorSection } from "../types";
import { getCharacterEnergyLabel, getDefinitionName } from "../state/catalog";
import { getImageUrl } from "../state/assets";
import { filterValidCharacterEntities, moveInArray } from "../utils";
import { allocateId, createCharacterState } from "../state/factory";
import { AURA_LABELS, AURA_OPTIONS } from "../constants";
import { getCharacter, getPlayer } from "../state/common";
import { AddButton } from "./AddButton";

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

interface TagFilterGroupProps<T extends string> {
  title: string;
  tags: readonly { tag: T; label: string }[];
  selectedTags: T[];
  onToggle: (tag: T) => void;
  activeClass: string;
}

export function TagFilterGroup<T extends string>(
  props: TagFilterGroupProps<T>,
) {
  return (
    <div class="space-y-2">
      <div class="text-xs text-slate-400">{props.title}</div>
      <div class="flex flex-wrap gap-2">
        <For each={props.tags}>
          {({ tag, label }) => (
            <button
              type="button"
              onClick={() => props.onToggle(tag)}
              class={`px-2 py-1 rounded-full text-xs border transition ${
                props.selectedTags.includes(tag)
                  ? props.activeClass
                  : "bg-slate-800 border-white/10 text-slate-300 hover:bg-slate-700"
              }`}
            >
              {label}
            </button>
          )}
        </For>
      </div>
    </div>
  );
}

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

  const [selectedCharacterTags, setSelectedCharacterTags] = createSignal<
    CharacterTag[]
  >([]);

  const toggleCharacterTag = (tag: CharacterTag) => {
    setSelectedCharacterTags((prev) => {
      if (prev.includes(tag)) {
        return prev.filter((t) => t !== tag);
      }
      return [...prev, tag];
    });
  };

  const existingCharacterIds = createMemo(() => {
    return new Set(
      player()
        .characters.map((c) => c?.definition.id)
        .filter((id) => typeof id === "number"),
    );
  });

  const filteredCharacters = createMemo(() => {
    const allCharacters = catalog().characters;
    const tags = selectedCharacterTags();
    const existingIds = existingCharacterIds();

    return allCharacters.filter((char) => {
      if (
        existingIds.has(char.definition.id) &&
        char.definition.id !== character()?.definition.id
      ) {
        return false;
      }
      if (tags.length === 0) {
        return true;
      }
      return tags.every((tag) => char.definition.tags.includes(tag));
    });
  });

  const updateCharacter = (
    updater: (target: Draft<CharacterState>) => void,
  ) => {
    const chId = characterId();
    updateState((draft) => {
      const target = getCharacter(draft, chId);
      if (target) {
        updater(target);
      }
    });
  };

  const moveCharacter = (delta: number) => {
    const who = props.who;
    const currentIndex = props.characterIndex;
    const newIndex = currentIndex + delta;
    if (newIndex < 0 || newIndex >= 3) return;

    updateState((draft) => {
      const player = draft.players[who];
      player.characters = moveInArray(
        player.characters,
        currentIndex,
        delta,
      );
    });

    props.onSelectSection({
      kind: "character",
      who: props.who,
      characterIndex: newIndex,
    });
  };

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

  const handleConfirmDefeat = () => {
    const chId = characterId();
    updateState((draft) => {
      const target = getCharacter(draft, chId);
      if (!target) return;
      target.variables.health = 0;
      target.variables.energy = 0;
      target.variables.aura = 0 as Aura;
      target.variables.alive = 0;
      target.entities = [];
    });
  };

  const reviveCharacter = () => {
    const chId = characterId();
    updateState((draft) => {
      const target = getCharacter(draft, chId);
      if (!target) return;
      target.variables.health = 1;
      target.variables.alive = 1;
    });
  };

  const setAsActive = () => {
    const who = props.who;
    const chId = characterId();
    updateState((draft) => {
      draft.players[who].activeCharacterId = chId;
    });
  };

  const reselectCharacter = () => {
    openModal(() => (
      <Modal title="选择角色" description="从列表中选择一个角色">
        <div class="space-y-4">
          <div class="space-y-3 border-b border-white/10 pb-4">
            <TagFilterGroup
              title="元素"
              tags={CHARACTER_TAG_CATEGORIES.element}
              selectedTags={selectedCharacterTags()}
              onToggle={toggleCharacterTag}
              activeClass="bg-cyan-500/20 border-cyan-500/50 text-cyan-50"
            />
            <TagFilterGroup
              title="武器"
              tags={CHARACTER_TAG_CATEGORIES.weapon}
              selectedTags={selectedCharacterTags()}
              onToggle={toggleCharacterTag}
              activeClass="bg-amber-500/20 border-amber-500/50 text-amber-50"
            />
            <TagFilterGroup
              title="阵营"
              tags={CHARACTER_TAG_CATEGORIES.nation}
              selectedTags={selectedCharacterTags()}
              onToggle={toggleCharacterTag}
              activeClass="bg-purple-500/20 border-purple-500/50 text-purple-50"
            />
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

          <div class="h-40vh overflow-y-auto pr-2 gi-editor-scroll">
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
                    <div class="w-full aspect-square rounded-full overflow-hidden border-2 border-white/20 group-hover:border-amber-500/50">
                      <img
                        src={getImageUrl(char, "icon")}
                        alt={char.name}
                        class="w-full h-full object-cover group-hover:scale-105 transition"
                        loading="lazy"
                      />
                    </div>
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

  const handleSelectCharacter = (charDef: CharacterDefinition) => {
    const who = props.who;
    const chIdx = props.characterIndex;
    updateState((draft) => {
      const player = draft.players[who];
      const existingChar = player.characters[chIdx];
      const hadActiveCharacter = player.characters.some(
        (character) => character?.id === player.activeCharacterId,
      );

      const existingEntities = existingChar?.entities ?? [];
      const validEntities = filterValidCharacterEntities(
        existingEntities,
        charDef,
      );

      const newCharacter = createCharacterState(charDef, allocateId(draft));
      newCharacter.entities = validEntities as Draft<EntityState>[];
      player.characters[chIdx] = newCharacter;

      if (
        !hadActiveCharacter ||
        existingChar?.id === player.activeCharacterId
      ) {
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
              <AddButton label="选择角色" onClick={reselectCharacter} />
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
                      disabled={props.characterIndex >= 2}
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
                          target.variables.aura = Number(value) as Aura;
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
