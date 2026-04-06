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
import { copyShareCode } from "../utils";
import { useI18n } from "../i18n";
import { TextFieldEdit } from "../components/TextFieldEdit";

export default function EditDeck() {
  const { t, locale, assetsManager } = useI18n();
  const params = useParams();
  const { status } = useAuth();
  const [guestDecks, { addGuestDeck, updateGuestDeck }] = useGuestDecks();
  const [searchParams, setSearchParams] = useSearchParams();
  const isNew = params.id === "new";
  const deckId = Number(params.id);
  const [deckName, setDeckName] = createSignal<string>(
    searchParams.name ?? t("newDeck"),
  );
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
        throw new Error(t("deckNotFound"));
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
      if (window.confirm(t("unsavedChangesConfirm"))) {
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
    const input = window.prompt(t("inputShareCode"));
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
      await copyShareCode(code, t);
    } catch (e) {
      if (e instanceof Error) {
        window.alert(e.message);
      }
      console.error(e);
    }
  };

  const saveName = async (newName: string) => {
    const oldName = deckName();
    const { type } = status();
    if (!isNew) {
      try {
        if (type === "guest") {
          await updateGuestDeck(deckId, { name: newName });
        } else if (type === "user") {
          await axios.patch(`decks/${deckId}`, { name: newName });
        }
        setDeckName(newName);
        return true;
      } catch (e) {
        if (e instanceof AxiosError) {
          alert(e.response?.data.message);
          setDeckName(oldName);
        }
        console.error(e);
      }
      return false;
    } else {
      setDeckName(newName);
      return true;
    }
  };

  const saveDeck = async () => {
    const deckInfo = { ...deckValue(), name: deckName() };
    const { type } = status();
    try {
      setUploading(true);
      if (isNew) {
        if (type === "guest") {
          await addGuestDeck(deckInfo);
        } else if (type === "user") {
          await axios.post("decks", deckInfo);
        }
        setDirty(false);
      } else {
        if (type === "guest") {
          await updateGuestDeck(deckId, deckInfo);
        } else if (type === "user") {
          await axios.patch(`decks/${deckId}`, deckInfo);
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
          <TextFieldEdit
            value={deckName()}
            saveText={t("save")}
            cancelText={t("cancel")}
            class="text-xl md:text-2xl font-bold "
            onSave={saveName}
          />
          <div class="flex flex-row flex-1 gap-1 md:gap-3 text-3.2 md:text-3.5">
            <button class="btn btn-outline-blue" onClick={importCode}>
              {t("importShareCode")}
            </button>
            <button class="btn btn-outline" onClick={exportCode}>
              {t("generateShareCode")}
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
                <Match when={true}>{t("saveDeck")}</Match>
              </Switch>
            </button>
            <span class="flex-grow" />
            <button
              class="flex-shrink-0 btn btn-outline-red"
              onClick={() => navigateBack()}
            >
              {t("back")}
            </button>
          </div>
        </div>
        <Switch>
          <Match when={userDeckData.loading}>{t("loading")}</Match>
          <Match when={status().type !== "guest" && userDeckData.error}>
            {t("loadFailed", {
              message:
                userDeckData.error instanceof AxiosError
                  ? userDeckData.error.response?.data.message
                  : userDeckData.error,
            })}
          </Match>
          <Match when={status().type !== "notLogin"}>
            <DeckBuilder
              class={`h-[calc(100dvh-9rem)] @3xl:h-auto w-full flex-grow min-h-0`}
              assetsManager={assetsManager()}
              locale={locale()}
              deck={deckValue()}
              onChangeDeck={(v) => (setDeckValue(v), setDirty(true))}
            />
          </Match>
        </Switch>
      </div>
    </Layout>
  );
}
