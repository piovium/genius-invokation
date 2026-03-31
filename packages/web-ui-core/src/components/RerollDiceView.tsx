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

import type { DiceType } from "@gi-tcg/typings";
import { Dice } from "./Dice";
import { createSignal, Index, Show } from "solid-js";
import { checkPointerEvent } from "../utils";
import { Button } from "./Button";
import type { ChessboardViewType } from "./Chessboard";
import { SpecialViewBackdrop } from "./ViewPanelBackdrop";
import { useUiContext } from "../hooks/context";

export interface RerollViewProps {
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
      class="absolute inset-0  flex flex-col items-center justify-center gap-10 select-none"
      onPointerUp={() => setSelectingOn(null)}
    >
      <h3 class="max-w-70 px-4 text-center leading-tight font-bold text-2xl">{t("view.rerollDiceTitle")}</h3>
      <ul class="grid grid-rows-2 grid-flow-col gap-6">
        <Index each={props.dice}>
          {(dice, index) => (
            <li>
              <div class="relative">
                {/* 骰子 */}
                <Dice
                  type={dice()}
                  selected={props.selectedDice[index]}
                  size={70}
                />
                {/* 点选、滑动点选触发区域 */}
                <div
                  class="cursor-pointer absolute w-60px h-60px left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-cyan opacity-0"
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
              </div>
            </li>
          )}
        </Index>
      </ul>
      <div
        class="visible data-[hidden]:invisible"
        bool:data-hidden={props.noConfirmButton}
      >
        <Button onClick={() => props.onConfirm()}>{t("view.confirmButton")}</Button>
      </div>
    </div>
  );
}
