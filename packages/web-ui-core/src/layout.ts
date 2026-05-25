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

import type { DraggingCardInfo } from "./components/Chessboard";

export type Size = [height: number, width: number];
export type Pos = [x: number, y: number];

export function unitInPx() {
  return parseFloat(getComputedStyle(document.documentElement).fontSize) / 4;
}

export const PERSPECTIVE = 200;
export const ACTION_OUTLINED_Z = 8;
export const FOCUSING_HANDS_Z = 10;
export const DRAGGING_Z = 12;

export const MINIMUM_WIDTH = 240;
export const MINIMUM_HEIGHT = 135;

const GADGET_HEIGHT = 6;

export const CARD_HEIGHT = 36;
export const CARD_WIDTH = 21;

const CHARACTER_AREA_HEIGHT = CARD_HEIGHT + 3 * GADGET_HEIGHT;
const CHARACTER_AREA_WIDTH = CARD_WIDTH;
const CHARACTER_AREA_GAP = 6;

const TOTAL_CHARACTERS_MAX_WIDTH =
  4 * CHARACTER_AREA_WIDTH + 3 * CHARACTER_AREA_GAP;

const ENTITY_HEIGHT = 19;
const ENTITY_WIDTH = 16;
const ENTITY_GAP = 4.5;
const ENTITY_AREA_HEIGHT = 2 * ENTITY_HEIGHT + ENTITY_GAP;
const ENTITY_AREA_WIDTH = 2 * ENTITY_WIDTH + ENTITY_GAP;

const HAND_CARD_BLURRED_SHOW_HEIGHT = 15;
const HAND_CARD_BLURRED_SHOW_WIDTH = 10;
const OPP_HAND_CARD_RIGHT_OFFSET = 24;

const SKILL_BUTTON_WIDTH = 15;

const HAND_CARD_FOCUSED_GAP = 2;
const HAND_CARD_FOCUSED_SHOW_HEIGHT = 36;
const HAND_CARD_FOCUSED_SHOW_WIDTH_MIN = 15;
const HAND_CARD_FOCUSED_CENTER_X_OFFSET = 0;

const HAND_CARD_HOVERING_Y_OFFSET = 3;
const HAND_CARD_HOVERING_X_OFFSET = 2;

const HAND_CARD_FOCUSING_AREA_HEIGHT_WHEN_DRAGGING = CARD_HEIGHT + 10;

export const SHOWING_CARD_X_MARGIN = 60;

export function getCharacterAreaPos(
  [height, width]: Size,
  opp: boolean,
  totalCount: number,
  index: number,
  isActive: boolean,
): Pos {
  const halfHeight = height / 2;
  const halfChessboardHeight = MINIMUM_HEIGHT / 2;
  const gapAroundCharacterArea =
    (halfChessboardHeight -
      CHARACTER_AREA_HEIGHT -
      HAND_CARD_BLURRED_SHOW_HEIGHT) /
    2 + 1;
  let characterAreaY = opp
    ? halfHeight - gapAroundCharacterArea - CHARACTER_AREA_HEIGHT
    : halfHeight + gapAroundCharacterArea;

  if (isActive === opp) {
    characterAreaY += GADGET_HEIGHT;
  }

  const halfWidth = width / 2;
  const totalCharacterAreaWidth =
    totalCount * CHARACTER_AREA_WIDTH + (totalCount - 1) * CHARACTER_AREA_GAP;
  const totalCharacterAreaX = halfWidth - totalCharacterAreaWidth / 2;
  const characterAreaX =
    totalCharacterAreaX + index * (CHARACTER_AREA_WIDTH + CHARACTER_AREA_GAP);
  return [characterAreaX, characterAreaY];
}

