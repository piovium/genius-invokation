// Copyright (C) 2024-2025 Guyutongxue
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

import { useNavigate } from "@solidjs/router";
import axios, { AxiosError } from "axios";
import { createResource, For, Show } from "solid-js";
import { DeckInfo } from "../pages/Decks";
import { useGuestDecks } from "../guest";
import { useAuth } from "../auth";
import { copyShareCode } from "../utils";
import { useI18n } from "../i18n";

export interface DeckInfoProps extends DeckInfo {
  editable?: boolean;
  onDelete?: () => void;
  onPin?: () => void;
}

function CharacterAvatar(props: { id: number }) {
  const { assetsManager } = useI18n();
  const [url] = createResource(
    () => [props.id, assetsManager()] as const,
    ([id, assetsManager]) =>
      assetsManager.getImageUrl(id, {
        type: "icon",
        thumbnail: true,
      }),
    {
      initialValue: `data:image/svg+xml;charset=utf-8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="100%" height="100%" fill="%23f0f0f0"/></svg>`,
    },
  );
  return (
    <img
      class="h-10 w-10 b-2 md:h-14 md:w-14 md:b-3 b-gray-500 rounded-full"
      src={url()}
      alt={assetsManager().getNameSync(props.id)}
    />
  );
}

export function DeckBriefInfo(props: DeckInfoProps) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { status } = useAuth();
  const [, { removeGuestDeck }] = useGuestDecks();

  const viewDeck = (e: MouseEvent) => {
    e.stopPropagation();
    navigate(`/decks/${props.id}?name=${encodeURIComponent(props.name)}`);
  };

  const copyCode = async (e: MouseEvent) => {
    e.stopPropagation();
    await copyShareCode(props.code, t);
  };

  const deleteDeck = async (e: MouseEvent) => {
    e.stopPropagation();
    const { type } = status();
    if (confirm(t("deleteDeckConfirm", { name: props.name }))) {
      try {
        if (type === "guest") {
          await removeGuestDeck(props.id);
        } else if (type === "user") {
          await axios.delete(`decks/${props.id}`);
        }
        props.onDelete?.();
      } catch (e) {
        if (e instanceof AxiosError) {
          alert(e.response?.data.message);
        }
        console.error(e);
      }
    }
  };

  return (
    <div
      class="w-full deck-info-card transition-all flex flex-col p-1 md:p-2 rounded-xl select-none cursor-default"
      onClick={viewDeck}
    >
      <div class="px-2 py-1 flex flex-row justify-between items-center">
        <h5 class="font-bold text-blue-900 overflow-hidden whitespace-nowrap text-ellipsis">
          {props.name}
        </h5>
        <div class="flex-shrink-0 flex flex-row gap-2">
          <button
            class="btn color-blue-900 h-6 w-6 p-0 hover:color-blue-500"
            title={t("copyShareCode")}
            onClick={copyCode}
          >
            <i class="i-mdi-file-export-outline h-5.5 w-5.5" />
          </button>
          <Show when={props.editable}>
            <button
              class="btn color-blue-900 h-6 w-6 p-0 hover:color-blue-500"
              title={t("pinDeck")}
              onClick={(e: MouseEvent) => {
                e.stopPropagation();
                props.onPin?.();
              }}
            >
              <i class="i-mdi-sort-descending h-6 w-6" />
            </button>
            <button
              class="btn color-red-800 h-6 w-6 p-0 hover:color-red-500"
              title={t("deleteDeck")}
              onClick={deleteDeck}
            >
              <i class="i-mdi-delete-outline h-6 w-6" />
            </button>
          </Show>
        </div>
      </div>
      <div class="p-1 md:p-2 flex flex-row items-center justify-around">
        <For each={props.characters}>{(id) => <CharacterAvatar id={id} />}</For>
      </div>
    </div>
  );
}
