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

import {
  createSignal,
  createResource,
  Switch,
  Match,
  Show,
  createEffect,
} from "solid-js";
import { Layout } from "../layouts/Layout";
import axios, { AxiosError } from "axios";
import type { Deck } from "@gi-tcg/typings";
import { DEFAULT_ASSETS_MANAGER } from "@gi-tcg/assets-manager";
import { useParams, useSearchParams } from "@solidjs/router";
import { DeckBuilder } from "@gi-tcg/deck-builder";
import "@gi-tcg/deck-builder/style.css";
import { useGuestDecks } from "../guest";
import { DeckInfo } from "./Decks";
import { useAuth } from "../auth";
import { unwrap } from "solid-js/store";
import { useMobile } from "../App";
import { copyToClipboard } from "../utils";

export default function EditDeck() {
  const params = useParams();
  const mobile = useMobile();
  const { status } = useAuth();
  const [guestDecks, { addGuestDeck, updateGuestDeck }] = useGuestDecks();
  const [searchParams, setSearchParams] = useSearchParams();
  const isNew = params.id === "new";
  const deckId = Number(params.id);
  const [deckName, setDeckName] = createSignal<string>(
    searchParams.name ?? "新建牌组",
  );
  const [nameInputEl, setNameInputEl] = createSignal<HTMLInputElement>();
  const [editingName, setEditingName] = createSignal(false);
  const [uploading, setUploading] = createSignal(false);
  const [uploadDone, setUploadDone] = createSignal(false);
  const [deckValue, setDeckValue] = createSignal<Deck>({
    characters: [],
    cards: [],
  });
  const [userDeckData] = createResource(() =>
    isNew ? void 0 : axios.get(`decks/${deckId}`).then((r) => r.data),
  );

  createEffect(() => {
    if (isNew) {
      return;
    }
    let deckInfo: DeckInfo = userDeckData.error ? void 0 : userDeckData();
    const { type } = status();
    if (type === "guest") {
      const found = guestDecks().find((d) => d.id === deckId);
      if (!found) {
        throw new Error("未找到该牌组");
      }
      deckInfo = found;
    }
    if (deckInfo) {
      setDeckValue(unwrap(deckInfo));
      setDeckName(deckInfo.name);
      setSearchParams({ name: null }, { replace: true });
    }
  });

  const [dirty, setDirty] = createSignal(false);

  // useBeforeLeave(async (e) => {
  //   if (dirty()) {
  //     e.preventDefault();
  //     if (window.confirm("您有未保存的更改，是否保存？")) {
  //       await saveDeck();
  //     }
  //     e.retry(true);
  //   }
  // });
  const navigateBack = async () => {
    if (dirty()) {
      if (window.confirm("您有未保存的更改，是否保存？")) {
        await saveDeck();
      }
    }
    history.back();
  };

  const valid = () => {
    const deck = deckValue();
    return deck.characters.length === 3 && deck.cards.length === 30;
  };

  const importCode = () => {
    const input = window.prompt("请输入分享码");
    if (input === null) {
      return;
    }
    try {
      const deck = DEFAULT_ASSETS_MANAGER.decode(input);
      setDeckValue(deck);
      setDirty(true);
    } catch (e) {
      if (e instanceof Error) {
        window.alert(e.message);
      }
      console.error(e);
    }
  };

  const exportCode = async () => {
    try {
      const deck = deckValue();
      const code = DEFAULT_ASSETS_MANAGER.encode(deck);
      await copyToClipboard(code);
      alert(`分享码已复制到剪贴板：${code}`);
    } catch (e) {
      if (e instanceof Error) {
        window.alert(e.message);
      }
      console.error(e);
    }
  };

  const startEditingName = () => {
    setEditingName(true);
    const nameInput = nameInputEl();
    if (nameInput) {
      nameInput.value = deckName();
      nameInput?.focus();
    }
  };

  const saveName = async (e: SubmitEvent) => {
    e.preventDefault();
    const data = new FormData(e.target as HTMLFormElement);
    const newName = data.get("name") as string;
    const oldName = deckName();
    const { type } = status();
    if (!isNew) {
      try {
        setUploading(true);
        if (type === "guest") {
          await updateGuestDeck(deckId, { name: newName });
        } else if (type === "user") {
          await axios.patch(`decks/${deckId}`, { name: newName });
        }
        setDeckName(newName);
        setEditingName(false);
      } catch (e) {
        if (e instanceof AxiosError) {
          alert(e.response?.data.message);
          setDeckName(oldName);
        }
        console.error(e);
      } finally {
        setUploading(false);
      }
    } else {
      setDeckName(newName);
      setEditingName(false);
    }
  };

  const saveDeck = async () => {
    const deck = deckValue();
    const { type } = status();
    try {
      setUploading(true);
      if (isNew) {
        const deckInfo = { ...deck, name: deckName() };
        if (type === "guest") {
          await addGuestDeck(deckInfo);
        } else if (type === "user") {
          await axios.post("decks", deckInfo);
        }
        setDirty(false);
      } else {
        if (type === "guest") {
          await updateGuestDeck(deckId, {
            cards: deck.cards,
            characters: deck.characters,
          });
        } else if (type === "user") {
          await axios.patch(`decks/${deckId}`, { ...deck });
        }
        setDirty(false);
        setUploadDone(true);
        setTimeout(() => setUploadDone(false), 500);
      }
      return true;
    } catch (e) {
      if (e instanceof AxiosError) {
        alert(e.response?.data.message);
      }
      console.error(e);
      return false;
    } finally {
      setUploading(false);
    }
  };

  return (
    <Layout>
      <div class="container mx-auto h-full flex flex-col px-2 @container">
        <div class="flex flex-row flex-wrap items-center gap-1 md:gap-3 mb-3 md:mb-5 min-h-0">
          <Show
            when={editingName()}
            fallback={
              <div class="flex flex-row items-center gap-2">
                <h2 class="text-xl md:text-2xl font-bold min-w-0 overflow-hidden whitespace-nowrap text-ellipsis flex-shrink-0">
                  {deckName()}
                </h2>
                <button class="btn btn-ghost h-8 w-8 p-1" onClick={startEditingName}>
                  <i class="i-mdi-pencil-outline" />
                </button>
              </div>
            }
          >
            <form onSubmit={saveName} class="flex flex-row gap-1 md:gap-3 text-3.2 md:text-3.5">
              <input
                type="text"
                required
                ref={setNameInputEl}
                onFocus={(e) => e.target.select()}
                name="name"
                class="input input-outline min-w-40 md:w-50 h-8 text-1rem"
              />
              <button
                type="submit"
                class="btn btn-soft-green h-8 w-12"
                disabled={uploading()}
              >
                <Show when={uploading()} fallback="保存">
                  <i class="i-mdi-loading animate-spin" />
                </Show>
              </button>
              <button
                class="btn btn-soft-red h-8 w-12"
                onClick={() => setEditingName(false)}
              >
                取消
              </button>
            </form>
          </Show>
          <div class="flex flex-row flex-1 gap-1 md:gap-3 text-3.2 md:text-3.5">
            <button
              class="btn btn-outline-blue"
              onClick={importCode}
            >
              导入分享码
            </button>
            <button
              class="btn btn-outline"
              onClick={exportCode}
            >
              生成分享码
            </button>
            <button
              class="flex-shrink-0 btn btn-solid-green min-w-18 md:min-w-22"
              disabled={!valid() || uploading()}
              onClick={async () => {
                if (await saveDeck()) {
                  if (isNew) {
                    navigateBack();
                  }
                }
              }}
            >
              <Switch>
                <Match when={uploading()}>
                  <i class="i-mdi-loading animate-spin" />
                </Match>
                <Match when={uploadDone()}>
                  <i class="i-mdi-check" />
                </Match>
                <Match when={true}>保存牌组</Match>
              </Switch>
            </button>
            <span class="flex-grow" />
            <button
              class="flex-shrink-0 btn btn-outline-red"
              onClick={() => navigateBack()}
            >
              返回
            </button>
          </div>
        </div>
        <Switch>
          <Match when={userDeckData.loading}>正在加载中...</Match>
          <Match when={status().type !== "guest" && userDeckData.error}>
            加载失败：{" "}
            {userDeckData.error instanceof AxiosError
              ? userDeckData.error.response?.data.message
              : userDeckData.error}
          </Match>
          <Match when={status().type !== "notLogin"}>
            <DeckBuilder
              class={`h-[calc(100dvh-9rem)] @3xl:h-auto w-full flex-grow min-h-0`}
              deck={deckValue()}
              onChangeDeck={(v) => (setDeckValue(v), setDirty(true))}
            />
          </Match>
        </Switch>
      </div>
    </Layout>
  );
}
