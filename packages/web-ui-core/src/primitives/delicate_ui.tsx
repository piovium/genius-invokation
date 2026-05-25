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

import {
  createEffect,
  createMemo,
  createResource,
  Show,
  untrack,
  type JSX,
} from "solid-js";
import { useUiContext } from "../hooks/context";

export type WithDelicateUiProps =
  | {
      dataUri?: false;
      assetId: string | string[];
      fallback: JSX.Element;
      children: (...assets: HTMLImageElement[]) => JSX.Element;
    }
  | {
      dataUri: true;
      assetId: string | string[];
      fallback: JSX.Element;
      children: (...assets: string[]) => JSX.Element;
    };

const UI_ASSET_URL_BASE = `https://ui-assets.piovium.org/`;

const assetsImageCache = new Map<string, HTMLImageElement>();
const assetsUriCache = new Map<string, string>();

/**
 * 异步加载 `props.assetId` UI 素材。
 *
 * 当素材未加载时，渲染 `props.fallback`；加载完成后渲染 `props.children(img)`。
 * 其中 `img` 是加载得到的 `HTMLImageElement` 或 Data URI。
 * @param props
 * @returns
 */
export function WithDelicateUi(props: WithDelicateUiProps) {
  const { disableDelicateUi } = useUiContext();
  const assetId = createMemo(() => props.assetId);
  const assetUrls = createMemo(() => {
    const id = assetId();
    return (Array.isArray(id) ? id : [id]).map(
      (id) => `${UI_ASSET_URL_BASE}${id}.webp`,
    );
  });
  const useDataUri = untrack(() => props.dataUri);
  const [resource] = createResource(assetUrls, (urls) =>
    Promise.all(
      urls.map(
        (url) =>
          new Promise<HTMLImageElement | string>((resolve, reject) => {
            if (disableDelicateUi) {
              reject(null);
              return;
            }
            if (useDataUri) {
              if (assetsUriCache.has(url)) {
                resolve(assetsUriCache.get(url)!);
                return;
              }
              fetch(url)
                .then((res) => res.blob())
                .then((blob) => {
                  const reader = new FileReader();
                  reader.onload = () => {
                    const uri = reader.result as string;
                    assetsUriCache.set(url, uri);
                    resolve(uri);
                  };
                  reader.onerror = () => reject(null);
                  reader.readAsDataURL(blob);
                })
                .catch(() => reject(null));
            } else {
              if (assetsImageCache.has(url)) {
                resolve(
                  assetsImageCache.get(url)!.cloneNode() as HTMLImageElement,
                );
                return;
              }
              const img = new Image();
              img.draggable = false;
              img.src = url;
              img.onload = () => {
                assetsImageCache.set(url, img);
                resolve(img);
              };
              img.onerror = () => reject(null);
            }
          }),
      ),
    ),
  );
  return (
    <Show when={resource.state === "ready"} fallback={props.fallback}>
      {props.children(...(resource() as any[]))}
    </Show>
  );
}
