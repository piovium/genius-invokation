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
  createSignal,
  For,
  Match,
  Show,
  Switch,
} from "solid-js";
import type { PbCharacterState, PbEntityState } from "@gi-tcg/typings";
import type { ViewerInput } from "./CardDataViewer";
import type {
  ActionCardRawData,
  CharacterRawData,
  EntityRawData,
  KeywordRawData,
  PlayCost,
  SkillRawData,
} from "@gi-tcg/assets-manager";
import { PlayCostList } from "./PlayCost";
import { Description } from "./Description";
import { Tags } from "./Tags";
import { typeTagText } from "./text_map";
import { useAssetsManager } from "./context";
import { IdBox } from "./IdBox";

export interface CardDataProps {
  class?: string;
  input: ViewerInput;
  onRequestExplain?: (id: number) => void;
}

export function Character(props: CardDataProps) {
  const state = createMemo(() => {
    if (props.input.from === "definitionId") {
      return null;
    } else {
      return props.input.state as PbCharacterState;
    }
  });
  const { assetsManager, t } = useAssetsManager();
  const [data] = createResource(
    () => [props.input.definitionId, assetsManager()] as const,
    ([defId, manager]) => manager.getData(defId) as Promise<CharacterRawData>,
  );
  const hpText = () =>
    state() ? `${state()!.health}/${state()!.maxHealth}` : `${data()!.hp}`;
  const mpText = () =>
    state()
      ? `${state()!.energy}/${state()!.maxEnergy}`
      : `${data()!.maxEnergy}`;
  return (
    <div class={props.class}>
      <Switch>
        <Match when={data.error}>{t("loadFailed")}</Match>
        <Match when={data.state === "pending"}>{t("loading")}</Match>
        <Match when={data()}>
          {(data) => (
            <>
              <h3 class="card-name">{data().name}</h3>
              <dl class="flex flex-row gap-[0.25em] mb-[0.25em] card-info">
                <dt>HP</dt>
                <dd class="font-bold">{hpText()}</dd>
                <dt>&nbsp;&nbsp;&nbsp;MP</dt>
                <dd class="font-bold">{mpText()}</dd>
              </dl>
              <Tags tags={data().tags} />
              <ul class="flex flex-col gap-[0.5em]">
                <For each={data().skills}>
                  {(skill) => (
                    <Show when={!skill.hidden}>
                      <Skill
                        {...props}
                        input={{
                          from: "definitionId",
                          type: "skill",
                          definitionId: skill.id,
                        }}
                        asChild
                      />
                    </Show>
                  )}
                </For>
              </ul>
            </>
          )}
        </Match>
      </Switch>
      <IdBox
        defId={props.input.definitionId}
        id={state() ? state()!.id : void 0}
      />
    </div>
  );
}

export function ActionCard(props: CardDataProps) {
  const state = createMemo(() => {
    if (props.input.from === "definitionId") {
      return null;
    } else {
      return props.input.state as PbEntityState;
    }
  });
  const { assetsManager, t } = useAssetsManager();
  const [data] = createResource(
    () => [props.input.definitionId, assetsManager()] as const,
    ([defId, manager]) =>
      manager.getData(defId) as Promise<ActionCardRawData | EntityRawData>,
  );
  const rawDescription = () => {
    if (state()) {
      if (
        props.input.type === "card" &&
        (data() as ActionCardRawData).rawDynamicDescription
      ) {
        return (data() as ActionCardRawData).rawDynamicDescription;
      } else if (
        props.input.type === "entity" &&
        data()!.rawPlayingDescription
      ) {
        return data()!.rawPlayingDescription;
      }
    }
    return data()!.rawDescription;
  };
  return (
    <div class={props.class}>
      <Switch>
        <Match when={data.error}>{t("loadFailed")}</Match>
        <Match when={data.state === "pending"}>{t("loading")}</Match>
        <Match when={data()}>
          {(data) => (
            <>
              <h3 class="card-name">{data().name}</h3>
              <div class="flex flex-row items-center mb-[0.25em]">
                <span class="skill-type mr-[0.5em]">
                  {typeTagText(data().type, t)}
                </span>
                <Show when={props.input.type === "card"}>
                  <PlayCostList
                    playCost={(data() as ActionCardRawData).playCost}
                  />
                </Show>
              </div>
              <Tags tags={data().tags} />
              <div>
                <Description
                  {...props}
                  keyMap={state() ? state()!.descriptionDictionary : {}}
                  definitionId={props.input.definitionId}
                  description={rawDescription()!}
                  onRequestExplain={props.onRequestExplain}
                />
              </div>
            </>
          )}
        </Match>
      </Switch>
      <IdBox
        defId={props.input.definitionId}
        id={state() ? state()!.id : void 0}
      />
    </div>
  );
}

