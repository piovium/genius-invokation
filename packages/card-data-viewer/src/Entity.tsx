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
  createResource,
  createSignal,
  For,
  Match,
  Show,
  Switch,
} from "solid-js";
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

export interface CardDataProps {
  class?: string;
  input: ViewerInput;
  includesImage: boolean;
  onRequestExplain?: (id: number) => void;
}

export function Character(props: CardDataProps) {
  const { assetsManager, t } = useAssetsManager();
  const [data] = createResource(
    () => [props.input.definitionId, assetsManager()] as const,
    ([defId, manager]) => manager.getData(defId) as Promise<CharacterRawData>,
  );
  const [image] = createResource(
    () => [props.input.definitionId, assetsManager()] as const,
    ([defId, manager]) => manager.getImageUrl(defId, { type: "icon" }),
  );
  return (
    <div class={props.class}>
      <Switch>
        <Match when={data.error}>{t("loadFailed")}</Match>
        <Match when={data.state === "pending"}>{t("loading")}</Match>
        <Match when={data()}>
          {(data) => (
            <>
              <Show when={props.includesImage}>
                <div class="w-15 float-start mr-3 mb-3">
                  <Show when={image()}>
                    {(image) => <img src={image()} class="w-full" />}
                  </Show>
                </div>
              </Show>
              <h3 class="font-bold mb-1">{data().name}</h3>
              <dl class="flex flex-row gap-1 mb-1 text-sm">
                <dt>HP</dt>
                <dd class="font-bold">{data().hp}</dd>
                <dt>&nbsp;&nbsp;&nbsp;MP</dt>
                <dd class="font-bold">{data().maxEnergy}</dd>
              </dl>
              <Tags tags={data().tags} />
              <ul class="clear-both flex flex-col gap-2">
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
                        class="b-yellow-3 b-1 rounded-md"
                      />
                    </Show>
                  )}
                </For>
              </ul>
            </>
          )}
        </Match>
      </Switch>
      <p class="mt-2 text-xs font-mono text-yellow-6">
        DefID: <span class="select-text">{props.input.definitionId}</span>
        <Show when={props.input.from === "state" && props.input} keyed>
          {(input) => (
            <>
              <span class="inline-block w-1em" />
              ID: <span class="select-text">{input.id}</span>
            </>
          )}
        </Show>
      </p>
    </div>
  );
}

export function ActionCard(props: CardDataProps) {
  const { assetsManager, t } = useAssetsManager();
  const [data] = createResource(
    () => [props.input.definitionId, assetsManager()] as const,
    ([defId, manager]) => manager.getData(defId) as Promise<ActionCardRawData>,
  );
  const [image] = createResource(
    () => [props.input.definitionId, assetsManager()] as const,
    ([defId, manager]) => manager.getImageUrl(defId),
  );
  return (
    <div class={props.class}>
      <Switch>
        <Match when={data.error}>{t("loadFailed")}</Match>
        <Match when={data.state === "pending"}>{t("loading")}</Match>
        <Match when={data()}>
          {(data) => (
            <>
              <Show when={props.includesImage}>
                <div class="w-19 float-start mr-2 mb-0">
                  <Show when={image()}>
                    {(image) => <img src={image()} class="w-full" />}
                  </Show>
                </div>
              </Show>
              <div class="flex flex-col mb-2">
                <h3 class="font-bold">{data().name}</h3>
                <div class="h-6 flex flex-row items-center gap-1">
                  <span class="text-xs">{typeTagText(data().type, t)}</span>
                  <PlayCostList playCost={data().playCost} />
                </div>
              </div>
              <Tags tags={data().tags} />
              <div>
                <Description
                  {...props}
                  keyMap={
                    props.input.from === "state"
                      ? props.input.descriptionDictionary
                      : {}
                  }
                  definitionId={props.input.definitionId}
                  description={
                    (props.input.from === "state" &&
                      data().rawDynamicDescription) ||
                    data().rawDescription
                  }
                  onRequestExplain={props.onRequestExplain}
                />
              </div>
            </>
          )}
        </Match>
      </Switch>
      <p class="mt-2 text-xs font-mono text-yellow-6">
        DefID: <span class="select-text">{props.input.definitionId}</span>
      </p>
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
      class={`flex flex-col group ${props.class ?? ""}`}
      open={!props.asChild}
    >
      <summary class="flex flex-row items-center gap-2 cursor-pointer rounded-md group-not-open:bg-yellow-2 transition-colors">
        <div class="w-12 h-12">
          <Show when={icon()}>
            {(icon) => <img src={icon()} class="w-full h-full skill-icon" />}
          </Show>
        </div>
        <div class="flex flex-col">
          <h3>
            {data()?.name ??
              assetsManager().getNameSync(props.input.definitionId) ??
              props.input.definitionId}
          </h3>
          <div class="h-5 flex flex-row items-center gap-1">
            <span class="text-xs">{skillTypeText()}</span>
            <PlayCostList playCost={playCost()} />
          </div>
        </div>
      </summary>
      <Switch>
        <Match when={data.error}>{t("loadFailed")}</Match>
        <Match when={data.state === "pending"}>{t("loading")}</Match>
        <Match when={data()}>
          {(data) => (
            <div class="p-2">
              <Description
                {...props}
                definitionId={props.input.definitionId}
                description={data().rawDescription}
                keyMap={data().keyMap}
                onRequestExplain={props.onRequestExplain}
              />
            </div>
          )}
        </Match>
      </Switch>
      <p
        class="text-xs font-mono text-yellow-6"
        classList={{
          "mx-2 mb-2": props.asChild,
        }}
      >
        DefID: <span class="select-text">{props.input.definitionId}</span>
      </p>
    </details>
  );
}

