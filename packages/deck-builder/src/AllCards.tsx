// Copyright (C) 2024-2025 Guyutongxue
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

import { createSignal, Index, Show } from "solid-js";
import { AllCharacterCards } from "./AllCharacterCards";
import { AllActionCards } from "./AllActionCards";
import type { Deck } from "@gi-tcg/typings";
import type { DeckData } from "@gi-tcg/assets-manager";
import { useDeckBuilderContext } from "./DeckBuilder";

export interface AllCardsProps extends DeckData {
  deck: Deck;
  version: number;
  versionSpecified?: boolean;
  onChangeDeck?: (deck: Deck) => void;
  onSwitchTab?: (tab: number) => void;
  onSetVersion?: (version: number) => void;
}

export function AllCards(props: AllCardsProps) {
  const { t } = useDeckBuilderContext();
  const [tab, setTab] = createSignal(0);

  return (
    <div
      class={`min-w-0 min-h-0 flex-1
        h-[calc(100cqh-18.5rem)] @3xl:h-full DP:@3xl:h-full
        flex flex-col
        DP:hidden DP:h-0
        @3xl:flex DP:@3xl:flex`}
    >
      <div class="flex flex-row mb-2">
        <button
          class="data-[active]:font-bold rounded-l-full w-22 h-8 b-1 b-r-0 data-[active]:b-0 data-[active]:bg-blue-100"
          onClick={() => setTab(0)}
          bool:data-active={tab() === 0}
        >
          {t("characters")}
        </button>
        <button
          class="data-[active]:font-bold rounded-r-full w-22 h-8 b-1 b-l-0 data-[active]:b-0 data-[active]:bg-blue-100"
          onClick={() => setTab(1)}
          bool:data-active={tab() === 1}
        >
          {t("actionCards")}
        </button>
        <Show
          when={!props.versionSpecified}
          fallback={
            <span class="text-gray-500 ml-2">
              {t("versionBelow", { version: props.allVersions[props.version] })}
            </span>
          }
        >
          <select
            class="flex-grow b-1 rounded-full ml-2! outline-none focus:b-0 focus:bg-blue-100"
            value={props.version}
            onChange={(e) => props.onSetVersion?.(Number(e.target.value))}
          >
            <Index each={props.allVersions.toReversed()}>
              {(versionStr, index) => (
                <option value={props.allVersions.length - 1 - index}>
                  {versionStr()}
                </option>
              )}
            </Index>
          </select>
        </Show>
      </div>
      <div class="min-h-0">
        <div
          bool:data-visible={tab() === 0}
          class="h-full hidden data-[visible]:block"
        >
          <AllCharacterCards
            {...props}
            onSwitchTab={(tabNo) => setTab(tabNo)}
          />
        </div>
        <div
          bool:data-visible={tab() === 1}
          class="h-full hidden data-[visible]:block"
        >
          <AllActionCards {...props} onSwitchTab={(tabNo) => setTab(tabNo)} />
        </div>
      </div>
    </div>
  );
}
