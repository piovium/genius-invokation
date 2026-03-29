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
  Aura,
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
  children,
  createEffect,
  createMemo,
  createSignal,
  For,
  Index,
  Match,
  Show,
  Switch,
  untrack,
  type Component,
  type ComponentProps,
  type JSX,
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
import { WithDelicateUi } from "../primitives/delicate_ui";
import { StrokedText } from "./StrokedText";
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
  const [preReactionAura, setPreReactionAura] = createSignal<Aura | null>();
  const [getReaction, setReaction] = createSignal<ReactionInfo | null>(null);
  const [showDamage, setShowDamage] = createSignal(false);

  const renderDamages = async (
    delayMs: number,
    damages: (DamageInfo | ReactionInfo)[],
  ) => {
    let preReactionAuraValue: Aura | null = null;
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
      return `var(--c-${DAMAGE_COLOR[damageType]})`;
    }
  });

  const aura = createMemo((): [number, number] => {
    const aura = props.preview?.newAura ?? preReactionAura() ?? data().aura;
    return [aura & 0xf, (aura >> 4) & 0xf];
  });
  const previewReaction = createMemo(() =>
    props.preview?.reactions.map((r) => {
      const reactionElement = REACTION_TEXT_MAP[r.reactionType].elements;
      const applyElement = r.incoming;
      const baseElement = reactionElement.find((e) => e !== applyElement);
      return [baseElement, applyElement];
    }),
  );
  const energy = createMemo(() => data().energy);
  const defeated = createMemo(() => data().defeated);
  const triggered = createMemo(() => props.triggered);

  // MARK: debug SKK with returning true
  const isSkirkEnergyBar = () =>
    data().specialEnergyName === "serpentsSubtlety";

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
      class="absolute flex flex-col items-center transition-transform preserve-3d [&_*]:backface-hidden"
      style={cssPropertyOfTransform(props.uiState.transform)}
      ref={el}
      onClick={(e) => {
        e.stopPropagation();
        props.onClick?.(e, e.currentTarget);
      }}
    >
      <div
        class="h-6 w-21 flex relative justify-center overflow-visible preview-blink z-10"
        bool:data-preview={props.preview?.newAura || props.preview?.reactions}
      >
        <div class="flex flex-row items-center gap-0.2 max-w-full">
          <Switch>
            <Match when={getReaction()}>{(r) => <Reaction info={r()} />}</Match>
            <Match when={true}>
              <For each={previewReaction()}>
                {(reaction) => (
                  <div class="h-5.1 flex flex-row items-center bg-black/60 rounded-full shrink-0">
                    <For each={reaction}>
                      {(e) => (
                        <Show when={e}>
                          {(e) => (
                            <Image
                              imageId={e()}
                              class="h-5 w-5"
                              fallback="aura"
                            />
                          )}
                        </Show>
                      )}
                    </For>
                  </div>
                )}
              </For>
              <For each={aura()}>
                {(aura) => (
                  <Show when={aura}>
                    <Image imageId={aura} class="h-5 w-5" fallback="aura" />
                  </Show>
                )}
              </For>
            </Match>
          </Switch>
        </div>
      </div>
      <div class="h-36 w-21 relative z-9 preserve-3d">
        <Show when={!defeated()}>
          <Health
            value={data().health}
            isMax={data().health === data().maxHealth}
            bondOfLife={!!(data().tags & CHARACTER_TAG_BOND_OF_LIFE)}
          />
          <div class="absolute z-1 right-0.4 top-3 translate-x-50% flex flex-col gap-0 items-center">
            <Dynamic
              component={isSkirkEnergyBar() ? SkirkEnergyBar : EnergyBar}
              current={energy()}
              preview={props.preview?.newEnergy ?? null}
              total={data().maxEnergy}
              specialEnergyName={data().specialEnergyName}
            />
            <Show when={technique()}>
              {(et) => (
                <div class="relative w-6 h-6 rounded-full mt-0.75">
                  <Image
                    class="w-6 h-6 equipment"
                    imageId={et().data.definitionId}
                    type={"icon"}
                    fallback="technique"
                    bool:data-disposing={et().animation === "disposing"}
                  />
                  <div
                    class="absolute top-0 w-6 h-6 rounded-full technique-usage"
                    bool:data-usable={et().data.hasUsagePerRound}
                    bool:data-disposing={et().animation === "disposing"}
                  />
                  <div
                    class="absolute top-0 w-6 h-6 rounded-full equipment-animation-1"
                    bool:data-entering={et().animation === "entering"}
                    bool:data-disposing={et().animation === "disposing"}
                    bool:data-triggered={et().triggered}
                  />
                  <div
                    class="absolute top-0 w-6 h-6 rounded-full equipment-animation-2"
                    bool:data-entering={et().animation === "entering"}
                    bool:data-disposing={et().animation === "disposing"}
                    bool:data-triggered={et().triggered}
                  />
                </div>
              )}
            </Show>
          </div>
          <Show when={props.preview && props.preview.newHealth !== null}>
            <VariableDiff
              class="absolute z-5 top-0.6 left-6"
              oldValue={data().health}
              newValue={
                props.preview!.negativeHealth ?? props.preview!.newHealth!
              }
              direction={props.preview!.newHealthDirection}
              defeated={props.preview?.defeated}
              revived={props.preview?.revived}
            />
          </Show>
          <div class="absolute z-3 hover:z-10 left-0 -translate-x-2.5 top-8 flex flex-col items-center justify-center">
            <Show when={weapon()}>
              {(et) => (
                <Equipment data={et()}>
                  <WeaponIcon
                    class="absolute w-7 h-7 equipment"
                    bool:data-disposing={et().animation === "disposing"}
                  />
                </Equipment>
              )}
            </Show>
            <Show when={artifact()}>
              {(et) => (
                <Equipment data={et()}>
                  <ArtifactIcon
                    class="absolute w-7 h-7 equipment"
                    bool:data-disposing={et().animation === "disposing"}
                  />
                </Equipment>
              )}
            </Show>
            <Key each={otherEquipments()} by="id">
              {(et) => (
                <Equipment data={et()}>
                  <TalentIcon
                    class="absolute w-7 h-7 equipment"
                    bool:data-disposing={et().animation === "disposing"}
                  />
                </Equipment>
              )}
            </Key>
          </div>
        </Show>
        <div
          class="h-full w-full rounded-1.2 clickable-outline transition-shadow data-[defeated]:brightness-50 preserve-3d"
          bool:data-clickable={
            props.clickStep && props.clickStep.ui >= ActionStepEntityUi.Outlined
          }
          bool:data-defeated={defeated()}
        >
          <Show when={damageSourceColor()}>
            <div
              class="absolute inset-0 h-full w-full rounded-1 attack-effect"
              style={{ "--glow-color": damageSourceColor() }}
            />
            <div
              class="absolute inset-0 h-full w-full rounded-1 attack-effect rotate-y-180"
              style={{ "--glow-color": damageSourceColor() }}
            />
          </Show>
          <Show when={data().tags & CHARACTER_TAG_NIGHTSOULS_BLESSING}>
            <NightsoulsBlessing
              class="absolute z--1 inset--1.25 top--6"
              element={Number(data().definitionId.toString()[1]) as DiceType}
            />
          </Show>
          <div class="absolute inset-0.5 bg-#bdaa8a rounded-1.2" />
          <Image
            imageId={data().definitionId}
            class="absolute inset-0 h-full w-full p-1px"
            fallback="card"
          />
          <CardFrameNormal class="absolute inset-0 h-full w-full pointer-events-none" />
          <CardbackNormal class="absolute inset-0 h-full w-full backface-hidden rotate-y-180 translate-z--0.1px" />
        </div>
        <StatusGroup
          class="absolute z-3 left-0.5 bottom-0 h-5.5 w-20"
          statuses={statuses()}
        />
        <Show when={defeated()}>
          <DefeatedIcon class="absolute z-5 top-[50%] left-0 w-21 text-center text-5xl font-bold translate-y--10.5 font-[var(--font-emoji)]" />
        </Show>
        <Switch>
          <Match when={props.clickStep?.ui === ActionStepEntityUi.Selected}>
            <div class="z-6 absolute inset-0 backface-hidden flex items-center justify-center">
              <SelectingConfirmIcon class="cursor-pointer h-20 w-20" />
            </div>
          </Match>
          <Match when={props.selecting}>
            <div class="z-6 absolute inset-0 backface-hidden flex items-center justify-center">
              <SelectingIcon class="w-21 h-21" />
            </div>
          </Match>
          <Match when={props.preview?.active}>
            <div class="z-6 absolute inset-0 backface-hidden flex items-center justify-center">
              <SwitchActiveHistoryIcon class="h-18 w-18" />
            </div>
          </Match>
        </Switch>
        <Show when={getDamage()}>
          {(dmg) => <Damage info={dmg()} shown={showDamage()} />}
        </Show>
        <CharacterTagMasks tags={data().tags} />
        <Show when={triggered()}>
          <div class="absolute h-21 w-21 top-7.5">
            <div class="absolute h-full w-full triggered-animation-6" />
            <div class="absolute h-full w-full triggered-animation-4">
              <div class="absolute h-full w-full triggered-animation-1" />
              <div class="absolute h-full w-full triggered-animation-2" />
              <div class="absolute h-full w-full triggered-animation-3" />
            </div>
            <div class="absolute h-full w-full triggered-animation-5" />
          </div>
        </Show>
      </div>
      <Show when={props.active}>
        <StatusGroup class="h-6 w-20 z-10" statuses={props.combatStatus} />
      </Show>
    </div>
  );
}

