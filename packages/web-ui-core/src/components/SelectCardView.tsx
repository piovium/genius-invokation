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
  createSignal,
  For,
  Show,
  splitProps,
  type ComponentProps,
} from "solid-js";
import { Button } from "./Button";
import { Image } from "./Image";
import CardFrameNormal from "../svg/CardFrameNormal.svg?fb";
import SelectingIcon from "../svg/SelectingIcon.svg?fb";
import { useUiContext } from "../hooks/context";
import { DiceCostAsync } from "./DiceCost";

export interface SelectCardViewProps {
  shown: boolean;
  candidateIds: number[];
  onClickCard: (id: number) => void;
  onConfirm: (id: number) => void;
}

export function SelectCardView(props: SelectCardViewProps) {
  const { t, assetsManager } = useUiContext();
  const [selectedId, setSelectedId] = createSignal<number | null>(null);

  return (
    <div
      class="w-full h-full hidden data-[shown]:flex flex-col items-center justify-center select-none z-3 min-w-0 min-h-0 "
      bool:data-shown={props.shown}
    >
      <h3 class="h-10 font-bold text-3xl text-white/80">
        {t("view.chooseCard")}
      </h3>
      <div class={`flex flex-row h-36 my-15 justify-evenly w-180`}>
        <For each={props.candidateIds}>
          {(cardId) => (
            <StaticCard
              cardDefinitionId={cardId}
              selected={selectedId() === cardId}
              onClick={() => {
                setSelectedId(cardId);
                props.onClickCard(cardId);
              }}
            >
              <div class="self-end w-35 mx--7 max-w-35 py-1 text-3 text-center text-white/80 line-height-tight translate-y-100%">
                {assetsManager().getNameSync(cardId)}
              </div>
            </StaticCard>
          )}
        </For>
      </div>
      <Button
        class="visible data-[hidden]:invisible"
        bool:data-hidden={selectedId() === null}
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

export interface StaticCardProps extends ComponentProps<"div"> {
  cardDefinitionId: number;
  selected?: boolean;
}

export function StaticCard(props: StaticCardProps) {
  const [local, rest] = splitProps(props, [
    "cardDefinitionId",
    "selected",
    "class",
    "children",
  ]);
  return (
    <div
      class={`w-21 h-36 grid relative children:grid-area-[1/1] ${local.class ?? ""}`}
      {...rest}
    >
      <Image
        class="h-full w-full p-1% text-3"
        imageId={local.cardDefinitionId}
        fallback="card"
      />
      <CardFrameNormal class="h-full w-full pointer-events-none" />
      <Show when={local.selected}>
        {/* with animate no render */}
        <SelectingIcon noRender class="w-21 h-21 place-self-center" />
      </Show>
      <DiceCostAsync
        cardDefinitionId={local.cardDefinitionId}
        class="absolute left-2 top--0.5 translate-x--50% flex flex-col gap-1"
        diceClass="w-9 h-9 text-4.5 m--1 max-w-9 max-h-9"
      />
      {local.children}
    </div>
  );
}
