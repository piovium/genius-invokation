// Copyright (C) 2025 Guyutongxue
// Copyright (C) 2026 Piovium Labs
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
  children,
  createEffect,
  on,
  onCleanup,
  onMount,
  untrack,
  type JSX,
  type Setter,
} from "solid-js";
import { MINIMUM_HEIGHT, MINIMUM_WIDTH, unitInPx } from "../layout";
import { funnel } from "remeda";

export type Rotation = 0 | 90 | 180 | 270;
export interface TransformWrapperProps {
  /**
   * 控制棋盘缩放。当 ```hasOppChessboard=true``` 时，棋盘内容将缩小一定比例以容纳更多元素。
   */
  hasOppChessboard: boolean;
  class?: string;
  autoHeight?: boolean;
  rotation?: Rotation;
  isFullscreen?: boolean;
  children: JSX.Element;
  setTransformScale: Setter<number>;
}

const PRE_ROTATION_TRANSFORM = "translate(-50%, -50%)";
const POST_ROTATION_TRANSFORM = {
  0: "translate(50%, 50%)",
  90: "translate(50%, -50%)",
  180: "translate(-50%, -50%)",
  270: "translate(-50%, 50%)",
};
export const MERGE_CHESSBOARD_SCALE = 0.875;

export function TransformWrapper(props: TransformWrapperProps) {
  let transformWrapperEl!: HTMLDivElement;

  const onContainerResize = () => {
    const containerEl = transformWrapperEl.parentElement!;
    const containerWidth = containerEl.clientWidth;
    let containerHeight = containerEl.clientHeight;
    const autoHeight = untrack(() => props.autoHeight) ?? true;
    const rotate = untrack(() => props.rotation) ?? 0;
    const isFullscreen = untrack(() => props.isFullscreen) ?? false;
    const mergeScale = untrack(() => props.hasOppChessboard) ? MERGE_CHESSBOARD_SCALE : 1;
    const UNIT = unitInPx();
    let height: number;
    let width: number;
    let scale: number;
    const DEFAULT_HEIGHT_WIDTH_RATIO = MINIMUM_HEIGHT / MINIMUM_WIDTH;
    if (rotate % 180 === 0) {
      if (autoHeight && !isFullscreen) {
        containerHeight = 0.9 * DEFAULT_HEIGHT_WIDTH_RATIO * containerWidth;
        containerEl.style.height = `${containerHeight}px`;
      }
      scale = Math.min(
        containerHeight / (UNIT * MINIMUM_HEIGHT),
        containerWidth / (UNIT * MINIMUM_WIDTH),
      );
      height = containerHeight / (scale * mergeScale);
      width = containerWidth / (scale * mergeScale);
    } else {
      if (autoHeight && !isFullscreen) {
        containerHeight = containerWidth / DEFAULT_HEIGHT_WIDTH_RATIO;
        containerEl.style.height = `${containerHeight}px`;
      }
      scale = Math.min(
        containerHeight / (UNIT * MINIMUM_WIDTH),
        containerWidth / (UNIT * MINIMUM_HEIGHT),
      );
      height = containerWidth / (scale * mergeScale);
      width = containerHeight / (scale * mergeScale);
    }
    transformWrapperEl.style.setProperty(
      "--chessboard-merge-scale",
      `${mergeScale}`,
    );
    transformWrapperEl.style.transform = `${PRE_ROTATION_TRANSFORM} 
      scale(${scale * mergeScale}) rotate(${rotate}deg) 
      ${POST_ROTATION_TRANSFORM[rotate]}`;
    transformWrapperEl.style.height = `${height}px`;
    transformWrapperEl.style.width = `${width}px`;
    untrack(() => props.setTransformScale)(scale * mergeScale);
  };

  const onContainerResizeDebouncer = funnel(onContainerResize, {
    minQuietPeriodMs: 200,
  });
  const containerResizeObserver = new ResizeObserver(
    onContainerResizeDebouncer.call,
  );
  onMount(() => {
    onContainerResize();
    containerResizeObserver.observe(transformWrapperEl.parentElement!);
  });
  createEffect(
    on(
      () => [
        props.hasOppChessboard,
        props.autoHeight,
        props.rotation,
        props.isFullscreen,
      ],
      () => {
        onContainerResizeDebouncer.call();
      },
    ),
  );
  onCleanup(() => {
    containerResizeObserver.disconnect();
  });

  const inner = children(() => props.children);
  return (
    <div
      class={`transform-origin-center ${props.class ?? ""}`}
      ref={transformWrapperEl}
    >
      {inner()}
    </div>
  );
}
