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

import type { DetailLogEntry, DetailLogType } from "@gi-tcg/core";
import { For, Show, createEffect, createSignal } from "solid-js";
import styles from "./style.css?inline";
import { getNameSync } from "@gi-tcg/assets-manager";

export interface DetailLogEntryProps {
  log: DetailLogEntry;
}

export function DetailLogEntry(props: DetailLogEntryProps) {
  const [open, setOpen] = createSignal(false);
  const toggleOpen = () => setOpen(!open());
  const color = () => {
    switch (props.log.type) {
      case "event":
        return "darkgreen";
      case "skill":
        return "darkred";
      case "primitive":
        return "black";
      case "mutation":
        return "lightblue";
      case "phase":
        return "rebeccapurple";
      default:
        return "gray";
    }
  };

  const text = () => {
    const reg = /\[(\w+?):([\d.]+?)\]/g;
    return props.log.value.replaceAll(reg, (origStr, type, idStr): string => {
      const id = Number(idStr);
      switch (type) {
        case "dice":
          return (
            ["无色", "冰", "水", "火", "雷", "风", "岩", "草", "万能", "充能"][
              id
            ] ?? origStr
          );
        case "aura":
          if (id > 16) return "冰草";
          else
            return (
              ["空", "冰", "水", "火", "雷", "风", "岩", "草"][id] ?? origStr
            );
        case "damage":
          return (
            [
              "物理",
              "冰",
              "水",
              "火",
              "雷",
              "风",
              "岩",
              "草",
              "穿透",
              "治疗",
              "复活治疗",
            ][id] ?? origStr
          );
        default: {
          const rid = Math.floor(id);
          let result = getNameSync?.("CHS", rid);
          if (result) {
            if (rid !== id) {
              result += "的响应技能";
            }
            return result;
          } else {
            return origStr;
          }
        }
      }
    });
  };
  return (
    <div class="detail-log">
      <div class="detail-log__parent">
        <Show
          when={props.log.children?.length}
          fallback={<div class="detail-log__toggle-placeholder" />}
        >
          <button class="detail-log__toggle-button" onClick={toggleOpen}>
            {open() ? "-" : "+"}
          </button>
        </Show>
        <span class="detail-log__text" style={{ color: color() }}>
          {text()}
        </span>
      </div>
      <div class="detail-log__children">
        <Show when={open()}>
          <For each={props.log.children}>
            {(child) => <DetailLogEntry log={child} />}
          </For>
        </Show>
      </div>
    </div>
  );
}

export function DetailLogViewer(props: DetailLogViewer.Props) {
  return (
    <div>
      <style>{styles}</style>
      <For each={props.logs}>{(log) => <DetailLogEntry log={log} />}</For>
    </div>
  );
}

export declare namespace DetailLogViewer {
  export interface Props {
    logs: readonly DetailLogEntry[];
    names?: (id: number) => string;
  }
}
