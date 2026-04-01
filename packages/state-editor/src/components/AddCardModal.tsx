import { For, Show, createMemo, createSignal } from "solid-js";
import type { EntityDefinition, EntityType, EntityTag } from "@gi-tcg/core";
import { Modal } from "./Modal";
import { useStateEditorContext } from "./GameStateEditor";
import { ENTITY_TYPE_LABELS, TAG_LABELS } from "../constants";
import type { AssetOption } from "../types";
import { getImageUrl, matchesSearch } from "../state/assets";

interface AddCardModalProps {
  ref?: HTMLDialogElement | ((el: HTMLDialogElement) => void);
  autoClose?: boolean;
  onSelect: (cardDefinition: EntityDefinition) => void;
  // 可选：控制是否展示类型筛选行
  showTypeFilter?: boolean;
  // 可选：控制是否展示标签筛选行
  showTagFilter?: boolean;
  // 可选：控制哪些类型显示在筛选项中
  type: EntityType | "cardEntities" | "characterEntities";
  // 可选：控制哪些标签显示在筛选项中（默认为所有 EntityTag）
  availableTags?: EntityTag[];
  // 是否显示"其他"选项（筛选不包含任何 availableTags 的实体）
  showOtherTag?: boolean;
  // 可选：控制截断长度（默认为60）
  maxResults?: number;
}

const DEFAULT_MAX_RESULTS = 60;

const ALL_ENTITY_TAGS: EntityTag[] = [
  // CardTag
  "legend",
  "action",
  "food",
  "resonance",
  // CommonEntityTag
  "shield",
  "barrier",
  // StatusTag
  "preparingSkill",
  // CombatStatusTag
  "nightsoulsBlessing",
  // EquipmentTag
  "talent",
  "artifact",
  "technique",
  "weapon",
  "sword",
  "claymore",
  "pole",
  "catalyst",
  "bow",
  // SupportTag
  "ally",
  "place",
  "item",
  "blessing",
  "adventureSpot",
];

