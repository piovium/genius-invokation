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

import { optimize } from "svgo";
import { Plugin } from "vite";
import { readFile } from "node:fs/promises";
import path from "node:path";

async function compileSvg(filepath: string, source: string) {
  const filename = path.basename(filepath);
  const remoteRenderedUrl = `https://ui-assets.piovium.org/${filename}.webp`;
  return `import { Show, createSignal, omit } from "solid-js";
export default (props = {}) => {
  const elProps = omit(props, "noRender");
  const remoteRenderedUrl = ${JSON.stringify(remoteRenderedUrl)};
  const [remoteError, setRemoteError] = createSignal(false);
  const [remoteLoaded, setRemoteLoaded] = createSignal(false);
  const errored = () => props.noRender || window.GI_TCG_REMOTE_RENDERED_ERRORS?.includes(remoteRenderedUrl) || remoteError();
  const isAppleMobile = () => !!window.GestureEvent;
  return (
    <>
      <Show when={!errored()}>
        <img
          data-display-none={!remoteLoaded()}
          {...elProps}
          src={remoteRenderedUrl}
          draggable="false"
          onError={() => {
            setRemoteError(true);
            (window.GI_TCG_REMOTE_RENDERED_ERRORS ??= []).push(remoteRenderedUrl);
          }}
          onLoad={() => setRemoteLoaded(true)}
        />
      </Show>
      <Show when={errored() || (!remoteLoaded() && !isAppleMobile())}>
        <div data-contain-strict {...elProps} ref={host => {
          host.attachShadow({mode: "open"}).innerHTML = ${JSON.stringify(source)};
        }} />
      </Show>
    </>
  );
}
`;
}

async function optimizeSvg(content: string, path: string) {
  const result = optimize(content, { path });
  return result.data;
}

export default function svgWithFallback(): Plugin {
  const extPrefix = "fb";
  const shouldProcess = (qs: string) => {
    const params = new URLSearchParams(qs);
    return params.has(extPrefix);
  };

  let solidPlugin: Plugin;
  return {
    enforce: "pre",
    name: "solid-svg",

    configResolved(cfg) {
      solidPlugin = cfg.plugins.find((p) => p.name === "solid")!;
      if (!solidPlugin) {
        throw new Error("solid plugin not found");
      }
    },

    async load(id) {
      const [path, qs] = id.split("?");

      if (!path.endsWith(".svg")) {
        return null;
      }

      if (shouldProcess(qs)) {
        let code = await readFile(path, { encoding: "utf8" });
        code = await optimizeSvg(code, path);
        const result = await compileSvg(path, code);
        return result;
      }
    },

    transform(source, id, transformOptions) {
      const [path, qs] = id.split("?");
      if (path.endsWith(".svg") && shouldProcess(qs)) {
        const transformFn =
          typeof solidPlugin.transform === "function"
            ? solidPlugin.transform
            : solidPlugin.transform?.handler;
        return transformFn?.bind(this)(source, `${path}.tsx`, transformOptions);
      }
    },
  };
}
