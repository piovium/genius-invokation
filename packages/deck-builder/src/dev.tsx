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
// along with this program.  If not, see <http://www.gnu.org/licenses/>.

import { render } from "solid-js/web";
import { DeckBuilder } from ".";
import type { Deck } from "@gi-tcg/typings";
import { createEffect, createSignal } from "solid-js";
import { AssetsManager } from "@gi-tcg/assets-manager";

const EMPTY_DECK: Deck = {
  characters: [],
  cards: [],
};

function App() {
  const [deck, setDeck] = createSignal<Deck>(EMPTY_DECK);
  createEffect(() => {
    console.log(deck());
  });
  const assetsManager = new AssetsManager({
    apiEndpoint: `https://static-data.piovium.org/api/v4`,
    language: 'EN',
  })
  return (
    <DeckBuilder
      assetsManager={assetsManager}
      class="mobile"
      deck={deck()}
      onChangeDeck={setDeck}
      locale="en"
      // version="v3.3.0"
    />
  );
}

render(() => <App />, document.getElementById("root")!);