export function getEntityPos(
  [height, width]: Size,
  opp: boolean,
  type: "summon" | "support",
  index: number,
) {
  if (index >= 4) {
    return [999, 999];
  }
  const halfHeight = height / 2;
  const halfWidth = width / 2;
  const halfChessboardHeight = MINIMUM_HEIGHT / 2;
  const gapAroundEntityArea =
    (halfChessboardHeight -
      ENTITY_AREA_HEIGHT -
      HAND_CARD_BLURRED_SHOW_HEIGHT) /
    2;
  const entityAreaY = opp
    ? halfHeight - gapAroundEntityArea - ENTITY_AREA_HEIGHT
    : halfHeight + gapAroundEntityArea;
  const entityAreaX =
    type === "summon"
      ? halfWidth + TOTAL_CHARACTERS_MAX_WIDTH / 2
      : halfWidth - TOTAL_CHARACTERS_MAX_WIDTH / 2 - ENTITY_AREA_WIDTH;
  const x = entityAreaX + (index % 2) * (ENTITY_WIDTH + ENTITY_GAP);
  const y = entityAreaY + Math.floor(index / 2) * (ENTITY_HEIGHT + ENTITY_GAP);
  return [x, y];
}

export function getHandCardBlurredPos(
  [height, width]: Size,
  opp: boolean,
  showHands: boolean,
  totalCount: number,
  index: number,
  skillCount: number,
): Pos {
  if (opp) {
    let y =
      (height - MINIMUM_HEIGHT) / 2 +
      HAND_CARD_BLURRED_SHOW_HEIGHT -
      CARD_HEIGHT;
    if (!showHands) {
      y = HAND_CARD_BLURRED_SHOW_HEIGHT - CARD_HEIGHT - 2 - CARD_HEIGHT / 2;
    }
    const areaX =
      (width - MINIMUM_WIDTH) / 2 +
      MINIMUM_WIDTH -
      OPP_HAND_CARD_RIGHT_OFFSET -
      totalCount * HAND_CARD_BLURRED_SHOW_WIDTH;
    const x = areaX + index * HAND_CARD_BLURRED_SHOW_WIDTH;
    return [x, y];
  } else {
    let y =
      (height - MINIMUM_HEIGHT) / 2 +
      MINIMUM_HEIGHT -
      HAND_CARD_BLURRED_SHOW_HEIGHT - 1;
    if (!showHands) {
      y = height - HAND_CARD_BLURRED_SHOW_HEIGHT + 3 + CARD_HEIGHT / 2;
    }
    const halfWidth = width / 2;
    const totalHandCardWidth =
      (totalCount - 1) * HAND_CARD_BLURRED_SHOW_WIDTH + CARD_WIDTH;
    let areaX = halfWidth - totalHandCardWidth / 2;
    const skillButtonGroupWidth = skillCount * SKILL_BUTTON_WIDTH + 2;
    if (
      areaX + totalHandCardWidth >
      (width - MINIMUM_WIDTH) / 2 + MINIMUM_WIDTH - skillButtonGroupWidth
    ) {
      areaX =
        (width - MINIMUM_WIDTH) / 2 +
        MINIMUM_WIDTH -
        skillButtonGroupWidth -
        totalHandCardWidth;
    }
    const x = areaX + index * HAND_CARD_BLURRED_SHOW_WIDTH;
    return [x, y];
  }
}

export function getOppHandCardFocusedPos(
  [height, width]: Size,
  totalCount: number,
  index: number,
  hoveringIndex: number | null,
): Pos {
  const yBase = (height - MINIMUM_HEIGHT) / 2;
  const y = yBase + (index === hoveringIndex ? HAND_CARD_HOVERING_Y_OFFSET : 0);
  const halfWidth = width / 2;
  const cardAreaCenter = halfWidth + HAND_CARD_FOCUSED_CENTER_X_OFFSET;
  const cardAreaMaxWidth = 9 * HAND_CARD_FOCUSED_SHOW_WIDTH_MIN + CARD_WIDTH;
  const realGap = Math.min(
    (cardAreaMaxWidth - CARD_WIDTH) / (totalCount - 1),
    CARD_WIDTH + HAND_CARD_FOCUSED_GAP,
  );
  const cardAreaWidth = realGap * (totalCount - 1) + CARD_WIDTH;
  const cardAreaX = cardAreaCenter - cardAreaWidth / 2;
  let x = cardAreaX + index * realGap;
  if (hoveringIndex === null) {
    return [x, y];
  }
  if (index < hoveringIndex) {
    x -= HAND_CARD_HOVERING_X_OFFSET;
  } else if (index > hoveringIndex) {
    x += HAND_CARD_HOVERING_X_OFFSET;
  }
  return [x, y];
}

