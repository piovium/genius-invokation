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

import {
  type ComponentProps,
  type JSX,
  Match,
  Show,
  Switch,
  createMemo,
  createResource,
  mergeProps,
  splitProps,
} from "solid-js";
import { useUiContext } from "../hooks/context";
import CardFaceNormal from "../svg/CardFaceNormal.svg?fb";
import SummonNormal from "../svg/SummonNormal.svg?fb";
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
    "width",
    "height",
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

  const isUnknown = () => local.imageId === 0 && local.zero === "unknown";

  const showImage = () => {
    if (local.imageId === 0 && local.zero === "unknown") {
      return false;
    } else {
      return url.state === "ready";
    }
  };

  const classNames = "flex items-center justify-center object-cover";
  const innerProps = createMemo(
    (): ComponentProps<"img"> => ({
      ...rest,
      class: `${rest.class ?? ""} ${classNames}`,
      src: url.state === "ready" ? url() : void 0,
      alt: isUnknown()
        ? ""
        : (assetsManager().getNameSync(local.imageId) ?? `${local.imageId}`),
      draggable: "false",
      style: {
        height: local.height ? `${local.height}px` : void 0,
        width: local.width ? `${local.width}px` : void 0,
      },
    }),
  );

  return (
    <Show
      when={showImage()}
      fallback={
        <div {...(innerProps() as ComponentProps<"div">)}>
          <ImageFallback
            type={local.fallback}
            alt={innerProps().alt}
            imageId={local.imageId}
            loading={url.loading}
          />
        </div>
      }
    >
      <img {...innerProps()} />
    </Show>
  );
}

export type ImageFallbackType =
  | "card"
  | "summon"
  | "state"
  | "technique"
  | "aura"
  | "general"
  | "alert"
  | "board"
  | undefined;

export interface ImageFallbackProps {
  type: ImageFallbackType;
  alt?: string;
  imageId?: number;
  loading: boolean;
}

export function ImageFallback(props: ImageFallbackProps) {
  return (
    <Switch>
      <Match when={props.type === "card" && props.loading}>
        <div class="absolute top-72% text-3 text-center w-90% overflow-hidden text-nowrap text-ellipsis">
          {props.alt}
        </div>
      </Match>
      <Match when={props.type === "card"}>
        <CardFaceNormal class="absolute h-full w-full" />
        <div class="absolute top-72% text-3 text-center w-90% overflow-hidden text-nowrap text-ellipsis">
          {props.alt}
        </div>
      </Match>
      <Match when={props.type === "summon" && props.loading}>
        <div class="absolute top-60% text-2.5 text-center w-90% overflow-hidden text-nowrap text-ellipsis">
          {props.alt}
        </div>
      </Match>
      <Match when={props.type === "summon"}>
        <SummonNormal class="absolute h-full w-full" />
        <div class="absolute top-60% text-2.5 text-center w-90% overflow-hidden text-nowrap text-ellipsis">
          {props.alt}
        </div>
      </Match>
      <Match when={props.type === "state"}>
        <UnknownStatus />
      </Match>
      <Match when={props.type === "technique"}>
        <TechniqueNormal noRender class="absolute h-full w-full" />
      </Match>
      <Match when={props.type === "aura"}>
        <SimplyElemental id={props.imageId ?? 0} />
      </Match>
      <Match when={props.type === "general"}>
        <UnknownIcon noRender class="absolute h-75% w-75%" />
      </Match>
      <Match when={props.type === "alert"}>
        <div
          class="h-full w-full simply-elemental text-center text-#fa8080 font-bold text-4.8"
          style={{ "--bg-color": "#c54444aa" }}
        >
          !
        </div>
      </Match>
      <Match when={props.type === "board"}>
        <div class="w-5 h-8.6 bg-#bdaa8a rounded-0.75" />
      </Match>
    </Switch>
  );
}

export function UnknownStatus() {
  return (
    <div
      class="relative h-full w-full custom-status"
      style={{
        "--bg-inner-color": "#c2aa80",
        "--bg-outer-color": "#938161",
      }}
    >
      <UnknownIcon noRender class="absolute h-90% w-90% inset-5%" />
    </div>
  );
}

export function SimplyElemental(props: { id: number }) {
  return (
    <div
      class="h-full w-full simply-elemental"
      style={{
        "--bg-color":
          props.id <= 10 ? `var(--c-${DAMAGE_COLOR[props.id]})` : "#a44a08aa",
      }}
    />
  );
}
