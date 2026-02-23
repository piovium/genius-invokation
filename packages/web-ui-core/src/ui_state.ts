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

import type { DamageType } from "@gi-tcg/typings";
import type { DamageInfo, ReactionInfo } from "./components/Chessboard";

export interface AnimatingUiState {
  readonly isAnimating: true;
  readonly onAnimationFinish?: () => void;
}

export interface StaticUiState {
  readonly isAnimating: false;
}

export interface UiState {
  readonly isAnimating: boolean;
  readonly onAnimationFinish?: () => void;
}

export interface Transform {
  x: number;
  y: number;
  z: number;
  rx?: number;
  ry: number;
  rz: number;
}

export const cssPropertyOfTransform = (
  x: Transform,
): Record<string, string> => ({
  // "z-index": `${x.zIndex}`,
  transform: `var(--override-transform, translate3d(${x.x / 4}rem, ${
    x.y / 4
  }rem, ${x.z / 4}rem) 
    rotateZ(${x.rz}deg)
    rotateY(${x.ry}deg)
    rotateX(${x.rx ?? 0}deg))`,
});

export interface CardStaticUiState extends StaticUiState {
  readonly type: "cardStatic";
  readonly transform: Transform;
  readonly triggered: boolean;
  // 当拖拽结束时，应用一个消失动画
  readonly draggingEndAnimation: boolean;
}

export interface CardAnimatingUiState extends AnimatingUiState {
  readonly type: "cardAnimation";
  /**
   * 动画开始时牌的位置；应当从上一个对局状态中查找到
   */
  readonly start: Transform | null;
  /**
   * 牌面向上时展示；牌背向上时设置为 `null`
   */
  readonly middle: Transform | null;
  /**
   * 动画结束时牌的位置；应当从当前对局状态中查找到
   */
  readonly end: Transform | null;
  /** 动画持续毫秒数 */
  readonly durationMs: number;
  /** 动画延迟播放毫秒数 */
  readonly delayMs: number;
}

export type CardUiState = CardStaticUiState | CardAnimatingUiState;

export const createCardAnimation = (
  init: Pick<CardAnimatingUiState, "start" | "middle" | "end" | "delayMs">,
): [CardAnimatingUiState, Promise<void>] => {
  const ANIMATION_DURATION_HAS_MIDDLE = 900;
  const ANIMATION_DURATION_NO_MIDDLE = 500;
  const { promise, resolve } = Promise.withResolvers<void>();
  return [
    {
      type: "cardAnimation",
      isAnimating: true,
      onAnimationFinish: resolve,
      durationMs: init.middle
        ? ANIMATION_DURATION_HAS_MIDDLE
        : ANIMATION_DURATION_NO_MIDDLE,
      ...init,
    },
    promise,
  ];
};

export interface DamageSourceAnimation {
  readonly type: "damageSource";
  readonly targetX: number;
  readonly targetY: number;
  readonly damageType: DamageType;
}

export interface DamageTargetAnimation {
  readonly type: "damageTarget";
  readonly sourceX: number;
  readonly sourceY: number;
  readonly damageType: DamageType;
}

export const CHARACTER_ANIMATION_NONE = { type: "none" } as const;

export type CharacterAnimation =
  | DamageSourceAnimation
  | DamageTargetAnimation
  | typeof CHARACTER_ANIMATION_NONE;

export interface CharacterUiState extends UiState {
  readonly type: "character";
  readonly transform: Transform;
  damages: (DamageInfo | ReactionInfo)[];
  animation: CharacterAnimation;
}

export interface EntityUiState extends StaticUiState {
  readonly type: "entityStatic";
  readonly transform: Transform;
}