interface EnergyBarProps {
  current: number;
  preview: number | null;
  total: number;
  specialEnergyName?: string | undefined;
}

function EnergyBar(props: EnergyBarProps) {
  type EnergyState = 0 | 1 | 2;
  let energyMap = createMemo<Partial<Record<EnergyState, Component>>>(() => {
    if (props.specialEnergyName === "fightingSpirit") {
      return {
        0: EnergyIconEmptyMavuika,
        1: EnergyIconActiveMavuika,
        2: EnergyIconExtraMavuika,
      };
    } else {
      return {
        0: EnergyIconEmpty,
        1: EnergyIconActive,
      };
    }
  });
  const energyStates = (current: number): EnergyState[] => {
    const total = props.total;
    const state = Array.from(
      { length: total },
      (_, i) => (+(current > i) + +(current - total > i)) as EnergyState,
    );
    return state;
  };
  const currentStates = createMemo(() => energyStates(props.current));
  const previewStates = createMemo(() =>
    energyStates(props.preview ?? props.current),
  );
  return (
    <div class="grid grid-cols-1 grid-rows-1">
      <div class="grid-area-[1/1]">
        <For each={currentStates()}>
          {(comp) => (
            <Dynamic<Component<ComponentProps<"div">>>
              component={energyMap()[comp]}
              class="w-5.8 h-4"
            />
          )}
        </For>
      </div>
      <Show when={props.preview !== null && props.preview > props.current}>
        <div class="grid-area-[1/1] energy-preview-animation">
          <For each={previewStates()}>
            {(comp) => (
              <Dynamic<Component<ComponentProps<"div">>>
                component={energyMap()[comp]}
                class="w-5.8 h-4"
              />
            )}
          </For>
        </div>
      </Show>
    </div>
  );
}

