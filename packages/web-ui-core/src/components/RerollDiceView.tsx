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
import { Dice } from "./Dice";
import { createSignal, Index } from "solid-js";
import { checkPointerEvent } from "../utils";
import { Button } from "./Button";
import { useUiContext } from "../hooks/context";

export interface RerollViewProps {
  shown: boolean;
  noConfirmButton?: boolean;
  dice: DiceType[];
  selectedDice: boolean[];
  onSelectDice: (selectedDice: boolean[]) => void;
  onConfirm: () => void;
}

export function RerollDiceView(props: RerollViewProps) {
  const { t } = useUiContext();
  const [selectingOn, setSelectingOn] = createSignal<boolean | null>(null);
  const toggleDice = (index: number) => {
    const rawSelectedDice = props.selectedDice;
    const selectedDice = Array.from(props.dice, (_, i) => !!rawSelectedDice[i]);
    const selected = selectedDice[index];
    let isOn = selectingOn();
    if (isOn === null) {
      isOn = !selected;
      setSelectingOn(isOn);
    }
    selectedDice[index] = isOn;
    props.onSelectDice(selectedDice);
  };
  return (
    <div
      class="w-full h-full hidden data-[shown]:flex flex-col items-center justify-center select-none z-3 min-w-0 min-h-0"
      bool:data-shown={props.shown}
      onPointerUp={() => setSelectingOn(null)}
    >
      <h3 class="h-10 font-bold text-3xl text-white/80">
        {t("view.rerollDiceTitle")}
      </h3>
      <div class="h-42 my-12 grid grid-rows-2 grid-flow-col gap-2">
        <Index each={props.dice}>
          {(dice, index) => (
            <Dice
              type={dice()}
              selected={props.selectedDice[index]}
              class="cursor-pointer w-20 h-20"
              onPointerDown={(e) => {
                if (checkPointerEvent(e)) {
                  toggleDice(index);
                  if (e.target.hasPointerCapture(e.pointerId)) {
                    // https://w3c.github.io/pointerevents/#implicit-pointer-capture
                    // Touchscreen may implicitly capture pointer
                    e.target.releasePointerCapture(e.pointerId);
                  }
                }
              }}
              onPointerEnter={(e) => {
                if (checkPointerEvent(e)) {
                  toggleDice(index);
                }
              }}
            />
          )}
        </Index>
      </div>
      <Button
        class="visible data-[hidden]:invisible"
        bool:data-hidden={props.noConfirmButton}
        onClick={() => props.onConfirm()}
      >
        {t("view.confirmButton")}
      </Button>
    </div>
  );
}
