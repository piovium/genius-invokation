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
  createMemo,
  Errored,
  Loading,
  createSignal,
  Switch,
  Match,
  Show,
  onSettled,
  snapshot,
  untrack,
} from "solid-js";
import { Layout } from "../layouts/Layout";
import axios from "axios";
import type { Deck } from "@gi-tcg/typings";
import { DEFAULT_ASSETS_MANAGER } from "@gi-tcg/assets-manager";
import { useParams, useSearchParams } from "@solidjs/router";
import { DeckBuilder } from "@gi-tcg/deck-builder";
import "@gi-tcg/deck-builder/style.css";
import { type DeckWithName, useGuestDecks } from "../guest";
import type { DeckInfo } from "./Decks";
import { useAuth } from "../auth";
import { copyShareCode, getErrorMessage } from "../utils";
import { useI18n } from "../i18n";
import { TextFieldEdit } from "../components/TextFieldEdit";
import { AutoResizeText } from "@gi-tcg/web-ui-core";

export default function EditDeck() {
  const params = useParams<{ id: string }>();
  const { t } = useI18n();
  const { status, loading, error } = useAuth();
  const owner = () => {
    const current = status();
    return current.type === "user"
      ? current.id
      : current.type === "guest" && "guest";
  };
  const authMessage = () => {
    if (loading()) {
      return t("loading");
    }
    const cause = error();
    return cause
      ? t("userInfoLoadFailed", { message: getErrorMessage(cause) })
      : t("notLoggedIn");
  };
  return (
    <Layout>
      <Show
        when={owner()}
        keyed
        fallback={<DeckLoadStatus message={authMessage()} />}
      >
        {(owner) => (
          <Show when={params.id} keyed>
            {(id) => (
              <Errored
                fallback={(err) => (
                  <DeckLoadStatus
                    message={t("loadFailed", {
                      message: getErrorMessage(err()),
                    })}
                  />
                )}
              >
                <Loading fallback={<DeckLoadStatus message={t("loading")} />}>
                  <DeckLoader id={id} guest={owner === "guest"} />
                </Loading>
              </Errored>
            )}
          </Show>
        )}
      </Show>
    </Layout>
  );
}

function DeckLoadStatus(props: { message: string }) {
  const { t } = useI18n();
  const [searchParams] = useSearchParams<{ name: string }>();
  return (
    <div class="container mx-auto px-2">
      <div class="flex items-center justify-between mb-3">
        <Show when={searchParams.name}>
          {(name) => <h2 class="text-xl md:text-2xl font-bold">{name()}</h2>}
        </Show>
        <button
          class="ml-auto btn btn-outline-red"
          onClick={() => history.back()}
        >
          {t("back")}
        </button>
      </div>
      <p>{props.message}</p>
    </div>
  );
}

interface DeckRouteProps {
  id: string;
  guest: boolean;
}

function DeckLoader(props: DeckRouteProps) {
  const { t } = useI18n();
  const [guestDecks] = useGuestDecks();
  const [searchParams] = useSearchParams<{ name: string }>();
  const initialDeck = createMemo(() => {
    if (props.id === "new") {
      return {
        characters: [],
        cards: [],
        name: searchParams.name ?? t("newDeck"),
      };
    }
    const id = Number(props.id);
    if (props.guest) {
      const deck = guestDecks().find((d) => d.id === id);
      if (!deck) {
        throw new Error(t("deckNotFound"));
      }
      return snapshot(deck);
    }
    return axios.get<DeckInfo>(`decks/${id}`).then(({ data }) => data);
  });
  return (
    <Show when={initialDeck()}>
      {(deck) => <DeckEditor {...props} initialDeck={deck()} />}
    </Show>
  );
}

function DeckEditor(props: DeckRouteProps & { initialDeck: DeckWithName }) {
  const { t, locale, assetsManager } = useI18n();
  const [, { addGuestDeck, updateGuestDeck }] = useGuestDecks();
  const [searchParams, setSearchParams] = useSearchParams<{ name: string }>();
  const isNew = props.id === "new";
  const deckId = Number(props.id);
  const initialDeck = untrack(() => props.initialDeck);
  const [deckName, setDeckName] = createSignal(initialDeck.name);
  const [deckValue, setDeckValue] = createSignal<Deck>(initialDeck);
  const [uploading, setUploading] = createSignal(false);
  const [uploadDone, setUploadDone] = createSignal(false);
  onSettled(() => {
    if (!isNew && searchParams.name) {
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
    if (
      dirty() &&
      window.confirm(t("unsavedChangesConfirm")) &&
      !(await saveDeck())
    ) {
      return;
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
    try {
      if (!isNew) {
        if (props.guest) {
          await updateGuestDeck(deckId, { name: newName });
        } else {
          await axios.patch(`decks/${deckId}`, { name: newName });
        }
      }
      setDeckName(newName);
      return true;
    } catch (error) {
      alert(getErrorMessage(error));
      return false;
    }
  };

  const saveDeck = async () => {
    const deckInfo = { ...deckValue(), name: deckName() };
    try {
      setUploading(true);
      if (isNew) {
        if (props.guest) {
          await addGuestDeck(deckInfo);
        } else {
          await axios.post("decks", deckInfo);
        }
        setDirty(false);
      } else {
        if (props.guest) {
          await updateGuestDeck(deckId, deckInfo);
        } else {
          await axios.patch(`decks/${deckId}`, deckInfo);
        }
        setDirty(false);
        setUploadDone(true);
        setTimeout(() => setUploadDone(false), 500);
      }
      return true;
    } catch (error) {
      alert(getErrorMessage(error));
      return false;
    } finally {
      setUploading(false);
    }
  };

  return (
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
            class="flex-shrink-0 btn btn-solid-green min-w-15 md:min-w-22 max-w-20% py-0 px-1"
            aria-label={t("saveDeck")}
            aria-busy={uploading() ? "true" : "false"}
            disabled={!valid() || uploading()}
            onClick={async () => {
              if ((await saveDeck()) && isNew) {
                history.back();
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
              <Match when={true}>
                <AutoResizeText minFontSize={10}>
                  {t("saveDeck")}
                </AutoResizeText>
              </Match>
            </Switch>
          </button>
          <span class="flex-grow" />
          <button
            class="flex-shrink-0 btn btn-outline-red min-w-15 max-w-20% py-0 px-1"
            onClick={() => navigateBack()}
          >
            <AutoResizeText minFontSize={10}>{t("back")}</AutoResizeText>
          </button>
        </div>
      </div>
      <DeckBuilder
        class={`h-[calc(100dvh-9rem)] @3xl:h-auto w-full flex-grow min-h-0`}
        assetsManager={assetsManager()}
        locale={locale()}
        deck={deckValue()}
        onChangeDeck={(v) => (setDeckValue(v), setDirty(true))}
      />
    </div>
  );
}
