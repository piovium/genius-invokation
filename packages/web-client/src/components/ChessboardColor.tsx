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
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

import { createSignal, For, Show } from "solid-js";
import { useAuth } from "../auth";
import { AxiosError } from "axios";
import { useI18n } from "../i18n";

export const CHESSBOARD_COLORS = [
  "#c0cac3",
  "#537a76",
  "#7f7473",
  "#66588a",
  "#667a4a",
  "#456a90",
  "#783f29",
];

export interface ChessboardColorProps {}

export function ChessboardColor(props: ChessboardColorProps) {
  const { t } = useI18n();
  const { status, updateInfo } = useAuth();
  const [dirty, setDirty] = createSignal<boolean>(false);
  const [color, setColor] = createSignal<string | null>(
    status().chessboardColor
  );
  const [loading, setLoading] = createSignal<boolean>(false);
  return (
    <div class="flex items-center gap-2 flex-wrap">
      <For each={CHESSBOARD_COLORS}>
        {(presetColor) => (
          <button
            class="h-8 w-8 flex items-center justify-center rounded-full cursor-pointer border b-1 b-gray-300 data-[selected]:b-3 data-[selected]:b-gray-600"
            onClick={async () => {
              setDirty(true);
              setColor(presetColor);
            }}
            bool:data-selected={color() === presetColor}
          >
            <div
              class="h-6 w-6 rounded-full"
              style={{ "background-color": presetColor }}
            />
          </button>
        )}
      </For>
      <div class="relative h-8 w-8 flex items-center justify-center rounded-full cursor-pointer inset-0">
        <input
          type="color"
          class="h-7 w-7 flex items-center justify-center rounded-full cursor-pointer"
          value={color() ?? "#ffffff"}
          onInput={async (e) => {
            setDirty(true);
            setColor(e.currentTarget.value);
          }}
        />
        <div
          class="absolute h-8 w-8 flex items-center justify-center rounded-full cursor-pointer border b-1 b-gray-300 data-[selected]:b-3 data-[selected]:b-gray-600 bg-white pointer-events-none"
          bool:data-selected={!CHESSBOARD_COLORS.includes(color() ?? "")}
        >
          <div
            class="h-6 w-6 rounded-full"
            style={
              CHESSBOARD_COLORS.includes(color() ?? "") || !color()
                ? {
                    background:
                      "conic-gradient(#ff0000 0deg, #ffff00 60deg, #00ff00 120deg, #00ffff 180deg, #0000ff 240deg, #ff00ff 300deg, #ff0000 360deg)",
                    opacity: "0.5",
                  }
                : {
                    "background-color": color() ?? void 0,
                  }
            }
          />
        </div>
      </div>
      <Show when={dirty() && color() !== null}>
        <button
          class="btn btn-soft-green"
          disabled={loading()}
          onClick={async () => {
            try {
              setLoading(true);
              await updateInfo({ chessboardColor: color() });
              setDirty(false);
            } catch (e) {
              if (e instanceof AxiosError) {
                alert(e.response?.data.message);
              }
              console.error(e);
            } finally {
              setLoading(false);
            }
          }}
        >
          {t("save")}
        </button>
        <button
          class="btn btn-soft-red"
          disabled={loading()}
          onClick={async () => {
            setColor(status().chessboardColor);
            setDirty(false);
          }}
        >
          {t("cancel")}
        </button>
      </Show>
    </div>
  );
}
