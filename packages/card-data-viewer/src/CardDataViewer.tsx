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

import type { AnyState } from "@gi-tcg/core";
import type {
  PbAttachmentState,
  PbCharacterState,
  PbEntityState,
} from "@gi-tcg/typings";
import {
  createEffect,
  createMemo,
  createSignal,
  ErrorBoundary,
  For,
  Show,
} from "solid-js";
import { ActionCard, Character, Entity, Keyword, Skill } from "./Entity";
import { useAssetsManager } from "./context";
import { CardFace } from "./CardFace";

type MainStateType = "character" | "card" | "entity" | "skill" | "keyword";
type SubStateType = "attachment" | "status" | "combatStatus" | "equipment";

export type StateType = MainStateType | SubStateType;

export type ViewerInput =
  | {
      from: "definitionId";
      definitionId: number;
      type: StateType;
    }
  | {
      from: "state";
      id: number;
      type: StateType;
      definitionId: number;
      state: PbCharacterState | PbEntityState | PbAttachmentState;
    };

export interface CardDataViewerProps {
  inputs: ViewerInput[];
  mainImageDefId: number | null;
}

export interface CardDataViewerContainerProps extends CardDataViewerProps {
  shown: boolean;
}

export function CardDataViewerContainer(props: CardDataViewerContainerProps) {
  return (
    <Show when={props.shown}>
      <CardDataViewer {...props} />
    </Show>
  );
}

function CardDataViewer(props: CardDataViewerProps) {
  const { t } = useAssetsManager();
  const grouped = createMemo(() => Object.groupBy(props.inputs, (i) => i.type));
  const hasStatuses = () => {
    const g = grouped();
    return g.equipment || g.status || g.combatStatus || g.attachment;
  };

  const [explainKeyword, setExplainKeyword] = createSignal<number | null>(null);
  const onRequestExplain = (definitionId: number) => {
    setExplainKeyword((prev) => (prev === definitionId ? null : definitionId));
  };

  return (
    <div class="gi-tcg-card-data-viewer reset">
      <ErrorBoundary
        fallback={(err) => (
          <div class="card-panel">
            <p>{t("loadFailed")}</p>
            <pre class="whitespace-pre-wrap">
              {"message" in err ? (console.error(err), err.message) : `${err}`}
            </pre>
          </div>
        )}
      >
        <Show when={props.mainImageDefId}>
          {(id) => <CardFace defId={id()} />}
        </Show>
        <For each={grouped().character}>
          {(input) => (
            <div class="card-panel">
              <Character
                {...props}
                input={input}
                onRequestExplain={onRequestExplain}
              />
            </div>
          )}
        </For>
        <For each={[...(grouped().card ?? []), ...(grouped().entity ?? [])]}>
          {(input) => (
            <div class="card-panel">
              <ActionCard
                class="min-h-0"
                {...props}
                input={input}
                onRequestExplain={onRequestExplain}
              />
            </div>
          )}
        </For>
        <For each={grouped().skill}>
          {(input) => (
            <div class="card-panel">
              <Skill
                class="min-h-0"
                {...props}
                input={input}
                onRequestExplain={onRequestExplain}
              />
            </div>
          )}
        </For>
        <Show when={hasStatuses()}>
          <div class="card-panel">
            <Show when={grouped().equipment?.length}>
              <h3 class="text-yellow-7 mb-2">{t("equipment")}</h3>
            </Show>
            <For each={grouped().equipment}>
              {(input) => (
                <Entity
                  class="b-yellow-3 b-1 rounded-md mb-2"
                  {...props}
                  input={input}
                  asChild
                  onRequestExplain={onRequestExplain}
                />
              )}
            </For>
            <Show when={grouped().status?.length}>
              <h3 class="text-yellow-7 mb-2">{t("status")}</h3>
            </Show>
            <For each={grouped().status}>
              {(input) => (
                <Entity
                  class="b-yellow-3 b-1 rounded-md mb-2"
                  {...props}
                  input={input}
                  asChild
                  onRequestExplain={onRequestExplain}
                />
              )}
            </For>
            <Show when={grouped().combatStatus?.length}>
              <h3 class="text-yellow-7 mb-2">{t("combatStatus")}</h3>
            </Show>
            <For each={grouped().combatStatus}>
              {(input) => (
                <Entity
                  class="b-yellow-3 b-1 rounded-md mb-2"
                  {...props}
                  input={input}
                  asChild
                  onRequestExplain={onRequestExplain}
                />
              )}
            </For>
            <Show when={grouped().attachment?.length}>
              <h3 class="text-yellow-7 mb-2">{t("attachmentStatus")}</h3>
            </Show>
            <For each={grouped().attachment}>
              {(input) => (
                <Entity
                  class="b-yellow-3 b-1 rounded-md mb-2"
                  {...props}
                  input={input}
                  asChild
                  onRequestExplain={onRequestExplain}
                />
              )}
            </For>
          </div>
        </Show>
        <Show when={explainKeyword()}>
          {(defId) => (
            <div class="card-panel">
              <Keyword {...props} definitionId={defId()} />
              <div
                class="absolute right-1 top-1 text-xs"
                onClick={() => setExplainKeyword(null)}
              >
                &#10060;
              </div>
            </div>
          )}
        </Show>
      </ErrorBoundary>
    </div>
  );
}
