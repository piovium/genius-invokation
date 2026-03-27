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

import { HandsModal, PileModal } from "./CollectionModal";
import {
  NumberField,
  SectionTitle,
  SelectField,
  Surface,
} from "./Fields";
import {
  AttachmentModal,
  CharacterModal,
  EntityModal,
  ExtensionModal,
} from "./DetailModals";
import { PlayerEditor } from "./PlayerEditor";
import {
  buildEditorCatalog,
  cloneGameState,
  createDefaultGameState,
  materializeGameState,
  PHASE_LABELS,
  validateGameState,
  type EditorModal,
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

  return (
    <div
      {...rest}
      class={`gi-state-editor gi-tcg-chessboard-new ${local.class ?? ""}`}
    >
      <form
        ref={formRef}
        class="gi-editor-frame px-4 py-6 sm:px-6 lg:px-8"
        onInput={refreshFormValidity}
        onChange={refreshFormValidity}
      >
        <div class="sticky top-4 z-20 mb-6 flex flex-wrap items-center justify-between gap-3 rounded-full border border-[var(--gi-editor-border-strong)] bg-slate-950/70 px-4 py-3 shadow-[var(--gi-editor-shadow)] backdrop-blur">
          <div>
            {/* <p class="text-xs uppercase tracking-[0.28em] text-amber-100/70">可恢复状态编辑器</p> */}
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

        <div class="space-y-6">
          <Surface title="游戏状态编辑">
            <div class="grid gap-4 xl:grid-cols-[2fr,1fr]">
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
              <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
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
                          onClick={() => openModal({ kind: "extension", index: index() })}
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
            </div>
          </Surface>

          <PlayerEditor
            state={state as unknown as GameState}
            who={1}
            catalog={catalog()}
            updateState={updateState}
            openModal={openModal}
          />

          <PlayerEditor
            state={state as unknown as GameState}
            who={0}
            catalog={catalog()}
            updateState={updateState}
            openModal={openModal}
          />

          <Show when={errors().length > 0}>
            <Surface title="状态校验">
              <ul class="list-disc space-y-2 pl-5 text-sm text-rose-100">
                <For each={errors()}>{(error) => <li>{error}</li>}</For>
              </ul>
            </Surface>
          </Show>
        </div>
      </form>

      <Switch>
        <Match when={currentModal()?.kind === "pile"}>
          <PileModal
            open
            state={state as unknown as GameState}
            who={(currentModal() as Extract<EditorModal, { kind: "pile" }>).who}
            catalog={catalog()}
            updateState={updateState}
            openModal={openModal}
            onClose={closeTopModal}
          />
        </Match>
        <Match when={currentModal()?.kind === "hands"}>
          <HandsModal
            open
            state={state as unknown as GameState}
            who={(currentModal() as Extract<EditorModal, { kind: "hands" }>).who}
            catalog={catalog()}
            updateState={updateState}
            openModal={openModal}
            onClose={closeTopModal}
          />
        </Match>
        <Match when={currentModal()?.kind === "character"}>
          <CharacterModal
            open
            state={state as unknown as GameState}
            who={(currentModal() as Extract<EditorModal, { kind: "character" }>).who}
            characterId={(currentModal() as Extract<EditorModal, { kind: "character" }>).characterId}
            catalog={catalog()}
            updateState={updateState}
            openModal={openModal}
            onClose={closeTopModal}
          />
        </Match>
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
        <Match when={currentModal()?.kind === "extension"}>
          <ExtensionModal
            open
            state={state as unknown as GameState}
            index={(currentModal() as Extract<EditorModal, { kind: "extension" }>).index}
            updateState={updateState}
            onClose={closeTopModal}
          />
        </Match>
      </Switch>
    </div>
  );
}