interface ExpandableCardDataProps extends CardDataProps {
  class?: string;
  asChild?: boolean;
}

export function Skill(props: ExpandableCardDataProps) {
  const { assetsManager, t } = useAssetsManager();
  const [data] = createResource(
    () => [props.input.definitionId, assetsManager()] as const,
    ([defId, manager]) => manager.getData(defId) as Promise<SkillRawData>,
  );

  const [icon] = createResource(
    () => [props.input.definitionId, assetsManager()] as const,
    ([defId, manager]) => manager.getImageUrl(defId),
  );
  const [skillTypeText, setSkillTypeText] = createSignal("");
  const [playCost, setPlayCost] = createSignal<PlayCost[]>([]);

  createEffect(() => {
    if (data.state === "ready") {
      setPlayCost(data().playCost);
      setSkillTypeText(typeTagText(data().type, t) ?? "");
    }
  });
  return (
    <details
      class={`flex flex-col min-h-0 skill-wrap group ${props.class ?? ""}`}
      open={!props.asChild}
    >
      <summary class="flex flex-row items-center p-[0.25em] gap-[0.25em] cursor-pointer skill-header">
        <Show when={icon()} fallback={<div class="w-[3em] h-[3em]" />}>
          {(icon) => (
            <div
              class="skill-icon"
              style={{ "mask-image": `url(${icon()})` }}
            />
          )}
        </Show>
        <div class="flex flex-col">
          <h3 class="skill-name">
            {data()?.name ??
              assetsManager().getNameSync(props.input.definitionId) ??
              props.input.definitionId}
          </h3>
          <div class="flex flex-row items-center">
            <span class="skill-type mr-[0.5em]">{skillTypeText()}</span>
            <Show when={data()?.type !== "GCG_SKILL_TAG_PASSIVE"}>
              <PlayCostList playCost={playCost()} />
            </Show>
          </div>
        </div>
      </summary>
      <div class="p-[0.5em]">
        <Switch>
          <Match when={data.error}>{t("loadFailed")}</Match>
          <Match when={data.state === "pending"}>{t("loading")}</Match>
          <Match when={data()}>
            {(data) => (
              <Description
                {...props}
                definitionId={props.input.definitionId}
                description={data().rawDescription}
                keyMap={data().keyMap}
                onRequestExplain={props.onRequestExplain}
              />
            )}
          </Match>
        </Switch>
        <IdBox defId={props.input.definitionId} />
      </div>
    </details>
  );
}

