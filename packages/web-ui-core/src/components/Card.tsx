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

import { createEffect, createMemo, Match, Show, Switch } from "solid-js";
import { Image } from "./Image";
import { DiceCost } from "./DiceCost";
import {
  cssPropertyOfTransform,
  type CardAnimatingUiState,
  type Transform,
} from "../ui_state";
import { type CardInfo } from "./Chessboard";
import {
  type PbDiceRequirement,
  CARD_TAG_ABYSS,
  CARD_TAG_CONDUCTIVE,
} from "@gi-tcg/typings";
import SelectingIcon from "../svg/SelectingIcon.svg?fb";
import CardFrameNormal from "../svg/CardFrameNormal.svg?fb";
import CardbackNormal from "../svg/CardbackNormal.svg?fb";
import ExchangeCard from "../svg/ExchangeCard.svg?fb";
import { AttachmentGroup } from "./StatusGroup";
import ConductiveEffect from "../svg/ConductiveEffect.svg?fb";

export interface CardProps extends CardInfo {
  selected: boolean;
  toBeSwitched: boolean;
  realCost?: PbDiceRequirement[];
  hidden?: boolean;
  onClick?: (e: MouseEvent, currentTarget: HTMLElement) => void;
  onPointerEnter?: (e: PointerEvent, currentTarget: HTMLElement) => void;
  onPointerLeave?: (e: PointerEvent, currentTarget: HTMLElement) => void;
  onPointerUp?: (e: PointerEvent, currentTarget: HTMLElement) => void;
  onPointerMove?: (e: PointerEvent, currentTarget: HTMLElement) => void;
  onPointerDown?: (e: PointerEvent, currentTarget: HTMLElement) => void;
}

const transformKeyframes = (uiState: CardAnimatingUiState): Keyframe[] => {
  const { start, middle, end } = uiState;
  const EMPTY: Transform = {
    x: 0,
    y: 0,
    z: 0,
    ry: 0,
    rz: 0,
  };
  const fallbackStyle = cssPropertyOfTransform(middle ?? end ?? start ?? EMPTY);
  const startKeyframe: Keyframe = {
    offset: 0,
    ...(start ? cssPropertyOfTransform(start) : fallbackStyle),
  };
  const middleKeyframes: Keyframe[] = middle
    ? [
        {
          offset: 0.4,
          ...cssPropertyOfTransform(middle),
        },
        {
          offset: 0.6,
          ...cssPropertyOfTransform(middle),
        },
      ]
    : [];
  const endKeyframe: Keyframe[] = end
    ? [
        {
          offset: 1,
          ...cssPropertyOfTransform(end),
        },
      ]
    : [
        {
          offset: 0.99,
          ...fallbackStyle,
          visibility: "visible",
        },
        {
          offset: 1,
          ...fallbackStyle,
          visibility: "hidden",
        },
      ];
  return [startKeyframe, ...middleKeyframes, ...endKeyframe];
};

/**
 * The opacity keyframes must be applied to a non-3d rendering context.
 * In our case, apply to the card's children.
 */
const opacityKeyframes = (uiState: CardAnimatingUiState): Keyframe[] => {
  const { start, middle, end } = uiState;
  const startKeyframe: Keyframe = {
    offset: 0,
    opacity: start ? 1 : 0,
  };
  const middleKeyframes: Keyframe[] = middle
    ? [
        {
          offset: 0.4,
          opacity: 1,
        },
        {
          offset: 0.6,
          opacity: 1,
        },
      ]
    : [];
  const endKeyframe: Keyframe = {
    offset: 1,
    opacity: end ? 1 : 0,
  };
  return [startKeyframe, ...middleKeyframes, endKeyframe];
};

const EFFECTLESS_DEFINITION_ID = 208;

