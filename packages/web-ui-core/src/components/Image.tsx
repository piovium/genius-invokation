// Copyright (C) 2024-2025 Guyutongxue
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

import {
  type ComponentProps,
  Match,
  Show,
  Switch,
  createMemo,
  createResource,
  mergeProps,
  splitProps,
} from "solid-js";
import { useUiContext } from "../hooks/context";
import TechniqueNormal from "../svg/TechniqueNormal.svg?fb";
import UnknownIcon from "../svg/Unknown.svg?fb";
import { DAMAGE_COLOR } from "./Damage";

export interface ImageProps extends ComponentProps<"img"> {
  imageId: number;
  zero?: "unknown" | "physic";
  fallback?: ImageFallbackType;
  type?: "cardFace" | "icon" | "unspecified";
}

export function Image(props: ImageProps) {
  const merged = mergeProps({ zero: "unknown" } as const, props);
  const [local, rest] = splitProps(merged, [
    "imageId",
    "zero",
    "fallback",
    "type",
  ]);
  const { assetsManager } = useUiContext();
  const [url] = createResource(
    () => [local.imageId, local.type, assetsManager()] as const,
    ([imageId, type, manager]) =>
      manager.getImageUrl(imageId, {
        type: type,
        thumbnail: true,
      }),
  );

  const showImage = () => {
    if (local.imageId === 0 && local.zero === "unknown") {
      return false;
    } else {
      return url.state === "ready";
    }
  };

  const classNames = "object-cover";
  const innerProps = createMemo(
    (): ComponentProps<"img"> => ({
      ...rest,
      class: `${rest.class ?? ""} ${classNames}`,
      src: url.state === "ready" ? url() : void 0,
      alt: assetsManager().getNameSync(local.imageId) ?? `${local.imageId}`,
      draggable: "false",
    }),
  );

  return (
    <Show
      when={showImage()}
      fallback={
        <ImageFallback
          type={local.fallback}
          imageId={local.imageId}
          {...innerProps()}
        />
      }
    >
      <img {...innerProps()} />
    </Show>
  );
}

export type ImageFallbackType = "card" | "state" | "skill" | "technique";

export interface ImageFallbackProps {
  type?: ImageFallbackType;
  imageId: number;
  alt?: string;
  class?: string;
}

export function ImageFallback(props: ImageFallbackProps) {
  const [local, rest] = splitProps(props, ["type", "imageId", "alt", "class"]);
  return (
    <Switch>
      <Match when={local.type === "card"}>
        <div
          class={`text-center bg-#bdaa8a rounded-md leading-none select-none
            contain-strict flex justify-center items-center ${local.class ?? ""}`}
          {...rest}
        >
          {local.alt}
        </div>
      </Match>
      <Match when={local.type === "state"}>
        <div
          class={`bg-[var(--bg-color)] rounded-full opacity-80 ${local.class ?? ""}`}
          style={{
            "--bg-color": `var(--c-${DAMAGE_COLOR[Math.min(local.imageId, 8)]})`,
          }}
          {...rest}
        />
      </Match>
      <Match when={local.type === "skill"}>
        <UnknownIcon class={`${local.class ?? ""}`} noRender {...rest} />
      </Match>
      <Match when={local.type === "technique"}>
        <TechniqueNormal class={`${local.class ?? ""}`} noRender {...rest} />
      </Match>
    </Switch>
  );
}
