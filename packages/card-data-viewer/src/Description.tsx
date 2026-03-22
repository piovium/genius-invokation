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
  For,
  Match,
  Show,
  Switch,
} from "solid-js";
import { createStore, produce } from "solid-js/store";
import { Reference } from "./Entity";
import { useAssetsManager } from "./context";

type DescriptionItem =
  | {
      type: "text";
      content: string;
    }
  | {
      type: "key";
      content: string;
    }
  | {
      type: "damage";
      dType?: string;
    }
  | {
      type: "reference";
      rType: string; // "C" | "K" | "S" | "A"
      id: number;
    };

const descriptionToItems = (
  description: string,
  keyMap: Record<string, string> = {},
): DescriptionItem[] => {
  const text = description
    .replace(/<[^>]+>/g, "")
    .replace(/\\n/g, "\n")
    .replace(/\$?\{(.*?)\}/g, (_, g1: string) => {
      return keyMap[g1] ?? "";
    });
  const segs = text.replace(/\$\[(.*?)\]/g, "$$[$1$$[").split("$[");
  const result: DescriptionItem[] = [];
  for (let i = 0; i < segs.length; i++) {
    result.push({ type: "text", content: segs[i] });
    i++;
    if (i >= segs.length) break;
    if (segs[i] === "D__KEY__ELEMENT") {
      result.push({ type: "damage", dType: keyMap[segs[i]] });
    } else if (keyMap[segs[i]]) {
      result.push({ type: "key", content: keyMap[segs[i]] });
    } else {
      const rType = segs[i][0];
      let id = Number(segs[i].substring(1));
      if (rType === "K") {
        id *= -1;
      }
      result.push({ type: "reference", rType, id });
    }
  }
  return result;
};

interface DamageDescriptionProps {
  dType: string | undefined;
  onRequestExplain?: (id: number) => void;
}

const DAMAGE_COLORS = [
  "#000000",
  "#91d5ff",
  "#1890ff",
  "#f5222d",
  "#722ed1",
  "#36cfc9",
  "#d4b106",
  "#52c41a",
];

function DamageDescription(props: DamageDescriptionProps) {
  const { assetsManager } = useAssetsManager();
  const id = () =>
    [
      "GCG_ELEMENT_PHYSIC",
      "GCG_ELEMENT_CRYO",
      "GCG_ELEMENT_HYDRO",
      "GCG_ELEMENT_PYRO",
      "GCG_ELEMENT_ELECTRO",
      "GCG_ELEMENT_ANEMO",
      "GCG_ELEMENT_GEO",
      "GCG_ELEMENT_DENDRO",
      void 0,
    ].indexOf(props.dType);
  const keywordId = () => -(100 + id());
  const [url] = createResource(
    () => [id(), assetsManager()] as const,
    ([id, manager]) => manager.getImageUrl(id),
  );
  return (
    <>
      <Show when={id() <= 7 && url()}>
        {(url) => <img src={url()} class="inline-block h-1em mb-2px mx-1" />}
      </Show>
      <span
        class="underline underline-1 underline-offset-3 cursor-pointer"
        style={{ color: DAMAGE_COLORS[id()] }}
        onClick={() => props.onRequestExplain?.(keywordId())}
      >
        <ReferenceName definitionId={keywordId()} />
      </span>
    </>
  );
}

export interface DescriptionProps {
  definitionId: number;
  description: string;
  keyMap?: Record<string, string>;
  includesImage: boolean;
  fromSkill?: boolean;
  onRequestExplain?: (id: number) => void;
  onAddReference?: (defId: number) => void;
}

export function Description(props: DescriptionProps) {
  const { assetsManager } = useAssetsManager();
  const items = createMemo(() =>
    descriptionToItems(props.description, props.keyMap),
  );
  const [references, setReferences] = createStore<number[]>([]);

  const addReference = (defId: number) => {
    setReferences(
      produce((prev) => {
        if (defId !== props.definitionId && !prev.includes(defId)) {
          prev.push(defId);
        }
      }),
    );
  };

  createEffect(() => {
    const addRefFn = props.onAddReference ?? addReference;
    for (const item of items()) {
      if (item.type !== "reference") {
        continue;
      } else if (item.rType === "S" && !props.fromSkill) {
        addRefFn(item.id);
      } else if (item.rType === "C") {
        addRefFn(item.id);
      }
    }
  });

  return (
    <>
      <p class="line-height-normal whitespace-pre-wrap mb-2">
        <For each={items()}>
          {(item) => (
            <Switch>
              <Match when={item.type === "text" && item} keyed>
                {(item) => <span>{item.content}</span>}
              </Match>
              <Match when={item.type === "key" && item} keyed>
                {(item) => <span>{item.content}</span>}
              </Match>
              <Match when={item.type === "damage" && item} keyed>
                {(item) => (
                  <DamageDescription
                    dType={item.dType}
                    onRequestExplain={props.onRequestExplain}
                  />
                )}
              </Match>
              <Match when={item.type === "reference" && item} keyed>
                {(item) => (
                  <Show
                    when={item.rType === "K"}
                    fallback={
                      <span class="text-black mx-1">
                        <ReferenceName definitionId={item.id} />
                      </span>
                    }
                  >
                    <span
                      class="text-black underline underline-1 underline-offset-3 cursor-pointer mx-1"
                      onClick={() => props.onRequestExplain?.(item.id)}
                    >
                      <ReferenceName definitionId={item.id} />
                    </span>
                  </Show>
                )}
              </Match>
            </Switch>
          )}
        </For>
      </p>
      <ul>
        <For each={references}>
          {(defId) => (
            <li class="b-l-2 p-l-2 b-solid b-yellow-5 mb-2">
              <Reference
                {...props}
                definitionId={defId}
                onAddReference={props.onAddReference ?? addReference}
              />
            </li>
          )}
        </For>
      </ul>
    </>
  );
}

function ReferenceName(props: { definitionId: number }) {
  const { assetsManager } = useAssetsManager();
  const [data] = createResource(
    () => [props.definitionId, assetsManager()] as const,
    ([defId, manager]) => manager.getData(defId),
  );
  return (
    <>
      {data()?.name ??
        assetsManager().getNameSync(props.definitionId) ??
        props.definitionId}
    </>
  );
}