function SkirkEnergyBar(props: EnergyBarProps) {
  const currentRatio = () => (props.current * 14 + 5) / 108;
  const previewRatio = () => ((props.preview ?? props.current) * 14 + 5) / 108;
  return (
    <div class="grid grid-cols-1 grid-rows-1">
      <div class="grid-area-[1/1]">
        <EnergyIconEmptySkirk class="w-4.2 h-16.2" />
      </div>
      <div
        class="grid-area-[1/1] skirk-foreground"
        style={{ "--ratio": `${currentRatio() * 100}%` }}
      >
        <EnergyIconActiveSkirk class="w-4.2 h-16.2" />
      </div>
      <Show when={props.preview !== null && props.preview > props.current}>
        <div
          class="grid-area-[1/1] skirk-foreground energy-preview-animation"
          style={{ "--ratio": `${previewRatio() * 100}%` }}
        >
          <EnergyIconActiveSkirk class="w-4.2 h-16.2" />
        </div>
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
    <div class="absolute z-1 left-1.8 top-3 h-9.8 w-9.8 -translate-x-50% -translate-y-50% children-h-full">
      <HealthIcon class="w-full h-full" />
      <Show when={props.bondOfLife}>
        <div class="bond-of-life-health">
          <BondOfLifeIcon class="w-full h-full" />
          <div class="bond-of-life-health-background" />
        </div>
      </Show>
      <Show when={props.isMax}>
        <div class="absolute inset-0 w-full h-full max-health" />
      </Show>
      <div class="absolute inset-0 h-full w-full pt-1.4 flex items-center justify-center scale-y-96">
        <StrokedText
          text={String(props.value)}
          class="line-height-none text-white font-bold text-4.5"
          strokeWidth={2}
          strokeColor="#000000B0"
        />
      </div>
    </div>
  );
}

interface CharacterTagMasksProps {
  tags: number;
}

function CharacterTagMasks(props: CharacterTagMasksProps) {
  const assets = {
    [CHARACTER_TAG_SHIELD]: "UI_GCG_Shield_01",
    [CHARACTER_TAG_BARRIER]: "UI_GCG_Shield_02",
    [CHARACTER_TAG_DISABLE_SKILL]: "UI_GCG_Frozen",
    // "UI_GCG_Rocken",
    // "UI_GCG_Dizzy",
  };
  return (
    <WithDelicateUi assetId={Object.values(assets)} fallback={<></>}>
      {(...imgs) => (
        <div class="absolute inset-0 pointer-events-none children-absolute children-inset-1/2 children--translate-x-1/2 children--translate-y-1/2 children-h-92% children-w-full children-scale-125%">
          <Index each={Object.keys(assets)}>
            {(flag, i) => (
              <Show when={props.tags & Number(flag())}>{imgs[i]}</Show>
            )}
          </Index>
        </div>
      )}
    </WithDelicateUi>
  );
}

interface EquipmentProps {
  data: StatusInfo;
  children: JSX.Element;
}

function Equipment(props: EquipmentProps) {
  const ch = children(() => props.children);
  const data = createMemo(() => props.data);
  return (
    <div class="relative w-7 h-6.5 rounded-full">
      {ch()}
      <div
        class="absolute top-0 w-7 h-7 rounded-full equipment-usage"
        bool:data-usable={data().data.hasUsagePerRound}
        bool:data-disposing={data().animation === "disposing"}
      />
      <div
        class="absolute top-0 w-7 h-7 rounded-full equipment-animation-1"
        bool:data-entering={data().animation === "entering"}
        bool:data-disposing={data().animation === "disposing"}
        bool:data-triggered={data().triggered}
      />
      <div
        class="absolute top-0 w-7 h-7 rounded-full equipment-animation-2"
        bool:data-entering={data().animation === "entering"}
        bool:data-disposing={data().animation === "disposing"}
        bool:data-triggered={data().triggered}
      />
    </div>
  );
}
