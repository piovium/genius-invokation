// Copyright (C) 2025 Guyutongxue
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

import { createMemo, For, untrack, type Accessor } from "solid-js";
import type { JSX } from "@solidjs/web";
import type { UiState } from "../ui_state";

type AnimatingElement = { id: number; uiState: UiState };
export type UpdateSignal = { force: boolean };

export function KeyWithAnimation<T extends AnimatingElement>(props: {
  each: readonly T[];
  updateWhen: UpdateSignal;
  children: (item: Accessor<T>, index: Accessor<number>) => JSX.Element;
}) {
  const items = createMemo<readonly T[]>((previous) => {
    const { force } = props.updateWhen;
    const next = untrack(() => props.each);
    if (force || !previous) {
      return next;
    }
    // Layout updates must not interrupt an animation started by a game notification.
    const animating = new Map(
      previous
        .filter((item) => item.uiState.isAnimating)
        .map((item) => [item.id, item]),
    );
    return next.map((item) => animating.get(item.id) ?? item);
  });
  return (
    <For each={items()} keyed={(item) => item.id}>
      {props.children}
    </For>
  );
}
