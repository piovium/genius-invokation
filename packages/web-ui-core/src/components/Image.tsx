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

import { Match, Show, Switch, createMemo, omit } from "solid-js";
import type { ComponentProps } from "@solidjs/web";
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
  const rest = omit(props, "imageId", "zero", "fallback", "type");
  const { assetsManager } = useUiContext();
  const imageId = createMemo(() => props.imageId);
  const url = createMemo(
    () =>
      assetsManager()
        .getImageUrl(imageId(), {
          type: props.type,
          thumbnail: true,
        })
        .catch(() => void 0),
    { loadingValue: void 0 },
  );

  const showImage = () => (imageId() !== 0 || props.zero === "physic") && url();
  const innerProps = createMemo((): ComponentProps<"img"> => ({
    ...rest,
    class: [rest.class, "object-cover"],
    src: url(),
    alt: assetsManager().getNameSync(imageId()) ?? `${imageId()}`,
    draggable: "false",
  }));

  return (
    <Show
      when={showImage()}
      fallback={
        <ImageFallback
          type={props.fallback}
          imageId={imageId()}
          {...innerProps()}
        />
      }
    >
      <img {...innerProps()} />
    </Show>
  );
}

export type ImageFallbackType = "card" | "state" | "skill" | "technique";

export interface ImageFallbackProps extends Pick<
  ComponentProps<"img">,
  "alt" | "class"
> {
  type?: ImageFallbackType;
  imageId: number;
}

export function ImageFallback(props: ImageFallbackProps) {
  const rest = omit(props, "type", "imageId", "alt", "class");
  return (
    <Switch>
      <Match when={props.type === "card"}>
        <div
          class={[
            "text-center bg-#bdaa8a rounded-md leading-none select-none contain-[size_style] flex justify-center items-center ",
            props.class,
          ]}
          {...rest}
        >
          {props.alt}
        </div>
      </Match>
      <Match when={props.type === "state"}>
        <div
          class={["state-fallback rounded-full ", props.class]}
          style={{
            "--bg-color": `var(--c-${DAMAGE_COLOR[Math.min(props.imageId, 8)]})`,
          }}
          {...rest}
        />
      </Match>
      <Match when={props.type === "skill"}>
        <UnknownIcon class={props.class} noRender {...rest} />
      </Match>
      <Match when={props.type === "technique"}>
        <TechniqueNormal class={props.class} noRender {...rest} />
      </Match>
    </Switch>
  );
}
