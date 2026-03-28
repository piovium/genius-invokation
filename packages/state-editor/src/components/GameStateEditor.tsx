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
  type JSX,
} from "solid-js";
import { createStore, produce, unwrap } from "solid-js/store";

import type { GameState, CharacterState } from "@gi-tcg/core";

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
  ExtensionModal,
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
  createDefaultGameState,
  PHASE_LABELS,
  validateGameState,
  getPlayer,
  getDefinitionName,
  DICE_LABELS,
  type EditorModal,
  type EditorSection,
  type Mutable,
  type UpdateGameState,
} from "../state";

export interface GameStateEditorProps extends Omit<ComponentProps<"div">, "onSubmit"> {
  initialValue?: GameState;
  onSubmit: (state: GameState) => void;
}

// Grid 布局常量
const GRID_ROWS = 12;  // 总行数
const GRID_COLS = 16;   // 总列数

// 入口配置接口 - 使用行列坐标指定位置和尺寸
interface SectionConfig {
  section: EditorSection;
  label: string;
  // 位置和尺寸（基于0的索引）
  row: number;          // 起始行
  col: number;          // 起始列
  rowSpan: number;      // 占据行数
  colSpan: number;      // 占据列数
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

  const activeStyles = props.isActive
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
      onClick={props.onClick}
      class={`
        relative rounded-2xl border p-3 text-left transition-all duration-200
        hover:scale-[1.02] hover:shadow-lg overflow-hidden
        ${variantStyles[props.config.variant || "default"]}
        ${activeStyles}
      `}
      style={gridStyle()}
    >
      {/* 标题 */}
      <div class="flex items-center justify-between mb-2">
        <span class="font-semibold text-amber-50 text-sm">{props.config.label}</span>
        {props.isActive && (
          <span class="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
        )}
      </div>
      
      {/* 预览内容 */}
      <div class="text-xs text-slate-400 mt-2">
        {props.config.preview?.(props.state)}
      </div>
    </button>
  );
}

// 角色预览组件
function CharacterPreview(props: { character: CharacterState; isActive: boolean }) {
  return (
    <div class="space-y-1">
      <div class="flex items-center gap-2">
        <span class="text-amber-200">{getDefinitionName(props.character.definition)}</span>
        {props.isActive && <span class="text-xs text-cyan-400">出战</span>}
      </div>
      <div class="flex gap-3 text-xs">
        <span class="text-rose-300">生命 {props.character.variables.health}/{props.character.variables.maxHealth}</span>
        <span class="text-cyan-300">能量 {props.character.variables.energy}/{props.character.variables.maxEnergy}</span>
      </div>
      <div class="text-slate-500">
        装备 {props.character.entities.length} 个
      </div>
    </div>
  );
}

// 牌库/手牌预览
function CollectionPreview(props: { count: number; max: number; label: string }) {
  return (
    <div class="space-y-1">
      <div class="flex items-center justify-between">
        <span class="text-cyan-200">{props.count} 张卡牌</span>
        <span class="text-slate-500">上限 {props.max}</span>
      </div>
      <div class="w-full bg-slate-800 rounded-full h-1.5 mt-2">
        <div 
          class="bg-cyan-500 h-1.5 rounded-full transition-all"
          style={{ width: `${Math.min((props.count / props.max) * 100, 100)}%` }}
        ></div>
      </div>
    </div>
  );
}

// 骰子预览
function DicePreview(props: { dice: number[] }) {
  const diceCounts = () => {
    const counts: Record<number, number> = {};
    props.dice.forEach(d => { counts[d] = (counts[d] || 0) + 1; });
    return counts;
  };

  return (
    <div class="space-y-1">
      <div class="text-emerald-200">共 {props.dice.length} 个骰子</div>
      <div class="flex flex-wrap gap-1 mt-1">
        {Object.entries(diceCounts()).slice(0, 4).map(([type, count]) => (
          <span class="px-1.5 py-0.5 bg-slate-800 rounded text-[10px] text-slate-300">
            {DICE_LABELS[Number(type)]}×{count}
          </span>
        ))}
        {Object.keys(diceCounts()).length > 4 && (
          <span class="text-[10px] text-slate-500">+{Object.keys(diceCounts()).length - 4}</span>
        )}
      </div>
    </div>
  );
}

