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

import { createMemo, createSignal, For, Show, omit } from "solid-js";
import type { ComponentProps } from "@solidjs/web";
import {
  DiceType,
  type SelectOptionRequest,
  SelectOptionUiType,
} from "@gi-tcg/typings";
import { Button } from "./Button";
import { ImageFallback } from "./Image";
import { useUiContext } from "../hooks/context";
import SelectOptionCard from "../svg/SelectOption.svg?fb";
import { StaticCard } from "./SelectCardView";

export interface SelectOptionViewProps {
  shown: boolean;
  request: SelectOptionRequest;
  onConfirm: (selectedIndex: number) => void;
}

export function SelectOptionView(props: SelectOptionViewProps) {
  const { t } = useUiContext();
  const [selectedIndex, setSelectedIndex] = createSignal<number | null>(null);
  const selectOptionText = textWithReference();
  return (
    <div
      class="w-full h-full hidden data-[shown]:flex flex-col items-center justify-center select-none z-3 min-w-0 min-h-0"
      data-shown={props.shown}
    >
      <h3 class="h-10 font-bold text-3xl text-white/80">
        {t("view.selectOption")}
      </h3>
      <p class="h-6 text-white/60 text-4">
        {selectOptionText(props.request.prompt)}
      </p>
      <div class={`flex flex-row h-36 mt-9 mb-15 justify-evenly w-180`}>
        <For each={props.request.options}>
          {(option, index) => (
            <SelectOption
              uiType={option.uiType}
              image={option.image}
              title={option.title}
              text={option.text}
              selected={selectedIndex() === index()}
              onClick={() => setSelectedIndex(index())}
            />
          )}
        </For>
      </div>
      <Button
        class="visible data-[hidden]:invisible"
        data-hidden={selectedIndex() === null}
        onClick={() => {
          const index = selectedIndex();
          if (index !== null) {
            props.onConfirm(index);
          }
        }}
      >
        {t("view.confirmButton")}
      </Button>
    </div>
  );
}

export interface SelectOptionProps extends ComponentProps<"div"> {
  uiType?: SelectOptionUiType;
  image?: string;
  title?: string;
  text: string;
  selected?: boolean;
}

export function SelectOption(props: SelectOptionProps) {
  const rest = omit(props, "uiType", "image", "title", "text", "selected", "class");
  const selectOptionText = textWithReference();
  const cardId = () =>
    props.uiType === SelectOptionUiType.CARD_FACE &&
    props.image?.match(/^id:\/\/(\d+)$/)?.[1];
  return (
    <Show
      when={cardId()}
      fallback={
        <div
          class={[
            "w-21 h-36 grid relative children:grid-area-[1/1] rounded isolate transition-all select-option",
            props.class,
          ]}
          data-selected={props.selected}
          {...rest}
        >
          <SelectOptionCard class="w-full h-full select-option-card" />
          <div class="grid grid-rows-[3.2rem_1.6rem_4.2rem] grid-cols-1 w-full h-full justify-items-center z-1">
            <SelectOptionImage
              image={
                props.uiType === SelectOptionUiType.OPTION
                  ? props.image
                  : void 0
              }
              class="rounded-full w-9 h-9 grid-area-[1/1] self-end"
            />
            <span class="grid-area-[2/1] text-#ebccba font-bold text-2.5 self-center">
              {selectOptionText(props.title ?? "")}
            </span>
            <div class="grid-area-[3/1] w-full h-full overflow-y-auto px-1 pb-1 text-2 text-#ebd6c0 whitespace-pre-wrap break-words touch-pan scrollbar-hidden select-option-text">
              {selectOptionText(props.text)}
            </div>
          </div>
        </div>
      }
    >
      {(id) => (
        <StaticCard
          cardDefinitionId={Number(id())}
          selected={props.selected}
          {...rest}
        >
          <div class="self-end w-35 mx--7 max-w-35 py-1 text-3 text-center text-white/80 line-height-tight translate-y-100%">
            {selectOptionText(props.title ?? "")}
          </div>
        </StaticCard>
      )}
    </Show>
  );
}

export function SelectOptionImage(props: { image?: string; class?: string }) {
  const { assetsManager } = useUiContext();
  const url = createMemo(
    () =>
      props.image &&
      assetsManager().resolveCustomImageUrl(props.image, {
        type: "icon",
        thumbnail: true,
      }),
  );
  return (
    <Show when={url()} keyed>
      {(src) => {
        const [failed, setFailed] = createSignal(false);
        return (
          <Show
            when={!failed()}
            fallback={
              <ImageFallback
                type="state"
                imageId={DiceType.Omni}
                class={props.class}
              />
            }
          >
            <img
              src={src}
              alt=""
              draggable="false"
              class={["object-cover", props.class]}
              onError={() => setFailed(true)}
            />
          </Show>
        );
      }}
    </Show>
  );
}

export const textWithReference = () => {
  const { assetsManager } = useUiContext();
  return (text: string) =>
    text.replace(
      /\$\[[ACS](\d+)\]/g,
      (reference, id: string) =>
        assetsManager().getNameSync(Number(id)) ?? reference,
    );
};
