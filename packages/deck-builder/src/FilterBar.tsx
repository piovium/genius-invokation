// Copyright (C) 2024-2026 Piovium Labs
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as
// published by the Free Software Foundation, either version 3 of the
// License, or (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Affero General Public License for more details.
//
// You should have received a copy of the GNU Affero General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>.

import { For, Show, createMemo, createSignal, createUniqueId, type Accessor } from "solid-js";
import FilterIcon from "./Filter.svg";
import DeleteIcon from "./Delete.svg";
import { TagIcon } from "./TagIcon";

export interface FilterSelection {
  name: string;
  selected: Accessor<string | null>;
  onSelect: (value: string | null) => void;
  option: Record<string, string>;
}

export interface FilterBarProps {
  filterSelections: FilterSelection[];
}

export function FilterBar(props: FilterBarProps) {
  const selected = createMemo(() => {
    return props.filterSelections.some((fs) => fs.selected() !== null);
  });
  const filterMenuControlId = createUniqueId();

  return (
    <div class="@3xl:h-auto h-8 w-full flex-row mb-2 relative grid grid-cols-[auto_1fr]">
      <input
        id={filterMenuControlId}
        type="checkbox"
        class="filter-menu-control"
        hidden
      />
      {/* 筛选按钮 */}
      <Show
        when={selected()}
        fallback={
          <label
            for={filterMenuControlId}
            class="@3xl:hidden mr--2 pl-1.5 h-8 w-22 rounded-full bg-purple-300 text-white flex items-center justify-center flex-shrink-0 z-1 "
          >
            <span class="text-4 font-bold">筛选</span>
            <img src={FilterIcon} class="w-5 h-5" />
          </label>
        }
      >
        <div
          class="@3xl:hidden mr--2 pl-1.5 h-8 w-22 rounded-full bg-red-300 text-white flex items-center justify-center flex-shrink-0 z-1 relative"
          onClick={() => {
            props.filterSelections.forEach((fs) => fs.onSelect(null));
          }}
        >
          <span class="text-4 font-bold">清除</span>
          <img src={DeleteIcon} class="w-5 h-5" />
        </div>
      </Show>
      {/* mobile 占位边框 */}
      <div class="grid-area-[1/2] pointer-events-none @3xl:hidden h-8 flex-1 rounded-r-full b-purple-200 b-2 b-l-0 b-solid" />
      {/* 筛选菜单 */}
      <div
        class={`grid-area-[1/2] FM:grid-area-[1/1/1/3]
          FM:absolute FM:z-30 FM:top-9 FM:left-0 
          relative @3xl:FM:relative
          top-0 left-0 @3xl:FM:top-0 @3xl:FM:left-0
          b-0 p-0 p-l-3 p-r-1
          @3xl:p-l-0 @3xl-p-r-0
          @3xl:FM:b-0 @3xl:FM:p-0 @3xl:FM:p-l-0 @3xl:FM:p-r-0
          FM:p-2 FM:bg-white FM:b-2
          flex flex-row min-w-0
          flex-shrink-0 items-center overflow-x-auto overflow-y-hidden scrollbar-hidden
          @3xl:flex-col FM:flex-col 
          @3xl:items-stretch FM:items-stretch
          @3xl:gap-2 FM:gap-2
          rounded-r-full FM:rounded-lg FM:rounded-r-lg
          @3xl:rounded-0 @3xl:rounded-r-0 @3xl:FM:rounded-0 @3xl:FM:rounded-r-0`}
      >
        <For each={props.filterSelections}>
          {(fs) => (
            <div class="flex-shrink-0 flex-grow-0 flex flex-col gap-1 @3xl:flex-row min-w-0">
              <div class="hidden FM:block @3xl:block text-4 text-black text-nowrap @3xl:line-height-10 flex-shrink-0">
                {fs.name}
              </div>
              <div class="flex-1 flex flex-row gap-1 @3xl:flex-wrap FM:flex-wrap @3xl:w-0">
                <For each={Object.keys(fs.option)}>
                  {(tag) => (
                    <button
                      onClick={() => fs.onSelect(tag)}
                      bool:data-selected={fs.selected() === tag}
                      bool:data-capsule={tag.startsWith("GCG_CARD_")}
                      class={`flex-shrink-0 bg-gray-200 
                        w-7 h-7
                        FM:w-10 FM:h-10 @3xl:w-10 @3xl:h-10 
                        flex flex-col items-center justify-center rounded-full 
                        text-3.5 font-bold
                        FM:text-lg @3xl:text-lg FM:line-height-8 @3xl:line-height-8
                        FM:children:h-8 @3xl:children:h-8
                        opacity-30 b-purple-400
                        data-[selected]:opacity-100
                        FM:data-[selected]:b-3 @3xl:data-[selected]:b-3  
                        data-[capsule]:w-12
                        FM:data-[capsule]:w-20 @3xl:data-[capsule]:w-20`}
                    >
                      <TagIcon tagName={tag} />
                    </button>
                  )}
                </For>
              </div>
            </div>
          )}
        </For>
        <label
          for={filterMenuControlId}
          class="hidden FM:block @3xl:FM:hidden h-6 w-full rounded-full bg-blue-100 text-blue-500 text-sm line-height-6 text-center"
        >
          收起
        </label>
      </div>
      {/* 当前选择 */}
      <div class={`
        @3xl:hidden
        FM:grid-area-[1/2] grid-area-[1/1/2/2] z-2
        FM:justify-self-unset justify-self-center
        absolute bottom-0 translate-y-50% 
        FM:transform-none FM:relative FM:bottom-unset FM:left-unset
        flex flex-shrink-0 flex-row gap-1
        items-center justify-center FM:justify-end
        h-3 FM:h-auto FM:pr-1
        `}>
        <For each={props.filterSelections}>
          {(fs) => (
            <Show when={fs.selected()}>
              {(tag) => (
                <div
                  class={`
                    flex-shrink-0 bg-white children:opacity-75 
                    w-3 data-[capsule]:w-7 h-3 
                    FM:w-7 FM:data-[capsule]:w-12 FM:h-7
                    flex flex-col items-center justify-center rounded-full text-2`}
                  bool:data-capsule={tag().startsWith("GCG_CARD_")}
                >
                  <TagIcon tagName={tag()} />
                </div>
              )}
            </Show>
          )}
        </For>
      </div>
    </div>
  );
}
