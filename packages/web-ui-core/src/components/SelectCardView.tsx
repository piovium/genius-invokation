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

import { createSignal, For, Show } from "solid-js";
import { Button } from "./Button";
import { CardFace } from "./Card";
import SelectingIcon from "../svg/SelectingIcon.svg?fb";
import { useUiContext } from "../hooks/context";
import { DiceCostAsync } from "./DiceCost";

export interface SelectCardViewProps {
  candidateIds: number[];
  nameGetter: (id: number) => string | undefined;
  onClickCard: (id: number) => void;
  onConfirm: (id: number) => void;
}

export function SelectCardView(props: SelectCardViewProps) {
  const { t } = useUiContext();
  const [selectedId, setSelectedId] = createSignal<number | null>(null);

  return (
    <div class="absolute inset-0 flex flex-col items-center justify-center gap-10 select-none">
      <h3 class="font-bold text-3xl">{t("view.chooseCard")}</h3>
      <ul class="flex flex-row gap-1">
        <For each={props.candidateIds}>
          {(cardId) => (
            <li class="flex flex-col items-center">
              <div
                class="h-36 w-21 relative"
                onClick={() => {
                  setSelectedId(cardId);
                  props.onClickCard(cardId);
                }}
              >
                <CardFace
                  definitionId={cardId}
                  class="absolute inset-0 h-36 w-21"
                />
                <Show when={selectedId() === cardId}>
                  <div class="absolute h-full w-full backface-hidden flex items-center justify-center">
                    <SelectingIcon class="w-21 h-21" />
                  </div>
                </Show>
                <DiceCostAsync
                  cardDefinitionId={cardId}
                  class="absolute translate-x--50% backface-hidden flex flex-col gap-1 left-1.8 top--1"
                  diceClass="w-9 h-9 text-4.5 m--1"
                />
              </div>
              <div class="mt-2 w-36 font-size-4 text-center color-black/60 font-bold">
                {props.nameGetter(cardId)}
              </div>
            </li>
          )}
        </For>
      </ul>
      <div
        class="invisible pointer-events-none data-[shown]:visible data-[shown]:pointer-events-auto"
        bool:data-shown={selectedId() !== null}
      >
        <Button
          onClick={() => {
            const id = selectedId();
            if (id !== null) {
              props.onConfirm(id);
            }
          }}
        >
          {t("view.confirmButton")}
        </Button>
      </div>
    </div>
  );
}
