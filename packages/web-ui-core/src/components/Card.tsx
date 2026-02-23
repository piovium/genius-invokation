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

import { createEffect, createMemo, Match, Show, Switch } from "solid-js";
import { Image } from "./Image";
import { DiceCost } from "./DiceCost";
import {
  cssPropertyOfTransform,
  type CardAnimatingUiState,
  type Transform,
} from "../ui_state";
import { type CardInfo, type StatusViewInfo } from "./Chessboard";
import {
  type PbDiceRequirement,
  CARD_TAG_ABYSS,
  CARD_TAG_CONDUCTIVE,
} from "@gi-tcg/typings";
import { WithDelicateUi } from "../primitives/delicate_ui";
import SelectingIcon from "../svg/SelectingIcon.svg?fb";
import CardFrameNormal from "../svg/CardFrameNormal.svg?fb";
import CardbackNormal from "../svg/CardbackNormal.svg?fb";
import { StatusGroup } from "./StatusGroup";
import { ElectricShocks } from "./ElectricShocks";

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

export interface CardFaceProps {
  definitionId: number;
}

export function CardFace(props: CardFaceProps) {
  return (
    <div class="absolute h-full w-full backface-hidden">
      <div class="absolute inset-0.5 bg-#bdaa8a rounded-2" />
      <Image
        class="absolute inset-0 h-full w-full p-1px"
        imageId={props.definitionId}
        fallback="card"
      />
      <CardFrameNormal class="absolute inset-0 h-full w-full pointer-events-none" />
    </div>
  );
}

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

  const EFFECTLESS_PLACEHOLDER: StatusViewInfo = {
    id: 0,
    data: {
      id: 0,
      definitionId: 208,
      tags: 0,
      descriptionDictionary: {},
    },
    animation: "none",
    triggered: false,
  };

  const attachmentInfo = createMemo<StatusViewInfo[]>(() => {
    const result = props.data.attachment.map<StatusViewInfo>((data) => ({
      id: data.id,
      data,
      animation: "none",
      triggered: false,
    }));
    // attachment 引入之前的 effectless 效果需要手动添加
    if (result.length === 0 && props.playStep?.isEffectless) {
      result.push(EFFECTLESS_PLACEHOLDER);
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
      class="absolute top-0 left-0 h-36 w-21 rounded-1.5 preserve-3d transform-origin-tl card pointer-events-auto data-[dragging-end]:pointer-events-none"
      style={style()}
      bool:data-opp-hand={props.kind === "oppHand"}
      bool:data-hidden={props.hidden}
      bool:data-transition-transform={props.enableTransition}
      bool:data-shadow={props.enableShadow}
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
      <div
        class="absolute inset-0 pointer-events-none h-full w-full rounded-1.2 entity-animation-1"
        bool:data-triggered={
          props.uiState.type === "cardStatic" && props.uiState.triggered
        }
      />

      <CardFace definitionId={data().definitionId} />
      <Switch>
        <Match when={props.toBeSwitched}>
          <WithDelicateUi
            assetId="UI_TeyvatCard_Select_ExchangeCard"
            fallback={
              <div class="absolute h-full w-full backface-hidden flex items-center justify-center text-8xl text-red-500 line-height-none">
                &#8856;
              </div>
            }
          >
            {(image) => (
              <div class="absolute h-full w-full backface-hidden flex items-center justify-center children-w-18">
                {image}
              </div>
            )}
          </WithDelicateUi>
        </Match>
        <Match when={props.selected}>
          <div class="absolute h-full w-full backface-hidden flex items-center justify-center">
            <SelectingIcon class="w-21 h-21" />
          </div>
        </Match>
      </Switch>
      <StatusGroup
        class="absolute top-0.5 attachments w-full justify-center"
        statuses={attachmentInfo()}
        maxCount={2}
      />
      <DiceCost
        class="absolute left-1.8 top--1 translate-x--50% backface-hidden flex flex-col gap-1 [&:where([data-opp-hand]>*)]:rotate-180"
        cost={data().definitionCost}
        size={36}
        realCost={realCost()}
      />
      <CardbackNormal class="absolute h-full w-full backface-hidden rotate-y-180 translate-z--0.1px pointer-events-none" />
      <Show when={abyssDebuff()}>
        <div class="absolute h-full w-full backface-hidden rotate-y-180 translate-z--0.2px rounded-1.2 abyss-debuff" />
      </Show>
      <Show when={conductiveDebuff()}>
        <ElectricShocks
          class={`${
            props.kind === "oppHand"
              ? "translate-z--0.2px inset--18%"
              : "inset--20%"
          }`}
        />
      </Show>
    </div>
  );
}
