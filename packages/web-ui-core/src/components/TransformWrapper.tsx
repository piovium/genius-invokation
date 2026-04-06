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
  hasOppChessboard: boolean;
  class?: string;
  autoHeight?: boolean;
  rotation?: Rotation;
  isFullscreen?: boolean;
  children: JSX.Element;
  setTransformScale: Setter<number>;
}

const PRE_ROTATION_TRANSFORM = `translate(-50%, -50%)`;
const POST_ROTATION_TRANSFORM = {
  0: "translate(50%, 50%)",
  90: "translate(50%, -50%)",
  180: "translate(-50%, -50%)",
  270: "translate(-50%, 50%)",
};

export function TransformWrapper(props: TransformWrapperProps) {
  let transformWrapperEl!: HTMLDivElement;

  const onContainerResize = () => {
    const containerEl = transformWrapperEl.parentElement!;
    const hasOppChessboard = untrack(() => props.hasOppChessboard) ?? false;
    const containerWidth = containerEl.clientWidth;
    let containerHeight = containerEl.clientHeight;
    const autoHeight = untrack(() => props.autoHeight) ?? true;
    const rotate = untrack(() => props.rotation) ?? 0;
    const isFullscreen = untrack(() => props.isFullscreen) ?? false;
    const UNIT = unitInPx();
    let height: number;
    let width: number;
    let scale: number;
    let oppScale = 1;
    const DEFAULT_HEIGHT_WIDTH_RATIO = MINIMUM_HEIGHT / MINIMUM_WIDTH;
    const adjustScale = () => {
      height /= scale;
      width /= scale;
      if (hasOppChessboard) {
        if (height / width > DEFAULT_HEIGHT_WIDTH_RATIO) {
          oppScale = 0.75;
        } else {
          oppScale = 0.8;
        }
        height /= oppScale;
      }
    };
    if (rotate % 180 === 0) {
      if (autoHeight && !isFullscreen) {
        containerHeight = 0.9 * DEFAULT_HEIGHT_WIDTH_RATIO * containerWidth;
        containerEl.style.height = `${containerHeight}px`;
      }
      scale = Math.min(
        containerHeight / (UNIT * MINIMUM_HEIGHT),
        containerWidth / (UNIT * MINIMUM_WIDTH),
      );
      height = containerHeight;
      width = containerWidth;
      adjustScale();
    } else {
      if (autoHeight && !isFullscreen) {
        containerHeight = containerWidth / DEFAULT_HEIGHT_WIDTH_RATIO;
        containerEl.style.height = `${containerHeight}px`;
      }
      scale = Math.min(
        containerHeight / (UNIT * MINIMUM_WIDTH),
        containerWidth / (UNIT * MINIMUM_HEIGHT),
      );
      height = containerWidth;
      width = containerHeight;
      adjustScale();
    }
    transformWrapperEl.style.setProperty(
      "--chessboard-opp-scale",
      `${oppScale}`,
    );
    transformWrapperEl.style.transform = `${PRE_ROTATION_TRANSFORM} scale(${
      scale * oppScale
    }) rotate(${rotate}deg) ${POST_ROTATION_TRANSFORM[rotate]}`;
    transformWrapperEl.style.height = `${height}px`;
    transformWrapperEl.style.width = `${width}px`;
    untrack(() => props.setTransformScale)(scale * oppScale);
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
