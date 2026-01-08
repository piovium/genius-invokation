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

import { Show, createResource, createSignal, onCleanup } from "solid-js";
import { useDeckBuilderContext } from "./DeckBuilder";

export interface CardProps {
  id: number;
  type: "character" | "actionCard";
  name: string;
  partialSelected?: boolean;
  selected?: boolean;
}

const LONG_PRESS_DELAY = 500; // ms
const MOVE_THRESHOLD = 10; // px

export function Card(props: CardProps) {
  const { assetsManager, showCard } = useDeckBuilderContext();

  const [url] = createResource(() =>
    assetsManager.getImageUrl(props.id, { thumbnail: true })
  );

  const [pressing, setPressing] = createSignal(false);

  let longPressTimer: number | undefined;
  let startX = 0;
  let startY = 0;
  let moved = false;

  const clearTimer = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      longPressTimer = undefined;
    }
  };

  const onTouchStart = (e: TouchEvent) => {
    if (e.touches.length !== 1) return;

    const touch = e.touches[0];
    startX = touch.clientX;
    startY = touch.clientY;
    moved = false;

    clearTimer();
    longPressTimer = window.setTimeout(() => {
      setPressing(true);
    }, LONG_PRESS_DELAY);
  };

  const onTouchMove = (e: TouchEvent) => {
    if (!longPressTimer || e.touches.length !== 1) return;

    const touch = e.touches[0];
    const dx = Math.abs(touch.clientX - startX);
    const dy = Math.abs(touch.clientY - startY);

    if (dx > MOVE_THRESHOLD || dy > MOVE_THRESHOLD) {
      moved = true;
      clearTimer();
      setPressing(false);
    }
  };

  const onTouchEnd = (e: TouchEvent) => {
    const wasPressing = pressing();
    clearTimer();
    setPressing(false);

    if (!moved && wasPressing) {
      showCard(e, props.type, props.id);
    }
  };

  const onTouchCancel = () => {
    clearTimer();
    setPressing(false);
  };

  onCleanup(() => {
    clearTimer();
  });

  return (
    <div
      title={props.name}
      data-selected={props.selected}
      data-partial-selected={props.partialSelected}
      class="w-full rounded-lg overflow-clip data-[selected=true]:border-green data-[partial-selected=true]:border-yellow border-2 border-transparent relative group"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchCancel}
    >
      <Show
        when={url.state === "ready"}
        fallback={
          <div class="w-full aspect-ratio-[7/12] bg-gray-200">
            {props.name}
          </div>
        }
      >
        <img
          src={url()}
          alt={props.name}
          draggable="false"
          class="w-full h-full object-cover"
        />
      </Show>
      <Show when={pressing()}>
        <div class="absolute inset-0 bg-black/50 pointer-events-none" />
      </Show>
      <div
        class="absolute right-0 top-0 bg-white rounded-full h-6 w-6 line-height-none items-center justify-center hidden group-hover:flex"
        onClick={(e) => {
          e.stopPropagation();
          showCard(e, props.type, props.id);
        }}
      >
        &#128269;
      </div>
    </div>
  );
}

