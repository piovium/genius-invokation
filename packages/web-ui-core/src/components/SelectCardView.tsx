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

import { createSignal, For, Show } from "solid-js";
import { Button } from "./Button";
import { Image } from "./Image";
import CardFrameNormal from "../svg/CardFrameNormal.svg?fb";
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
    <div class="grid-area-[1/1] w-full h-full flex flex-col items-center justify-center select-none z-3">
      <h3 class="h-10 font-bold text-3xl text-white/80">
        {t("view.chooseCard")}
      </h3>
      <div class={`flex flex-row h-36 my-15 justify-evenly w-180`}>
        <For each={props.candidateIds}>
          {(cardId) => (
            <div
              class="w-21 h-36 grid relative"
              onClick={() => {
                setSelectedId(cardId);
                props.onClickCard(cardId);
              }}
            >
              <Image
                class="grid-area-[1/1] h-full w-full p-1% text-3"
                imageId={cardId}
                fallback="card"
              />
              <CardFrameNormal class="grid-area-[1/1] h-full w-full pointer-events-none" />
              <Show when={selectedId() === cardId}>
                {/* with animate no render */}
                <SelectingIcon noRender class="grid-area-[1/1] w-21 h-21 place-self-center" />
              </Show>
              <DiceCostAsync
                cardDefinitionId={cardId}
                class="absolute left-2 top--0.5 translate-x--50% flex flex-col gap-1"
                diceClass="w-9 h-9 text-4.5 m--1 max-w-9 max-h-9"
              />
              <div class="grid-area-[1/1] self-end py-1 text-3 text-center text-white/80 line-height-tight translate-y-100%">
                {props.nameGetter(cardId)}
              </div>
            </div>
          )}
        </For>
      </div>
      <Button
        class="invisible pointer-events-none data-[shown]:visible data-[shown]:pointer-events-auto"
        bool:data-shown={selectedId() !== null}
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
  );
}
