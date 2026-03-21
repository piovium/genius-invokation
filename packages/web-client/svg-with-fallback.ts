import { optimize } from "svgo";
import type { Plugin, ResolvedConfig } from "vite";
import { readFile } from "node:fs/promises";
import path from "node:path";

async function compileSvg(filepath: string, source: string) {
  const filename = path.basename(filepath);
  const remoteRenderedUrl = `https://ui.assets.gi-tcg.guyutongxue.site/rendered-svg/${filename}.webp`;
  const svgSource = source
    .replace(/([{}])/g, "{'$1'}")
    .replace(/<!--\s*([\s\S]*?)\s*-->/g, "{/* $1 */}");
  return `import { Portal } from "solid-js/web";
import { Show, onMount, createSignal, splitProps } from "solid-js";
export default (props = {}) => {
  const [, elProps] = splitProps(props, ["noRender"]);
  const remoteRenderedUrl = ${JSON.stringify(remoteRenderedUrl)};
  const [remoteError, setRemoteError] = createSignal(false);
  const [remoteLoaded, setRemoteLoaded] = createSignal(false);
  let div;
  onMount(() => {
    window.GI_TCG_REMOTE_RENDERED_ERRORS ??= [];
  });
  const errored = () => props.noRender || window.GI_TCG_REMOTE_RENDERED_ERRORS?.includes(remoteRenderedUrl) || remoteError();
  const isAppleMobile = () => !!window.GestureEvent;
  return (
    <>
      <Show when={!errored()}>
        <img
          bool:data-display-none={!remoteLoaded()}
          {...elProps}
          src={remoteRenderedUrl}
          draggable={false}
          onError={() => {
            setRemoteError(true);
            window.GI_TCG_REMOTE_RENDERED_ERRORS.push(remoteRenderedUrl);
          }}
          onLoad={() => setRemoteLoaded(true)}
        />
      </Show>
      <Show when={errored() || (!remoteLoaded() && !isAppleMobile())}>
        <div data-contain-strict ref={div} {...elProps}>
          <Portal mount={div} useShadow={true}>${svgSource}</Portal>
        </div>
      </Show>
    </>
  );
}
`;
}

async function optimizeSvg(content: string, filePath: string) {
  const result = optimize(content, { path: filePath });
  return result.data;
}

export default function svgWithFallback(): Plugin {
  const extPrefix = "fb";
  const shouldProcess = (qs: string) => {
    const params = new URLSearchParams(qs);
    return params.has(extPrefix);
  };

  let config: ResolvedConfig;
  let solidPlugin: Plugin;
  return {
    enforce: "pre",
    name: "solid-svg",

    configResolved(cfg) {
      config = cfg;
      solidPlugin = config.plugins.find((p) => p.name === "solid")!;
      if (!solidPlugin) {
        throw new Error("solid plugin not found");
      }
    },

    async load(id) {
      const [filePath, qs = ""] = id.split("?");

      if (!filePath.endsWith(".svg")) {
        return null;
      }

      if (shouldProcess(qs)) {
        let code = await readFile(filePath, { encoding: "utf8" });
        code = await optimizeSvg(code, filePath);
        return compileSvg(filePath, code);
      }
      return null;
    },

    transform(source, id, transformOptions) {
      const [filePath, qs = ""] = id.split("?");
      if (filePath.endsWith(".svg") && shouldProcess(qs)) {
        const transformFn =
          typeof solidPlugin.transform === "function"
            ? solidPlugin.transform
            : solidPlugin.transform?.handler;
        return transformFn?.bind(this)(source, `${filePath}.tsx`, transformOptions);
      }
      return null;
    },
  };
}
