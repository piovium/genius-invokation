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
  Show,
  Switch,
  Match,
  createResource,
  createSignal,
  onCleanup,
} from "solid-js";
import { useDeckBuilderContext } from "./DeckBuilder";
import BrowseIcon from "./Browse.svg";
import DeleteIcon from "./Delete.svg";

import "long-press-event";

export interface CardProps {
  id: number;
  type: "character" | "actionCard";
  name: string;
}

export function Card(props: CardProps) {
  const { assetsManager, showCard } = useDeckBuilderContext();

  const [url] = createResource(() =>
    assetsManager().getImageUrl(props.id, { thumbnail: true }),
  );

  return (
    <div title={props.name} class="w-full relative group">
      <Show
        when={url.state === "ready"}
        fallback={
          <div class="w-full aspect-ratio-[7/12] bg-gray-200 text-black whitespace-pre overflow-clip">
            {props.name}
          </div>
        }
      >
        <img
          src={url()}
          alt={props.name}
          draggable="false"
          class="w-full object-cover brightness-[var(--card-brightness,1)] opacity-[var(--card-opacity,1)]"
        />
      </Show>
      <div
        class="absolute left-0 top-0 bg-gray-500/90 h-25% w-full items-center justify-center hidden group-hover:flex"
        onClick={(e) => {
          e.stopPropagation();
          showCard(e, props.type, props.id);
        }}
      >
        <img src={BrowseIcon} draggable="false" class="w-35% h-auto" />
      </div>
      <div
        class="absolute inset-0 z-100 bg-transparent @3xl:hidden"
        onContextMenu={(e) => e.preventDefault()}
        data-long-press-delay="400"
        on:long-press={(e: CustomEvent) => {
          e.preventDefault();
          showCard(e, props.type, props.id);
        }}
      />
    </div>
  );
}

export interface PoolCardProps extends CardProps {
  valid?: boolean;
  partialSelected?: boolean;
  selected?: boolean;
  selectedCount?: number;
}

export function PoolCard(props: PoolCardProps) {
  const { t } = useDeckBuilderContext();
  return (
    <div
      class="pool-card w-full rounded-lg overflow-clip b-[var(--border-color)] b-2 relative"
      bool:data-selected={props.selected}
      bool:data-partial-selected={props.partialSelected}
      bool:data-invalid={props.valid === false}
    >
      <Card id={props.id} type={props.type} name={props.name} />
      <Switch>
        <Match when={props.valid === false}>
          <div
            class="absolute left-0 bottom-0 bg-[var(--border-color)] h-25% w-full items-center justify-center text-red font-bold text-sm flex"
            bool:data-invalid={props.valid === false}
          >
            {t("invalid")}
          </div>
        </Match>
        <Match when={props.type === "character" && props.selected}>
          <div
            class="absolute left-0 bottom-0 bg-[var(--border-color)] h-25% w-full items-center justify-center text-white font-bold text-sm flex"
            bool:data-selected={props.selected}
          >
            {t("selected")}
          </div>
        </Match>
        <Match
          when={
            props.type === "actionCard" &&
            (props.selected || props.partialSelected)
          }
        >
          <div
            class="absolute left-0 bottom-0 bg-[var(--border-color)] h-25% w-full items-center justify-center text-white font-bold text-sm flex"
            bool:data-selected={props.selected}
            bool:data-partial-selected={props.partialSelected}
          >
            {t("selectedCount", { count: props.selectedCount ?? 0 })}
          </div>
        </Match>
      </Switch>
    </div>
  );
}

export interface DeckCardProps extends CardProps {
  class?: string;
  warn: boolean;
}

export function DeckCard(props: DeckCardProps) {
  return (
    <div
      class={`w-full overflow-clip b-gray-500 b-2 relative group ${
        props.class ?? ""
      }`}
    >
      <Card id={props.id} type={props.type} name={props.name} />
      <div
        class={`absolute inset-0 data-[warn]:flex hidden group-hover:hidden pointer-events-none
           bg-red-500/50 items-center justify-center`}
        bool:data-warn={props.warn}
      >
        <span class="text-4xl font-bold text-white text-center">&#9888;</span>
      </div>
      <div class="absolute left-0 bottom-0 bg-red-500/50 h-75% w-full items-center justify-center hidden @3xl:group-hover:flex DP:group-hover:flex">
        <img
          src={DeleteIcon}
          draggable="false"
          class="cursor-pointer w-80% h-auto opacity-75 mt-5%"
        />
      </div>
    </div>
  );
}

export interface TinyCardProps {
  id: number;
  warn: boolean;
}

export function TinyCharacterCard(props: TinyCardProps) {
  const { assetsManager } = useDeckBuilderContext();

  const [url] = createResource(() =>
    assetsManager().getImageUrl(props.id, { type: "icon", thumbnail: true }),
  );

  return (
    <div class="@3xl:hidden DP:hidden w-full h-full rounded-full overflow-clip b-gray-500 border-2 relative group">
      <Show
        when={url.state === "ready"}
        fallback={<div class="w-full h-full bg-gray-200" />}
      >
        <img src={url()} draggable="false" class="w-full object-cover" />
      </Show>
      <div
        class={`absolute inset-0 data-[warn]:block hidden pointer-events-none 
          text-lg line-height-10 text-white text-center bg-red-500/50`}
        bool:data-warn={props.warn}
      >
        &#9888;
      </div>
    </div>
  );
}

export function TinyActionCard(props: TinyCardProps) {
  const { assetsManager } = useDeckBuilderContext();

  const [url] = createResource(() =>
    assetsManager().getImageUrl(props.id, { thumbnail: true }),
  );

  return (
    <div class="@3xl:hidden DP:hidden w-full rounded-md overflow-clip b-gray-500 border-2 relative group">
      <Show
        when={url.state === "ready"}
        fallback={<div class="w-full aspect-ratio-[7/12] bg-gray-200" />}
      >
        <img src={url()} draggable="false" class="w-full object-cover" />
      </Show>
      <div
        class={`absolute inset-0 data-[warn]:block hidden pointer-events-none 
          text-lg line-height-10 text-white text-center bg-red-500/50`}
        bool:data-warn={props.warn}
      >
        &#9888;
      </div>
    </div>
  );
}
