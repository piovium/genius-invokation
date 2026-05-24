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
  Aura as A,
  CHARACTER_TAG_BARRIER,
  CHARACTER_TAG_BOND_OF_LIFE,
  CHARACTER_TAG_DISABLE_SKILL,
  CHARACTER_TAG_NIGHTSOULS_BLESSING,
  CHARACTER_TAG_SHIELD,
  DamageType,
  DiceType,
  PbEquipmentType,
} from "@gi-tcg/typings";
import { Key } from "@solid-primitives/keyed";
import {
  createEffect,
  createMemo,
  createSignal,
  For,
  Index,
  Match,
  Show,
  Switch,
  type Component,
  type ComponentProps,
} from "solid-js";
import { Image } from "./Image";
import type {
  CharacterInfo,
  DamageInfo,
  ReactionInfo,
  StatusInfo,
} from "./Chessboard";
import { Damage, DAMAGE_COLOR } from "./Damage";
import { cssPropertyOfTransform } from "../ui_state";
import { StatusGroup } from "./StatusGroup";
import { ActionStepEntityUi } from "../action";
import { VariableDiff } from "./VariableDiff";
import { StrokedTextContent } from "./StrokedText";
import DefeatedIcon from "../svg/DefeatedIcon.svg?fb";
import HealthIcon from "../svg/HealthIcon.svg?fb";
import BondOfLifeIcon from "../svg/BondOfLifeIcon.svg?fb";
import EnergyIconEmpty from "../svg/EnergyIconEmpty.svg?fb";
import EnergyIconActive from "../svg/EnergyIconActive.svg?fb";
import EnergyIconEmptySkirk from "../svg/EnergyIconEmptySkirk.svg?fb";
import EnergyIconActiveSkirk from "../svg/EnergyIconActiveSkirk.svg?fb";
import EnergyIconEmptyMavuika from "../svg/EnergyIconEmptyMavuika.svg?fb";
import EnergyIconActiveMavuika from "../svg/EnergyIconActiveMavuika.svg?fb";
import EnergyIconExtraMavuika from "../svg/EnergyIconExtraMavuika.svg?fb";
import SelectingConfirmIcon from "../svg/SelectingConfirmIcon.svg?fb";
import SelectingIcon from "../svg/SelectingIcon.svg?fb";
import SwitchActiveHistoryIcon from "../svg/SwitchActiveHistoryIcon.svg?fb";
import ReplaceEquipment from "../svg/ReplaceEquipment.svg?fb";
import ArtifactIcon from "../svg/ArtifactIcon.svg?fb";
import WeaponIcon from "../svg/WeaponIcon.svg?fb";
import TalentIcon from "../svg/TalentIcon.svg?fb";
import CardFrameNormal from "../svg/CardFrameNormal.svg?fb";
import CardbackNormal from "../svg/CardbackNormal.svg?fb";
import { Reaction, REACTION_TEXT_MAP } from "./Reaction";
import { NightsoulsBlessing } from "./NightsoulsBlessing";
import { Dynamic } from "solid-js/web";

export interface DamageSourceAnimation {
  type: "damageSource";
  targetX: number;
  targetY: number;
}

export const DAMAGE_SOURCE_ANIMATION_DURATION = 800;
export const DAMAGE_TARGET_ANIMATION_DELAY =
  DAMAGE_SOURCE_ANIMATION_DURATION * 0.6;
export const DAMAGE_TARGET_ANIMATION_DURATION =
  DAMAGE_SOURCE_ANIMATION_DURATION * 0.3;

export interface DamageTargetAnimation {
  type: "damageTarget";
  sourceX: number;
  sourceY: number;
}

export const CHARACTER_ANIMATION_NONE = { type: "none" as const };

export type CharacterAnimation =
  | DamageSourceAnimation
  | DamageTargetAnimation
  | typeof CHARACTER_ANIMATION_NONE;

