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
import { useI18n } from "../i18n";

export interface AvatarSelectorProps {
  currentAvatar: string | null;
  onSelect: (avatar: string | null) => void;
  onCancel: () => void;
}

export function AvatarSelector(props: AvatarSelectorProps) {
  const { t } = useI18n();
  const [selected, setSelected] = createSignal<string | null>(props.currentAvatar);
  const [uploading, setUploading] = createSignal(false);

  const handleConfirm = async () => {
    setUploading(true);
    try {
      await props.onSelect(selected());
    } finally {
      setUploading(false);
    }
  };

  return (
    <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <h3 class="text-xl font-bold mb-4">{t("selectAvatar")}</h3>
        
        {/* 空值选项 */}
        <div class="mb-4">
          <button
            class={`w-full p-4 rounded-lg border-2 transition-colors ${
              selected() === null
                ? "border-blue-500 bg-blue-50"
                : "border-gray-200 hover:border-gray-300"
            }`}
            onClick={() => setSelected(null)}
          >
            <span class="text-gray-600">{t("useRandomAvatar")}</span>
          </button>
        </div>

        {/* 头像网格 */}
        <div class="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3 mb-6">
          <For each={AVATARS}>
            {(avatar) => (
              <button
                class={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all hover:scale-105 ${
                  selected() === avatar
                    ? "border-blue-500 ring-2 ring-blue-300"
                    : "border-gray-200"
                }`}
                onClick={() => setSelected(avatar)}
              >
                <img
                  src={`/avatars/${avatar}`}
                  alt={avatar}
                  class="w-full h-full object-cover"
                />
                {selected() === avatar && (
                  <div class="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
                    <i class="i-mdi-check-circle text-blue-600 text-2xl" />
                  </div>
                )}
              </button>
            )}
          </For>
        </div>

        {/* 按钮 */}
        <div class="flex justify-end gap-3">
          <button
            class="btn btn-soft-red"
            onClick={props.onCancel}
            disabled={uploading()}
          >
            {t("cancel")}
          </button>
          <button
            class="btn btn-soft-green"
            onClick={handleConfirm}
            disabled={uploading()}
          >
            <Show when={uploading()} fallback={t("confirm")}>
              <i class="i-mdi-loading animate-spin" />
            </Show>
          </button>
        </div>
      </div>
    </div>
  );
}
