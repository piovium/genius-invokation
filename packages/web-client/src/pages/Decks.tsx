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

import { For, Match, Switch, createResource, Accessor } from "solid-js";
import { Layout } from "../layouts/Layout";
import axios, { AxiosError } from "axios";
import { A } from "@solidjs/router";
import { DeckBriefInfo } from "../components/DeckBriefInfo";
import type { Deck } from "@gi-tcg/typings";
import { useGuestDecks } from "../guest";
import { useAuth } from "../auth";
import { useI18n } from "../i18n";

export interface DeckInfo extends Deck {
  id: number;
  name: string;
  code: string;
  requiredVersion: number;
}

interface DecksResponse {
  count: number;
  data: DeckInfo[];
}

export interface UseDecksResult {
  readonly decks: Accessor<DecksResponse>;
  readonly loading: Accessor<boolean>;
  readonly error: Accessor<any>;
  readonly refetch: () => void;
}

export function useDecks(): UseDecksResult {
  const { status } = useAuth();
  const EMPTY = { count: 0, data: [] };
  const [userDecks, { refetch }] = createResource(
    status,
    () => axios.get<DecksResponse>("decks").then((res) => res.data),
    {
      initialValue: EMPTY,
    },
  );
  const [guestDecks] = useGuestDecks();
  return {
    decks: () => {
      const { type } = status();
      if (type === "guest") {
        const data = guestDecks();
        return {
          data,
          count: data.length,
        };
      } else if (type === "user" && userDecks.state === "ready") {
        return userDecks();
      } else {
        return EMPTY;
      }
    },
    loading: () => status().type === "user" && userDecks.loading,
    error: () => (status().type === "user" ? userDecks.error : void 0),
    refetch: () => (status().type === "user" ? refetch() : void 0),
  };
}

export default function Decks() {
  const { t } = useI18n();
  const { status } = useAuth();
  const { decks, loading, error, refetch } = useDecks();
  const [, { pinGuestDeck }] = useGuestDecks();

  const pinDeck = async (deck: DeckInfo) => {
    const { type } = status();
    try {
      if (type === "guest") {
        await pinGuestDeck(deck.id);
      } else if (type === "user") {
        // trigger updatedAt
        await axios.patch(`decks/${deck.id}`, { name: deck.name });
      }
      refetch();
    } catch (e) {
      if (e instanceof AxiosError) {
        alert(e.response?.data?.message || t("pinFailed"));
      }
      console.error(e);
    }
  };

  return (
    <Layout>
      <div class="container mx-auto h-full px-2 flex flex-col">
        <div class="flex flex-row gap-4 justify-between items-center mb-5">
          <h2 class="text-2xl font-bold">{t("myDecks")}</h2>
          <A class="btn btn-outline-green" href="/decks/new">
            <i class="i-mdi-plus" /> {t("add")}
          </A>
        </div>
        <Switch>
          <Match when={loading()}>{t("loading")}</Match>
          <Match when={error()}>
            {t("loadFailed", { message: error()?.message ?? String(error()) })}
          </Match>
          <Match when={true}>
            <ul class="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-2 md:grid-cols-[repeat(auto-fill,minmax(240px,1fr))] md:gap-3 md:overflow-y-auto scrollbar-thin-hover">
              <For
                each={decks().data}
                fallback={
                  <li class="p-4 text-gray-5">{t("noDecksAddHint")}</li>
                }
              >
                {(deckData) => (
                  <DeckBriefInfo
                    editable
                    onDelete={() => refetch()}
                    onPin={() => pinDeck(deckData)}
                    {...deckData}
                  />
                )}
              </For>
            </ul>
          </Match>
        </Switch>
      </div>
    </Layout>
  );
}