export interface CharacterAreaProps extends CharacterInfo {
  selecting: boolean;
  hidden?: boolean;
  onClick?: (e: MouseEvent, currentTarget: HTMLElement) => void;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

interface AnimationInfo {
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
}

const damageSourceKeyFrames = (info: AnimationInfo): Keyframe[] => {
  const rz =
    (-Math.atan((info.targetX - info.sourceX) / (info.targetY - info.sourceY)) *
      180) /
    Math.PI;
  const diffX = info.targetX - info.sourceX;
  const diffY = info.targetY - info.sourceY;
  const rx = Math.sign(diffY);
  return [
    {
      offset: 0,
      ...cssPropertyOfTransform({
        x: info.sourceX,
        y: info.sourceY,
        z: 0,
        ry: 0,
        rz: 0,
      }),
    },
    {
      offset: 0.1,
      easing: "ease-in",
      ...cssPropertyOfTransform({
        x: info.sourceX,
        y: info.sourceY - diffY * 0.08,
        z: 25,
        rx: -rx * 20,
        ry: 5,
        rz: rz * 0.1,
      }),
    },
    {
      offset: 0.2,
      easing: "ease-out",
      ...cssPropertyOfTransform({
        x: info.sourceX,
        y: info.sourceY - diffY * 0.16,
        z: 50,
        ry: 0,
        rz,
      }),
    },
    {
      offset: 0.3,
      ...cssPropertyOfTransform({
        x: info.sourceX,
        y: info.sourceY - diffY * 0.16,
        z: 50,
        ry: 0,
        rz,
      }),
    },
    {
      offset: 0.4,
      easing: "ease-in",
      ...cssPropertyOfTransform({
        x: info.sourceX + diffX * 0.2,
        y: info.sourceY + diffY * 0.2,
        z: 40,
        ry: 90,
        rz,
      }),
    },
    {
      offset: 0.5,
      ...cssPropertyOfTransform({
        x: info.sourceX + diffX * 0.6,
        y: info.sourceY + diffY * 0.5,
        z: 40,
        ry: 120,
        rz,
      }),
    },
    {
      offset: 0.55,
      ...cssPropertyOfTransform({
        x: info.sourceX + diffX * 0.7,
        y: info.sourceY + diffY * 0.6,
        z: 30,
        rx: rx * 20,
        ry: 180,
        rz,
      }),
    },
    {
      offset: 0.6,
      ...cssPropertyOfTransform({
        x: info.targetX,
        y: info.targetY - diffY * 0.1,
        z: 20,
        rx: rx * 70,
        ry: 180,
        rz,
      }),
    },
    {
      offset: 0.65,
      ...cssPropertyOfTransform({
        x: info.sourceX + diffX * 0.7,
        y: info.sourceY + diffY * 0.6,
        z: 30,
        rx: rx * 20,
        ry: 180,
        rz: rz * 0.85,
      }),
    },
    {
      offset: 0.8,
      easing: "ease-in",
      ...cssPropertyOfTransform({
        x: info.sourceX + diffX * 0.4,
        y: info.sourceY + diffY * 0.4,
        z: 40,
        ry: 90,
        rz: rz * 0.5,
      }),
    },
    {
      offset: 0.9,
      easing: "ease-out",
      ...cssPropertyOfTransform({
        x: info.sourceX + diffX * 0.2,
        y: info.sourceY + diffY * 0.2,
        z: 20,
        rx: rx * 10,
        ry: 0,
        rz: rz * 0.1,
      }),
    },
    {
      offset: 1,
      ...cssPropertyOfTransform({
        x: info.sourceX,
        y: info.sourceY,
        z: 0,
        ry: 0,
        rz: 0,
      }),
    },
  ];
};

const damageTargetKeyFrames = (info: AnimationInfo): Keyframe[] => {
  const rad = Math.atan2(
    info.targetY - info.sourceY,
    info.targetX - info.sourceX,
  );
  const OFFSET = 5;
  const xOffset = OFFSET * Math.cos(rad);
  const yOffset = OFFSET * Math.sin(rad);
  const xRotate = Math.sign(info.targetY - info.sourceY) * 20;
  const yRotate = -Math.sign(info.targetX - info.sourceX) * 15;
  return [
    {
      offset: 0,
      ...cssPropertyOfTransform({
        x: info.targetX,
        y: info.targetY,
        z: 0,
        ry: 0,
        rz: 0,
      }),
    },
    {
      offset: 0.5,
      easing: "ease-in-out",
      ...cssPropertyOfTransform({
        x: info.targetX + xOffset,
        y: info.targetY + yOffset,
        z: 5,
        rx: xRotate,
        ry: yRotate,
        rz: 0,
      }),
    },
    {
      offset: 1,
      ...cssPropertyOfTransform({
        x: info.targetX,
        y: info.targetY,
        z: 0,
        ry: 0,
        rz: 0,
      }),
    },
  ];
};

export function CharacterArea(props: CharacterAreaProps) {
  let el!: HTMLDivElement;
  const data = createMemo(() => props.data);

  const [getDamage, setDamage] = createSignal<DamageInfo | null>(null);
  // 播放带元素反应的伤害动画时，目标携带旧 aura
  const [preReactionAura, setPreReactionAura] = createSignal<A | null>();
  const [getReaction, setReaction] = createSignal<ReactionInfo | null>(null);
  const [showDamage, setShowDamage] = createSignal(false);

  const renderDamages = async (
    delayMs: number,
    damages: (DamageInfo | ReactionInfo)[],
  ) => {
    let preReactionAuraValue: A | null = null;
    if (damages[0]?.type === "damage" && damages[0]?.reaction?.base) {
      preReactionAuraValue = damages[0].reaction.base;
    } else if (damages[0]?.type === "reaction" && damages[0].base) {
      preReactionAuraValue = damages[0].base;
    }
    setPreReactionAura(preReactionAuraValue);
    await sleep(delayMs);
    setPreReactionAura(null);
    for (const damage of damages) {
      if (damage.type === "damage") {
        setDamage(damage);
        setReaction(damage.reaction);
        setShowDamage(true);
        await sleep(500);
        setShowDamage(false);
        setReaction(null);
        await sleep(100);
      } else if (damage.type === "reaction") {
        setReaction(damage);
        await sleep(500);
        setReaction(null);
      }
    }
  };

  // createEffect(() => {
  //   if (props.id === -500035) {
  //     console.log(props.uiState.damages);
  //   }
  // });

  createEffect(() => {
    const {
      damages,
      animation: propAnimation,
      transform,
      onAnimationFinish,
    } = props.uiState;

    let damageDelay =
      damages[0]?.type === "damage" && damages[0].isAfterSkillMainDamage
        ? DAMAGE_TARGET_ANIMATION_DELAY
        : 0;
    const animations: Promise<void>[] = [];

    if (propAnimation.type === "damageTarget") {
      damageDelay = DAMAGE_TARGET_ANIMATION_DELAY;
      const { sourceX, sourceY } = propAnimation;
      const animation = el.animate(
        damageTargetKeyFrames({
          sourceX,
          sourceY,
          targetX: transform.x,
          targetY: transform.y,
        }),
        {
          delay: DAMAGE_TARGET_ANIMATION_DELAY,
          duration: DAMAGE_TARGET_ANIMATION_DURATION,
        },
      );
      animations.push(animation.finished.then(() => animation.cancel()));
    } else if (propAnimation.type === "damageSource") {
      const { targetX, targetY } = propAnimation;
      const animation = el.animate(
        damageSourceKeyFrames({
          sourceX: transform.x,
          sourceY: transform.y,
          targetX,
          targetY,
        }),
        {
          delay: 0,
          duration: DAMAGE_SOURCE_ANIMATION_DURATION,
        },
      );
      animations.push(animation.finished.then(() => animation.cancel()));
    }
    const dmgRender = renderDamages(damageDelay, damages);
    animations.push(dmgRender);

    Promise.all(animations).then(() => {
      onAnimationFinish?.();
    });
  });

  const damageSourceColor = createMemo<string | undefined>(() => {
    if (props.uiState.animation.type !== "damageSource") {
      return;
    }
    const damageType = props.uiState.animation.damageType;
    if (damageType > DamageType.Physical && damageType < DamageType.Piercing) {
      return DAMAGE_COLOR[damageType];
    }
  });

  const aura = createMemo((): [number, number] => {
    const aura = props.preview?.newAura ?? preReactionAura() ?? data().aura;
    return [aura & 0xf, (aura >> 4) & 0xf];
  });
  const previewAura = createMemo(
    () => !!props.preview?.newAura || !!props.preview?.reactions?.length,
  );
  const previewReaction = createMemo(() =>
    props.preview?.reactions.map((r) => {
      const reactionElement = REACTION_TEXT_MAP[r.reactionType].elements;
      const applyElement = r.incoming;
      const baseElement = reactionElement.find(
        (e) => e !== applyElement,
      ) as DamageType;
      return [baseElement, applyElement];
    }),
  );
  const energy = createMemo(() => data().energy);
  const defeated = createMemo(() => data().defeated);
  const triggered = createMemo(() => props.triggered);

  const energyBarComponent = createMemo(() => {
    const SPECIAL_ENERGY_MAP: Record<string, Component<EnergyBarProps>> = {
      serpentsSubtlety: SkirkEnergyBar,
      fightingSpirit: MavuikaEnergyBar,
    };
    return (
      SPECIAL_ENERGY_MAP[data().specialEnergyName ?? ""] ?? NormalEnergyBar
    );
  });

  const statuses = createMemo(() =>
    props.entities.filter((et) => typeof et.data.equipment === "undefined"),
  );
  const weapon = createMemo(() =>
    props.entities.find((et) => et.data.equipment === PbEquipmentType.WEAPON),
  );
  const artifact = createMemo(() =>
    props.entities.find((et) => et.data.equipment === PbEquipmentType.ARTIFACT),
  );
  const technique = createMemo(() =>
    props.entities.find(
      (et) => et.data.equipment === PbEquipmentType.TECHNIQUE,
    ),
  );
  const otherEquipments = createMemo(() =>
    props.entities.filter((et) => et.data.equipment === PbEquipmentType.OTHER),
  );
  return (
    <div
      class="absolute w-21 h-48 grid grid-cols-1 grid-rows-[1fr_6fr_1fr] transition-transform preserve-3d [&_*]:backface-hidden data-[hidden]:invisible"
      style={cssPropertyOfTransform(props.uiState.transform)}
      ref={el}
      onClick={(e) => {
        e.stopPropagation();
        props.onClick?.(e, e.currentTarget);
      }}
      bool:data-hidden={props.hidden}
    >
      {/* Elemente */}
      <Show
        when={getReaction()}
        fallback={
          <Aura
            preview={previewAura()}
            previewReaction={previewReaction()}
            aura={aura()}
          />
        }
      >
        {(r) => <Reaction class="grid-area-[1/1] z-10" info={r()} />}
      </Show>
      {/* Card Area */}
      <div
        class="grid-area-[2/1] relative preserve-3d grid rounded-md transition-shadow children:grid-area-[1/1] clickable-outline"
        bool:data-clickable={
          props.clickStep && props.clickStep.ui >= ActionStepEntityUi.Outlined
        }
      >
        {/* Marker */}
        <Show when={!defeated()}>
          <Health
            value={data().health}
            isMax={data().health === data().maxHealth}
            bondOfLife={!!(data().tags & CHARACTER_TAG_BOND_OF_LIFE)}
          />
          <div class="absolute z-1 right-0.5 top-3 translate-x-50% flex flex-col items-center">
            <Dynamic
              component={energyBarComponent()}
              current={energy()}
              preview={props.preview?.newEnergy ?? null}
              total={data().maxEnergy}
            />
            <Show when={technique()}>
              {(et) => (
                <Technique
                  data={et()}
                  replace={props.clickStep?.equip === PbEquipmentType.TECHNIQUE}
                />
              )}
            </Show>
          </div>
          <Show when={props.preview && props.preview.newHealth !== null}>
            <VariableDiff
              class="absolute z-1 top-0.5 left-6"
              oldValue={data().health}
              newValue={
                props.preview?.negativeHealth ??
                (props.preview?.newHealth as number)
              }
              direction={props.preview?.newHealthDirection}
              defeated={props.preview?.defeated}
              revived={props.preview?.revived}
            />
          </Show>
          <div class="absolute z-1 left-0.5 -translate-x-50% top-8 flex flex-col">
            <Show when={weapon()}>
              {(et) => (
                <Equipment
                  data={et()}
                  icon={WeaponIcon}
                  replace={props.clickStep?.equip === PbEquipmentType.WEAPON}
                />
              )}
            </Show>
            <Show when={artifact()}>
              {(et) => (
                <Equipment
                  data={et()}
                  icon={ArtifactIcon}
                  replace={props.clickStep?.equip === PbEquipmentType.ARTIFACT}
                />
              )}
            </Show>
            <Key each={otherEquipments()} by="id">
              {(et) => (
                <Equipment
                  data={et()}
                  icon={TalentIcon}
                  replace={props.clickStep?.equip === PbEquipmentType.OTHER}
                />
              )}
            </Key>
          </div>
        </Show>
        <Show when={damageSourceColor()}>
          <div
            class="rounded-md rotate-y-180 translate-z--0.2px attacking-effect"
            style={{ "--shadow-color": `var(--c-${damageSourceColor()})` }}
          />
        </Show>
        <Show when={data().tags & CHARACTER_TAG_NIGHTSOULS_BLESSING}>
          <NightsoulsBlessing
            class="z--1 m--1.25 mt--8 self-end"
            element={Number(data().definitionId.toString()[1]) as DiceType}
          />
        </Show>
        <Image
          imageId={data().definitionId}
          class="h-full w-full p-1% text-3 data-[defeated]:brightness-50"
          fallback="card"
          bool:data-defeated={defeated()}
        />
        <CardFrameNormal
          class="pointer-events-none data-[defeated]:brightness-50"
          bool:data-defeated={defeated()}
        />
        <CardbackNormal class="rotate-y-180 translate-z--0.1px" />
        <StatusGroup
          class="z-1 self-end h-5 px-0.5 mb-1"
          statuses={statuses()}
        />
        <Show when={defeated()}>
          <DefeatedIcon class="w-21 h-21 z-1 place-self-center" />
        </Show>
        <Switch>
          <Match when={props.clickStep?.ui === ActionStepEntityUi.Selected}>
            <SelectingConfirmIcon class="w-18 h-18 z-2 place-self-center" />
          </Match>
          <Match when={props.selecting}>
            {/* with animate no render */}
            <SelectingIcon noRender class="w-21 h-21 z-2 place-self-center" />
          </Match>
          <Match when={props.preview?.active}>
            <SwitchActiveHistoryIcon class="w-18 h-18 z-2 place-self-center" />
          </Match>
        </Switch>
        <Damage info={getDamage()} shown={showDamage()} />
        <CharacterTagMasks tags={data().tags} />
        <Show when={triggered()}>
          <div class="place-self-center h-21 w-21 rounded-full skill-triggered"/>
        </Show>
      </div>
      <Show when={props.active}>
        <StatusGroup
          class="grid-area-[3/1] z-10 px-0.5"
          statuses={props.combatStatus}
        />
      </Show>
    </div>
  );
}

interface AuraProps {
  preview: boolean;
  previewReaction?: DamageType[][];
  aura: [number, number];
}

function Aura(props: AuraProps) {
  return (
    <div
      class="grid-area-[1/1] flex flex-nowrap justify-center items-center z-10 aura"
      bool:data-preview={props.preview}
    >
      <For each={props.previewReaction}>
        {(reaction) => (
          <div class="flex flex-nowrap items-center bg-black/60 rounded-full shrink-0">
            <For each={reaction}>
              {(e) => <Image imageId={e} class="h-5 w-5" fallback="state" />}
            </For>
          </div>
        )}
      </For>
      <For each={props.aura}>
        {(aura) => (
          // aura is 0 when no element, should not render
          <Show when={aura}>
            <Image imageId={aura} class="h-5 w-5" fallback="state" />
          </Show>
        )}
      </For>
    </div>
  );
}

interface EnergyBarProps {
  current: number;
  preview: number | null;
  total: number;
}

interface EnergyCellBarProps extends EnergyBarProps {
  cellComponentMap: Record<number, Component>;
}

function EnergyCellBar(props: EnergyCellBarProps) {
  const energyStates = (current: number): number[] => {
    const total = props.total;
    const state = Array.from(
      { length: total },
      (_, i) =>
        (Math.floor(current / total) + +(current % total > i)) as number,
    );
    return state;
  };
  const currentStates = createMemo(() => energyStates(props.current));
  const previewStates = createMemo(() =>
    energyStates(props.preview ?? props.current),
  );
  return (
    <div
      class="grid grid-cols-1 grid-rows-[repeat(var(--total),minmax(0,1fr))]"
      style={{ "--total": props.total }}
    >
      <For each={currentStates()}>
        {(comp, idx) => (
          <Dynamic<Component<ComponentProps<"div">>>
            component={props.cellComponentMap[comp]}
            class="w-9 h-6 grid-area-[var(--row-idx)/1] my--1"
            style={{ "--row-idx": idx() + 1 }}
          />
        )}
      </For>
      <Show when={props.preview !== null && props.preview > props.current}>
        <For each={previewStates()}>
          {(comp, idx) => (
            <Dynamic<Component<ComponentProps<"div">>>
              component={props.cellComponentMap[comp]}
              class="w-9 h-6 grid-area-[var(--row-idx)/1] my--1 energy-preview"
              style={{ "--row-idx": idx() + 1 }}
            />
          )}
        </For>
      </Show>
    </div>
  );
}

function NormalEnergyBar(props: EnergyBarProps) {
  const energyMap: Record<number, Component> = {
    0: EnergyIconEmpty,
    1: EnergyIconActive,
  };
  return (
    <EnergyCellBar
      current={props.current}
      preview={props.preview}
      total={props.total}
      cellComponentMap={energyMap}
    />
  );
}

function MavuikaEnergyBar(props: EnergyBarProps) {
  const energyMap: Record<number, Component> = {
    0: EnergyIconEmptyMavuika,
    1: EnergyIconActiveMavuika,
    2: EnergyIconExtraMavuika,
  };
  return (
    <EnergyCellBar
      current={props.current}
      preview={props.preview}
      total={props.total}
      cellComponentMap={energyMap}
    />
  );
}

function SkirkEnergyBar(props: EnergyBarProps) {
  const currentRatio = () => (props.current * 14 + 5) / 108;
  const previewRatio = () => ((props.preview ?? props.current) * 14 + 5) / 108;
  return (
    <div class="grid children:grid-area-[1/1]">
      <EnergyIconEmptySkirk class="w-4.2 h-16.2" />
      <EnergyIconActiveSkirk
        class="w-4.2 h-16.2 skirk-foreground"
        style={{ "--ratio": `${currentRatio() * 100}%` }}
      />
      <Show when={props.preview !== null && props.preview > props.current}>
        <EnergyIconActiveSkirk
          class="w-4.2 h-16.2 skirk-foreground energy-preview"
          style={{ "--ratio": `${previewRatio() * 100}%` }}
        />
      </Show>
    </div>
  );
}

interface HealthProps {
  value: number;
  isMax: boolean;
  bondOfLife?: boolean;
}

function Health(props: HealthProps) {
  return (
    <div class="absolute z-1 left-1.5 top--2 h-10 w-10 -translate-x-50% grid children:grid-area-[1/1]">
      <Show
        when={props.bondOfLife}
        fallback={<HealthIcon class="w-full h-full" />}
      >
        <BondOfLifeIcon class="w-full h-full" />
      </Show>
      <Show when={props.isMax || props.bondOfLife}>
        <div
          class="health"
          style={{ "--bg-color": `${props.isMax ? "#fef9c3dd" : "#ff000060"}` }}
        />
      </Show>
      <StrokedTextContent
        text={String(props.value)}
        class="mt-2.25 text-white font-bold text-4.5 text-center"
        strokeWidth={2}
        strokeColor="#000000B0"
      />
    </div>
  );
}

interface CharacterTagMasksProps {
  tags: number;
}

function CharacterTagMasks(props: CharacterTagMasksProps) {
  const TAG_MASK_MAP: Record<number, string> = {
    [CHARACTER_TAG_SHIELD]: "MaskShield",
    [CHARACTER_TAG_BARRIER]:"MaskBarrier",
    [CHARACTER_TAG_DISABLE_SKILL]: "MaskFrozen",
    // "UI_GCG_Rocken",
    // "UI_GCG_Dizzy",
  };
  return (
    <Index each={Object.keys(TAG_MASK_MAP)}>
      {(flag) => (
        <Show when={props.tags & Number(flag())}>
          <img class="m--3 w-27 h-42 max-w-27 max-h-42" src={`https://ui-assets.piovium.org/${TAG_MASK_MAP[Number(flag())]}.webp`}/>
        </Show>
      )}
    </Index>
  );
}

interface TechniqueProps {
  data: StatusInfo;
  replace: boolean;
}

function Technique(props: TechniqueProps) {
  const data = createMemo(() => props.data);
  return (
    <div class="w-7 h-7 mt-0.5 grid children:grid-area-[1/1]">
      <Image
        class="technique-icon"
        imageId={data().data.definitionId}
        type={"icon"}
        fallback="technique"
        bool:data-entering={data().animation === "entering"}
        bool:data-disposing={data().animation === "disposing"}
      />
      <Show when={props.replace}>
        {/* with animate no render */}
        <ReplaceEquipment noRender class="w-6.5 h-6.5 place-self-center" />
      </Show>
      <div
        class="rounded-full technique-effect"
        bool:data-usable={data().data.hasUsagePerRound}
        bool:data-entering={data().animation === "entering"}
        bool:data-disposing={data().animation === "disposing"}
        bool:data-triggered={data().triggered}
      />
    </div>
  );
}

interface EquipmentProps {
  data: StatusInfo;
  icon: Component;
  replace: boolean;
}

function Equipment(props: EquipmentProps) {
  const data = createMemo(() => props.data);
  return (
    <div class="w-7 h-7 mb--0.5 grid children:grid-area-[1/1]">
      <Dynamic<Component<ComponentProps<"div">>>
        component={props.icon}
        class="equipment-icon"
        bool:data-entering={data().animation === "entering"}
        bool:data-disposing={data().animation === "disposing"}
      />
      <Show when={props.replace}>
        {/* with animate no render */}
        <ReplaceEquipment noRender class="w-6.5 h-6.5 place-self-center" />
      </Show>
      <div
        class="rounded-full equipment-effect"
        bool:data-usable={data().data.hasUsagePerRound}
        bool:data-entering={data().animation === "entering"}
        bool:data-disposing={data().animation === "disposing"}
        bool:data-triggered={data().triggered}
      />
    </div>
  );
}
