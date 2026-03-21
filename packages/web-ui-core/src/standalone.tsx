// Copyright (C) 2025 Guyutongxue
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

import type { PbExposedMutation, PbGameState } from "@gi-tcg/typings";
import { createMemo, splitProps, untrack, type ComponentProps } from "solid-js";
import { Chessboard, type ChessboardData } from "./components/Chessboard";
import { UiContext } from "./hooks/context";
import { parseMutations } from "./mutations";
import { type AssetsManager, DEFAULT_ASSETS_MANAGER } from "@gi-tcg/assets-manager";
import { updateHistory, type HistoryData } from "./history/parser";
import type { HistoryBlock } from "./history/typings";
import { detectLocale, t as translate } from "./i18n";

export interface StandaloneChessboardProps extends ComponentProps<"div"> {
  who: 0 | 1;
  assetsManager?: AssetsManager | (() => AssetsManager);
  locale?: "zh-CN" | "en-US" | (() => "zh-CN" | "en-US");
  state: PbGameState;
  mutations: PbExposedMutation[];
}

export function StandaloneChessboard(props: StandaloneChessboardProps) {
  const [localProps, elProps] = splitProps(props, [
    "who",
    "assetsManager",
    "locale",
    "state",
    "mutations",
  ]);

  const history = createMemo<HistoryBlock[]>(() => {
    return [];
  });
  const getAssetsManager = () =>
    (typeof localProps.assetsManager === "function"
      ? localProps.assetsManager()
      : localProps.assetsManager) ?? DEFAULT_ASSETS_MANAGER;
  const getLocale = () =>
    typeof localProps.locale === "function"
      ? localProps.locale()
      : localProps.locale ?? detectLocale();
  const getName = (definitionId?: number) => {
    if (!definitionId) {
      return "???";
    }
    const assetsManager = getAssetsManager();
    try {
      return assetsManager.getDataSync(definitionId).name;
    } catch {
      return assetsManager.getNameSync(definitionId) ?? `${definitionId}`;
    }
  };

  const data = createMemo<ChessboardData>(() => {
    const parsed = parseMutations(props.mutations);
    return {
      ...parsed,
      previousState: props.state,
      state: props.state,
    };
  });
  return (
    <UiContext.Provider
      value={{
        assetsManager: getAssetsManager,
        locale: getLocale,
        t: (key, params) => translate(key, params, getLocale()),
        getName,
      }}
    >
      <Chessboard
        who={localProps.who}
        data={data()}
        actionState={null}
        history={history()}
        viewType="normal"
        selectCardCandidates={[]}
        doingRpc={false}
        opp={null}
        {...elProps}
      />
    </UiContext.Provider>
  );
}
