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

import type { StatusViewInfo } from "./Chessboard";
import { Image } from "./Image";
import { useUiContext } from "../hooks/context";
import { createMemo, createResource, Show, For } from "solid-js";

interface StatusProps extends StatusViewInfo {}

function Status(props: StatusProps) {
  const data = createMemo(() => props.data);
  const defId = createMemo(() => props.data.definitionId);
  const hasUsagePerRound = createMemo(() => {
    const d = data();
    return "hasUsagePerRound" in d && d.hasUsagePerRound;
  });
  return (
    <div class="h-5 w-5 relative grid children:grid-area-[1/1] select-none">
      <Image
        imageId={defId()}
        class="h-5.5 w-5.5 m--0.25 max-h-5.5 max-w-5.5 place-self-center status-icon"
        fallback="state"
        bool:data-disposing={props.animation === "disposing"}
      />
      <div
        class="rounded-full status-effect"
        bool:data-usable={hasUsagePerRound()}
        bool:data-entering={props.animation === "entering"}
        bool:data-disposing={props.animation === "disposing"}
        bool:data-triggered={props.triggered}
      />
      <Show when={typeof data().variableValue === "number"}>
        <div class="place-self-end m--0.5 w-2.5 h-2.5 rounded-full bg-black/60 text-2.5 text-white text-center line-height-none">
          {data().variableValue}
        </div>
      </Show>
    </div>
  );
}

export interface StatusGroupProps {
  class?: string;
  statuses: StatusViewInfo[];
}

export function StatusGroup(props: StatusGroupProps) {
  const showEllipsis = () => props.statuses.length > 4;
  const statuses = createMemo(() =>
    showEllipsis() ? props.statuses.slice(0, 3) : props.statuses,
  );
  const ellipsisStatuses = createMemo((): StatusViewInfo[] =>
    showEllipsis() ? props.statuses.slice(3) : [],
  );
  return (
    <div class={`flex flex-row ${props.class ?? ""}`}>
      <For each={statuses()}>{(status) => <Status {...status} />}</For>
      <Show when={showEllipsis()}>
        <div class="h-5 w-5 relative grid children:grid-area-[1/1]">
          <MoreStatus class="h-5.5 w-5.5 m--0.25 max-h-5.5 max-w-5.5 place-self-center" />
          <div class="place-self-end m--0.5 w-2.5 h-2.5 rounded-full bg-black/60 text-2.5 text-white text-center line-height-none">
            {ellipsisStatuses().length}
          </div>
          <div
            class="rounded-full status-effect"
            bool:data-entering={ellipsisStatuses().some(
              (es) => es.animation === "entering",
            )}
            bool:data-disposing={ellipsisStatuses().some(
              (es) => es.animation === "disposing",
            )}
            bool:data-triggered={ellipsisStatuses().some((es) => es.triggered)}
          />
        </div>
      </Show>
    </div>
  );
}

export interface AttachmentGroupProps {
  class?: string;
  attachments: number[];
}

export function AttachmentGroup(props: AttachmentGroupProps) {
  const showEllipsis = () => props.attachments.length > 2;
  const attachments = createMemo(() =>
    showEllipsis() ? props.attachments.slice(0, 1) : props.attachments,
  );
  return (
    <div class={`flex flex-row ${props.class ?? ""}`}>
      <For each={attachments()}>
        {(defId) => (
          <Image imageId={defId} class="h-6 w-6 mx--0.25" fallback="state" />
        )}
      </For>
      <Show when={showEllipsis()}>
        <MoreStatus class="h-6 w-6 mx--0.25" />
      </Show>
    </div>
  );
}

export function MoreStatus(props: { class?: string }) {
  const { assetsManager } = useUiContext();
  const url = createMemo(() =>
    assetsManager().getRawImageUrlSync("UI_Gcg_Buff_Common_More"),
  );
  return <img class={`object-cover ${props.class ?? ""}`} src={url()} />;
}
