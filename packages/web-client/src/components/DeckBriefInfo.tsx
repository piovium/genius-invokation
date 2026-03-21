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
import { copyToClipboard } from "../utils";
import type { AssetsManager } from "@gi-tcg/assets-manager";
import { useI18n } from "../i18n";

export interface DeckInfoProps extends DeckInfo {
  editable?: boolean;
  onDelete?: () => void;
}

function CharacterAvatar(props: { id: number; assetsManager: AssetsManager }) {
  const [url] = createResource(
    () => [props.id, props.assetsManager] as const,
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
      class="h-14 w-14 b-2 b-yellow-100 rounded-full"
      src={url()}
      alt={props.assetsManager.getNameSync(props.id)}
    />
  );
}

export function DeckBriefInfo(props: DeckInfoProps) {
  const { t, assetsManager } = useI18n();
  const navigate = useNavigate();
  const { status } = useAuth();
  const [, { removeGuestDeck }] = useGuestDecks();

  const viewDeck = (e: MouseEvent) => {
    e.stopPropagation();
    navigate(`/decks/${props.id}?name=${encodeURIComponent(props.name)}`);
  };

  const copyCode = async (e: MouseEvent) => {
    e.stopPropagation();
    await copyToClipboard(props.code);
    alert(t("shareCodeCopied", { code: props.code }));
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
      class="w-60 bg-yellow-800 hover:bg-yellow-700 transition-all flex flex-col p-2 rounded-xl select-none cursor-default"
      onClick={viewDeck}
    >
      <div class="pl-2 flex flex-row justify-between">
        <h5 class="font-bold text-yellow-100 overflow-hidden whitespace-nowrap text-ellipsis">
          {props.name}
        </h5>
        <div class="flex-shrink-0">
          <button class="btn btn-ghost" title={t("copyShareCode")} onClick={copyCode}>
            <i class="i-mdi-clipboard-outline" />
          </button>
          <Show when={props.editable}>
            <button
              class="btn btn-ghost-red"
              title={t("deleteDeck")}
              onClick={deleteDeck}
            >
              <i class="i-mdi-delete" />
            </button>
          </Show>
        </div>
      </div>
      <div class="p-2 flex flex-row items-center justify-around">
        <For each={props.characters}>
          {(id) => <CharacterAvatar id={id} assetsManager={assetsManager()} />}
        </For>
      </div>
    </div>
  );
}
