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

import type { DiceType } from "@gi-tcg/typings";
import { Index, Show } from "solid-js";
import { Dice, DiceContent } from "./Dice";
import DiceCountHintBlue from "../svg/DiceCountHintBlue.svg?fb";
import DiceCountHintYellow from "../svg/DiceCountHintYellow.svg?fb";
import { Dynamic } from "solid-js/web";

export type DicePanelState = "hidden" | "wrapped" | "visible";

export interface DiceBarProps {
  class?: string;
  dice: DiceType[];
  selectedDice: boolean[];
  state: DicePanelState;
  opp?: boolean;
  spectatorMode?: boolean;
}

export function DiceBar(props: DiceBarProps) {
  return (
    <div
      class={`invisible data-[shown]:visible opacity-0 data-[shown]:opacity-100
        grid grid-cols-1 w-7 gap-1.5 place-items-center select-none transition-all
        pb-2 pointer-events-none dice-shadow ${props.class ?? ""}`}
      bool:data-wrapped={props.state === "wrapped"}
      bool:data-shown={props.state !== "visible" || props.spectatorMode}
    >
      <Dynamic
        component={props.opp ? DiceCountHintBlue : DiceCountHintYellow}
        class="grid-area-[1/1] w-9 h-9 m--1 max-w-9 max-h-9"
      />
      <div class="grid-area-[1/1] text-white font-bold">
        {props.dice.length}
      </div>
      <Index each={props.dice}>
        {(dice, index) => (
          <DiceContent
            type={dice()}
            selected={props.state === "wrapped" && props.selectedDice[index]}
            class="w-6 h-6 m--1 max-w-6 max-h-6"
            col={1}
            row={index + 2}
          />
        )}
      </Index>
    </div>
  );
}

export interface DicePanelProps extends DiceBarProps {
  disabledDiceTypes: DiceType[];
  maxSelectedCount: number | null;
  onSelectDice: (selectedDice: boolean[]) => void;
  onStateChange: (state: DicePanelState) => void;
}

export function DicePanel(props: DicePanelProps) {
  const toggleDice = (dice: DiceType, index: number) => {
    if (props.disabledDiceTypes.includes(dice)) {
      return;
    }
    const rawSelectedDice = props.selectedDice;
    const selectedDice = Array.from(props.dice, (_, i) => !!rawSelectedDice[i]);
    const selectedCount = selectedDice.filter(Boolean).length;
    if (!props.maxSelectedCount || selectedCount < props.maxSelectedCount) {
      selectedDice[index] = !selectedDice[index];
    } else {
      if (selectedDice[index]) {
        selectedDice[index] = false;
      } else {
        selectedDice.fill(false);
        selectedDice[index] = true;
      }
    }
    props.onSelectDice(selectedDice);
  };
  const toggleState = () => {
    if (props.state === "visible") {
      props.onStateChange("wrapped");
    } else {
      props.onStateChange("visible");
    }
  };
  return (
    <>
      <Show when={!props.spectatorMode}>
        <div
          class={`justify-self-end w-42 h-full mr--4 pr-6
            flex flex-row items-center select-none dice-panel`}
          data-state={props.state}
        >
          <div
            class={`h-40 w-8 flex items-center justify-center select-none cursor-pointer
              text-#e7d090 text-6 hover:text-#ffd26a hover:text-6.5`}
            data-state={props.state}
            onClick={toggleState}
          >
            {props.state === "visible" ? "\u276F" : "\u276E"}
          </div>
          <Show when={props.state === "visible"}>
            <div class="grid grid-cols-2 gap-x-1 gap-y-2 mb-10 w-21 mx-auto">
              <Index each={props.dice}>
                {(dice, index) => (
                  <Dice
                    type={dice()}
                    class="w-12 h-12 data-[disabled]:opacity-50 data-[disabled]:cursor-not-allowed m--1 max-w-12 max-h-12"
                    selected={props.selectedDice[index]}
                    bool:data-disabled={props.disabledDiceTypes.includes(
                      dice(),
                    )}
                    onClick={() => toggleDice(dice(), index)}
                  />
                )}
              </Index>
            </div>
          </Show>
        </div>
      </Show>
      <DiceBar
        class="justify-self-end self-start mr-2.5 mt-13 z-1 dice-bar-my"
        dice={props.dice}
        selectedDice={props.selectedDice}
        state={props.state}
        spectatorMode={props.spectatorMode}
      />
    </>
  );
}