export function Card(props: CardProps) {
  // const [data] = createResource(
  //   () => props.data.definitionId,
  //   (id) => getData(id),
  // );
  let el!: HTMLDivElement;
  const data = createMemo(() => props.data);
  const realCost = createMemo(() => props.realCost);

  const style = createMemo(() => {
    if (props.uiState.type === "cardStatic") {
      return cssPropertyOfTransform(props.uiState.transform);
    } else {
      const { end } = props.uiState;
      return end ? cssPropertyOfTransform(end) : {};
    }
  });

  const abyssDebuff = createMemo(
    () => props.kind === "oppHand" && !!(props.data.tags & CARD_TAG_ABYSS),
  );
  const conductiveDebuff = createMemo(
    () =>
      ["oppHand", "myHand"].includes(props.kind) &&
      !!(props.data.tags & CARD_TAG_CONDUCTIVE),
  );

  const attachments = createMemo<number[]>(() => {
    const result = props.data.attachment.map((data) => data.definitionId);
    // attachment 引入之前的 effectless 效果需要手动添加
    if (result.length === 0 && props.playStep?.isEffectless) {
      result.push(EFFECTLESS_DEFINITION_ID);
    }
    return result;
  });

  // onMount(() => {
  //   console.log(el);
  // });

  // createEffect(() => {
  //   if (props.data.id === -500039) {
  //     console.log(el);
  //   }
  // });

  createEffect(() => {
    const uiState = props.uiState;
    if (uiState.type === "cardAnimation") {
      const { delayMs, durationMs, onAnimationFinish } = uiState;
      const transformKf = transformKeyframes(uiState);
      const opacityKf = opacityKeyframes(uiState);
      const opt: KeyframeAnimationOptions = {
        delay: delayMs,
        duration: durationMs,
        fill: "both",
        // easing: "cubic-bezier(0.4, 0, 0.2, 1)",
      };
      const applyAndWait = (el: Element, kf: Keyframe[]) => {
        const animation = el.animate(kf, opt);
        return animation.finished.then(() => {
          try {
            animation.commitStyles();
          } catch {}
          animation.cancel();
        });
      };
      Promise.all([
        applyAndWait(el, transformKf),
        ...[...el.children].map((e) => applyAndWait(e, opacityKf)),
      ]).then(() => {
        onAnimationFinish?.();
      });
    }
  });

  return (
    <div
      ref={el}
      class={`absolute top-0 left-0 h-36 w-21 grid rounded-md [&_*]:backface-hidden
        preserve-3d transform-origin-tl pointer-events-auto children:grid-area-[1/1] card`}
      style={style()}
      bool:data-opp-hand={props.kind === "oppHand"}
      bool:data-hidden={props.hidden}
      bool:data-transition-transform={props.enableTransition}
      bool:data-shadow={props.enableShadow}
      bool:data-triggered={
        props.uiState.type === "cardStatic" && props.uiState.triggered
      }
      bool:data-playable={
        props.kind !== "switching" && props.playStep?.playable
      }
      bool:data-dragging-end={
        props.uiState.type === "cardStatic" &&
        props.uiState.draggingEndAnimation
      }
      onClick={(e) => {
        e.stopPropagation();
        props.onClick?.(e, e.currentTarget);
      }}
      onPointerEnter={(e) => {
        e.stopPropagation();
        props.onPointerEnter?.(e, e.currentTarget);
      }}
      onPointerLeave={(e) => {
        e.stopPropagation();
        props.onPointerLeave?.(e, e.currentTarget);
      }}
      onPointerUp={(e) => {
        e.stopPropagation();
        props.onPointerUp?.(e, e.currentTarget);
      }}
      onPointerMove={(e) => {
        e.stopPropagation();
        props.onPointerMove?.(e, e.currentTarget);
      }}
      onPointerDown={(e) => {
        e.stopPropagation();
        props.onPointerDown?.(e, e.currentTarget);
      }}
    >
      <Image
        class="w-21 h-36 p-1% text-3"
        imageId={data().definitionId}
        fallback="card"
      />
      <CardFrameNormal class="w-21 h-36 pointer-events-none" />
      <div class="pointer-events-none rounded-md z-1 card-animation" />
      <Switch>
        <Match when={props.toBeSwitched}>
          {/* with animate no render */}
          <ExchangeCard noRender class="w-18 h-18 place-self-center z-1" />
        </Match>
        <Match when={props.selected}>
          {/* with animate no render */}
          <SelectingIcon noRender class="w-21 h-21 place-self-center z-1" />
        </Match>
      </Switch>
      <AttachmentGroup
        class="mt-1 z-1 self-start justify-self-center"
        attachments={attachments()}
      />
      <DiceCost
        class="absolute left-2 top--0.5 translate-x--50% flex flex-col gap-1 z-2"
        cost={data().definitionCost}
        diceClass="w-9 h-9 text-4.5 m--1 max-w-9 max-h-9"
        realCost={realCost()}
      />
      <CardbackNormal class="rotate-y-180 translate-z--0.1px pointer-events-none" />
      <Show when={abyssDebuff()}>
        <div class="rotate-y-180 translate-z--0.2px rounded-1.2 abyss-debuff" />
      </Show>
      <Show when={conductiveDebuff()}>
        {/* with animate no render */}
        <ConductiveEffect
          noRender
          class={`m--3 w-27 h-42 max-w-27 max-h-42
            ${props.kind === "oppHand" ? "rotate-y-180 translate-z--0.2px" : ""}`}
        />
      </Show>
    </div>
  );
}
