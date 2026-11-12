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
import { type SelectOptionRequest, SelectOptionUiType } from "@gi-tcg/typings";
import { Button } from "./Button";
import { Image } from "./Image";
import { useUiContext } from "../hooks/context";
import SelectOptionCard from "../svg/SelectOption.svg?fb";

export interface SelectOptionViewProps {
  shown: boolean;
  request: SelectOptionRequest;
  onConfirm: (selectedIndex: number) => void;
}

export function SelectOptionView(props: SelectOptionViewProps) {
  const { t } = useUiContext();
  const [selectedIndex, setSelectedIndex] = createSignal<number | null>(null);
  return (
    <div
      class="w-full h-full hidden data-[shown]:flex flex-col items-center justify-center select-none z-3 min-w-0 min-h-0"
      bool:data-shown={props.shown}
    >
      <h3 class="h-10 font-bold text-3xl text-white/80">
        {t("view.selectOption")}
      </h3>
      <p class="h-6 text-white/60 text-4">
        <SelectOptionText text={props.request.prompt} />
      </p>
      <div class={`flex flex-row h-36 mt-9 mb-15 justify-evenly w-180`}>
        <For each={props.request.options}>
          {(option, index) => (
            <SelectOption
              uiType={props.request.uiType}
              image={option.image}
              title={option.title}
              text={option.text}
              onClick={() => setSelectedIndex(index())}
              bool:data-selected={selectedIndex() === index()}
            />
          )}
        </For>
      </div>
      <Button
        class="visible data-[hidden]:invisible"
        bool:data-hidden={selectedIndex() === null}
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
  uiType: SelectOptionUiType;
  image?: string;
  title?: string;
  text: string;
}

export function SelectOption(props: SelectOptionProps) {
  const [local, rest] = splitProps(props, [
    "uiType",
    "image",
    "title",
    "text",
    "class",
  ]);
  const imageId = () => local.image?.match(/^id:\/\/(\d+)$/)?.[1];
  const imageType = () => {
    switch (local.uiType) {
      case SelectOptionUiType.CARD_FACE:
        return "cardFace" as const;
      case SelectOptionUiType.ICON:
        return "icon" as const;
      default:
        return undefined;
    }
  };
  return (
    <div
      class={`w-21 h-36 grid relative children:grid-area-[1/1] rounded isolate transition-all select-option ${local.class ?? ""}`}
      {...rest}
    >
      <SelectOptionCard class="w-full h-full select-option-card" />
      <div class="grid grid-rows-[3.2rem_1.6rem_4.2rem] grid-cols-1 w-full h-full justify-items-center z-1">
        <Show when={local.image && imageType()}>
          <Show
            when={imageId()}
            fallback={
              <img
                src={local.image}
                alt=""
                draggable={false}
                class="rounded-full w-9 h-9 object-cover grid-area-[1/1] self-end"
              />
            }
          >
            {(id) => (
              <Image
                imageId={Number(id())}
                type={imageType()}
                fallback={imageType() === "cardFace" ? "card" : "state"}
                class="rounded-full w-9 h-9 grid-area-[1/1] self-end"
              />
            )}
          </Show>
        </Show>
        <span class="grid-area-[2/1] text-#ebccba font-bold text-2.5 self-center">
          <SelectOptionText text={local.title ?? ""} />
        </span>
        <div class="grid-area-[3/1] w-full h-full overflow-y-auto px-1 text-2 text-#ebd6c0 whitespace-pre-wrap break-words">
          <SelectOptionText text={local.text} />
        </div>
      </div>
    </div>
  );
}

function SelectOptionText(props: { text: string }) {
  const { assetsManager } = useUiContext();
  return (
    <>
      {props.text.replace(
        /\$\[[ACS](\d+)\]/g,
        (reference, id: string) =>
          assetsManager().getNameSync(Number(id)) ?? reference,
      )}
    </>
  );
}