// 支援/召唤区预览
function EntityAreaPreview(props: { items: readonly { definition: { id: number } }[]; max: number; label: string }) {
  return (
    <div class="space-y-1">
      <div class="flex items-center justify-between">
        <span class="text-purple-200">{props.items.length} 个{props.label}</span>
        <span class="text-slate-500">上限 {props.max}</span>
      </div>
      <div class="flex flex-wrap gap-1 mt-1">
        {props.items.slice(0, 3).map((item, i) => (
          <span class="text-[10px] text-slate-400 truncate max-w-[60px]">
            {getDefinitionName(item.definition)}
          </span>
        ))}
        {props.items.length > 3 && (
          <span class="text-[10px] text-slate-500">+{props.items.length - 3}</span>
        )}
      </div>
    </div>
  );
}

export function GameStateEditor(props: GameStateEditorProps) {
  const [local, rest] = splitProps(props, ["initialValue", "onSubmit", "class"]);
  const initialState = (local.initialValue ?? createDefaultGameState());
  const [state, setState] = createStore(initialState);
  const catalog = createMemo(() =>
    buildEditorCatalog(state.data),
  );
  const [selectedSection, setSelectedSection] = createSignal<EditorSection>({ kind: "global" });
  const [modalStack, setModalStack] = createSignal<EditorModal[]>([]);
  const currentModal = createMemo(() => modalStack()[modalStack().length - 1] ?? null);
  const errors = createMemo(() => validateGameState(state, catalog()));
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
    if (!formValid() || errors().length > 0) {
      return;
    }
    const nextState = unwrap(state);
    console.log(`Submitted:`, nextState);
    local.onSubmit(nextState);
  };

  // 配置化的入口定义 - 使用行列坐标指定位置 (0-based索引)
  // Grid: 12行 x 16列，撑满容器
  const sectionConfigs = createMemo((): SectionConfig[] => {
    const configs: SectionConfig[] = [];
    
    configs.push({
      section: { kind: "global" },
      label: "游戏全局",
      row: 5, col: 0, rowSpan: 2, colSpan: 3,
      variant: "default",
      preview: (s) => (
        <div class="flex gap-4 text-sm">
          <span>回合 {s.roundNumber}</span>
          <span>玩家 {s.currentTurn} 行动</span>
          <span>阶段: {PHASE_LABELS[s.phase]}</span>
        </div>
      ),
    });
    
    const player0 = state.players[0];
    
    configs.push({
      section: { kind: "pile", who: 0 },
      label: "牌库",
      row: 8, col: 0, rowSpan: 3, colSpan: 3,
      variant: "collection",
      preview: () => (
        <CollectionPreview count={player0.pile.length} max={state.config.maxPileCount} label="卡牌" />
      ),
    });
    
    configs.push({
      section: { kind: "hands", who: 0 },
      label: "手牌",
      row: 10, col: 3, rowSpan: 2, colSpan: 12,
      variant: "collection",
      preview: () => (
        <CollectionPreview count={player0.hands.length} max={state.config.maxHandsCount} label="卡牌" />
      ),
    });
    
    configs.push({
      section: { kind: "character", who: 0, characterIndex: 0 },
      label: "角色1",
      row: 6, col: 6, rowSpan: 3, colSpan: 2,
      variant: "character",
      preview: () => (
        <CharacterPreview character={player0.characters[0]} isActive={player0.activeCharacterId === player0.characters[0].id} />
      ),
    });
    
    configs.push({
      section: { kind: "character", who: 0, characterIndex: 1 },
      label: "角色2",
      row: 6, col: 8, rowSpan: 3, colSpan: 2,
      variant: "character",
      preview: () => (
        <CharacterPreview character={player0.characters[1]} isActive={player0.activeCharacterId === player0.characters[1].id} />
      ),
    });
    
    configs.push({
      section: { kind: "character", who: 0, characterIndex: 2 },
      label: "角色3",
      row: 6, col: 10, rowSpan: 3, colSpan: 2,
      variant: "character",
      preview: () => (
        <CharacterPreview character={player0.characters[2]} isActive={player0.activeCharacterId === player0.characters[2].id} />
      ),
    });
    
    configs.push({
      section: { kind: "supports", who: 0 },
      label: "支援区",
      row: 6, col: 3, rowSpan: 4, colSpan: 3,
      variant: "status",
      preview: () => (
        <EntityAreaPreview items={player0.supports} max={state.config.maxSupportsCount} label="支援" />
      ),
    });
    
    configs.push({
      section: { kind: "summons", who: 0 },
      label: "召唤区",
      row: 6, col: 12, rowSpan: 4, colSpan: 3,
      variant: "status",
      preview: () => (
        <EntityAreaPreview items={player0.summons} max={state.config.maxSummonsCount} label="召唤" />
      ),
    });
    
    configs.push({
      section: { kind: "combatStatuses", who: 0 },
      label: "出战状态",
      row: 9, col: 6, rowSpan: 1, colSpan: 6,
      variant: "status",
      preview: () => <div class="text-emerald-200">{player0.combatStatuses.length} 个状态</div>,
    });
    
    configs.push({
      section: { kind: "dice", who: 0 },
      label: "骰子",
      row: 6, col: 15, rowSpan: 6, colSpan: 1,
      variant: "default",
      preview: () => <DicePreview dice={[...player0.dice]} />,
    });

    configs.push({
      section: { kind: "playerInfo", who: 0 },
      label: "玩家0 信息",
      row: 11, col: 0, rowSpan: 1, colSpan: 3,
      variant: "default",
      preview: () => (
        <div class="space-y-1">
          <div class="text-xs text-slate-400">
            {player0.declaredEnd && <span class="text-amber-400 mr-2">已结束</span>}
            {player0.hasDefeated && <span class="text-rose-400 mr-2">已击败</span>}
            {player0.legendUsed && <span class="text-purple-400">已秘传</span>}
          </div>
          <div class="text-xs text-slate-500">技能记录: {player0.roundSkillLog.size} 条</div>
        </div>
      ),
    });
    
    configs.push({
      section: { kind: "deckImport", who: 0 },
      label: "玩家0 牌组导入",
      row: 7, col: 0, rowSpan: 1, colSpan: 3,
      variant: "default",
      preview: () => <span class="text-slate-500">点击导入</span>,
    });

    const player1 = state.players[1];
    
    configs.push({
      section: { kind: "pile", who: 1 },
      label: "牌库",
      row: 1, col: 0, rowSpan: 3, colSpan: 3,
      variant: "collection",
      preview: () => (
        <CollectionPreview count={player1.pile.length} max={state.config.maxPileCount} label="卡牌" />
      ),
    });
    
    configs.push({
      section: { kind: "hands", who: 1 },
      label: "手牌",
      row: 0, col: 3, rowSpan: 2, colSpan: 12,
      variant: "collection",
      preview: () => (
        <CollectionPreview count={player1.hands.length} max={state.config.maxHandsCount} label="卡牌" />
      ),
    });
    
    configs.push({
      section: { kind: "character", who: 1, characterIndex: 0 },
      label: "角色1",
      row: 2, col: 6, rowSpan: 3, colSpan: 2,
      variant: "character",
      preview: () => (
        <CharacterPreview character={player1.characters[0]} isActive={player1.activeCharacterId === player1.characters[0].id} />
      ),
    });

    configs.push({
      section: { kind: "character", who: 1, characterIndex: 1 },
      label: "角色2",
      row: 2, col: 8, rowSpan: 3, colSpan: 2,
      variant: "character",
      preview: () => (
        <CharacterPreview character={player1.characters[1]} isActive={player1.activeCharacterId === player1.characters[1].id} />
      ),
    });
    
    configs.push({
      section: { kind: "character", who: 1, characterIndex: 2 },
      label: "角色3",
      row: 2, col: 10, rowSpan: 3, colSpan: 2,
      variant: "character",
      preview: () => (
        <CharacterPreview character={player1.characters[2]} isActive={player1.activeCharacterId === player1.characters[2].id} />
      ),
    });
    
    configs.push({
      section: { kind: "supports", who: 1 },
      label: "支援区",
      row: 2, col: 3, rowSpan: 4, colSpan: 3,
      variant: "status",
      preview: () => (
        <EntityAreaPreview items={player1.supports} max={state.config.maxSupportsCount} label="支援" />
      ),
    });

    configs.push({
      section: { kind: "summons", who: 1 },
      label: "召唤区",
      row: 2, col: 12, rowSpan: 4, colSpan: 3,
      variant: "status",
      preview: () => (
        <EntityAreaPreview items={player1.summons} max={state.config.maxSummonsCount} label="召唤" />
      ),
    });
    
    configs.push({
      section: { kind: "combatStatuses", who: 1 },
      label: "出战状态",
      row: 5, col: 6, rowSpan: 1, colSpan: 6,
      variant: "status",
      preview: () => <div class="text-emerald-200">{player1.combatStatuses.length} 个状态</div>,
    });
    
    configs.push({
      section: { kind: "dice", who: 1 },
      label: "骰子",
      row: 0, col: 15, rowSpan: 6, colSpan: 1,
      variant: "default",
      preview: () => <DicePreview dice={[...player1.dice]} />,
    });
    
    configs.push({
      section: { kind: "playerInfo", who: 1 },
      label: "玩家1 信息",
      row: 0, col: 0, rowSpan: 1, colSpan: 3,
      variant: "default",
      preview: () => (
        <div class="space-y-1">
          <div class="text-xs text-slate-400">
            {player1.declaredEnd && <span class="text-amber-400 mr-2">已结束</span>}
            {player1.hasDefeated && <span class="text-rose-400 mr-2">已击败</span>}
            {player1.legendUsed && <span class="text-purple-400">已秘传</span>}
          </div>
          <div class="text-xs text-slate-500">技能记录: {player1.roundSkillLog.size} 条</div>
        </div>
      ),
    });
    
    configs.push({
      section: { kind: "deckImport", who: 1 },
      label: "玩家1 牌组导入",
      row: 4, col: 0, rowSpan: 1, colSpan: 3,
      variant: "default",
      preview: () => <span class="text-slate-500">点击导入</span>,
    });
    
    return configs;
  });

  const isSectionActive = (section: EditorSection) => {
    const current = selectedSection();
    if (current.kind !== section.kind) return false;
    return JSON.stringify(current) === JSON.stringify(section);
  };

  return (
    <div
      {...rest}
      class={`gi-state-editor ${local.class ?? ""}`}
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
          {/* Left Sidebar - Grid Layout */}
          <div 
            class="w-3/5 flex-none border-r border-[var(--gi-editor-border)] bg-slate-900 overflow-y-auto"
          >
            <div 
              class="p-4 grid gap-2 h-full box-border"
              style={{
                "grid-template-columns": `repeat(${GRID_COLS}, 1fr)`,
                "grid-template-rows": `repeat(${GRID_ROWS}, 1fr)`,
              }}
            >
              <For each={sectionConfigs()}>
                {(config) => (
                  <SectionCard
                    config={config}
                    isActive={isSectionActive(config.section)}
                    onClick={() => setSelectedSection(config.section)}
                    state={state as unknown as GameState}
                  />
                )}
              </For>
            </div>
          </div>

          {/* Right Content Area */}
          <div class="w-2/5 shrink-0 overflow-y-auto p-4 sm:p-6 lg:p-8 box-border">
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
                                class="gi-editor-button flex w-full items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 text-left p-0 overflow-hidden"
                                onClick={() => openModal({ kind: "extension", index: index() })}
                              >
                                <div class="flex flex-col gap-2 p-3">
                                  <p class="text-sm font-semibold text-amber-50 my-0">{extension.definition.description || `扩展 #${extension.definition.id}`}</p>
                                  <p class="text-xs text-slate-300/80 my-0">{extension.definition.description ? `扩展 #${extension.definition.id}` : "无说明"}</p>
                                </div>
                                <div class="flex items-center self-stretch shrink-0">
                                  <span class="inline-flex min-w-16 h-auto min-h-full bg-cyan-300/10 text-xs font-bold text-cyan-50 items-center justify-center">
                                    编辑
                                  </span>
                                </div>
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
                    state={state}
                    who={(selectedSection() as Extract<EditorSection, { kind: "character" }>).who}
                    characterIndex={(selectedSection() as Extract<EditorSection, { kind: "character" }>).characterIndex}
                    catalog={catalog()}
                    updateState={updateState}
                    openModal={openModal}
                  />
                </Match>

                {/* Player Sections */}
                <Match when={selectedSection().kind === "supports" || selectedSection().kind === "summons" || selectedSection().kind === "combatStatuses" || selectedSection().kind === "dice" || selectedSection().kind === "playerInfo" || selectedSection().kind === "deckImport"}>
                  <PlayerSectionContent
                    state={state}
                    section={selectedSection()}
                    catalog={catalog()}
                    updateState={updateState}
                    openModal={openModal}
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
            state={state}
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
            state={state}
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
            state={state}
            index={(currentModal() as Extract<EditorModal, { kind: "extension" }>).index}
            updateState={updateState}
            onClose={closeTopModal}
          />
        </Match>
      </Switch>
    </div>
  );
}
