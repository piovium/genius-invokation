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
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

import { createEffect, createSignal, on, Show } from "solid-js";

export interface TextFieldEditProps {
  value: string;
  saveText: string;
  cancelText: string;
  class?: string;
  placeholder?: string;
  disable?: boolean;
  onSave: (value: string) => boolean | Promise<boolean>;
  onCancel?: () => void;
}

export function TextFieldEdit(props: TextFieldEditProps) {
  const [editing, setEditing] = createSignal(false);
  const [uploading, setUploading] = createSignal(false);

  let inputEl: HTMLInputElement | undefined;

  createEffect(
    on(editing, () => {
      if (!inputEl) {
        return;
      }
      inputEl.value = props.value;
      inputEl.focus();
      inputEl.select();
    }),
  );

  const submit = async (e: SubmitEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const newValue = formData.get("name") as string;
    setUploading(true);
    const onSave = props.onSave;
    const success = await Promise.try(() => onSave(newValue)).finally(() =>
      setUploading(false),
    );
    if (success) {
      setEditing(false);
    }
  };

  return (
    <Show
      when={editing() && !props.disable}
      fallback={
        <div class="flex flex-row items-center gap-2">
          <h2 class={`min-w-0 overflow-hidden whitespace-nowrap text-ellipsis flex-shrink-0 ${props.class}`}>
            {props.value}
          </h2>
          <button
            class="btn btn-ghost h-8 w-8 p-1"
            onClick={() => setEditing(true)}
          >
            <i class="i-mdi-square-edit-outline h-6 w-6" />
          </button>
        </div>
      }
    >
      <form
        onSubmit={submit}
        class="flex flex-row gap-1 md:gap-3 text-3.2 md:text-3.5"
      >
        <input
          type="text"
          required
          ref={(el) => (inputEl = el)}
          name="name"
          class="input input-outline min-w-40 md:w-50 h-8 text-1rem"
          placeholder={props.placeholder}
        />
        <button
          type="submit"
          class="btn btn-soft-green h-8 w-12"
          disabled={uploading()}
        >
          <Show when={uploading()} fallback={props.saveText}>
            <i class="i-mdi-loading animate-spin" />
          </Show>
        </button>
        <button
          type="button"
          class="btn btn-soft-red h-8 w-12"
          onClick={() => {
            props.onCancel?.();
            setEditing(false);
          }}
        >
          {props.cancelText}
        </button>
      </form>
    </Show>
  );
}
