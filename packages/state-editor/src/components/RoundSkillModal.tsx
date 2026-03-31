import { For, Show, createEffect, createMemo, createSignal } from "solid-js";
import { ActionButton, SelectField, SectionTitle } from "./Fields";
import { Modal } from "./Modal";
import { getDefinitionName } from "../state/catalog";
import { useStateEditorContext } from "./GameStateEditor";
import { matchesSearch } from "../state/assets";

interface RoundSkillModalProps {
  who: 0 | 1;
  // 编辑模式时传入的现有数据
  editingCharacterId?: number;
  editingSkillIds?: number[];
  // 已使用的角色ID列表（用于排除）
  disabledCharacterIds: number[];
  onSubmit: (characterId: number, skillIds: number[]) => void;
}

export function RoundSkillModal(props: RoundSkillModalProps) {
  const { gameState, catalog } = useStateEditorContext();

  // 是否是编辑模式
  const isEditing = () => typeof props.editingCharacterId === "number";

  // 角色选择状态
  const [selectedCharacterId, setSelectedCharacterId] = createSignal<
    number | null
  >(null);
  const [showOtherCharacterSelect, setShowOtherCharacterSelect] =
    createSignal(false);

  // 技能选择状态
  const [selectedSkillIds, setSelectedSkillIds] = createSignal<number[]>([]);
  const [showOtherSkillSelect, setShowOtherSkillSelect] = createSignal(false);
  const [otherSkillQuery, setOtherSkillQuery] = createSignal("");

  // 当前玩家
  const player = () => gameState().players[props.who];

  // 牌组中的三个角色
  const deckCharacters = createMemo(() => {
    return player()
      .characters.map((char) =>
        char
          ? {
              id: char.definition.id,
              name: getDefinitionName(char.definition),
              definition: char.definition,
            }
          : null,
      )
      .filter((c) => !!c);
  });

  // 可选的其他角色（排除牌组中的和已使用的）
  const otherCharacterOptions = createMemo(() => {
    const deckIds = new Set(deckCharacters().map((c) => c.id));
    return catalog().characters.filter(
      (char) =>
        !deckIds.has(char.id) && !props.disabledCharacterIds.includes(char.id),
    );
  });

  // 当前选中的角色
  const currentCharacter = createMemo(() => {
    const id = selectedCharacterId();
    if (!id) return null;
    return (
      deckCharacters().find((c) => c.id === id) ||
      catalog().characters.find((c) => c.id === id)
    );
  });

  // 当前角色拥有的技能
  const characterSkills = createMemo(() => {
    const charId = selectedCharacterId();
    if (!charId) return [];
    return catalog().initiativeSkillsByCharacterId.get(charId) ?? [];
  });

  // 其他技能选项（排除当前角色的技能和已选择的）
  const otherSkillOptions = createMemo(() => {
    const currentSkills = new Set(characterSkills().map((s) => s.id));
    const selected = new Set(selectedSkillIds());
    return catalog().allInitiativeSkills.filter(
      (skill) => !currentSkills.has(skill.id) && !selected.has(skill.id),
    );
  });

  // 过滤后的其他技能
  const filteredOtherSkills = createMemo(() => {
    const query = otherSkillQuery().trim();
    if (!query) return otherSkillOptions();
    return otherSkillOptions().filter(
      (skill) => matchesSearch(skill, query)
    );
  });

  // 是否可以提交
  const canSubmit = createMemo(() => {
    return selectedCharacterId() !== null && selectedSkillIds().length > 0;
  });

  // 重置状态当modal打开/关闭时
  createEffect(() => {
    if (isEditing() && props.editingCharacterId) {
      setSelectedCharacterId(props.editingCharacterId);
      setSelectedSkillIds(props.editingSkillIds ?? []);
    } else {
      setSelectedCharacterId(null);
      setSelectedSkillIds([]);
    }
    setShowOtherCharacterSelect(false);
    setShowOtherSkillSelect(false);
    setOtherSkillQuery("");
  });

  // 切换技能选择
  const toggleSkill = (skillId: number) => {
    setSelectedSkillIds((prev) => {
      if (prev.includes(skillId)) {
        return prev.filter((id) => id !== skillId);
      }
      return [...prev, skillId];
    });
  };

  // 处理提交
  const handleSubmit = () => {
    const charId = selectedCharacterId();
    const skillIds = selectedSkillIds();
    if (charId && skillIds.length > 0) {
      props.onSubmit(charId, skillIds);
    }
  };

  return (
    <Modal
      title={isEditing() ? "编辑技能记录" : "新增技能记录"}
      description="选择角色和本回合使用过的技能"
      footer={
        <div class="flex justify-end gap-3">
          <ActionButton label="取消" data-close-dialog />
          <ActionButton
            label={isEditing() ? "保存" : "提交"}
            data-close-dialog
            tone="accent"
            disabled={!canSubmit()}
            onClick={handleSubmit}
          />
        </div>
      }
    >
      <div class="space-y-6">
        {/* 角色选择 */}
        <div class="space-y-3">
          <SectionTitle title="选择角色" />

          {/* 牌组中的角色 */}
          <div class="flex flex-wrap gap-2">
            <For each={deckCharacters()}>
              {(character) => {
                const isSelected = () => selectedCharacterId() === character.id;
                const isDisabled = () =>
                  !isEditing() &&
                  props.disabledCharacterIds.includes(character.id) &&
                  selectedCharacterId() !== character.id;

                return (
                  <button
                    type="button"
                    onClick={() => {
                      if (!isDisabled()) {
                        setSelectedCharacterId(character.id);
                        setSelectedSkillIds([]);
                        setShowOtherCharacterSelect(false);
                      }
                    }}
                    disabled={isDisabled()}
                    class={`px-4 py-2 rounded-xl border text-sm transition ${
                      isSelected()
                        ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-50"
                        : isDisabled()
                          ? "bg-slate-800/50 border-white/10 text-slate-600 cursor-not-allowed"
                          : "bg-slate-800 border-white/20 text-slate-200 hover:bg-slate-700"
                    }`}
                  >
                    {character.name}
                  </button>
                );
              }}
            </For>

            {/* 其他角色按钮 */}
            <button
              type="button"
              onClick={() => setShowOtherCharacterSelect(true)}
              class={`px-4 py-2 rounded-xl border text-sm transition ${
                showOtherCharacterSelect()
                  ? "bg-amber-500/20 border-amber-500/50 text-amber-50"
                  : "bg-slate-800 border-white/20 text-slate-200 hover:bg-slate-700"
              }`}
            >
              + 其他角色
            </button>
          </div>

          {/* 其他角色搜索下拉 */}
          <Show when={showOtherCharacterSelect()}>
            <div class="space-y-2 p-3 rounded-xl bg-slate-900 border border-white/10">
              <SelectField
                label="搜索其他角色"
                value={selectedCharacterId() ?? ""}
                options={[
                  { value: "", label: "请选择角色" },
                  ...otherCharacterOptions().map((char) => ({
                    value: char.id,
                    label: `${char.name} #${char.id}`,
                  })),
                ]}
                onChange={(value) => {
                  const id = Number(value);
                  if (id) {
                    setSelectedCharacterId(id);
                    setSelectedSkillIds([]);
                  }
                }}
              />
            </div>
          </Show>

          {/* 当前选中的角色显示 */}
          <Show when={currentCharacter()}>
            {(char) => (
              <div class="text-sm text-slate-400">
                已选择: <span class="text-amber-200">{char().name}</span>
              </div>
            )}
          </Show>
        </div>

        {/* 技能选择 */}
        <Show when={selectedCharacterId()}>
          <div class="space-y-3 pt-4 border-t border-white/10">
            <SectionTitle title="选择技能" />

            {/* 当前角色的技能 */}
            <div class="flex flex-wrap gap-2">
              <For each={characterSkills()}>
                {(skill) => {
                  const isSelected = () =>
                    selectedSkillIds().includes(skill.id);

                  return (
                    <button
                      type="button"
                      onClick={() => toggleSkill(skill.id)}
                      class={`px-3 py-1.5 rounded-full border text-xs transition ${
                        isSelected()
                          ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-50"
                          : "bg-slate-800 border-white/20 text-slate-200 hover:bg-slate-700"
                      }`}
                    >
                      {skill.name} #{skill.id}
                    </button>
                  );
                }}
              </For>

              {/* 其他技能按钮 */}
              <button
                type="button"
                onClick={() => setShowOtherSkillSelect(true)}
                class={`px-3 py-1.5 rounded-full border text-xs transition ${
                  showOtherSkillSelect()
                    ? "bg-amber-500/20 border-amber-500/50 text-amber-50"
                    : "bg-slate-800 border-white/20 text-slate-200 hover:bg-slate-700"
                }`}
              >
                + 其他技能
              </button>
            </div>

            {/* 其他技能搜索 */}
            <Show when={showOtherSkillSelect()}>
              <div class="space-y-2 p-3 rounded-xl bg-slate-900 border border-white/10">
                <div class="text-xs text-slate-400 mb-2">搜索其他技能</div>
                <input
                  type="text"
                  value={otherSkillQuery()}
                  onInput={(e) => setOtherSkillQuery(e.currentTarget.value)}
                  placeholder="输入技能名称或ID搜索"
                  class="w-full px-3 py-2 rounded-lg bg-slate-800 border border-white/20 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
                />
                <div class="flex flex-wrap gap-2 mt-2 max-h-32 overflow-y-auto">
                  <For each={filteredOtherSkills()}>
                    {(skill) => (
                      <button
                        type="button"
                        onClick={() => toggleSkill(skill.id)}
                        class="px-3 py-1.5 rounded-full border border-white/20 bg-slate-800 text-xs text-slate-300 hover:bg-slate-700 transition"
                      >
                        {skill.name} #{skill.id}
                      </button>
                    )}
                  </For>
                  <Show when={filteredOtherSkills().length === 0}>
                    <span class="text-xs text-slate-500">无匹配技能</span>
                  </Show>
                </div>
              </div>
            </Show>

            {/* 已选择的技能显示 */}
            <Show when={selectedSkillIds().length > 0}>
              <div class="text-sm text-slate-400">
                已选择{" "}
                <span class="text-amber-200">{selectedSkillIds().length}</span>{" "}
                个技能
              </div>
            </Show>
          </div>
        </Show>
      </div>
    </Modal>
  );
}