export function getPilePos([height, width]: Size, opp: boolean): Pos {
  const quarterHeight = MINIMUM_HEIGHT / 4;
  const y = opp
    ? (height - MINIMUM_HEIGHT) / 2 + quarterHeight + CARD_WIDTH / 2
    : (height - MINIMUM_HEIGHT) / 2 + quarterHeight * 3 + CARD_WIDTH / 2;
  const x = (width - MINIMUM_WIDTH) / 2 + 24;
  return [x, y];
}

export function getHandCardFocusedPos(
  [height, width]: Size,
  totalCount: number,
  index: number,
  hoveringIndex: number | null,
): Pos {
  const yBase =
    (height - MINIMUM_HEIGHT) / 2 +
    MINIMUM_HEIGHT -
    HAND_CARD_FOCUSED_SHOW_HEIGHT;
  const y = yBase - (index === hoveringIndex ? HAND_CARD_HOVERING_Y_OFFSET : 0);
  const halfWidth = width / 2;
  const cardAreaCenter = halfWidth + HAND_CARD_FOCUSED_CENTER_X_OFFSET;
  const cardAreaMaxWidth = 9 * HAND_CARD_FOCUSED_SHOW_WIDTH_MIN + CARD_WIDTH;
  const realGap = Math.min(
    (cardAreaMaxWidth - CARD_WIDTH) / (totalCount - 1),
    CARD_WIDTH + HAND_CARD_FOCUSED_GAP,
  );
  const cardAreaWidth = realGap * (totalCount - 1) + CARD_WIDTH;
  const cardAreaX = cardAreaCenter - cardAreaWidth / 2;
  let x = cardAreaX + index * realGap;
  if (hoveringIndex === null) {
    return [x, y];
  }
  if (index < hoveringIndex) {
    x -= HAND_CARD_HOVERING_X_OFFSET;
  } else if (index > hoveringIndex) {
    x += HAND_CARD_HOVERING_X_OFFSET;
  }
  return [x, y];
}

export function shouldFocusHandWhenDragging(
  [height, width]: Size,
  currentY: number,
) {
  return (
    currentY >=
    (height - MINIMUM_HEIGHT) / 2 +
      MINIMUM_HEIGHT -
      HAND_CARD_FOCUSING_AREA_HEIGHT_WHEN_DRAGGING
  );
}

export function getShowingCardPos(
  [height, width]: Size,
  totalCount: number,
  index: number,
): Pos {
  const y = height / 2 - CARD_HEIGHT / 2;
  const gapX =
    (MINIMUM_WIDTH - SHOWING_CARD_X_MARGIN - totalCount * CARD_WIDTH) /
    (totalCount + 1);
  const xStart = (width - MINIMUM_WIDTH + SHOWING_CARD_X_MARGIN) / 2 + gapX;
  const x = xStart + index * (CARD_WIDTH + gapX);
  return [x, y];
}

export function getPileHintPos(size: Size, opp: boolean) {
  const [x, y] = getPilePos(size, opp);
  return {
    x: x - 4.5,
    y: y - CARD_WIDTH / 2 - 4.5,
  };
}

export function getHandHintPos(
  size: Size,
  opp: boolean,
  value: number,
  focused: boolean,
) {
  if (opp) {
    if (focused) {
      const [x, y] = getOppHandCardFocusedPos(size, value, value - 1, null);
      return {
        x: x + CARD_WIDTH - 9,
        y: y + CARD_HEIGHT + 1,
      };
    }
    const [x, y] = getHandCardBlurredPos(size, true, true, value, value - 1, 0);
    return {
      x: x - 9,
      y: y + CARD_HEIGHT + 1,
    };
  } else {
    const [x, y] = getHandCardFocusedPos(size, value, value - 1, null);
    return {
      x: x + CARD_WIDTH - 9,
      y: y - 10,
    };
  }
}

export const TUNNING_AREA_INSET = 25;

export function getTuningAreaPos(
  [height, width]: Size,
  draggingHand: DraggingCardInfo | null,
) {
  const tangent = MINIMUM_WIDTH / 2 / PERSPECTIVE;
  let x = (width - MINIMUM_WIDTH) / 2 + MINIMUM_WIDTH - DRAGGING_Z * tangent;
  if (draggingHand?.status === "moving" && draggingHand.tuneStep) {
    x -= TUNNING_AREA_INSET;
  }
  return [x, 0];
}