export function Entity(props: ExpandableCardDataProps) {
  const { assetsManager, t } = useAssetsManager();
  const [data] = createResource(
    () => [props.input.definitionId, assetsManager()] as const,
    ([defId, manager]) => manager.getData(defId) as Promise<EntityRawData>,
  );
  const [icon] = createResource(
    () => [props.input.definitionId, assetsManager()] as const,
    ([defId, manager]) => manager.getImageUrl(defId),
  );
  const [entityTypeText, setEntityTypeText] = createSignal("");

  createEffect(() => {
    if (data.state === "ready") {
      setEntityTypeText(typeTagText(data().type, t) ?? "");
    }
  });
  return (
    <details
      class={`flex flex-col group ${props.class ?? ""}`}
      open={!props.asChild}
    >
      <summary class="flex flex-row items-center gap-2 cursor-pointer rounded-md group-not-open:bg-yellow-2 transition-colors">
        <div class="relative h-12">
          <Show when={icon()} fallback={<div class="w-12 h-12" />}>
            {(icon) => <img src={icon()} class="h-full" />}
          </Show>
          <Show
            when={
              props.input.from === "state" &&
              typeof props.input.variableValue === "number" &&
              props.input
            }
            keyed
          >
            {(input) => (
              <div class="absolute right-0 bottom-0 b-yellow-1 b-2 bg-yellow-8 text-yellow-1 text-xs line-height-0 h-4 w-4 rounded-full flex items-center justify-center">
                {input.variableValue}
              </div>
            )}
          </Show>
        </div>
        <div class="flex flex-col">
          <h3>
            {data()?.name ??
              assetsManager().getNameSync(props.input.definitionId) ??
              props.input.definitionId}
          </h3>
          <div class="h-5 flex flex-row items-center gap-1">
            <span class="text-xs">{entityTypeText()}</span>
          </div>
        </div>
      </summary>
      <Switch>
        <Match when={data.error}>{t("loadFailed")}</Match>
        <Match when={data.state === "pending"}>{t("loading")}</Match>
        <Match when={data()}>
          {(data) => (
            <div class="p-2">
              <Description
                {...props}
                keyMap={
                  props.input.from === "state"
                    ? props.input.descriptionDictionary
                    : {}
                }
                definitionId={props.input.definitionId}
                description={
                  data().rawPlayingDescription ?? data().rawDescription
                }
                onRequestExplain={props.onRequestExplain}
              />
            </div>
          )}
        </Match>
      </Switch>
      <p class="mx-2 mb-2 text-xs font-mono text-yellow-6">
        DefID: <span class="select-text">{props.input.definitionId}</span>
        <Show when={props.input.from === "state" && props.input} keyed>
          {(input) => (
            <>
              <span class="inline-block w-1em" />
              ID: <span class="select-text">{input.id}</span>
            </>
          )}
        </Show>
      </p>
    </details>
  );
}

export interface CardDefinitionProps {
  class?: string;
  definitionId: number;
  includesImage: boolean;
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
  const [image] = createResource(
    () => [props.definitionId, assetsManager()] as const,
    ([defId, manager]) => manager.getImageUrl(defId),
  );
  return (
    <div>
      <Show when={props.includesImage}>
        <div class="w-8 h-11 float-start mr-1 justify-center overflow-hidden relative rounded-1">
          <Show when={image()}>
            {(image) => (
              <img
                src={image()}
                class="absolute w-full top-50% left-50% translate-x--50% translate-y--50%"
                classList={{
                  "skill-icon":
                    data.state === "ready" &&
                    data()?.type?.startsWith("GCG_SKILL_"),
                }}
              />
            )}
          </Show>
        </div>
      </Show>
      <h4 class="flex flex-row items-center justify-between">
        <span class="font-bold">
          {data()?.name ??
            assetsManager().getNameSync(props.definitionId) ??
            props.definitionId}
        </span>
        <Show when={data.state === "ready" && data()}>
          {(data) => (
            <span class="text-xs text-yellow-7">
              {typeTagText(data().type, t)}
            </span>
          )}
        </Show>
      </h4>
      <div class="text-sm">
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
        <p class="text-xs font-mono text-yellow-6">
          DefID: <span class="select-text">{props.definitionId}</span>
        </p>
      </div>
    </div>
  );
}
