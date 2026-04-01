import { For, Show, createMemo } from "solid-js";
import type { JSX } from "solid-js";
import type { EntityTag, EntityType } from "@gi-tcg/core";
import { ENTITY_TYPE_LABELS, TAG_LABELS } from "../constants";

// 扩展的实体定义类型，兼容 EntityDefinition 和 AttachmentDefinition
type ExtendedEntityDefinition = {
  type: EntityType;
  tags: readonly EntityTag[];
};

export interface ListItemButton {
  content: JSX.Element;
  col: number; // 列号，从0开始
  onClick: () => void;
  variant?: "default" | "primary" | "danger" | "accent" | "use";
}

export interface ListItemProps {
  // 左侧信息区域
  imageSrc?: string;
  imageMode?: "card" | "icon";
  title: JSX.Element;
  description?: JSX.Element;
  tags?: string[];

  // 实体定义 - 如果传入则自动显示 type 和 tags
  definition?: ExtendedEntityDefinition;

  // 右侧按钮区域
  buttonColumns?: number;
  buttons?: ListItemButton[];

  // 整体样式
  class?: string;
  onClick?: () => void;
}

export function ListItem(props: ListItemProps) {
  const variantClasses = {
    default: "border-white/10 bg-white/5 text-slate-100 hover:bg-white/10",
    primary:
      "border-cyan-200/30 bg-cyan-300/10 text-cyan-50 hover:bg-cyan-300/20",
    danger:
      "border-rose-300/30 bg-rose-400/10 text-rose-100 hover:bg-rose-400/20",
    accent:
      "border-amber-200/30 bg-amber-300/10 text-amber-50 hover:bg-amber-300/20",
    use: "border-green-300/30 bg-green-400/10 text-green-100 hover:bg-green-400/20 w-24",
  };

  const buttonCols = () => props.buttonColumns ?? 2;

  // 按列分组按钮
  const buttonsByCol = createMemo(() => {
    const cols: ListItemButton[][] = [];
    const colCount = buttonCols();

    for (let i = 0; i < colCount; i++) {
      cols.push([]);
    }

    props.buttons?.forEach((btn) => {
      const col = Math.min(Math.max(0, btn.col), colCount - 1);
      cols[col].push(btn);
    });

    return cols;
  });

  // 合并标签：用户传入的标签 + 实体定义自动生成的标签
  const allTags = createMemo(() => {
    const userTags = props.tags ?? [];
    const def = props.definition;

    if (!def) {
      return userTags;
    }

    const autoTags: string[] = [];

    // 添加 type 标签
    const typeLabel = ENTITY_TYPE_LABELS[def.type];
    if (typeLabel) {
      autoTags.push(typeLabel);
    }

    // 添加 tags 标签
    def.tags.forEach((tag) => {
      const tagLabel = TAG_LABELS[tag];
      if (tagLabel && tagLabel.trim() !== "") {
        autoTags.push(tagLabel);
      }
    });

    return [...autoTags, ...userTags];
  });

  return (
    <div
      class={`flex w-full items-start justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 text-left transition hover:bg-white/10 box-border overflow-hidden ${props.class ?? ""}`}
      onClick={() => props.onClick?.()}
    >
      {/* 左侧信息区域 */}
      <div class="flex flex-1 items-center gap-2 min-w-0">
        {/* 图片 */}
        <Show when={props.imageSrc}>
          <div
            class={`flex shrink-0 overflow-hidden items-center ${props.imageMode === "card" ? "w-14 h-24" : "w-12 h-12 ml-2"}`}
          >
            <img
              src={props.imageSrc}
              class="w-full h-auto object-center"
              loading="lazy"
            />
          </div>
        </Show>

        {/* 文字信息 */}
        <div class={`flex-1 min-w-0 py-3 pr-2 ${props.imageSrc ? "" : "pl-4"}`}>
          {/* 标题 */}
          <div class="text-sm font-semibold text-amber-50 truncate">
            {props.title}
          </div>

          {/* 描述 */}
          <Show when={props.description}>
            <div class="text-xs text-slate-300/80 mt-1 truncate">
              {props.description}
            </div>
          </Show>

          {/* 标签 */}
          <Show when={allTags().length > 0}>
            <div class="flex flex-wrap gap-1 mt-2">
              <For each={allTags()}>
                {(tag) => (
                  <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] bg-slate-700/50 text-slate-300 border border-white/10">
                    {tag}
                  </span>
                )}
              </For>
            </div>
          </Show>
        </div>
      </div>

      {/* 右侧按钮区域 - Flex布局 */}
      <Show when={props.buttons && props.buttons.length > 0}>
        <div class="flex self-stretch shrink-0">
          <For each={buttonsByCol()}>
            {(colButtons) => (
              <Show when={colButtons.length > 0}>
                <div class="flex flex-col self-stretch">
                  <For each={colButtons}>
                    {(button) => (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          button.onClick();
                        }}
                        class={`inline-flex min-w-16 flex-1 items-center justify-center text-xs font-bold transition px-1 whitespace-nowrap text-ellipsis overflow-hidden ${
                          variantClasses[button.variant ?? "default"]
                        }`}
                      >
                        <span class="truncate">{button.content}</span>
                      </button>
                    )}
                  </For>
                </div>
              </Show>
            )}
          </For>
        </div>
      </Show>
    </div>
  );
}
