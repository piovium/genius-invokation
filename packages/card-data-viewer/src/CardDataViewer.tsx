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
  Match,
  Show,
  Switch,
} from "solid-js";
import { ActionCard, Character, Entity, Keyword, Skill } from "./Entity";
import { useAssetsManager } from "./context";
import { CardFace } from "./CardFace";

type MainStateType = "character" | "card" | "entity" | "skill" | "keyword";
type SubStateType =
  | "equipment"
  | "status"
  | "equipAndStatus"
  | "combatStatus"
  | "attachment";

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
  const [combineCharEntities, setCombineCharEntities] =
    createSignal<boolean>(false);

  const grouped = createMemo(() => {
    const combineEquipAndStatus = combineCharEntities();
    return Object.groupBy(props.inputs, (i) => {
      if (
        combineEquipAndStatus &&
        (i.type === "equipment" || i.type === "status")
      ) {
        return "equipAndStatus";
      } else {
        return i.type;
      }
    });
  });
  const subEntities = () => {
    const render: (ViewerInput | SubStateType)[] = [];
    const g = grouped();
    for (const t of [
      "equipment",
      "status",
      "equipAndStatus",
      "combatStatus",
      "attachment",
    ] as SubStateType[]) {
      if (g[t]?.length) {
        render.push(t);
        render.push(...g[t]);
      }
    }
    return render;
  };

  const showCombineButton = (type: SubStateType) =>
    !!(
      (grouped().equipment?.length && grouped().status?.length) ||
      grouped().equipAndStatus?.length
    ) && ["equipment", "status", "equipAndStatus"].includes(type);

  const [explainKeyword, setExplainKeyword] = createSignal<number | null>(null);
  const onRequestExplain = (definitionId: number | null) => {
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
              <Character input={input} onRequestExplain={onRequestExplain} />
            </div>
          )}
        </For>
        <For each={[...(grouped().card ?? []), ...(grouped().entity ?? [])]}>
          {(input) => (
            <div class="card-panel">
              <ActionCard input={input} onRequestExplain={onRequestExplain} />
            </div>
          )}
        </For>
        <For each={grouped().skill}>
          {(input) => (
            <div class="card-panel">
              <Skill input={input} onRequestExplain={onRequestExplain} />
            </div>
          )}
        </For>
        <Show when={subEntities()?.length}>
          <div class="card-panel">
            <div class="flex flex-col gap-[0.5em]">
              <For each={subEntities()}>
                {(entity) => (
                  <Switch>
                    <Match when={typeof entity === "string" && entity}>
                      {(entityType) => (
                        <h3
                          class="w-full text-center rounded-full entity-category"
                          bool:data-show-combine-button={showCombineButton(
                            entityType(),
                          )}
                          onClick={() => {
                            if (showCombineButton(entityType())) {
                              setCombineCharEntities((v) => !v);
                            }
                          }}
                        >
                          {t(entityType())}
                        </h3>
                      )}
                    </Match>
                    <Match when={true}>
                      <Entity
                        input={entity as ViewerInput}
                        asChild
                        onRequestExplain={onRequestExplain}
                      />
                    </Match>
                  </Switch>
                )}
              </For>
            </div>
          </div>
        </Show>
        <Show when={explainKeyword()}>
          {(defId) => (
            <div class="card-panel">
              <h3 class="w-full text-center rounded-full mb-[0.5em] entity-category">
                {t("rulesExplanation")}
              </h3>
              <Keyword {...props} definitionId={defId()} />
            </div>
          )}
        </Show>
      </ErrorBoundary>
    </div>
  );
}
