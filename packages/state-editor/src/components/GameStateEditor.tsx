import {
  For,
  Match,
  Show,
  Switch,
  createContext,
  createMemo,
  createSignal,
  onMount,
  splitProps,
  useContext,
  type Accessor,
  type ComponentProps,
  type JSX,
} from "solid-js";
import { createStore, produce, unwrap } from "solid-js/store";
import type { GameState } from "@gi-tcg/core";
import { Surface } from "./Fields";
import { CharacterEditor } from "./CharacterEditor";
import { PileEditor, HandsEditor } from "./HandsPileEditor";
import { PlayerSectionEditor } from "./PlayerSectionEditor";
import type { Draft } from "immer";
import { ModalContextProvider } from "./Modal";
import { guard } from "../utils";
import { GlobalSection } from "./GlobalSection";
import {
  CharacterPreview,
  CombatStatusPreview,
  DicePreview,
  EntityAreaPreview,
  HandsPreview,
  PilePreview,
} from "./Previews";
import type { EditorCatalog, EditorSection, UpdateGameState } from "../types";
import { createDefaultGameState } from "../state/factory";
import { buildEditorCatalog } from "../state/catalog";
import { validateGameState } from "../state/validator";
import { PHASE_LABELS } from "../constants";
import { isShallowEqual } from "remeda";

export interface GameStateEditorProps extends Omit<
  ComponentProps<"div">,
  "onSubmit"
> {
  initialValue?: GameState;
  onSubmit: (state: GameState) => void;
}

// Grid 布局常量
const GRID_ROWS = 12; // 总行数
const GRID_COLS = 16; // 总列数

// 入口配置接口 - 使用行列坐标指定位置和尺寸
interface SectionConfig {
  section: EditorSection;
  label: string;
  // 位置和尺寸（基于0的索引）
  row: number; // 起始行
  col: number; // 起始列
  rowSpan: number; // 占据行数
  colSpan: number; // 占据列数
  // 预览内容
  preview?: (state: GameState) => JSX.Element;
  // 样式变体
  variant?: "default" | "character" | "collection" | "status";
}

// 入口卡片组件
function SectionCard(props: {
  config: SectionConfig;
  isActive: boolean;
  onClick: () => void;
  state: GameState;
}) {
  const variantStyles = {
    default: "border-white/30 bg-slate-800/80",
    character: "border-amber-500/50 bg-amber-900/40",
    collection: "border-cyan-500/50 bg-cyan-900/40",
    status: "border-emerald-500/50 bg-emerald-900/40",
  };

  const activeStyles = () =>
    props.isActive
      ? "ring-2 ring-cyan-500/50 border-cyan-500/50 bg-cyan-950/30"
      : "";

  // 计算 grid 位置样式（CSS Grid 使用1-based索引）
  const gridStyle = () => ({
    "grid-column": `${props.config.col + 1} / span ${props.config.colSpan}`,
    "grid-row": `${props.config.row + 1} / span ${props.config.rowSpan}`,
  });

  return (
    <button
      type="button"
      onClick={() => props.onClick()}
      class={`
        relative rounded-md @2xl:rounded-2xl border p-1 @2xl:p-3 text-left transition-all duration-200
        hover:scale-[1.02] hover:shadow-lg overflow-hidden flex flex-col justify-start
        ${variantStyles[props.config.variant || "default"]}
        ${activeStyles()}
      `}
      style={gridStyle()}
    >
      {/* 标题 */}
      <div class="flex items-center justify-between mb-2 flex-wrap">
        <span class="font-semibold text-amber-50 text-sm whitespace-nowrap">
          {props.config.label}
        </span>
        <Show when={props.isActive}>
          <span class="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
        </Show>
      </div>

      {/* 预览内容 */}
      <div class="text-xs text-slate-400">
        {props.config.preview?.(props.state)}
      </div>
    </button>
  );
}

export interface StateEditorContextValue {
  gameState: Accessor<GameState>;
  updateState: UpdateGameState;
  catalog: Accessor<EditorCatalog>;
  openModal: (modalCode: () => JSX.Element) => void;
}

const StateEditorContext = createContext<StateEditorContextValue>();

export const useStateEditorContext = () => {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return useContext(StateEditorContext)!;
};

