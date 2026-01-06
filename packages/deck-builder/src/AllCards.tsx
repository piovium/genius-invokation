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

export interface AllCardsProps extends DeckData {
  deck: Deck;
  version: number;
  versionSpecified?: boolean;
  deckPage?: boolean;
  onChangeDeck?: (deck: Deck) => void;
  onSwitchTab?: (tab: number) => void;
  onSetVersion?: (version: number) => void;
}

export function AllCards(props: AllCardsProps) {
  const [tab, setTab] = createSignal(0);
  const deckPage = () => props.deckPage ?? false;

  return (
    <div 
      class="min-w-0 flex-grow h-full group-[xxx.mobile]:h-50dvh group-[xxx.mobile]:flex-shrink-0 flex flex-col min-h-0 group-[xxx.mobile]:data-[deck-page=true]:hidden"
      data-deck-page={deckPage()}
    >
      <div class="flex flex-row gap-2 mb-2">
        <button
          class="data-[active=true]:font-bold"
          onClick={() => setTab(0)}
          data-active={tab() === 0}
        >
          角色牌
        </button>
        <button
          class="data-[active=true]:font-bold"
          onClick={() => setTab(1)}
          data-active={tab() === 1}
        >
          行动牌
        </button>
        <Show
          when={!props.versionSpecified}
          fallback={
            <span class="text-gray-500">
              当前仅显示 {props.allVersions[props.version]} 及更低版本
            </span>
          }
        >
          <select
            class="flex-grow border-black border-1px"
            value={props.version}
            onChange={(e) => props.onSetVersion?.(Number(e.target.value))}
          >
            <Index each={props.allVersions.toReversed()}>
              {(versionStr, index) => (
                <option value={props.allVersions.length - 1 - index}>{versionStr()}</option>
              )}
            </Index>
          </select>
        </Show>
      </div>
      <div class="min-h-0">
        <div
          data-visible={tab() === 0}
          class="h-full hidden data-[visible=true]:block"
        >
          <AllCharacterCards
            {...props}
            onSwitchTab={(tabNo) => setTab(tabNo)}
          />
        </div>
        <div
          data-visible={tab() === 1}
          class="h-full hidden data-[visible=true]:block"
        >
          <AllActionCards {...props} onSwitchTab={(tabNo) => setTab(tabNo)} />
        </div>
      </div>
    </div>
  );
}
