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

import {
  type JSX,
  createContext,
  splitProps,
  useContext,
  untrack,
  createSignal,
  createEffect,
  Show,
  createResource,
  Switch,
  Match,
  createUniqueId,
} from "solid-js";
import { AllCards } from "./AllCards";
import { CurrentDeck } from "./CurrentDeck";
import type { Deck } from "@gi-tcg/typings";
import { createCardDataViewer } from "@gi-tcg/card-data-viewer";
import {
  DEFAULT_ASSETS_MANAGER,
  type AssetsManager,
  type DeckData,
} from "@gi-tcg/assets-manager";

export interface DeckBuilderProps extends JSX.HTMLAttributes<HTMLDivElement> {
  assetsManager?: AssetsManager;
  deck?: Deck;
  version?: string;
  onChangeDeck?: (deck: Deck) => void;
}

interface DeckBuilderContextValue {
  assetsManager: AssetsManager;
  showCard: (e: Event, type: "actionCard" | "character", id: number) => void;
}

const DeckBuilderContext = createContext<DeckBuilderContextValue>();

export const useDeckBuilderContext = () => useContext(DeckBuilderContext)!;

const EMPTY_DECK: Deck = {
  characters: [],
  cards: [],
};

export function DeckBuilder(props: DeckBuilderProps) {
  const [local, rest] = splitProps(props, ["assetsManager", "class"]);
  let container!: HTMLDivElement;

  const [deckData] = createResource(() => {
    return (local.assetsManager ?? DEFAULT_ASSETS_MANAGER).getDeckData();
  });

  const { CardDataViewer, showCard, showCharacter, hide } =
    createCardDataViewer({
      assetsManager: untrack(() => local.assetsManager),
    });

  const [cardDataViewerOffsetX, setCardDataViewerOffsetX] = createSignal(0);
  const [cardDataViewerOffsetY, setCardDataViewerOffsetY] = createSignal(0);

  const [version, setVersion] = createSignal(0);
  const allVersions = () => deckData()?.allVersions;
  const versionSpecified = () =>
    !!props.version && allVersions()?.includes(props.version);

  createEffect(() => {
    if (deckData.state === "ready") {
      if (versionSpecified()) {
        setVersion(deckData().allVersions.indexOf(props.version!));
      } else {
        setVersion(deckData().allVersions.length - 1);
      }
    }
  });

  const deckPageControlId = createUniqueId();

  return (
    <DeckBuilderContext.Provider
      value={{
        assetsManager:
          untrack(() => local.assetsManager) ?? DEFAULT_ASSETS_MANAGER,
        showCard: (e, type, id) => {
          const rect = (e.target as HTMLElement).getBoundingClientRect();
          const containerRect = container.getBoundingClientRect();
          // 当点击事件发生在靠近左侧位置时，在鼠标右下角显示；否则在左上角显示
          if (e.type === "long-press") {
            setCardDataViewerOffsetX((containerRect.width - 300) / 2);
            if (containerRect.bottom - rect.bottom < 200) {
              setCardDataViewerOffsetY(0);
            } else {
              setCardDataViewerOffsetY(rect.bottom - containerRect.top - 25);
            }
          } else if (rect.left - containerRect.left < 320) {
            setCardDataViewerOffsetX(
              rect.left + rect.width / 2 - containerRect.left,
            );
            setCardDataViewerOffsetY(
              rect.top + rect.height / 2 - containerRect.top,
            );
          } else {
            setCardDataViewerOffsetX(0);
            setCardDataViewerOffsetY(0);
          }
          if (type === "actionCard") {
            showCard(id);
          } else {
            showCharacter(id);
          }
        },
      }}
    >
      <div
        class={`gi-tcg-deck-builder @container groupxxx reset ${local.class}`}
        ref={container}
      >
        <input
          type="checkbox"
          id={deckPageControlId}
          class="deck-page-control"
          hidden
        />
        <div
          class="w-full h-full flex flex-col @3xl:flex-row items-stretch gap-0 @3xl:gap-3 select-none"
          {...rest}
          onClick={() => hide()}
        >
          <Switch>
            <Match when={deckData.loading}>
              <div class="flex-grow">Loading cards...</div>
            </Match>
            <Match when={deckData.error}>
              <div class="flex-grow">Load data errored!</div>
            </Match>
            <Match when={deckData()}>
              {(deckData) => (
                <AllCards
                  version={version()}
                  versionSpecified={versionSpecified()}
                  deck={props.deck ?? EMPTY_DECK}
                  onChangeDeck={props.onChangeDeck}
                  onSetVersion={setVersion}
                  {...deckData()}
                />
              )}
            </Match>
          </Switch>
          <div class="b-r-1 b-b-1 b-gray DP:mt-3 @3xl:mt-0 DP:@3xl:mt-0" />
          <div class="h-3 w-full @3xl:hidden flex relative DP:mb-2 DP:flex-shrink-0">
            <label
              for={deckPageControlId}
              class="absolute z-10 h-16 w-16 rounded-full b-1 b-white b-t-gray bg-white top-0 right-0 translate-y--15.5%"
            >
              <div class="absolute top-3 left-6 h-4 w-4 rounded-lt-1 b-t-3 b-l-3 b-yellow-5 rotate-45 DP:rotate-225 DP:top-2" />
            </label>
          </div>
          <Show when={deckData()}>
            {(deckData) => (
              <CurrentDeck
                version={version()}
                deck={props.deck ?? EMPTY_DECK}
                onChangeDeck={props.onChangeDeck}
                {...deckData()}
              />
            )}
          </Show>
        </div>
        <div
          class="absolute right-0 bottom-0 pointer-events-none z-50"
          style={{
            left: `${cardDataViewerOffsetX()}px`,
            top: `${cardDataViewerOffsetY()}px`,
          }}
        >
          <CardDataViewer />
        </div>
      </div>
    </DeckBuilderContext.Provider>
  );
}
