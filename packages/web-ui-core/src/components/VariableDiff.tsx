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

import { PbModifyDirection } from "@gi-tcg/typings";
import { createMemo, Match, Switch } from "solid-js";
import { StrokedText } from "./StrokedText";
import DefeatedPreviewIcon from "../svg/DefeatedPreviewIcon.svg?fb";
import RevivePreviewIcon from "../svg/RevivePreviewIcon.svg?fb";

export interface VariableDiffProps {
  class?: string;
  defeated?: boolean;
  revived?: boolean;
  oldValue: number;
  newValue: number;
  direction?: PbModifyDirection;
}

export function VariableDiff(props: VariableDiffProps) {
  const increase = createMemo(
    () =>
      props.newValue > props.oldValue ||
      (props.newValue === props.oldValue &&
        props.direction !== PbModifyDirection.DECREASE),
  );
  const backgroundColor = createMemo(() =>
    increase() ? "#6e9b3a" : props.defeated ? "#a25053" : "#d14f51",
  );
  return (
    <div
      class={`h-6 grid place-items-stretch ${props.class ?? ""}`}
      style={{
        "--bg-color": backgroundColor(),
      }}
    >
      <div class="grid-area-[1/1] bg-[var(--bg-color)] rounded-full b-black b-2 z-0" />
      <div class="grid-area-[1/1] bg-[var(--bg-color)] rounded-0.5 mx-1 b-black b-2 mix-blend-lighten z-0" />
      <div class="grid-area-[1/1] flex items-center px-2 w-max h-6 z-1">
        <Switch>
          <Match when={props.defeated}>
            <DefeatedPreviewIcon class="h-7.5 w-7.5 m--1" />
          </Match>
          <Match when={props.revived}>
            <RevivePreviewIcon class="h-7.5 w-7.5 m--1" />
          </Match>
        </Switch>
        <StrokedText
          class="shrink-0 font-bold font-size-4 line-height-none mx-0.5 text-white"
          text={`${increase() ? "+" : "-"}${Math.abs(
            props.newValue - props.oldValue,
          )}`}
          strokeWidth={2}
          strokeColor="black"
        />
      </div>
    </div>
  );
}
