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

import { Accessor, createResource, createSignal } from "solid-js";
import { makePersisted } from "@solid-primitives/storage";
import type { DeckInfo } from "./pages/Decks";
import type { Deck } from "@gi-tcg/typings";
import axios from "axios";
import { createStore, produce } from "solid-js/store";
import pLimit from "p-limit";

export interface GuestInfo {
  type: "guest";
  name: string;
  id: string | null;
  chessboardColor: string | null;
  avatarUrl: string | null;
}

export interface DeckWithName extends Deck {
  name: string;
}

export type GuestDeck = readonly [
  Accessor<DeckInfo[]>,
  {
    addGuestDeck: (deck: DeckWithName) => Promise<DeckInfo>;
    updateGuestDeck: (
      id: number,
      deck: Partial<DeckWithName>,
    ) => Promise<DeckInfo>;
    removeGuestDeck: (id: number) => Promise<void>;
    pinGuestDeck: (id: number) => Promise<void>;
  },
];

const [guestInfo, setGuestInfo] = makePersisted(
  // eslint-disable-next-line solid/reactivity
  createSignal<GuestInfo | null>(null),
  { storage: localStorage },
);

export const useGuestInfo = () => [guestInfo, setGuestInfo] as const;

// eslint-disable-next-line solid/reactivity
const [guestDeck, setGuestDeck] = makePersisted(createStore<DeckInfo[]>([]), {
  storage: localStorage,
});

type VersionResponse = Omit<DeckInfo, "id">;

export const useGuestDecks = (): GuestDeck => {
  const addGuestDeck = async (deck: DeckWithName) => {
    const id = Date.now();
    const { data } = await axios.post<VersionResponse>("decks/version", deck);
    const deckInfo: DeckInfo = { ...data, ...deck, id };
    setGuestDeck((decks) => [...decks, deckInfo]);
    return deckInfo;
  };

  const updateGuestDeck = async (
    id: number,
    newDeck: Partial<DeckWithName>,
  ) => {
    const index = guestDeck.findIndex((deck) => deck.id === id);
    if (index === -1) {
      throw new Error("Deck not found");
    }
    const oldDeck = guestDeck[index];
    const { data } = await axios.post<VersionResponse>("decks/version", {
      ...oldDeck,
      ...newDeck,
    });
    const result = { ...data, ...newDeck, id };
    setGuestDeck(
      produce((decks) => {
        decks.splice(index, 1);
        decks.push(result);
      }),
    );
    return result;
  };

  const removeGuestDeck = async (id: number) => {
    const idx = guestDeck.findIndex((deck) => deck.id === id);
    if (idx === -1) {
      throw new Error("Deck not found");
    }
    setGuestDeck(
      produce((decks) => {
        decks.splice(idx, 1);
      }),
    );
  };

  const limit = pLimit(1);

  return [
    () => guestDeck.toReversed(),
    {
      addGuestDeck: (deck) => limit(addGuestDeck, deck),
      updateGuestDeck: (id, newDeck) => limit(updateGuestDeck, id, newDeck),
      removeGuestDeck: (id) => limit(removeGuestDeck, id),
      pinGuestDeck: async (id) => {
        await limit(updateGuestDeck, id, {});
      },
    },
  ];
};