export function Entity(props: ExpandableCardDataProps) {
  const state = createMemo(() => {
    if (props.input.from === "definitionId") {
      return null;
    } else {
      return props.input.state as PbEntityState;
    }
  });
  const { assetsManager, t } = useAssetsManager();
  const [data] = createResource(
    () => [props.input.definitionId, assetsManager()] as const,
    ([defId, manager]) => manager.getData(defId) as Promise<EntityRawData>,
  );
  const [icon] = createResource(
    () => [props.input.definitionId, assetsManager()] as const,
    ([defId, manager]) => manager.getImageUrl(defId, { type: "icon" }),
  );
  const [entityTypeText, setEntityTypeText] = createSignal("");

  createEffect(() => {
    if (data.state === "ready") {
      setEntityTypeText(typeTagText(data().type, t) ?? "");
    }
  });
  return (
    <details
      class={`flex flex-col min-h-0 skill-wrap group ${props.class ?? ""}`}
      open={!props.asChild}
    >
      <summary class="flex flex-row items-center p-[0.25em] gap-[0.25em] cursor-pointer skill-header">
        <div class="w-[3em] h-[3em] grid children:grid-area-[1/1]">
          <Show when={icon()}>
            {(icon) => <img src={icon()} class="w-[3em] h-[3em]" />}
          </Show>
          <Show
            when={
              state() !== null && typeof state()!.variableValue === "number"
            }
          >
            <div class="place-self-end rounded-full entity-variable">
              {state()!.variableValue}
            </div>
          </Show>
        </div>
        <div class="flex flex-col">
          <h3 class="skill-name">
            {data()?.name ??
              assetsManager().getNameSync(props.input.definitionId) ??
              props.input.definitionId}
          </h3>
          <span class="skill-type">{entityTypeText()}</span>
        </div>
      </summary>
      <div class="p-2">
        <Switch>
          <Match when={data.error}>{t("loadFailed")}</Match>
          <Match when={data.state === "pending"}>{t("loading")}</Match>
          <Match when={data()}>
            {(data) => (
              <Description
                {...props}
                keyMap={state() ? state()!.descriptionDictionary : {}}
                definitionId={props.input.definitionId}
                description={
                  data().rawPlayingDescription ?? data().rawDescription
                }
                onRequestExplain={props.onRequestExplain}
              />
            )}
          </Match>
        </Switch>
        <IdBox
          defId={props.input.definitionId}
          id={state() ? state()!.id : void 0}
        />
      </div>
    </details>
  );
}

export interface CardDefinitionProps {
  class?: string;
  definitionId: number;
}

export function Keyword(props: CardDefinitionProps) {
  const { assetsManager, t } = useAssetsManager();
  const [data] = createResource(
    () => [props.definitionId, assetsManager()] as const,
    ([defId, manager]) => manager.getData(defId) as Promise<KeywordRawData>,
  );
  return (
    <div class={props.class}>
      <h3>
        <span class="text-yellow-7">{t("rulesExplanation")}</span>
        <span class="font-bold">
          {data()?.name ??
            assetsManager().getNameSync(props.definitionId) ??
            props.definitionId}
        </span>
      </h3>
      <Switch>
        <Match when={data.error}>{t("loadFailed")}</Match>
        <Match when={data.state === "pending"}>{t("loading")}</Match>
        <Match when={data()}>
          {(data) => (
            <div class="p-2">
              <Description
                {...props}
                definitionId={props.definitionId}
                description={data().rawDescription}
              />
            </div>
          )}
        </Match>
      </Switch>
      <p class="mt-2 text-xs font-mono text-yellow-6">
        DefID: <span class="select-text">{-props.definitionId}</span>
      </p>
    </div>
  );
}

export interface ReferenceProps extends CardDefinitionProps {
  onAddReference?: (id: number) => void;
}

export function Reference(props: ReferenceProps) {
  const { assetsManager, t } = useAssetsManager();
  const [data] = createResource(
    () => [props.definitionId, assetsManager()] as const,
    ([defId, manager]) => manager.getData(defId) as Promise<SkillRawData>,
  );
  return (
    <>
      <h4 class="flex flex-row items-center justify-between mb-[0.25em]">
        <span class="keyword-name">
          {data()?.name ??
            assetsManager().getNameSync(props.definitionId) ??
            props.definitionId}
        </span>
        <Show when={data.state === "ready" && data()}>
          {(data) => (
            <span class="keyword-type">{typeTagText(data().type, t)}</span>
          )}
        </Show>
      </h4>
      <div class="keyword-description">
        <Switch>
          <Match when={data.error}>{t("loadFailed")}</Match>
          <Match when={data.state === "pending"}>{t("loading")}</Match>
          <Match when={data()}>
            {(data) => (
              <Description
                {...props}
                keyMap={"keyMap" in data() ? data().keyMap : {}}
                definitionId={props.definitionId}
                description={data().rawDescription}
                onAddReference={props.onAddReference}
              />
            )}
          </Match>
        </Switch>
      </div>
      <IdBox defId={props.definitionId} />
    </>
  );
}
