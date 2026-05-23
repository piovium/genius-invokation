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
import { StrokedTextContent } from "./StrokedText";
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
  hidden?: boolean;
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
  const hintComponent = createMemo(() => {
    if (data.state === "ready") {
      return ICON_MAP[(data() as EntityRawData).shownIcon as string];
    }
  });
  return (
    <Show when={hintComponent()}>
      <div class="absolute w-7 h-7 top--2.5 right--3 grid children:grid-area-[1/1] z-3">
        <Dynamic<Component<ComponentProps<"div">>>
          component={hintComponent()}
          class="w-full h-full"
        />
        <StrokedTextContent
          class="place-self-center text-white font-bold"
          strokeWidth={2}
          strokeColor="#000000aa"
          text={String(props.value)}
        />
      </div>
    </Show>
  );
};

const EntityBottomHint = (props: { imageId: number; value: string }) => {
  return (
    <div class="absolute h-8 w-8 left-0 bottom-0 grid children:grid-area-[1/1] place-items-center z-3">
      <Image
        imageId={props.imageId}
        zero="physic"
        type="icon"
        class="h-7.5 w-7.5"
        fallback="state"
      />
      <StrokedTextContent
        class="text-white font-bold text-4.5"
        strokeWidth={2}
        strokeColor="#000000aa"
        text={props.value}
      />
    </div>
  );
};

export function Entity(props: EntityProps) {
  const data = createMemo(() => props.data);
  const showVariableDiff = createMemo(
    () =>
      props.preview &&
      (props.preview.newVariableValue !== null || props.preview.disposed) &&
      !props.previewingNew,
  );
  return (
    <div
      class={`absolute left-0 top-0 w-16 aspect-ratio-[28/33] data-[hidden]:invisible
        grid preserve-3d rounded isolate children:grid-area-[1/1] clickable-outline entity`}
      style={cssPropertyOfTransform(props.uiState.transform)}
      bool:data-hidden={props.hidden}
      bool:data-entering={props.animation === "entering"}
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
        class="w-full aspect-ratio-[28/33] p-1% rounded-md text-2.5 z-0"
        imageId={data().definitionId}
        fallback="card"
      />
      <CardFrameSummon class="w-full h-full pointer-events-none z-1" />
      <div
        class="w-full h-full rounded entity-effect z-2"
        bool:data-usable={data().hasUsagePerRound || props.previewingNew}
        bool:data-entering={props.animation === "entering"}
        bool:data-triggered={props.triggered}        
      />
      <Show when={showVariableDiff()}>
        <VariableDiff
          class="absolute z-1 top--2 left--1 z-5"
          oldValue={data().variableValue}
          newValue={props.preview?.newVariableValue ?? void 0}
          direction={props.preview?.newVariableDirection}
          defeated={props.preview?.disposed}
        />
      </Show>
      <Show
        when={typeof data().variableValue === "number" && !props.previewingNew}
      >
        <EntityTopHint
          cardDefinitionId={data().definitionId}
          value={data().variableValue as number}
        />
      </Show>
      <Show when={typeof data().hintIcon === "number" && !props.previewingNew}>
        <EntityBottomHint
          imageId={data().hintIcon as number}
          value={
            data().hintText?.replace(
              /\$\{([^}]+)\}/g,
              (_, g1) => data().descriptionDictionary[g1] ?? "",
            ) ?? ""
          }
        />
      </Show>
      <Switch>
        <Match when={props.clickStep?.ui === ActionStepEntityUi.Selected}>
          <SelectingConfirmIcon class="place-self-center w-18 h-18 m--1 max-w-18 z-4" />
        </Match>
        <Match when={props.selecting}>
          {/* with animate no render */}
          <SelectingIcon noRender class="place-self-center w-21 h-21 m--2.5 max-w-21 z-4" />
        </Match>
      </Switch>
    </div>
  );
}
