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
// along with this program.  If not, see <http://www.gnu.org/licenses/>.

/* @refresh reload */

import "./index";

import { makePersisted } from "@solid-primitives/storage";
import { createMemo, createSignal } from "solid-js";
import { render } from "solid-js/web";

import getData from "@gi-tcg/data";
import {
  CURRENT_VERSION,
  deserializeGameStateLog,
  serializeGameStateLog,
  type GameState,
} from "@gi-tcg/core";

import { GameStateEditor } from "./components/GameStateEditor";

const STORAGE_KEY = "gi-tcg-state-editor-latest";

function downloadState(serialized: string) {
  const blob = new Blob([serialized], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "resumable-game-state.json";
  anchor.click();
  URL.revokeObjectURL(url);
}

function App() {
  const [persistedState, setPersistedState] = makePersisted(
    // eslint-disable-next-line solid/reactivity
    createSignal<string | null>(null),
    {
      storage: localStorage,
      name: STORAGE_KEY,
    },
  );

  const initialState = createMemo(() => {
    const source = persistedState();
    if (!source) {
      return;
    }
    try {
      const logs = deserializeGameStateLog(
        getData(CURRENT_VERSION),
        JSON.parse(source),
      );
      return logs[0]?.state;
    } catch (error) {
      console.error(error);
      return;
    }
  });

  const handleSubmit = (state: GameState) => {
    const serialized = JSON.stringify(
      serializeGameStateLog([{ state, canResume: true }]),
      null,
      2,
    );
    setPersistedState(serialized);
    downloadState(serialized);
  };

  return (
    <GameStateEditor initialValue={initialState()} onSubmit={handleSubmit} />
  );
}

render(() => <App />, document.getElementById("root") as HTMLElement);
