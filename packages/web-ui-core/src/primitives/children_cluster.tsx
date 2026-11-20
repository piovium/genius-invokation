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
import type {
  ChessboardChildren,
  ChessboardChildrenUpdate,
} from "../components/Chessboard";

interface AnimatingElement {
  id: number;
  uiState: UiState;
}

type ValidPath = {
  [
    K in keyof ChessboardChildren
  ]: ChessboardChildren[K] extends readonly AnimatingElement[] ? K : never;
}[keyof ChessboardChildren];

type ClusterItem<Path extends ValidPath> = ChessboardChildren[Path][number];

export interface ChildrenClusterProps<Path extends ValidPath> {
  input: ChessboardChildrenUpdate;
  path: Path;
  children: (
    item: Accessor<ClusterItem<Path>>,
    index: Accessor<number>,
  ) => JSX.Element;
}

/**
 * Renders the chessboard items at `path`, keyed by ID.
 * Layout updates reuse previous values for animating items whose IDs are still
 * present. When `input.forceUpdate` is true, uses the incoming list directly.
 */
export function ChildrenCluster<const Path extends ValidPath>(
  props: ChildrenClusterProps<Path>,
) {
  const items = createMemo<readonly ClusterItem<Path>[]>((previous) => {
    const next: readonly ClusterItem<Path>[] =
      untrack(() => props.input)[props.path];
    if (props.input.forceUpdate || !previous) {
      return next;
    }
    // “软”更新不要打断正在动画中的元素
    const animating = new Map(
      previous
        .filter((item) => item.uiState.isAnimating)
        .map((item) => [item.id, item]),
    );
    return next.map((item) => animating.get(item.id) ?? item);
  });
  return (
    <For<readonly ClusterItem<Path>[], JSX.Element>
      each={items()}
      keyed={(item) => item.id}
    >
      {props.children}
    </For>
  );
}
