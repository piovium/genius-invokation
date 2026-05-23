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

import { DiceType, type PbDiceRequirement } from "@gi-tcg/typings";
import { Image } from "./Image";
import { DiceCost } from "./DiceCost";
import { createMemo, Match, Show, Switch } from "solid-js";
import type { ClickSwitchActiveButtonActionStep } from "../action";
import type { SkillInfo } from "./Chessboard";
import { Key } from "@solid-primitives/keyed";
import { DICE_COLOR } from "./Dice";
import SkillAbandonIcon from "../svg/SkillAbandonIcon.svg?fb";
import SwitchActiveIcon from "../svg/SwitchActiveIcon.svg?fb";
import SkillButtonReactIcon from "../svg/SkillButtonReactIcon.svg?fb";
import SkillSelectingYellow from "../svg/SkillSelectingYellow.svg?fb";
import SkillButtonBurstRing from "../svg/SkillButtonBurstRing.svg?fb";
import { useUiContext } from "../hooks/context";

export interface SkillButtonProps extends SkillInfo {
  hideDiceCost?: boolean;
  isTechnique?: boolean;
  energy?: number;
  onClick?: (e: MouseEvent) => void;
}

function SkillButton(props: SkillButtonProps) {
  const { t } = useUiContext();
  const skillId = createMemo(() => props.id);
  const color = createMemo(() => {
    const diceType =
      props.cost.find((item) => item.type >= 1 && item.type <= 7)?.type ?? 8;
    return `var(--c-${DICE_COLOR[diceType]})`;
  });
  const isBurst = createMemo(
    () => props.cost.find((item) => item.type === 9) && !props.isTechnique,
  );
  return (
    <div
      class="relative w-14.5 h-20 flex flex-col items-center gap-0.5 select-none"
      style={{ "--element-color": color() }}
    >
      <div
        class="grid w-14.5 h-14.5 place-items-center children:grid-area-[1/1] children:pointer-events-none isolate skill-button"
        title={props.step ? props.step.tooltipText : t("skill.notYourTurn")}
        bool:data-mini={props.isTechnique}
        bool:data-selected={props.step?.isFocused}
        bool:data-disabled={!props.step || props.step.isDisabled}
        onClick={(e) => props.onClick?.(e)}
      >
        {/* with react no render */}
        <SkillButtonReactIcon
          noRender
          class="w-14.5 h-14.5 skill-button-bg z-1"
        />
        <Show when={isBurst()}>
          <div
            class="hidden data-[shown]:block w-12 h-12 rounded-full skill-button-burst-animation z-0"
            bool:data-shown={props.energy === 1}
          />
          <SkillButtonBurstRing class="w-14.5 h-14.5 z-3" />
          <div
            class="w-13.5 h-13.5 rounded-full border-3.5 b-[var(--element-color)] z-4 skill-button-burst-progress"
            style={{
              "--progress-value": (100 * (props.energy ?? 0)).toFixed(0) + "%",
            }}
          />
        </Show>
        <SkillSelectingYellow class="w-12 h-6.3 translate-y--6 skill-button-marker z-5" />
        <Switch>
          <Match when={typeof skillId() === "number"}>
            <Image
              imageId={skillId() as number}
              class="w-11 h-11 skill-button-icon z-6"
              fallback="skill"
            />
          </Match>
          <Match when={skillId() === "switchActive"}>
            <SwitchActiveIcon class="w-11 h-11 skill-button-icon skill-button-switch z-6 " />
          </Match>
        </Switch>
        <SkillAbandonIcon
          class="w-6 h-6 place-self-end data-[hidden]:hidden z-7"
          bool:data-hidden={props.step}
        />
      </div>
      <DiceCost
        class="flex flex-row gap-1 data-[hidden]:hidden data-[disabled]:brightness-80 data-[disabled]:saturate-80"
        cost={props.cost}
        diceClass="w-7 h-7 text-3.5 m--1 max-w-7 max-h-7"
        realCost={props.realCost}
        bool:data-hidden={props.hideDiceCost}
        bool:data-disabled={!props.step || props.step.isDisabled}
      />
    </div>
  );
}

export interface SkillButtonGroupProps {
  class?: string;
  skills: SkillInfo[];
  shown: boolean;
  switchActiveButton: ClickSwitchActiveButtonActionStep | null;
  switchActiveCost: Map<number, PbDiceRequirement[]> | null;
  onClick?: (skill: SkillInfo) => void;
}

const DEFAULT_SWITCH_ACTIVE_COST: PbDiceRequirement[] = [
  { type: DiceType.Void, count: 1 },
];

export function SkillButtonGroup(props: SkillButtonGroupProps) {
  const skills = createMemo<SkillInfo[]>(() => {
    if (props.switchActiveButton) {
      const step = props.switchActiveButton;
      const realCost = props.switchActiveCost?.get(step.targetCharacterId ?? 0);
      const skillInfo = {
        id: "switchActive" as const,
        step: step,
        cost: DEFAULT_SWITCH_ACTIVE_COST,
        realCost: realCost ?? [],
        hideDiceCost: !realCost,
      };
      return [skillInfo];
    } else {
      return props.skills;
    }
  });
  return (
    <div
      class={`flex flex-row-reverse gap-1 transition-opacity opacity-0 data-[shown]:opacity-100 pointer-events-none data-[shown]:pointer-events-auto ${
        props.class ?? ""
      }`}
      bool:data-shown={props.shown}
    >
      <Key each={[...skills()].reverse()} by="id">
        {(skill) => (
          <SkillButton
            {...skill()}
            onClick={(e) => {
              e.stopPropagation();
              props.onClick?.(skill());
            }}
          />
        )}
      </Key>
    </div>
  );
}
