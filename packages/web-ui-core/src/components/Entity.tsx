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
  createEffect,
  createMemo,
  createResource,
  Match,
  Show,
  Switch,
  type Component,
  type ComponentProps,
} from "solid-js";
import { cssPropertyOfTransform } from "../ui_state";
import type { EntityInfo } from "./Chessboard";
import { Image } from "./Image";
import { VariableDiff } from "./VariableDiff";
import { ActionStepEntityUi } from "../action";
import { StrokedText } from "./StrokedText";
import SelectingIcon from "../svg/SelectingIcon.svg?fb";
import SelectingConfirmIcon from "../svg/SelectingConfirmIcon.svg?fb";
import CardFrameSummon from "../svg/CardFrameSummon.svg?fb";
import ClockIcon from "../svg/ClockIcon.svg?fb";
import HourglassIcon from "../svg/HourglassIcon.svg?fb";
import BarrierIcon from "../svg/BarrierIcon.svg?fb";
import { useUiContext } from "../hooks/context";
import type { EntityRawData } from "@gi-tcg/assets-manager";
import { Dynamic } from "solid-js/web";

export interface EntityProps extends EntityInfo {
  selecting: boolean;
  onClick?: (e: MouseEvent, currentTarget: HTMLElement) => void;
}

const EntityTopHint = (props: { cardDefinitionId: number; value: number }) => {
  const { assetsManager } = useUiContext();
  const [data] = createResource(
    () => [props.cardDefinitionId, assetsManager()] as const,
    ([id, manager]) => manager.getData(id),
  );
  const ICON_MAP: Record<string, Component> = {
    GCG_TOKEN_ICON_CLOCK: ClockIcon,
    GCG_TOKEN_ICON_HOURGLASS: HourglassIcon,
    GCG_TOKEN_ICON_BARRIER_SHIELD: BarrierIcon,
  };
  return (
    <Switch>
      <Match when={data.loading || data.error}>
        <div class="w-6 h-6 absolute top--2 right--2.5 rounded-full bg-white b-1 b-black flex items-center justify-center line-height-none">
          {props.value}
        </div>
      </Match>
      <Match when={data()}>
        {(data) => (
          <div class="w-7 h-7 absolute top--2.2 right--3">
            <Dynamic<Component<ComponentProps<"div">>>
              component={
                ICON_MAP[(data() as EntityRawData).shownIcon as string]
              }
              class="w-7 h-7 absolute"
            />
            <StrokedText
              class="absolute inset-0 line-height-7 text-center text-white font-bold"
              strokeWidth={2}
              strokeColor="#000000aa"
              text={String(props.value)}
            />
          </div>
        )}
      </Match>
    </Switch>
  );
};

export function Entity(props: EntityProps) {
  const data = createMemo(() => props.data);
  return (
    <div
      class="absolute left-0 top-0 h-17.7 w-15 transition-all rounded-1.2 clickable-outline entity"
      style={cssPropertyOfTransform(props.uiState.transform)}
      bool:data-disposing={props.animation === "disposing"}
      bool:data-clickable={
        props.clickStep && props.clickStep.ui >= ActionStepEntityUi.Outlined
      }
      onClick={(e) => {
        e.stopPropagation();
        props.onClick?.(e, e.currentTarget);
      }}
    >
      <Image
        class="absolute inset-0 h-full w-full p-2px rounded-lg"
        imageId={data().definitionId}
        fallback="summon"
      />
      <CardFrameSummon class="absolute inset-0 h-full w-full pointer-events-none" />
      <Show when={data().hasUsagePerRound || props.previewingNew}>
        <div class="absolute inset-1px rounded-1 overflow-hidden entity-usage-1">
          <div class="absolute h-full w-full scale-200 entity-usage-2" />
        </div>
      </Show>
      <div
        class="absolute h-full w-full rounded-1.2 entity-animation-1"
        bool:data-entering={props.animation === "entering"}
        bool:data-triggered={props.triggered}
      />
      <div
        class="absolute h-full w-full rounded-1.2 entity-animation-2"
        bool:data-entering={props.animation === "entering"}
      />
      <Show when={props.preview && props.preview.newVariableValue !== null && !props.previewingNew}>
        <VariableDiff
          class="absolute z-5 top--1.6 right-1"
          oldValue={data().variableValue!}
          newValue={props.preview!.newVariableValue!}
          direction={props.preview!.newVariableDirection}
          defeated={props.preview!.disposed}
        />
      </Show>
      <Show when={typeof data().variableValue === "number" && !props.previewingNew}>
        <EntityTopHint
          cardDefinitionId={data().definitionId}
          value={data().variableValue as number}
        />
      </Show>
      <Show when={typeof data().hintIcon === "number" && !props.previewingNew}>
        <div class="absolute h-7 w-7 min-w-0 left-0 bottom-0.5">
          <Image
            imageId={data().hintIcon!}
            zero="physic"
            type="icon"
            class="h-7 w-7 absolute"
            fallback="aura"
          />
          <StrokedText
            class="absolute inset-0 line-height-7 text-center text-white font-bold text-4.5 whitespace-nowrap"
            strokeWidth={2}
            strokeColor="#000000cc"
            text={
              data().hintText?.replace(
                /\$\{([^}]+)\}/g,
                (_, g1) => data().descriptionDictionary[g1] ?? "",
              ) ?? ""
            }
          />
        </div>
      </Show>
      <Switch>
        <Match when={props.clickStep?.ui === ActionStepEntityUi.Selected}>
          <div class="absolute h-full w-full backface-hidden flex items-center justify-center overflow-visible scale-120%">
            <SelectingConfirmIcon class="cursor-pointer h-15 w-15" />
          </div>
        </Match>
        <Match when={props.selecting}>
          <div class="absolute h-full w-full backface-hidden flex items-center justify-center overflow-visible scale-120%">
            <SelectingIcon class="w-15 h-15" />
          </div>
        </Match>
      </Switch>
    </div>
  );
}
