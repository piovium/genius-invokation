import {
  For,
  Match,
  Show,
  Switch,
  createMemo,
  createSignal,
  onMount,
  splitProps,
  type ComponentProps,
} from "solid-js";
import { createStore, produce } from "solid-js/store";

import type { GameState } from "@gi-tcg/core";

import {
  NumberField,
  SectionTitle,
  SelectField,
  Surface,
} from "./Fields";
import {
  CharacterModalContent,
  EntityModalContent,
  AttachmentModalContent,
  ExtensionModalContent,
  EntityModal,
  AttachmentModal,
} from "./DetailModals";
import {
  PileModalContent,
  HandsModalContent,
} from "./CollectionModal";
import { PlayerSectionContent } from "./PlayerSectionContent";
import {
  buildEditorCatalog,
  cloneGameState,
  createDefaultGameState,
  materializeGameState,
  PHASE_LABELS,
  validateGameState,
  type EditorModal,
  type EditorSection,
  type Mutable,
  type UpdateGameState,
} from "../state";

export interface GameStateEditorProps extends Omit<ComponentProps<"div">, "onSubmit"> {
  initialValue?: GameState;
  onSubmit: (state: GameState) => void;
}

export function GameStateEditor(props: GameStateEditorProps) {
  const [local, rest] = splitProps(props, ["initialValue", "onSubmit", "class"]);
  const initialState = cloneGameState(local.initialValue ?? createDefaultGameState());
  const [state, setState] = createStore(initialState);
  const catalog = createMemo(() =>
    buildEditorCatalog(state.data as unknown as Parameters<typeof buildEditorCatalog>[0]),
  );
  const [selectedSection, setSelectedSection] = createSignal<EditorSection>({ kind: "global" });
  const [modalStack, setModalStack] = createSignal<EditorModal[]>([]);
  const currentModal = createMemo(() => modalStack()[modalStack().length - 1] ?? null);
  const materializedState = createMemo(() => materializeGameState(state as unknown as GameState));
  const errors = createMemo(() => validateGameState(materializedState(), catalog()));
  const [formValid, setFormValid] = createSignal(true);
  let formRef: HTMLFormElement | undefined;

  const refreshFormValidity = () => {
    setFormValid(formRef?.checkValidity() ?? true);
  };

  onMount(() => queueMicrotask(refreshFormValidity));

  const updateState: UpdateGameState = (updater) => {
    setState(produce((draft) => updater(draft as unknown as Mutable<GameState>)));
    queueMicrotask(refreshFormValidity);
  };

  const openModal = (modal: EditorModal) => {
    setModalStack((stack) => [...stack, modal]);
    queueMicrotask(refreshFormValidity);
  };

  const closeTopModal = () => {
    setModalStack((stack) => stack.slice(0, -1));
    queueMicrotask(refreshFormValidity);
  };

  const submit = () => {
    const nextState = materializedState();
    if (!formValid() || errors().length > 0) {
      return;
    }
    local.onSubmit(nextState);
  };

  const sections = createMemo(() => {
    const result: { section: EditorSection; label: string; icon?: string }[] = [
      { section: { kind: "global" }, label: "游戏全局" },
    ];
    
    for (const who of [0, 1] as const) {
      result.push({ section: { kind: "pile", who }, label: `玩家 ${who} 牌库` });
      result.push({ section: { kind: "hands", who }, label: `玩家 ${who} 手牌` });
      
      const player = state.players[who];
      player.characters.forEach((char, index) => {
        result.push({
          section: { kind: "character", who, characterIndex: index },
          label: `玩家 ${who} 角色 ${index + 1}`,
        });
      });
      
      result.push({ section: { kind: "supports", who }, label: `玩家 ${who} 支援区` });
      result.push({ section: { kind: "summons", who }, label: `玩家 ${who} 召唤区` });
      result.push({ section: { kind: "combatStatuses", who }, label: `玩家 ${who} 出战状态` });
      result.push({ section: { kind: "dice", who }, label: `玩家 ${who} 骰子` });
      result.push({ section: { kind: "playerFlags", who }, label: `玩家 ${who} 标记` });
      result.push({ section: { kind: "roundSkillLog", who }, label: `玩家 ${who} 技能记录` });
      result.push({ section: { kind: "deckImport", who }, label: `玩家 ${who} 牌组导入` });
    }
    
    state.extensions.forEach((_, index) => {
      result.push({ section: { kind: "extension", index }, label: `扩展 #${index + 1}` });
    });
    
    return result;
  });

  const isSectionActive = (section: EditorSection) => {
    const current = selectedSection();
    if (current.kind !== section.kind) return false;
    return JSON.stringify(current) === JSON.stringify(section);
  };

  return (
    <div
      {...rest}
      class={`gi-state-editor gi-tcg-chessboard-new ${local.class ?? ""}`}
    >
      <form
        ref={formRef}
        class="gi-editor-frame h-screen flex flex-col"
        onInput={refreshFormValidity}
        onChange={refreshFormValidity}
      >
        {/* Header */}
        <div class="flex-none px-4 py-4 sm:px-6 lg:px-8 border-b border-[var(--gi-editor-border-strong)] bg-slate-950/70">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 class="text-2xl font-semibold text-amber-50">游戏状态编辑</h1>
            </div>
            <div class="flex flex-wrap items-center gap-3">
              <Show when={errors().length > 0 || !formValid()}>
                <span class="rounded-full border border-rose-300/30 bg-rose-400/10 px-3 py-1.5 text-xs text-rose-100">
                  {errors().length > 0 ? `存在 ${errors().length} 个状态问题` : "表单输入未完成"}
                </span>
              </Show>
              <button
                type="button"
                class="gi-editor-button rounded-full border border-cyan-200/30 bg-cyan-300/10 px-5 py-2.5 text-sm font-semibold text-cyan-50 disabled:cursor-not-allowed disabled:opacity-40"
                disabled={!formValid() || errors().length > 0}
                onClick={submit}
              >
                完成
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div class="flex-1 flex overflow-hidden">
          {/* Left Sidebar */}
          <div class="w-64 flex-none border-r border-[var(--gi-editor-border)] bg-slate-950/50 overflow-y-auto">
            <nav class="p-4 space-y-1">
              <For each={sections()}>
                {({ section, label }) => (
                  <button
                    type="button"
                    onClick={() => setSelectedSection(section)}
                    class={`w-full text-left px-3 py-2 rounded-xl text-sm transition ${
                      isSectionActive(section)
                        ? "bg-cyan-500/20 text-cyan-50 border border-cyan-500/30"
                        : "text-slate-300 hover:bg-white/5 hover:text-slate-100"
                    }`}
                  >
                    {label}
                  </button>
                )}
              </For>
            </nav>
          </div>

          {/* Right Content Area */}
          <div class="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
            <div class="max-w-5xl mx-auto">
              <Switch>
                {/* Global Section */}
                <Match when={selectedSection().kind === "global"}>
                  <Surface title="游戏全局设置">
                    <div class="space-y-6">
                      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <NumberField
                          label="随机种子"
                          value={state.config.randomSeed}
                          onChange={(value) =>
                            updateState((draft) => {
                              draft.config.randomSeed = value;
                              draft.iterators.random = value;
                            })
                          }
                        />
                        <SelectField
                          label="阶段"
                          value={state.phase}
                          options={Object.entries(PHASE_LABELS).map(([value, label]) => ({ value, label }))}
                          onChange={(value) =>
                            updateState((draft) => {
                              draft.phase = value as GameState["phase"];
                            })
                          }
                        />
                        <NumberField
                          label="回合数"
                          value={state.roundNumber}
                          min={0}
                          onChange={(value) =>
                            updateState((draft) => {
                              draft.roundNumber = value;
                            })
                          }
                        />
                        <SelectField
                          label="当前行动方"
                          value={state.currentTurn}
                          options={[
                            { value: 0, label: "玩家 0" },
                            { value: 1, label: "玩家 1" },
                          ]}
                          onChange={(value) =>
                            updateState((draft) => {
                              draft.currentTurn = Number(value) as 0 | 1;
                            })
                          }
                        />
                      </div>
                      
                      <div class="rounded-3xl border border-white/10 bg-slate-950/20 p-4">
                        <SectionTitle title="固定信息" />
                        <div class="mt-3 space-y-2 text-sm text-slate-200">
                          <p>数据版本：{state.data === initialState.data ? "最新官方数据" : "传入初始值"}</p>
                          <p>胜者：固定为 null</p>
                          <p>下一个状态 ID：{state.iterators.id}</p>
                        </div>
                      </div>

                      <div class="rounded-3xl border border-white/10 bg-slate-950/20 p-4">
                        <SectionTitle title="扩展" description="扩展数量固定，只能编辑其内部状态。" />
                        <div class="mt-3 space-y-2">
                          <For each={state.extensions}>
                            {(extension, index) => (
                              <button
                                type="button"
                                class="gi-editor-button flex w-full items-start justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-left"
                                onClick={() => setSelectedSection({ kind: "extension", index: index() })}
                              >
                                <div>
                                  <p class="text-sm font-semibold text-amber-50">扩展 #{extension.definition.id}</p>
                                  <p class="text-xs text-slate-300/80">{extension.definition.description || "无说明"}</p>
                                </div>
                                <span class="rounded-full border border-cyan-200/30 bg-cyan-300/10 px-3 py-1.5 text-xs font-medium text-cyan-50">
                                  编辑
                                </span>
                              </button>
                            )}
                          </For>
                        </div>
                      </div>
                    </div>
                  </Surface>
                </Match>

                {/* Pile Section */}
                <Match when={selectedSection().kind === "pile"}>
                  <PileModalContent
                    state={state as unknown as GameState}
                    who={(selectedSection() as Extract<EditorSection, { kind: "pile" }>).who}
                    catalog={catalog()}
                    updateState={updateState}
                    openModal={openModal}
                  />
                </Match>

                {/* Hands Section */}
                <Match when={selectedSection().kind === "hands"}>
                  <HandsModalContent
                    state={state as unknown as GameState}
                    who={(selectedSection() as Extract<EditorSection, { kind: "hands" }>).who}
                    catalog={catalog()}
                    updateState={updateState}
                    openModal={openModal}
                  />
                </Match>

                {/* Character Section */}
                <Match when={selectedSection().kind === "character"}>
                  <CharacterModalContent
                    state={state as unknown as GameState}
                    who={(selectedSection() as Extract<EditorSection, { kind: "character" }>).who}
                    characterIndex={(selectedSection() as Extract<EditorSection, { kind: "character" }>).characterIndex}
                    catalog={catalog()}
                    updateState={updateState}
                    openModal={openModal}
                  />
                </Match>

                {/* Player Sections */}
                <Match when={selectedSection().kind === "supports" || selectedSection().kind === "summons" || selectedSection().kind === "combatStatuses" || selectedSection().kind === "dice" || selectedSection().kind === "playerFlags" || selectedSection().kind === "roundSkillLog" || selectedSection().kind === "deckImport"}>
                  <PlayerSectionContent
                    state={state as unknown as GameState}
                    section={selectedSection()}
                    catalog={catalog()}
                    updateState={updateState}
                    openModal={openModal}
                  />
                </Match>

                {/* Extension Section */}
                <Match when={selectedSection().kind === "extension"}>
                  <ExtensionModalContent
                    state={state as unknown as GameState}
                    index={(selectedSection() as Extract<EditorSection, { kind: "extension" }>).index}
                    updateState={updateState}
                  />
                </Match>
              </Switch>

              <Show when={errors().length > 0}>
                <Surface title="状态校验" class="mt-6">
                  <ul class="list-disc space-y-2 pl-5 text-sm text-rose-100">
                    <For each={errors()}>{(error) => <li>{error}</li>}</For>
                  </ul>
                </Surface>
              </Show>
            </div>
          </div>
        </div>
      </form>

      {/* Modals for entity editing (still needed for nested entities) */}
      <Switch>
        <Match when={currentModal()?.kind === "entity"}>
          <EntityModal
            open
            state={state as unknown as GameState}
            who={(currentModal() as Extract<EditorModal, { kind: "entity" }>).who}
            area={(currentModal() as Extract<EditorModal, { kind: "entity" }>).area}
            entityId={(currentModal() as Extract<EditorModal, { kind: "entity" }>).entityId}
            characterId={(currentModal() as Extract<EditorModal, { kind: "entity" }>).characterId}
            catalog={catalog()}
            updateState={updateState}
            openModal={openModal}
            onClose={closeTopModal}
          />
        </Match>
        <Match when={currentModal()?.kind === "attachment"}>
          <AttachmentModal
            open
            state={state as unknown as GameState}
            who={(currentModal() as Extract<EditorModal, { kind: "attachment" }>).who}
            area={(currentModal() as Extract<EditorModal, { kind: "attachment" }>).area}
            entityId={(currentModal() as Extract<EditorModal, { kind: "attachment" }>).entityId}
            attachmentId={(currentModal() as Extract<EditorModal, { kind: "attachment" }>).attachmentId}
            updateState={updateState}
            onClose={closeTopModal}
          />
        </Match>
      </Switch>
    </div>
  );
}
