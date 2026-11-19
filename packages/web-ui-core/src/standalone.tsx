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
import { createMemo, omit } from "solid-js";
import type { ComponentProps } from "@solidjs/web";
import { Chessboard, type ChessboardData } from "./components/Chessboard";
import { createUiTranslator, UiContext, type Locale } from "./hooks/context";
import { parseMutations } from "./mutations";
import {
  type AssetsManager,
  DEFAULT_ASSETS_MANAGER,
} from "@gi-tcg/assets-manager";
import type { HistoryBlock } from "./history/typings";

export interface StandaloneChessboardProps extends ComponentProps<"div"> {
  who: 0 | 1;
  assetsManager?: AssetsManager;
  locale?: Locale;
  state: PbGameState;
  mutations: PbExposedMutation[];
}

export function StandaloneChessboard(props: StandaloneChessboardProps) {
  const elProps = omit(
    props,
    "who",
    "assetsManager",
    "locale",
    "state",
    "mutations",
  );

  const getLocale = () => props.locale ?? "zh-CN";
  const t = createUiTranslator(getLocale);

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
    <UiContext
      value={{
        assetsManager: () => props.assetsManager ?? DEFAULT_ASSETS_MANAGER,
        locale: getLocale,
        t,
      }}
    >
      <Chessboard
        who={props.who}
        data={data()}
        actionState={null}
        history={history()}
        viewType="normal"
        selectCardCandidates={[]}
        doingRpc={false}
        opp={null}
        {...elProps}
      />
    </UiContext>
  );
}
