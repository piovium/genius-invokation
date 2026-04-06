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
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

import { For, Show } from "solid-js";
import { useI18n } from "../i18n";
import { avatarToUrl } from "../utils";

export interface AvatarSelectorProps {
  ref?: HTMLDialogElement | ((el: HTMLDialogElement) => void);
  value: string;
  onChange?: (value: string) => void;
}

export function AvatarSelector(props: AvatarSelectorProps) {
  const { t } = useI18n();

  let dialogEl: HTMLDialogElement;
  
  const avatarUrls = AVATARS.map(avatarToUrl);

  return (
    <dialog
      ref={(el) => (dialogEl = el) && (props.ref as any)?.(el)}
      class="max-h-unset max-w-unset h-100dvh w-100dvw overflow-auto pt-[calc(0.75rem+var(--root-padding-top))] md:pt-3 md:m-x-auto md:my-3rem md:h-[calc(100vh-6rem)] md:w-min md:max-h-200 md:rounded-xl md:shadow-xl p-6 scrollbar-hidden"
    >
      <div class="flex flex-col md:min-h-full md:h-min w-full gap-5">
        <h3 class="flex-shrink-0 text-xl font-bold">{t("selectAvatar")}</h3>
        <div class="md:w-120 flex-grow min-h-0 overflow-auto scrollbar-thin-hover p-2 mb-[calc(4.5rem+var(--root-padding-bottom))] md:mb-0">
          <div class="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-3">
            <For each={avatarUrls}>
              {(avatarUrl) => (
                <button
                  class={`relative aspect-square rounded-full overflow-hidden border-2 transition-all hover:scale-105 ${
                    props.value === avatarUrl
                      ? "border-blue-500 ring-2 ring-blue-300"
                      : "border-gray-200"
                  }`}
                  onClick={() => props.onChange?.(avatarUrl)}
                >
                  <img src={avatarUrl} class="w-full h-full object-cover" />
                  <Show when={props.value === avatarUrl}>
                    <div class="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
                      <i class="i-mdi-check-circle text-blue-600 text-2xl" />
                    </div>
                  </Show>
                </button>
              )}
            </For>
          </div>
        </div>
      </div>
      <button
        autofocus
        class="block absolute right-4 top-4 h-5 w-5 text-black bg-transparent"
        onClick={() => dialogEl.close()}
      >
        <i class="inline-block h-full w-full i-mdi-window-close" />
      </button>
    </dialog>
  );
}
