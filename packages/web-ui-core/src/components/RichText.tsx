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

import { Image } from "./Image";
import { DiceIcon } from "./Dice";
import {
  createMemo,
  createSignal,
  onCleanup,
  onMount,
  type JSX,
} from "solid-js";

export interface RichTextProps {
  /**
   * The content is XML formatted string, supporting following tags:
   * - `<font color="<css-color-value>">...</font>`: to specify the color of the text
   * - `<image type="<image-type>" id="<image-id>"/>`: insert an image with line-height size.
   *    - `image-type` can be `dice`, `element` and `icon`.
   */
  content: string;
}

type RichTextImageType = "dice" | "element" | "icon";

function InlineImage(props: { type?: RichTextImageType; id: number }) {
  return (
    <span class="inline-flex items-center justify-center align-middle">
      {props.type === "dice" ? (
        <DiceIcon class="inline-image" type={props.id} selected={false} />
      ) : (
        <Image
          class="inline-image"
          data-image-type={props.type}
          imageId={props.id}
          type="icon"
          fallback={props.type === "element" ? "aura" : "general"}
        />
      )}
    </span>
  );
}

function renderNodes(nodes: readonly ChildNode[]): JSX.Element[] {
  return nodes.flatMap((node, index) => renderNode(node, index));
}

function renderNode(node: ChildNode, index: number): JSX.Element[] {
  switch (node.nodeType) {
    case Node.TEXT_NODE:
      return [node.textContent ?? ""];
    case Node.ELEMENT_NODE:
      return renderElement(node as Element, index);
    default:
      return [];
  }
}

function renderElement(element: Element, _index: number): JSX.Element[] {
  switch (element.tagName) {
    case "font": {
      const color = element.getAttribute("color") ?? void 0;
      return [
        <span style={{ color }}>
          {renderNodes(Array.from(element.childNodes))}
        </span>,
      ];
    }
    case "image": {
      const type = element.getAttribute("type");
      const id = Number.parseInt(element.getAttribute("id") ?? "", 10);
      if (
        (type !== "dice" && type !== "element" && type !== "icon") ||
        Number.isNaN(id)
      ) {
        return [];
      }
      return [<InlineImage type={type} id={id} />];
    }
    default:
      return renderNodes(Array.from(element.childNodes));
  }
}

export function RichText(props: RichTextProps) {
  const rendered = createMemo(() => {
    if (typeof DOMParser === "undefined") {
      return [props.content] satisfies JSX.Element[];
    }

    const document = new DOMParser().parseFromString(
      `<root>${props.content}</root>`,
      "text/xml",
    ) as XMLDocument;
    if (document.getElementsByTagName("parsererror").length > 0) {
      return [props.content] satisfies JSX.Element[];
    }

    return renderNodes(Array.from(document.documentElement.childNodes));
  });

  return <span class="inline rich-text">{rendered()}</span>;
}
