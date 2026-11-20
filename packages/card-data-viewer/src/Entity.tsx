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

import { AssetFallback } from "./AssetFallback";
import {
  createMemo,
  Errored,
  For,
  Loading,
  type ParentProps,
  Show,
} from "solid-js";
import type { PbCharacterState, PbEntityState } from "@gi-tcg/typings";
import type { ViewerInput } from "./CardDataViewer";
import type {
  AnyData,
  EntityRawData,
  CharacterRawData,
  KeywordRawData,
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
  onRequestExplain?: (id: number | null) => void;
}

function createDefinition<T extends AnyData>(id: () => number) {
  const { assetsManager } = useAssetsManager();
  return createMemo(() => assetsManager().getData(id()) as Promise<T>);
}

function DefinitionBoundary(props: ParentProps<{ nameFor?: number }>) {
  const { assetsManager, t } = useAssetsManager();
  const name = () =>
    typeof props.nameFor === "number"
      ? (assetsManager().getNameSync(props.nameFor) ?? props.nameFor)
      : undefined;
  return (
    <Errored fallback={name() ?? t("loadFailed")}>
      <Loading fallback={name() ?? t("loading")}>{props.children}</Loading>
    </Errored>
  );
}

export function Character(props: CardDataProps) {
  const state = createMemo(() => {
    if (props.input.from === "definitionId") {
      return null;
    } else {
      return props.input.state as PbCharacterState;
    }
  });
  const { assetsManager } = useAssetsManager();
  const data = createDefinition<CharacterRawData>(
    () => props.input.definitionId,
  );
  const equipmentDefinitionIds = createMemo(
    () =>
      state()
        ?.entity.filter((entity) => typeof entity.equipment === "number")
        .map((entity) => entity.definitionId) ?? [],
  );
  const techniqueData = createMemo(
    () =>
      Promise.all(
        equipmentDefinitionIds().map((definitionId) =>
          (assetsManager().getData(definitionId) as Promise<EntityRawData>)
            .then((data) =>
              data.skills.filter((sk) => sk.type === "GCG_SKILL_TAG_VEHICLE"),
            )
            .catch(() => []),
        ),
      ),
    { loadingValue: [] },
  );
  const skills = createMemo(() => [
    ...data().skills,
    ...techniqueData().flat(),
  ]);
  const hpText = createMemo(() => {
    const st = state();
    if (st) {
      return `${st.health}/${st.maxHealth}`;
    } else {
      return data().hp;
    }
  });
  const mpText = createMemo(() => {
    const st = state();
    if (st) {
      return `${st.energy}/${st.maxEnergy}`;
    } else {
      return data().maxEnergy;
    }
  });
  return (
    <div class={props.class}>
      <DefinitionBoundary>
        <h3 class="card-name">{data().name}</h3>
        <dl class="flex flex-row gap-[0.25em] mb-[0.25em] card-info">
          <dt>HP</dt>
          <dd class="font-bold">{hpText()}</dd>
          <dt>&nbsp;&nbsp;&nbsp;MP</dt>
          <dd class="font-bold">{mpText()}</dd>
        </dl>
        <Tags tags={data().tags} />
        <ul class="flex flex-col gap-[0.5em]">
          <For each={skills()}>
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
      </DefinitionBoundary>
      <IdBox defId={props.input.definitionId} id={state()?.id} />
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
  const { t } = useAssetsManager();
  const data = createDefinition<EntityRawData>(() => props.input.definitionId);
  const rawDescription = createMemo(() => {
    const st = state();
    const d = data();
    if (st) {
      if (props.input.type === "card" && d.rawDynamicDescription) {
        return d.rawDynamicDescription;
      } else if (props.input.type === "entity" && d.rawPlayingDescription) {
        return d.rawPlayingDescription;
      }
    }
    return d.rawDescription;
  });
  return (
    <div class={props.class}>
      <DefinitionBoundary>
        <h3 class="card-name">{data().name}</h3>
        <div class="flex flex-row items-center mb-[0.25em]">
          <span class="skill-type mr-[0.5em]">
            {typeTagText(data().type, t)}
          </span>
          <Show when={props.input.type === "card"}>
            <PlayCostList playCost={data().playCost} />
          </Show>
        </div>
        <Tags tags={data().tags} />
        <div class="px-[0.5em]">
          <Description
            {...props}
            keyMap={state()?.descriptionDictionary ?? {}}
            definitionId={props.input.definitionId}
            description={rawDescription()}
            onRequestExplain={props.onRequestExplain}
          />
        </div>
      </DefinitionBoundary>
      <IdBox defId={props.input.definitionId} id={state()?.id} />
    </div>
  );
}

interface ExpandableCardDataProps extends CardDataProps {
  class?: string;
  asChild?: boolean;
}

export function Skill(props: ExpandableCardDataProps) {
  const { assetsManager, t } = useAssetsManager();
  const data = createDefinition<SkillRawData>(() => props.input.definitionId);

  const icon = createMemo(() =>
    assetsManager().getImageUrl(props.input.definitionId),
  );
  const skillTypeText = () => typeTagText(data().type, t) ?? "";
  return (
    <details
      class={["flex flex-col min-h-0 skill-wrap", props.class]}
      open={!props.asChild}
    >
      <summary class="flex flex-row items-center p-[0.25em] gap-[0.25em] cursor-pointer skill-header">
        <AssetFallback
          on={props.input.definitionId}
          fallback={<div class="w-[3em] h-[3em] shrink-0" />}
        >
          <div
            class="skill-icon shrink-0"
            style={{ "--mask-image": `url(${icon()})` }}
          />
        </AssetFallback>
        <div class="flex flex-col">
          <DefinitionBoundary nameFor={props.input.definitionId}>
            <h3 class="skill-name">{data().name}</h3>
            <div class="flex flex-row items-center">
              <span class="skill-type mr-[0.5em]">{skillTypeText()}</span>
              <Show when={data().type !== "GCG_SKILL_TAG_PASSIVE"}>
                <PlayCostList playCost={data().playCost} />
              </Show>
            </div>
          </DefinitionBoundary>
        </div>
      </summary>
      <div class="p-[0.5em]">
        <DefinitionBoundary>
          <Description
            {...props}
            definitionId={props.input.definitionId}
            description={data().rawDescription}
            keyMap={data().keyMap ?? {}}
            onRequestExplain={props.onRequestExplain}
          />
        </DefinitionBoundary>
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
  const data = createDefinition<EntityRawData>(() => props.input.definitionId);
  const icon = createMemo(() =>
    assetsManager().getImageUrl(props.input.definitionId, { type: "icon" }),
  );
  const entityTypeText = () => typeTagText(data().type, t) ?? "";
  return (
    <details
      class={["flex flex-col min-h-0 skill-wrap", props.class]}
      open={!props.asChild}
    >
      <summary class="flex flex-row items-center p-[0.25em] gap-[0.25em] cursor-pointer skill-header">
        <div class="w-[3em] h-[3em] grid children:grid-area-[1/1] shrink-0">
          <AssetFallback on={props.input.definitionId}>
            <img src={icon()} class="w-[3em] h-[3em]" />
          </AssetFallback>
          <Show when={typeof state()?.variableValue === "number"}>
            <div class="place-self-end rounded-full entity-variable">
              {state()!.variableValue}
            </div>
          </Show>
        </div>
        <div class="flex flex-col">
          <DefinitionBoundary nameFor={props.input.definitionId}>
            <h3 class="skill-name">{data().name}</h3>
            <span class="skill-type">{entityTypeText()}</span>
          </DefinitionBoundary>
        </div>
      </summary>
      <div class="p-[0.5em]">
        <DefinitionBoundary>
          <Description
            {...props}
            keyMap={state()?.descriptionDictionary ?? {}}
            definitionId={props.input.definitionId}
            description={data().rawPlayingDescription ?? data().rawDescription}
            onRequestExplain={props.onRequestExplain}
          />
        </DefinitionBoundary>
        <IdBox defId={props.input.definitionId} id={state()?.id} />
      </div>
    </details>
  );
}

export interface CardDefinitionProps {
  class?: string;
  definitionId: number;
}

export function Keyword(props: CardDefinitionProps) {
  const data = createDefinition<KeywordRawData>(() => props.definitionId);
  return (
    <div class={["px-[0.5em]", props.class]}>
      <h3 class="keyword-name">
        <DefinitionBoundary nameFor={props.definitionId}>
          {data().name}
        </DefinitionBoundary>
      </h3>
      <DefinitionBoundary>
        <Description
          {...props}
          definitionId={props.definitionId}
          description={data().rawDescription}
        />
      </DefinitionBoundary>
      <IdBox defId={-props.definitionId} />
    </div>
  );
}

export interface ReferenceProps extends CardDefinitionProps {
  onAddReference?: (id: number) => void;
}

export function Reference(props: ReferenceProps) {
  const { t } = useAssetsManager();
  const data = createDefinition<SkillRawData>(() => props.definitionId);
  return (
    <>
      <h4 class="flex flex-row items-center justify-between mb-[0.25em]">
        <DefinitionBoundary nameFor={props.definitionId}>
          <span class="reference-name">{data().name}</span>
          <span class="reference-type">{typeTagText(data().type, t)}</span>
        </DefinitionBoundary>
      </h4>
      <div class="reference-description">
        <DefinitionBoundary>
          <Description
            {...props}
            keyMap={data().keyMap ?? {}}
            definitionId={props.definitionId}
            description={data().rawDescription}
            onAddReference={props.onAddReference}
          />
        </DefinitionBoundary>
      </div>
      <IdBox defId={props.definitionId} />
    </>
  );
}
