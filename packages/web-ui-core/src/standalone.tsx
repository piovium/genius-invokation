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
import { translations, UiContext, type Locale } from "./hooks/context";
import { parseMutations } from "./mutations";
import {
  type AssetsManager,
  DEFAULT_ASSETS_MANAGER,
} from "@gi-tcg/assets-manager";
import { updateHistory, type HistoryData } from "./history/parser";
import type { HistoryBlock } from "./history/typings";
import { resolveTemplate, translator } from "@solid-primitives/i18n";

export interface StandaloneChessboardProps extends ComponentProps<"div"> {
  who: 0 | 1;
  assetsManager?: AssetsManager;
  locale?: Locale;
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

  const getLocale = () => localProps.locale ?? "zh-CN";
  const dict = createMemo(() => translations[getLocale()]);
  const t = translator(dict, resolveTemplate);

  const history = createMemo<HistoryBlock[]>(() => {
    return [];
  });

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
        assetsManager: () => localProps.assetsManager ?? DEFAULT_ASSETS_MANAGER,
        locale: getLocale,
        t,
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
