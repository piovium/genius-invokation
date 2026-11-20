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

import { paths } from "../router";
import { affects, refresh, createMemo, Loading, Errored, For } from "solid-js";
import { Layout } from "../layouts/Layout";
import axios, { AxiosError } from "axios";
import { DeckBriefInfo } from "../components/DeckBriefInfo";
import type { Deck } from "@gi-tcg/typings";
import { useGuestDecks } from "../guest";
import { useAuth } from "../auth";
import { useI18n } from "../i18n";
import { getErrorMessage } from "../utils";

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

export function useDecks() {
  const { status } = useAuth();
  const [guestDecks] = useGuestDecks();
  const decks = createMemo<DecksResponse>(() => {
    const { type } = status();
    if (type === "user") {
      return axios.get<DecksResponse>("decks").then(({ data }) => data);
    }
    const data = type === "guest" ? guestDecks() : [];
    return { count: data.length, data };
  });
  return {
    decks,
    refetch: () => {
      if (status().type === "user") {
        affects(decks);
        return refresh(decks);
      }
    },
  };
}

export default function Decks() {
  const { t } = useI18n();
  const { status } = useAuth();
  const { decks, refetch } = useDecks();
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
      await refetch();
    } catch (e) {
      if (e instanceof AxiosError) {
        alert(getErrorMessage(e) || t("pinFailed"));
      }
      console.error(e);
    }
  };

  return (
    <Layout>
      <div class="container mx-auto h-full px-2 flex flex-col">
        <div class="flex flex-row gap-4 justify-between items-center mb-5">
          <h2 class="text-2xl font-bold">{t("myDecks")}</h2>
          <a class="btn btn-outline-green" href={paths.decks("new")}>
            <i class="i-mdi-plus" /> {t("add")}
          </a>
        </div>
        <Errored
          fallback={(err) =>
            t("loadFailed", { message: getErrorMessage(err()) })
          }
        >
          <Loading on={status().type} fallback={t("loading")}>
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
          </Loading>
        </Errored>
      </div>
    </Layout>
  );
}
