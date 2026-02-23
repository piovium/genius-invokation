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

import { Key } from "@solid-primitives/keyed";
import type { StatusViewInfo } from "./Chessboard";
import { Image } from "./Image";
import { createMemo, Show } from "solid-js";

interface StatusProps extends StatusViewInfo {}

function Status(props: StatusProps) {
  const data = createMemo(() => props.data);
  const defId = createMemo(() => props.data.definitionId);
  const hasUsagePerRound = createMemo(() => {
    const d = data();
    return "hasUsagePerRound" in d && d.hasUsagePerRound;
  });
  return (
    <div class="pointer-events-auto h-5 w-5 [.attachments_&]:h-6 [.attachments_&]:w-6 rounded-full relative">
      <Image
        imageId={defId()}
        class="h-full w-full status"
        fallback="state"
        bool:data-disposing={props.animation === "disposing"}
      />
      <Show when={typeof data().variableValue === "number"}>
        <div class="[.attachments_&]:hidden w-3 h-3 text-3 text-white line-height-none absolute bottom--1 right--1 rounded-full bg-black/50 flex items-center justify-center">
          {data().variableValue}
        </div>
      </Show>
      <div
        class="absolute h-full w-full rounded-full top-0 left-0 status-usage"
        bool:data-usable={hasUsagePerRound()}
      />
      <div
        class="absolute h-full w-full rounded-full top-0 left-0 status-animation"
        bool:data-entering={props.animation === "entering"}
        bool:data-disposing={props.animation === "disposing"}
        bool:data-triggered={props.triggered}
      />
    </div>
  );
}

export interface StatusGroupProps {
  class?: string;
  statuses: StatusViewInfo[];
  maxCount?: number;
}

export function StatusGroup(props: StatusGroupProps) {
  const showEllipsis = () => props.statuses.length > (props.maxCount ?? 4);
  const statuses = createMemo(() =>
    showEllipsis()
      ? props.statuses.slice(0, (props.maxCount ?? 4) - 1)
      : props.statuses,
  );
  return (
    <div class={`flex flex-row ${props.class ?? ""}`}>
      <Key each={statuses()} by="id">
        {(status) => <Status {...status()} />}
      </Key>
      <Show when={showEllipsis()}>
        <img
          class="pointer-events-auto h-5 w-5 [.attachments_&]:h-6 [.attachments_&]:w-6"
          // TODO: replace this with an API endpoint
          src="https://assets.gi-tcg.guyutongxue.site/assets/UI_Gcg_Buff_Common_More.webp"
        />
      </Show>
    </div>
  );
}
