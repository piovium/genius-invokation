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

import type { GameState, CharacterState } from "@gi-tcg/core";
import { Aura } from "@gi-tcg/typings";

import { NumberField, SectionTitle, SelectField, Surface } from "./Fields";
import { CharacterEditor } from "./CharacterEditor";
import { ExtensionModal } from "./ExtensionModal";
import { PileEditor, HandsEditor } from "./HandsPileEditor";
import { PlayerSectionEditor } from "./PlayerSectionEditor";
import { ListItem, type ListItemButton } from "./ListItem";
import {
  buildEditorCatalog,
  createDefaultGameState,
  PHASE_LABELS,
  validateGameState,
  getDefinitionName,
  getImageUrl,
  type EditorSection,
  type UpdateGameState,
  type EditorCatalog,
} from "../state";
import { DiceIcon } from "./DiceIcon";
import type { Draft } from "immer";
import { ModalContextProvider } from "./Modal";
import { guard } from "../utils";
import { GlobalSection } from "./GlobalSection";

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

// 角色预览组件
function CharacterPreview(props: {
  character?: CharacterState;
  isActive: boolean;
}) {
  // 分离装备和状态
  const equipments = () => {
    if (!props.character) return [];
    return props.character.entities.filter(
      (e) => e.definition.type === "equipment",
    );
  };

  const statuses = () => {
    if (!props.character) return [];
    return props.character.entities.filter(
      (e) => e.definition.type === "status",
    );
  };

  // 状态显示逻辑：最多4个，超过则显示3+more
  const statusDisplay = () => {
    const items = statuses();
    if (items.length <= 4) {
      return { items, showMore: false };
    }
    return {
      items: items.slice(0, 3),
      showMore: true,
      count: items.length - 3,
    };
  };

  // 获取元素附着图片
  const auraImage = () => {
    if (!props.character) return [];
    return AURA_IMAGE_IDS[props.character.variables.aura];
  };

  return (
    <Show
      when={props.character}
      fallback={
        <div class="text-center py-4 text-slate-500 text-sm">未选择角色</div>
      }
    >
      {(char) => (
        <>
          <Show when={!props.isActive}>
            <div class="h-4" />
          </Show>
          {/* 角色图片和基本信息 */}
          <div class="flex flex-col items-center">
            {/* 元素附着 */}
            <div class="flex h-5 mt--2">
              <For each={auraImage()}>
                {(id) => (
                  <div class="w-5 h-5 rounded-full overflow-hidden bg-slate-800/50 flex-shrink-0">
                    <img
                      src={getImageUrl({ id }, "icon")}
                      alt=""
                      class="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                )}
              </For>
            </div>
            <div class="w-80% h-auto aspect-[7/12] rounded-lg overflow-hidden bg-slate-800/50 flex-shrink-0 b-solid b-2 b-slate-400 box-border relative">
              <img
                src={getImageUrl(char().definition, "card")}
                alt=""
                class="w-full h-full object-cover"
                loading="lazy"
              />
              <div class="absolute flex bottom-0 flex-col bg-slate-800/80 p-1 w-full box-border">
                <div class="flex items-center gap-1 w-full justify-center">
                  <span class="text-amber-200 text-xs truncate">
                    {getDefinitionName(char().definition)}
                  </span>
                </div>
                <div class="grid grid-cols-2 text-[10px] text-center">
                  <span class="text-rose-300">生命</span>
                  <span class="text-cyan-300">能量</span>
                  <span class="text-rose-300">
                    {char().variables.health}/{char().variables.maxHealth}
                  </span>
                  <span class="text-cyan-300">
                    {char().variables.energy}/{char().variables.maxEnergy}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <Show when={props.isActive}>
            <div class="h-4 text-[10px] text-cyan-400/80 text-center">
              出战角色
            </div>
          </Show>
          {/* 装备组 */}
          <Show when={equipments().length > 0}>
            <div class="grid grid-cols-4 items-center gap-0.5">
              <For each={equipments()}>
                {(entity) => (
                  <div class="w-full h-auto aspect-square rounded overflow-hidden">
                    <img
                      src={getImageUrl(entity.definition, "icon")}
                      alt=""
                      class="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                )}
              </For>
            </div>
          </Show>
          {/* 状态组 */}
          <Show when={statuses().length > 0}>
            <div class="grid grid-cols-4 items-start gap-0.5">
              <For each={statusDisplay().items}>
                {(entity) => (
                  <div class="w-full h-auto aspect-square rounded overflow-hidden">
                    <img
                      src={getImageUrl(entity.definition, "icon")}
                      alt=""
                      class="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                )}
              </For>
              <Show when={statusDisplay().showMore}>
                <div class="w-full h-auto aspect-square rounded-full bg-slate-400/20 flex items-center justify-center text-[8px] text-slate-400">
                  +{statusDisplay().count}
                </div>
              </Show>
            </div>
          </Show>
        </>
      )}
    </Show>
  );
}

// 牌库预览 - 显示顶部15张卡牌图片
function PilePreview(props: {
  items: readonly { definition: { id: number; type: string } }[];
  max: number;
}) {
  const displayItems = () => {
    if (props.items.length <= 10) {
      return { items: props.items, showMore: false };
    }
    return { items: props.items.slice(0, 9), showMore: true };
  };

  return (
    <div class="space-y-1">
      <div class="flex items-center justify-between">
        <span class="text-cyan-200">{props.items.length} 张卡牌</span>
        <span class="text-slate-500">上限 {props.max}</span>
      </div>
      <div class="w-full bg-slate-800 rounded-full h-1.5 mt-2">
        <div
          class="bg-cyan-500 h-1.5 rounded-full transition-all"
          style={{
            width: `${Math.min((props.items.length / props.max) * 100, 100)}%`,
          }}
        />
      </div>
      <div class="grid grid-cols-5 items-start gap-1 pt-4">
        <For each={displayItems().items}>
          {(item) => (
            <div class="w-full h-auto rounded overflow-hidden bg-slate-800/50">
              <img
                src={getImageUrl(item.definition, "card")}
                alt=""
                class="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
          )}
        </For>
        {displayItems().showMore && (
          <div class="w-full h-auto aspect-[7/12] rounded-0.5 b-solid box-border b-slate-400 b-2 bg-slate-800/50 flex items-center justify-center text-[10px] text-slate-400">
            +{props.items.length - 9}
          </div>
        )}
      </div>
    </div>
  );
}

// 手牌预览 - 显示全部手牌图片
function HandsPreview(props: {
  items: readonly { definition: { id: number; type: string } }[];
  max: number;
}) {
  return (
    <div class="space-y-1">
      <div class="flex items-center justify-between">
        <span class="text-cyan-200">{props.items.length} 张卡牌</span>
        <span class="text-slate-500">上限 {props.max}</span>
      </div>
      <div class="w-full bg-slate-800 rounded-full h-1.5 mt-2">
        <div
          class="bg-cyan-500 h-1.5 rounded-full transition-all"
          style={{
            width: `${Math.min((props.items.length / props.max) * 100, 100)}%`,
          }}
        />
      </div>
      <div class="flex items-center gap-1 pt-2 overflow-hidden">
        <For each={props.items}>
          {(item) => (
            <div class="w-7 h-12 rounded overflow-hidden bg-slate-800/50 flex-shrink-0">
              <img
                src={getImageUrl(item.definition, "card")}
                alt=""
                class="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
          )}
        </For>
      </div>
    </div>
  );
}

// 元素附着类型到图片ID的映射
const AURA_IMAGE_IDS: Record<number, number[]> = {
  [Aura.None]: [],
  [Aura.Cryo]: [1],
  [Aura.Hydro]: [2],
  [Aura.Pyro]: [3],
  [Aura.Electro]: [4],
  [Aura.Dendro]: [7],
  [Aura.CryoDendro]: [1, 7],
};

// 骰子预览 - 显示全部骰子图片
function DicePreview(props: { dice: number[] }) {
  return (
    <div class="space-y-1">
      <div class="text-emerald-200 text-xs text-nowrap">
        {props.dice.length}个
      </div>
      <div class="flex flex-col">
        <For each={props.dice}>
          {(diceType) => (
            <div class="w-full h-auto rounded-full overflow-hidden bg-slate-800/30 mb--3">
              <DiceIcon type={diceType} />
            </div>
          )}
        </For>
      </div>
    </div>
  );
}

// 支援/召唤区预览 - 显示全部实体图片
function EntityAreaPreview(props: {
  items: readonly { definition: { id: number; type: string } }[];
  max: number;
  label: string;
}) {
  return (
    <div class="space-y-1">
      <div class="flex items-center justify-between">
        <span class="text-purple-200">
          {props.items.length} 个{props.label}
        </span>
        <span class="text-slate-500">上限 {props.max}</span>
      </div>
      <div class="grid grid-cols-2 gap-3 p-1 pt-2">
        <For each={props.items}>
          {(item) => (
            <div class="w-full h-auto aspect-[3/4] rounded-lg overflow-hidden bg-slate-800/50 b-solid b-2 b-slate-400">
              <img
                src={getImageUrl(item.definition, "card")}
                alt=""
                class="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
          )}
        </For>
      </div>
    </div>
  );
}

// 出战状态预览 - 显示至多5个状态
function CombatStatusPreview(props: {
  items: readonly { definition: { id: number; type: string } }[];
}) {
  const displayItems = () => {
    if (props.items.length <= 5) {
      return { items: props.items, showMore: false };
    }
    return { items: props.items.slice(0, 4), showMore: true };
  };

  return (
    <div class="space-y-1 flex flex-row items-center justify-between">
      <div class="text-emerald-200">{props.items.length} 个状态</div>
      <div class="flex items-center gap-1 mt-1">
        <For each={displayItems().items}>
          {(item) => (
            <div class="w-6 h-6 rounded overflow-hidden bg-slate-800/50">
              <img
                src={getImageUrl(item.definition, "icon")}
                alt=""
                class="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
          )}
        </For>
        <Show when={displayItems().showMore}>
          <div class="w-6 h-6 rounded-full bg-slate-400/20 flex items-center justify-center text-[10px] text-slate-400">
            +{props.items.length - 4}
          </div>
        </Show>
      </div>
    </div>
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
  return useContext(StateEditorContext)!;
};

export function GameStateEditor(props: GameStateEditorProps) {
  const [local, rest] = splitProps(props, [
    "initialValue",
    "onSubmit",
    "class",
  ]);
  const initialState = local.initialValue ?? createDefaultGameState();
  const [state, setState] = createStore(initialState);
  const catalog = createMemo(() => buildEditorCatalog(state.data));
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
    const Wrapper = () => (
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
    setModalStack((stack) => [...stack, Wrapper]);
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
    });

    const player0 = state.players[0];

    configs.push({
      section: { kind: "pile", who: 0 },
      label: "牌库",
      row: 8,
      col: 0,
      rowSpan: 3,
      colSpan: 3,
      variant: "collection",
      preview: () => (
        <PilePreview items={player0.pile} max={state.config.maxPileCount} />
      ),
    });

    configs.push({
      section: { kind: "hands", who: 0 },
      label: "手牌",
      row: 10,
      col: 3,
      rowSpan: 2,
      colSpan: 12,
      variant: "collection",
      preview: () => (
        <HandsPreview items={player0.hands} max={state.config.maxHandsCount} />
      ),
    });

    // 玩家0角色区域（支持0-3个角色）
    for (let i = 0; i < 3; i++) {
      const character = player0.characters[i];
      configs.push({
        section: { kind: "character", who: 0, characterIndex: i },
        label: `角色${i + 1}`,
        row: 6,
        col: 6 + i * 2,
        rowSpan: 3,
        colSpan: 2,
        variant: "character",
        preview: () => (
          <CharacterPreview
            character={character}
            isActive={
              character ? player0.activeCharacterId === character.id : false
            }
          />
        ),
      });
    }

    configs.push({
      section: { kind: "supports", who: 0 },
      label: "支援区",
      row: 6,
      col: 3,
      rowSpan: 4,
      colSpan: 3,
      variant: "status",
      preview: () => (
        <EntityAreaPreview
          items={player0.supports}
          max={state.config.maxSupportsCount}
          label="支援"
        />
      ),
    });

    configs.push({
      section: { kind: "summons", who: 0 },
      label: "召唤区",
      row: 6,
      col: 12,
      rowSpan: 4,
      colSpan: 3,
      variant: "status",
      preview: () => (
        <EntityAreaPreview
          items={player0.summons}
          max={state.config.maxSummonsCount}
          label="召唤"
        />
      ),
    });

    configs.push({
      section: { kind: "combatStatuses", who: 0 },
      label: "出战状态",
      row: 9,
      col: 6,
      rowSpan: 1,
      colSpan: 6,
      variant: "status",
      preview: () => <CombatStatusPreview items={player0.combatStatuses} />,
    });

    configs.push({
      section: { kind: "dice", who: 0 },
      label: "骰子",
      row: 6,
      col: 15,
      rowSpan: 6,
      colSpan: 1,
      variant: "default",
      preview: () => <DicePreview dice={[...player0.dice]} />,
    });

    configs.push({
      section: { kind: "playerInfo", who: 0 },
      label: "玩家0 信息",
      row: 11,
      col: 0,
      rowSpan: 1,
      colSpan: 3,
      variant: "default",
      preview: () => (
        <div class="space-y-1">
          <div class="text-xs text-slate-400">
            {player0.declaredEnd && (
              <span class="text-amber-400 mr-2">已结束</span>
            )}
            {player0.hasDefeated && (
              <span class="text-rose-400 mr-2">已击败</span>
            )}
            {player0.legendUsed && <span class="text-purple-400">已秘传</span>}
          </div>
          <div class="text-xs text-slate-500">
            技能记录: {player0.roundSkillLog.size} 条
          </div>
        </div>
      ),
    });

    configs.push({
      section: { kind: "deckImport", who: 0 },
      label: "玩家0 牌组导入",
      row: 7,
      col: 0,
      rowSpan: 1,
      colSpan: 3,
      variant: "default",
      preview: () => <span class="text-slate-500">点击导入</span>,
    });

    const player1 = state.players[1];

    configs.push({
      section: { kind: "pile", who: 1 },
      label: "牌库",
      row: 1,
      col: 0,
      rowSpan: 3,
      colSpan: 3,
      variant: "collection",
      preview: () => (
        <PilePreview items={player1.pile} max={state.config.maxPileCount} />
      ),
    });

    configs.push({
      section: { kind: "hands", who: 1 },
      label: "手牌",
      row: 0,
      col: 3,
      rowSpan: 2,
      colSpan: 12,
      variant: "collection",
      preview: () => (
        <HandsPreview items={player1.hands} max={state.config.maxHandsCount} />
      ),
    });

    // 玩家1角色区域（支持0-3个角色）
    for (let i = 0; i < 3; i++) {
      const character = player1.characters[i];
      configs.push({
        section: { kind: "character", who: 1, characterIndex: i },
        label: `角色${i + 1}`,
        row: 2,
        col: 6 + i * 2,
        rowSpan: 3,
        colSpan: 2,
        variant: "character",
        preview: () => (
          <CharacterPreview
            character={character}
            isActive={
              character ? player1.activeCharacterId === character.id : false
            }
          />
        ),
      });
    }

    configs.push({
      section: { kind: "supports", who: 1 },
      label: "支援区",
      row: 2,
      col: 3,
      rowSpan: 4,
      colSpan: 3,
      variant: "status",
      preview: () => (
        <EntityAreaPreview
          items={player1.supports}
          max={state.config.maxSupportsCount}
          label="支援"
        />
      ),
    });

    configs.push({
      section: { kind: "summons", who: 1 },
      label: "召唤区",
      row: 2,
      col: 12,
      rowSpan: 4,
      colSpan: 3,
      variant: "status",
      preview: () => (
        <EntityAreaPreview
          items={player1.summons}
          max={state.config.maxSummonsCount}
          label="召唤"
        />
      ),
    });

    configs.push({
      section: { kind: "combatStatuses", who: 1 },
      label: "出战状态",
      row: 5,
      col: 6,
      rowSpan: 1,
      colSpan: 6,
      variant: "status",
      preview: () => <CombatStatusPreview items={player1.combatStatuses} />,
    });

    configs.push({
      section: { kind: "dice", who: 1 },
      label: "骰子",
      row: 0,
      col: 15,
      rowSpan: 6,
      colSpan: 1,
      variant: "default",
      preview: () => <DicePreview dice={[...player1.dice]} />,
    });

    configs.push({
      section: { kind: "playerInfo", who: 1 },
      label: "玩家1 信息",
      row: 0,
      col: 0,
      rowSpan: 1,
      colSpan: 3,
      variant: "default",
      preview: () => (
        <div class="space-y-1">
          <div class="text-xs text-slate-400">
            {player1.declaredEnd && (
              <span class="text-amber-400 mr-2">已结束</span>
            )}
            {player1.hasDefeated && (
              <span class="text-rose-400 mr-2">已击败</span>
            )}
            {player1.legendUsed && <span class="text-purple-400">已秘传</span>}
          </div>
          <div class="text-xs text-slate-500">
            技能记录: {player1.roundSkillLog.size} 条
          </div>
        </div>
      ),
    });

    configs.push({
      section: { kind: "deckImport", who: 1 },
      label: "玩家1 牌组导入",
      row: 4,
      col: 0,
      rowSpan: 1,
      colSpan: 3,
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
                <div>
                  <h1 class="text-2xl font-semibold text-amber-50">
                    游戏状态编辑
                  </h1>
                </div>
                <div class="flex flex-wrap items-center gap-3">
                  <Show when={errors().length > 0 || !formValid()}>
                    <span class="rounded-full border border-rose-300/30 bg-rose-400/10 px-3 py-1.5 text-xs text-rose-100">
                      {errors().length > 0
                        ? `存在 ${errors().length} 个状态问题`
                        : "表单输入未完成"}
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
                        isActive={isSectionActive(config.section)}
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
                      when={guard(
                        selectedSection,
                        (s) => s.kind === "character",
                      )}
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
