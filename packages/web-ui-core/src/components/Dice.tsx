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

import { DiceType } from "@gi-tcg/typings";

import { Image } from "./Image";
import { Match, Show, Switch, createMemo, mergeProps } from "solid-js";
import { WithDelicateUi } from "../primitives/delicate_ui";
import { StrokedText } from "./StrokedText";
import SimpleEnergyDice from "../svg/SimpleEnergyDice.svg?fb";
import SimpleLegendDice from "../svg/SimpleLegendDice.svg?fb";

export interface DiceProps {
  type: number;
  selected?: boolean;
  size?: number;
  text?: string;
  color?: DiceColor;
}

export type DiceColor = "normal" | "increased" | "decreased";

export const DICE_COLOR: Record<number, string> = {
  [DiceType.Void]: "void",
  [DiceType.Cryo]: "cryo",
  [DiceType.Hydro]: "hydro",
  [DiceType.Pyro]: "pyro",
  [DiceType.Electro]: "electro",
  [DiceType.Anemo]: "anemo",
  [DiceType.Geo]: "geo",
  [DiceType.Dendro]: "dendro",
  [DiceType.Omni]: "omni",
  [DiceType.Energy]: "heal",
  10: "heal",
};

function EnergyIcon(props: { size: number }) {
  return (
    <WithDelicateUi
      assetId="UI_Gcg_DiceL_Energy"
      fallback={
        <SimpleEnergyDice
          style={{ height: `${props.size}px`, width: `${props.size}px` }}
        />
      }
    >
      {(image) => (
        <div
          class="children-h-full children-w-full children-scale-95%"
          style={{ height: `${props.size}px`, width: `${props.size}px` }}
        >
          {image}
        </div>
      )}
    </WithDelicateUi>
  );
}

function LegendIcon(props: { size: number }) {
  return (
    <WithDelicateUi
      assetId="UI_Gcg_DiceL_Legend"
      fallback={
        <SimpleLegendDice
          style={{ height: `${props.size}px`, width: `${props.size}px` }}
        />
      }
    >
      {(image) => (
        <div
          class="children-h-full children-w-full"
          style={{ height: `${props.size}px`, width: `${props.size}px` }}
        >
          {image}
        </div>
      )}
    </WithDelicateUi>
  );
}

export function DiceIcon(props: {
  class?: string;
  size?: number;
  type: DiceType;
  selected: boolean;
}) {
  return (
    <svg // 骰子图标
      width="14"
      height="14"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 15 15"
      class={`dice-icon fill-current w-10 h-10 ${props.class ?? ""}`}
      style={{
        height: props.size ? `${props.size}px` : void 0,
        width: props.size ? `${props.size}px` : void 0,
        color: `var(--c-${DICE_COLOR[props.type]})`,
      }}
    >
      <defs>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="0.3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
          <feFlood flood-color="#F7A15B" flood-opacity="1" result="color" />
          <feComposite in="color" in2="blur" operator="in" result="glowColor" />
          <feMerge>
            <feMergeNode in="glowColor" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <path
        d="M7.5 2.065L2.97 4.784v5.432l4.53 2.719 4.53-2.719V4.784z"
        stroke-width=".214"
        stroke-linejoin="round"
        fill="#FFF"
        stroke="gray"
      />
      <path
        d="M7.5 2.065L2.97 4.784v5.432l4.53 2.719 4.53-2.719V4.784z"
        opacity=".2"
      />
      <path
        d="M7.5 1.071L2.143 4.286v6.428L7.5 13.93l5.357-3.215V4.286L7.5 1.07zm0 .994l4.53 2.719v5.432L7.5 12.935l-4.53-2.719V4.784L7.5 2.065z"
        fill="#D4C0A5"
        stroke="#F7A15B"
        stroke-width={props.selected ? 2 : 0}
        stroke-linejoin="round"
        filter={props.selected ? "url(#glow)" : undefined}
      />
      <path
        d="M7.5 7.5V2.065L2.97 4.784zM7.5 12.935V7.5l4.53 2.716z"
        opacity=".6"
      />
      <path d="M2.97 4.784L7.5 7.5l-4.53 2.716z" opacity=".9" />
      <path d="M7.5 12.935V7.5l-4.53 2.716zm0-10.87V7.5l4.53-2.716z" />
      <path d="M7.5 7.5l4.53-2.716v5.432z" opacity=".9" />
    </svg>
  );
}

export function Dice(props: DiceProps) {
  const merged = mergeProps(
    {
      selected: false,
      size: 25,
      color: "normal" as DiceColor,
    },
    props,
  );
  const normalDelicateDiceAssetId = createMemo(
    () => `UI_Gcg_DiceL_${DICE_COLOR[merged.type]}_Glow`,
  );
  const signedDelicateDiceAssetId = createMemo(
    () =>
      `UI_Gcg_DiceL_${DICE_COLOR[merged.type]}_Glow_0${
        merged.size > 25 ? "2" : "1"
      }`,
  );

  return (
    <div class="relative flex items-center justify-center m--1">
      <Switch>
        <Match when={merged.type === 9}>
          <EnergyIcon size={merged.size} />
        </Match>
        <Match when={merged.type === 10}>
          <LegendIcon size={merged.size} />
        </Match>
        <Match when={true}>
          <DiceIcon {...merged} />
        </Match>
      </Switch>
      <Switch>
        <Match when={merged.text}>
          <Show when={merged.type !== 9}>
            <WithDelicateUi
              assetId={normalDelicateDiceAssetId()}
              fallback={<></>}
            >
              {(image) => (
                <div class="absolute inset-0 children-h-full children-w-full">
                  {image}
                </div>
              )}
            </WithDelicateUi>
          </Show>
          <StrokedText
            class="absolute inset-0 text-center font-bold text-white data-[color=increased]:text-red-500 data-[color=decreased]:text-green-500"
            style={{
              "line-height": `${merged.size}px`,
              "font-size": `${0.5 * merged.size}px`,
            }}
            strokeWidth={2}
            strokeColor="#000000B0"
            text={merged.text ?? ""}
            data-color={merged.color}
          />
        </Match>
        <Match when={merged.type >= 1 && merged.type <= 8}>
          <WithDelicateUi
            assetId={signedDelicateDiceAssetId()}
            fallback={
              <Show when={merged.type !== 8}>
                <Image
                  class="absolute"
                  imageId={merged.type}
                  height={0.6 * merged.size}
                  width={0.6 * merged.size}
                />
              </Show>
            }
          >
            {(image) => (
              <div
                class="absolute inset-0 children-h-full children-w-full delicate-dice"
                bool:data-selected={merged.selected}
              >
                {image}
              </div>
            )}
          </WithDelicateUi>
        </Match>
      </Switch>
    </div>
  );
}