export function GameStateEditor(props: GameStateEditorProps) {
  const [local, rest] = splitProps(props, [
    "initialValue",
    "onSubmit",
    "children",
    "class",
  ]);
  const initialState = local.initialValue ?? createDefaultGameState();
  const [state, setState] = createStore(initialState);
  const catalog = createMemo(() => buildEditorCatalog(state));
  const [selectedSection, setSelectedSection] = createSignal<EditorSection>({
    kind: "global",
  });
  const [modalStack, setModalStack] = createSignal<(() => JSX.Element)[]>([]);

  const errors = createMemo(() => validateGameState(state, catalog()));
  const [formValid, setFormValid] = createSignal(true);
  // eslint-disable-next-line no-unassigned-vars
  let formRef!: HTMLFormElement;

  const refreshFormValidity = () => {
    setFormValid(formRef.checkValidity());
  };

  onMount(() => queueMicrotask(refreshFormValidity));

  const updateState: UpdateGameState = (updater) => {
    setState(produce((draft) => updater(draft as Draft<GameState>)));
    queueMicrotask(refreshFormValidity);
  };

  const openModal = (modalCode: () => JSX.Element) => {
    function Wrapper() {
      return (
        <ModalContextProvider
          value={{
            removeSelf: () => {
              setModalStack((stack) => stack.filter((m) => m !== Wrapper));
              queueMicrotask(refreshFormValidity);
            },
          }}
        >
          {modalCode()}
        </ModalContextProvider>
      );
    }
    setModalStack((stack) => [...stack, Wrapper]);
  };

  const submit = () => {
    if (!formValid() || errors().length > 0) {
      return;
    }
    const nextState = unwrap(state);
    local.onSubmit(nextState);
  };

  const playerLayouts = {
    0: {
      pileRow: 8,
      handsRow: 10,
      characterRow: 6,
      supportsRow: 6,
      summonsRow: 6,
      combatRow: 9,
      diceRow: 6,
      infoRow: 11,
      deckImportRow: 7,
    },
    1: {
      pileRow: 1,
      handsRow: 0,
      characterRow: 2,
      supportsRow: 2,
      summonsRow: 2,
      combatRow: 5,
      diceRow: 0,
      infoRow: 0,
      deckImportRow: 4,
    },
  } as const;

  const buildPlayerInfoPreview = (who: 0 | 1) => {
    const player = state.players[who];
    return (
      <div class="space-y-1">
        <div class="text-xs text-slate-400">
          {player.declaredEnd && (
            <span class="text-amber-400 mr-2">已结束</span>
          )}
          {player.hasDefeated && <span class="text-rose-400 mr-2">有击倒</span>}
          {!player.legendUsed && <span class="text-purple-400">秘传揭令</span>}
        </div>
        <div class="text-xs text-slate-500">
          技能记录: {player.roundSkillLog.size} 条
        </div>
      </div>
    );
  };

  const playerConfigs = (who: 0 | 1) => {
    const player = state.players[who];
    const layout = playerLayouts[who];
    const configs: SectionConfig[] = [];
    for (let i = 0; i < 3; i += 1) {
      const character = player.characters[i];
      configs.push({
        section: { kind: "character", who, characterIndex: i },
        label: `角色${i + 1}`,
        row: layout.characterRow,
        col: 6 + i * 2,
        rowSpan: 3,
        colSpan: 2,
        variant: "character",
        preview: () => (
          <CharacterPreview
            character={character}
            isActive={
              character ? player.activeCharacterId === character.id : false
            }
          />
        ),
      });
    }
    configs.push(
      {
        section: { kind: "pile", who },
        label: "牌库",
        row: layout.pileRow,
        col: 0,
        rowSpan: 3,
        colSpan: 3,
        variant: "collection",
        preview: () => (
          <PilePreview items={player.pile} max={state.config.maxPileCount} />
        ),
      },
      {
        section: { kind: "hands", who },
        label: "手牌",
        row: layout.handsRow,
        col: 3,
        rowSpan: 2,
        colSpan: 12,
        variant: "collection",
        preview: () => (
          <HandsPreview items={player.hands} max={state.config.maxHandsCount} />
        ),
      },
      {
        section: { kind: "supports", who },
        label: "支援区",
        row: layout.supportsRow,
        col: 3,
        rowSpan: 4,
        colSpan: 3,
        variant: "status",
        preview: () => (
          <EntityAreaPreview
            items={player.supports}
            max={state.config.maxSupportsCount}
            label="支援"
          />
        ),
      },
      {
        section: { kind: "summons", who },
        label: "召唤区",
        row: layout.summonsRow,
        col: 12,
        rowSpan: 4,
        colSpan: 3,
        variant: "status",
        preview: () => (
          <EntityAreaPreview
            items={player.summons}
            max={state.config.maxSummonsCount}
            label="召唤"
          />
        ),
      },
      {
        section: { kind: "combatStatuses", who },
        label: "出战状态",
        row: layout.combatRow,
        col: 6,
        rowSpan: 1,
        colSpan: 6,
        variant: "status",
        preview: () => <CombatStatusPreview items={player.combatStatuses} />,
      },
      {
        section: { kind: "dice", who },
        label: "骰子",
        row: layout.diceRow,
        col: 15,
        rowSpan: 6,
        colSpan: 1,
        variant: "default",
        preview: () => <DicePreview dice={[...player.dice]} />,
      },
      {
        section: { kind: "playerInfo", who },
        label: `玩家${who} 信息`,
        row: layout.infoRow,
        col: 0,
        rowSpan: 1,
        colSpan: 3,
        variant: "default",
        preview: () => buildPlayerInfoPreview(who),
      },
      {
        section: { kind: "deckImport", who },
        label: `玩家${who} 牌组导入`,
        row: layout.deckImportRow,
        col: 0,
        rowSpan: 1,
        colSpan: 3,
        variant: "default",
        preview: () => <span class="text-slate-500">点击导入</span>,
      },
    );
    return configs;
  };

  const sectionConfigs = createMemo<SectionConfig[]>(() => {
    return [
      {
        section: { kind: "global" },
        label: "游戏全局",
        row: 5,
        col: 0,
        rowSpan: 2,
        colSpan: 3,
        variant: "default",
        preview: (s) => (
          <div class="flex flex-col text-sm">
            <span>第 {s.roundNumber} 回合</span>
            <span>{PHASE_LABELS[s.phase]}</span>
            <span>轮到 玩家{s.currentTurn} 行动</span>
          </div>
        ),
      },
      ...playerConfigs(0),
      ...playerConfigs(1),
    ];
  });

  return (
    <div {...rest} class={`gi-state-editor ${local.class ?? ""}`}>
      <StateEditorContext.Provider
        value={{
          gameState: () => state,
          updateState,
          openModal,
          catalog,
        }}
      >
        <form
          ref={formRef}
          class="gi-editor-frame flex flex-col"
          onInput={refreshFormValidity}
          onChange={refreshFormValidity}
        >
          {/* Header */}
          <div class="flex-none px-4 py-4 sm:px-6 lg:px-8 border-b border-[var(--gi-editor-border-strong)] bg-slate-950/70">
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div class="flex min-w-0 items-center gap-3">
                <h1 class="text-2xl font-semibold text-amber-50">
                  游戏状态编辑
                </h1>
              </div>
              <div class="flex flex-wrap items-center gap-3">
                <Show when={errors().length > 0 || !formValid()}>
                  <span class="rounded-full border b-solid border-rose-300/30 bg-rose-400/10 px-3 py-1.5 text-xs text-rose-100">
                    {errors().length > 0
                      ? `存在 ${errors().length} 个状态问题`
                      : "表单输入未完成"}
                  </span>
                </Show>
                <button
                  type="button"
                  class="gi-editor-button rounded-full border b-solid border-cyan-200/30 bg-cyan-300/10 px-5 py-2.5 text-sm font-semibold text-cyan-50 disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={!formValid() || errors().length > 0}
                  onClick={submit}
                >
                  完成
                </button>
                {local.children}                
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div class="flex-1 flex min-h-0 overflow-hidden">
            {/* Left Sidebar - Grid Layout */}
            <div class="w-3/5 flex-none border-r border-[var(--gi-editor-border)] bg-slate-900 overflow-y-auto">
              <div
                class="p-4 grid gap-2 box-border h-full min-h-180 @container"
                style={{
                  "grid-template-columns": `repeat(${GRID_COLS}, 1fr)`,
                  "grid-template-rows": `repeat(${GRID_ROWS}, 1fr)`,
                }}
              >
                <For each={sectionConfigs()}>
                  {(config) => (
                    <SectionCard
                      config={config}
                      isActive={isShallowEqual(
                        selectedSection(),
                        config.section,
                      )}
                      onClick={() => setSelectedSection(config.section)}
                      state={state}
                    />
                  )}
                </For>
              </div>
            </div>

            {/* Right Content Area */}
            <div class="w-2/5 shrink-0 overflow-y-auto p-4 sm:p-6 lg:p-8 box-border gi-editor-scroll">
              <div class="max-w-5xl mx-auto">
                <Switch>
                  {/* Global Section */}
                  <Match when={selectedSection().kind === "global"}>
                    <GlobalSection initialState={initialState} />
                  </Match>

                  {/* Pile Section */}
                  <Match
                    when={guard(selectedSection, (s) => s.kind === "pile")}
                  >
                    {(sect) => <PileEditor state={state} who={sect().who} />}
                  </Match>
                  {/* Hands Section */}
                  <Match
                    when={guard(selectedSection, (s) => s.kind === "hands")}
                  >
                    {(sect) => <HandsEditor state={state} who={sect().who} />}
                  </Match>

                  {/* Character Section */}
                  <Match
                    when={guard(selectedSection, (s) => s.kind === "character")}
                  >
                    {(sect) => (
                      <CharacterEditor
                        who={sect().who}
                        characterIndex={sect().characterIndex}
                        onSelectSection={setSelectedSection}
                      />
                    )}
                  </Match>

                  {/* Player Sections */}
                  <Match when={guard(selectedSection, (s) => "who" in s)}>
                    {(sect) => (
                      <PlayerSectionEditor
                        state={state}
                        who={sect().who}
                        kind={sect().kind}
                      />
                    )}
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
        <For each={modalStack()}>{(modal) => modal()}</For>
      </StateEditorContext.Provider>
    </div>
  );
}
