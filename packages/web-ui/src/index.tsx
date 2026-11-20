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

import { type JSX, render } from "@solidjs/web";
import {
  EMPTY_GAME_STATE,
  type WebUiPlayerIO,
  StandaloneChessboard,
  type StandaloneChessboardProps,
  type ClientOption,
  createClient as createClientSolid,
} from "@gi-tcg/web-ui-core";
import { DetailLogViewer } from "@gi-tcg/detail-log-viewer";
import webUiCss from "@gi-tcg/web-ui-core/style.css?inline";
import { customElement } from "@solidjs/element";

export function createClient(
  element: HTMLElement,
  who: 0 | 1,
  opt?: ClientOption,
) {
  const shadow = element.attachShadow({ mode: "open" });
  const style = document.createElement("style");
  style.textContent = webUiCss;
  shadow.appendChild(style);
  let io: WebUiPlayerIO;
  render(() => {
    let Chessboard: (props: JSX.HTMLAttributes<HTMLDivElement>) => JSX.Element;
    [io, Chessboard] = createClientSolid(who, opt);
    return <Chessboard style={{ width: "100%", height: "100%" }} />;
  }, shadow);
  return io!;
}

const standaloneChessboardDefaultProps: StandaloneChessboardProps = {
  state: EMPTY_GAME_STATE,
  who: 0,
  mutations: [],
  assetsManager: void 0,
};

customElement(
  "gi-tcg-standalone-chessboard",
  standaloneChessboardDefaultProps,
  (props, { element }) => {
    return (
      <>
        <style>{webUiCss}</style>
        <StandaloneChessboard {...props} />
      </>
    );
  },
);

const detailLogViewerDefaultProps: DetailLogViewer.Props = {
  logs: [],
  names: void 0,
};

customElement(
  "gi-tcg-detail-log-viewer",
  detailLogViewerDefaultProps,
  (props, { element }) => {
    return (
      <>
        {/* <style>{css}</style> */}
        <DetailLogViewer {...props} />
      </>
    );
  },
);
