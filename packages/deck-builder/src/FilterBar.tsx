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

import { For, Show, createMemo, createSignal } from "solid-js";
import FilterIcon from "./Filter.svg";
import DeleteIcon from "./Delete.svg";
import { TagIcon } from "./TagIcon";

export interface FilterSelection {
  name: string;
  selected: string | null;
  onSelect: (value: string | null) => void;
  option: Record<string, string>;
}

export interface FilterBarProps {
  filterSelections: FilterSelection[];
}

export function FilterBar(props: FilterBarProps) {
  const [filterMenuVisible, setFilterMenuVisible] =
    createSignal<boolean>(false);
  const selected = createMemo(() => {
    return props.filterSelections.some((fs) => fs.selected !== null);
  });

  return (
    <div class="group-[xxx.mobile]:h-8 w-full flex-row mb-2 flex relative">
      <Show
        when={selected()}
        fallback={
          <div
            class="mr--2 pl-1.5 h-8 w-22 rounded-full bg-purple-300 text-white flex items-center justify-center flex-shrink-0 z-1 md:hidden"
            onClick={() => setFilterMenuVisible(!filterMenuVisible())}
          >
            <span class="text-4 font-bold">筛选</span>
            <img src={FilterIcon} class="w-5 h-5" />
          </div>
        }
      >
        <div
          class="mr--2 pl-1.5 h-8 w-22 rounded-full bg-red-300 text-white flex items-center justify-center flex-shrink-0 z-1 relative md:hidden"
          onClick={() => {
            props.filterSelections.forEach((fs) => fs.onSelect(null));
          }}
        >
          <span class="text-4 font-bold">清除</span>
          <img src={DeleteIcon} class="w-5 h-5" />
          <Show when={!filterMenuVisible()}>
            <div class="absolute bottom-0 left-50% translate-x--50% translate-y-50% flex-shrink-0 h-3 flex flex-row gap-1 items-center">
              <For each={props.filterSelections}>
                {(fs) => (
                  <Show when={fs.selected}>
                    {(tag) => (
                      <div
                        class="flex-shrink-0 bg-white children:opacity-75 data-[capsule]:w-7 w-3 h-3 flex flex-col items-center justify-center rounded-full text-2"
                        bool:data-capsule={tag().startsWith("GCG_CARD_")}
                      >
                        <TagIcon tagName={tag()} />
                      </div>
                    )}
                  </Show>
                )}
              </For>
            </div>
          </Show>
        </div>
      </Show>
      <div
        class={`hidden group-[xxx.mobile]:data-[menu]:flex md:flex absolute z-1 top-9 left-0 md:relative md:top-0
          w-full rounded-lg group-[xxx.mobile]:b-2 bg-white flex-col group-[xxx.mobile]:p-2 gap-2`}
        bool:data-menu={filterMenuVisible()}
      >
        <For each={props.filterSelections}>
          {(fs) => (
            <div class="flex flex-col gap-1 md:flex-row">
              <div class="text-4 text-black text-nowrap md:line-height-10 flex-shrink-0">
                {fs.name}
              </div>
              <div class="flex flex-row gap-1 flex-wrap min-w-0">
                <For each={Object.keys(fs.option)}>
                  {(tag) => (
                    <button
                      onClick={() => fs.onSelect(tag)}
                      bool:data-selected={fs.selected === tag}
                      bool:data-capsule={tag.startsWith("GCG_CARD_")}
                      class={`flex-shrink-0 bg-gray-200 
                        w-10 h-10 flex flex-col items-center justify-center rounded-full 
                        text-lg line-height-8 children:h-8 font-bold opacity-30 b-purple-400!
                        data-[selected]:opacity-100 data-[selected]:b-3  
                        data-[capsule]:w-20`}
                    >
                      <TagIcon tagName={tag} />
                    </button>
                  )}
                </For>
              </div>
            </div>
          )}
        </For>
        <div
          class="h-6 w-full rounded-full bg-blue-100 text-blue-500 text-sm line-height-6 text-center md:hidden"
          onClick={() => setFilterMenuVisible(false)}
        >
          收起
        </div>
      </div>
      <div class="h-8 flex-1 rounded-r-full b-purple-200! b-2 b-l-0 b-solid flex-grow overflow-hidden md:hidden">
        <div
          class={`flex-shrink-0 mb-2 p-l-3 p-r-1 
            h-full flex flex-row items-center overflow-x-auto overflow-y-hidden 
            gap-1 
            data-[menu]:justify-end scrollbar-hidden`}
          bool:data-menu={filterMenuVisible()}
        >
          <For each={props.filterSelections}>
            {(fs) => (
              <For each={Object.keys(fs.option)}>
                {(tag) => (
                  <button
                    onClick={() => fs.onSelect(tag)}
                    bool:data-selected={fs.selected === tag}
                    bool:data-capsule={tag.startsWith("GCG_CARD_")}
                    bool:data-menu={filterMenuVisible()}
                    class={`flex-shrink-0 bg-gray-100 
                      w-7 h-7 flex flex-col items-center justify-center 
                      opacity-25 data-[selected]:opacity-100
                      data-[capsule]:w-12 
                      rounded-full text-3.5 font-bold
                      data-[menu]:hidden data-[selected]:flex`}
                  >
                    <TagIcon tagName={tag} />
                  </button>
                )}
              </For>
            )}
          </For>
        </div>
      </div>
    </div>
  );
}