export function AddCardModal(props: AddCardModalProps) {
  const { catalog } = useStateEditorContext();
  const [query, setQuery] = createSignal("");
  const [selectedType, setSelectedType] = createSignal<EntityType | null>(null);
  const [selectedTags, setSelectedTags] = createSignal<EntityTag[]>([]);
  const [selectedOther, setSelectedOther] = createSignal(false);

  // 获取可用的类型列表
  const availableTypes = createMemo<EntityType[]>(() => {
    if (props.type === "cardEntities") {
      return ["eventCard", "equipment", "support"];
    } else if (props.type === "characterEntities") {
      return ["status", "equipment"];
    } else if (props.type) {
      return [props.type];
    }
    return Object.keys(ENTITY_TYPE_LABELS) as EntityType[];
  });

  // 获取可用的标签列表
  const availableTags = createMemo(() => {
    if (props.availableTags && props.availableTags.length > 0) {
      return props.availableTags;
    }
    return ALL_ENTITY_TAGS;
  });

  // 是否正在使用标签筛选
  const isTagFiltering = createMemo(() => {
    return selectedTags().length > 0 || selectedOther();
  });

  // 获取实际的截断长度
  const maxResults = createMemo(() => props.maxResults ?? DEFAULT_MAX_RESULTS);

  // 所有可选的卡牌，根据availableTypes预筛选，按ID排序
  const allCards = createMemo(() => {
    let results: AssetOption<EntityDefinition>[] = [];

    // 从entitiesByType中获取指定类型的实体
    const entitiesOfType = catalog().entitiesByType[props.type];
    if (entitiesOfType) {
      results = [...results, ...entitiesOfType];
    }

    return results;
  });

  // 筛选后的结果
  const filteredCards = createMemo(() => {
    const q = query().trim();
    const type = selectedType();
    const tags = selectedTags();
    const otherSelected = selectedOther();
    const currentAvailableTags = availableTags();

    let results = allCards();

    // 1. 按搜索词筛选（名称或ID）
    if (q) {
      results = results.filter((card) => matchesSearch(card, q));
    }

    // 2. 按类型筛选（单选）
    if (type) {
      results = results.filter((card) => card.definition.type === type);
    }

    // 3. 按标签筛选
    if (otherSelected) {
      // 选择了"其他"：筛选不包含任何 availableTags 的实体
      results = results.filter(
        (card) =>
          !currentAvailableTags.some((tag) =>
            card.definition.tags.includes(tag),
          ),
      );
    } else if (tags.length > 0) {
      // 普通标签筛选（多选，并集）
      results = results.filter((card) =>
        tags.some((tag) => card.definition.tags.includes(tag)),
      );
    }

    return results;
  });

  // 截断后的结果：只在未筛选任何标签时应用截断规则
  const displayedCards = createMemo(() => {
    const results = filteredCards();
    if (isTagFiltering()) {
      return results; // 选择了标签，显示全部
    }
    return results.slice(0, maxResults()); // 未选择标签，应用截断
  });

  // 是否还有更多结果：只在未筛选任何标签时计算
  const hasMoreResults = createMemo(() => {
    if (isTagFiltering()) {
      return false; // 选择了标签，不显示截断提示
    }
    return filteredCards().length > maxResults();
  });

  // 切换标签选择
  const toggleTag = (tag: EntityTag) => {
    setSelectedTags((prev) => {
      if (prev.includes(tag)) {
        return prev.filter((t) => t !== tag);
      }
      return [...prev, tag];
    });
  };

  return (
    <Modal
      ref={(el) => (props.ref as any)?.(el)}
      title="追加卡牌"
      description="搜索并选择要追加的卡牌"
    >
      <div class="space-y-4">
        {/* 搜索框 */}
        <div class="space-y-2">
          <label class="text-sm text-slate-300">搜索</label>
          <input
            type="text"
            value={query()}
            onInput={(e) => setQuery(e.currentTarget.value)}
            placeholder="输入名称或ID搜索"
            class="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/20 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500/50 box-border"
          />
        </div>

        {/* 类型筛选（单选） */}
        <Show
          when={props.showTypeFilter !== false && availableTypes().length > 0}
        >
          <div class="space-y-2">
            <label class="text-sm text-slate-300">类型（单选）</label>
            <div class="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSelectedType(null)}
                class={`px-3 py-1.5 rounded-full text-xs border transition ${
                  selectedType() === null
                    ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-50"
                    : "bg-slate-800 border-white/20 text-slate-300 hover:bg-slate-700"
                }`}
              >
                全部
              </button>
              <For each={availableTypes()}>
                {(type) => (
                  <button
                    type="button"
                    onClick={() => setSelectedType(type)}
                    class={`px-3 py-1.5 rounded-full text-xs border transition ${
                      selectedType() === type
                        ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-50"
                        : "bg-slate-800 border-white/20 text-slate-300 hover:bg-slate-700"
                    }`}
                  >
                    {ENTITY_TYPE_LABELS[type]}
                  </button>
                )}
              </For>
            </div>
          </div>
        </Show>

        {/* 标签筛选（多选） */}
        <Show
          when={props.showTagFilter !== false && availableTags().length > 0}
        >
          <div class="space-y-2">
            <label class="text-sm text-slate-300">标签（多选）</label>
            <div class="flex flex-wrap gap-2">
              <For each={availableTags()}>
                {(tag) => {
                  const tagLabel = TAG_LABELS[tag] ?? tag;
                  return (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedOther(false);
                        toggleTag(tag);
                      }}
                      class={`px-3 py-1.5 rounded-full text-xs border transition ${
                        selectedTags().includes(tag)
                          ? "bg-amber-500/20 border-amber-500/50 text-amber-50"
                          : "bg-slate-800 border-white/20 text-slate-300 hover:bg-slate-700"
                      }`}
                    >
                      {tagLabel}
                    </button>
                  );
                }}
              </For>
              <Show when={props.showOtherTag !== false}>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTags([]);
                    setSelectedOther(!selectedOther());
                  }}
                  class={`px-3 py-1.5 rounded-full text-xs border transition ${
                    selectedOther()
                      ? "bg-amber-500/20 border-amber-500/50 text-amber-50"
                      : "bg-slate-800 border-white/20 text-slate-300 hover:bg-slate-700"
                  }`}
                >
                  其他
                </button>
              </Show>
            </div>
          </div>
        </Show>

        {/* 结果统计 */}
        <div class="text-xs text-slate-400">
          找到 {filteredCards().length} 个结果
          <Show when={hasMoreResults()}>
            <span class="text-amber-400 ml-2">
              （仅显示前 {maxResults()} 个，请完善筛选条件）
            </span>
          </Show>
        </div>

        {/* 结果网格 - 固定高度可滚动（细体滚动条） */}
        <div class="h-40vh overflow-y-auto pr-2 gi-editor-scroll">
          <div
            class="grid gap-3"
            style={{
              "grid-template-columns": "repeat(auto-fill, minmax(100px, 1fr))",
            }}
          >
            <For each={displayedCards()}>
              {(card) => {
                const cardMode = ["status", "combatStatus"].includes(
                  card.definition.type,
                )
                  ? "icon"
                  : "card";
                return (
                  <button
                    type="button"
                    bool:data-close-dialog={props.autoClose}
                    onClick={() => {
                      props.onSelect(card.definition);
                    }}
                    class="group flex flex-col items-center gap-2 p-3 rounded-xl border border-white/10 bg-slate-800/50 hover:bg-slate-700/50 hover:border-white/30 transition"
                  >
                    {/* 卡牌图片 */}
                    <div
                      class={`w-full rounded-lg overflow-hidden ${cardMode === "icon" ? "" : "aspect-[3/4]"}`}
                    >
                      <img
                        src={getImageUrl(card.definition, cardMode)}
                        alt={card.name}
                        class="w-full h-full object-cover group-hover:scale-105 transition"
                        loading="lazy"
                      />
                    </div>
                    {/* 名称和ID */}
                    <div class="text-center w-full">
                      <div class="text-xs text-slate-200 truncate">
                        {card.name}
                      </div>
                      <div class="text-[10px] text-slate-500">#{card.id}</div>
                    </div>
                  </button>
                );
              }}
            </For>
          </div>

          {/* 空状态 */}
          <Show when={displayedCards().length === 0}>
            <div class="text-center py-8 text-slate-500">
              没有找到匹配的卡牌
            </div>
          </Show>
        </div>
      </div>
    </Modal>
  );
}
