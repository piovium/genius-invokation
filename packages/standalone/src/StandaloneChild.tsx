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

import { createClient } from "@gi-tcg/web-ui-core";
import "@gi-tcg/web-ui-core/style.css";
import { onCleanup, onMount } from "solid-js";

export function StandaloneChild() {
  const [uiIo, Chessboard] = createClient(0, {
    onGiveUp: () => {
      window.opener?.postMessage({
        giTcg: "1.0",
        method: "giveUp",
      });
    },
  });

  async function messageHandler(e: MessageEvent) {
    const { data } = e;
    if (typeof data !== "object" || data === null) {
      return;
    }
    if (data.giTcg !== "1.0") {
      return;
    }
    if (!("method" in data)) {
      return;
    }
    switch (data.method) {
      case "notify": {
        if (!Array.isArray(data.params)) {
          return;
        }
        uiIo.notify(...(data.params as [any]));
        break;
      }
      case "rpc": {
        if (!Array.isArray(data.params)) {
          return;
        }
        const result = await uiIo.rpc(...(data.params as [any]));
        (e.source as WindowProxy)?.postMessage(
          {
            giTcg: "1.0",
            method: "rpc",
            result: JSON.parse(JSON.stringify(result)),
            id: data.id,
          },
          "*",
        );
        break;
      }
      case "cancelRpc": {
        uiIo.cancelRpc();
        break;
      }
    }
  }

  onMount(() => {
    window.addEventListener("message", messageHandler);
    window.opener?.postMessage({
      giTcg: "1.0",
      method: "initialized",
    });
  });

  onCleanup(() => {
    window.removeEventListener("message", messageHandler);
  });

  return (
    <div>
      <div class="title-row">
        <span class="title">先手方棋盘</span>
      </div>
      <Chessboard />
    </div>
  );
}
