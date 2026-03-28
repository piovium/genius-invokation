import { For, Show, createMemo } from "solid-js";
import type { JSX } from "solid-js";

export interface ListItemButton {
  content: JSX.Element;
  col: number; // 列号，从0开始
  onClick: () => void;
  variant?: "default" | "primary" | "danger" | "accent";
}

export interface ListItemProps {
  // 左侧信息区域
  imageSrc?: string;
  imageMode?: "card" | "icon";
  title: JSX.Element;
  description?: JSX.Element;
  tags?: string[];
  
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
    primary: "border-cyan-200/30 bg-cyan-300/10 text-cyan-50 hover:bg-cyan-300/20",
    danger: "border-rose-300/30 bg-rose-400/10 text-rose-100 hover:bg-rose-400/20",
    accent: "border-amber-200/30 bg-amber-300/10 text-amber-50 hover:bg-amber-300/20",
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

  return (
    <div
      class={`flex w-full items-start justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 text-left transition hover:bg-white/10 box-border overflow-hidden ${props.class ?? ""}`}
      onClick={props.onClick}
    >
      {/* 左侧信息区域 */}
      <div class="flex flex-1 items-center gap-2 min-w-0">
        {/* 图片 */}
        <Show when={props.imageSrc}>
          <div class={`flex shrink-0 overflow-hidden items-center ${props.imageMode === "card" ? "w-14 h-24" : "w-12 h-12 ml-2"}`}>
            <img
              src={props.imageSrc!}
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
          <Show when={props.tags && props.tags.length > 0}>
            <div class="flex flex-wrap gap-1 mt-2">
              <For each={props.tags}>
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
            {(colButtons, colIndex) => (
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
                        class={`inline-flex min-w-16 flex-1 items-center justify-center text-xs font-bold transition ${
                          variantClasses[button.variant ?? "default"]
                        }`}
                      >
                        {button.content}
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
