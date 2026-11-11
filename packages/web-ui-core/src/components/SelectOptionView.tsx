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
  createResource,
  createSignal,
  For,
  Show,
  splitProps,
  type ComponentProps,
} from "solid-js";
import { type SelectOptionRequest, SelectOptionType } from "@gi-tcg/typings";
import { DescriptionContent } from "@gi-tcg/card-data-viewer";
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
      <p class="h-6 text-white/60 text-4">{props.request.prompt}</p>
      <div class={`flex flex-row h-36 mt-9 mb-15 justify-evenly w-180`}>
        <For each={props.request.options}>
          {(option, index) => (
            <SelectOption
              optionKey={option.key}
              type={props.request.type}
              imageId={option.imageId}
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
  optionKey: string;
  type: SelectOptionType;
  imageId?: number;
  title?: string;
  text?: string;
}

export function SelectOption(props: SelectOptionProps) {
  const [local, rest] = splitProps(props, [
    "optionKey",
    "type",
    "imageId",
    "title",
    "text",
    "class",
  ]);
  const { assetsManager } = useUiContext();
  const [data] = createResource(
    () =>
      typeof local.imageId !== "undefined" &&
      (typeof local.title === "undefined" || typeof local.text === "undefined")
        ? ([local.imageId, assetsManager()] as const)
        : false,
    ([id, manager]) => manager.getData(id).catch(() => undefined),
  );
  const description = () => {
    const value = data();
    return value && "rawDescription" in value
      ? value.rawDescription
      : undefined;
  };
  const keyMap = () => {
    const value = data();
    return value && "keyMap" in value ? (value.keyMap ?? {}) : undefined;
  };
  const text = () => local.text ?? description();
  const title = () => {
    const value =
      local.title ??
      data()?.name ??
      (typeof local.imageId === "undefined"
        ? undefined
        : assetsManager().getNameSync(local.imageId));
    return !value && !text() && !(imageType() && local.imageId)
      ? local.optionKey
      : value;
  };
  const imageType = () => {
    switch (local.type) {
      case SelectOptionType.CARD_FACE:
        return "cardFace" as const;
      case SelectOptionType.ICON:
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
        <Show when={local.imageId && imageType()}>
          <Image
            imageId={local.imageId!}
            type={imageType()}
            fallback={imageType() === "cardFace" ? "card" : "state"}
            class="rounded-full w-9 h-9 grid-area-[1/1] self-end"
          />
        </Show>
        <span class="grid-area-[2/1] text-#ebccba font-bold text-2.5 self-center">
          {title()}
        </span>
        <div
          class="grid-area-[3/1] w-full h-full overflow-y-auto px-1 text-2 whitespace-pre-wrap break-words"
        >
          <DescriptionContent
            assetsManager={assetsManager()}
            description={text() ?? ""}
            keyMap={keyMap()}
          />
        </div>
      </div>
    </div>
  );
}
