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

import { createSignal } from "solid-js";
import { useUiContext } from "../hooks/context";

export interface MessageBoxController {
  confirm: (question: string) => Promise<boolean>;
}

export function createMessageBox() {
  let dialogEl: HTMLDialogElement | undefined;
  const [question, setQuestion] = createSignal<string>("");
  let resolver: PromiseWithResolvers<boolean> | null = null;

  return [
    {
      confirm: async (q) => {
        setQuestion(q), (resolver = Promise.withResolvers<boolean>());
        dialogEl?.showModal();
        return await resolver.promise.finally(() => {
          dialogEl?.close();
        });
      },
    } as MessageBoxController,
    () => (
      <MessageBox
        ref={dialogEl!}
        question={question()}
        onConfirm={() => resolver?.resolve(true)}
        onCancel={() => resolver?.resolve(false)}
      />
    ),
  ] as const;
}

interface MessageBoxProps {
  ref: HTMLDialogElement;
  question: string;
  onConfirm: () => void;
  onCancel: () => void;
}

function MessageBox(props: MessageBoxProps) {
  const { t } = useUiContext();
  return (
    <dialog
      ref={props.ref}
      class="bg-#ebdab7 p-4 rounded-3 shadow-lg w-96 h-48 border-#735a3f border-2"
    >
      <p class="h-24 font-size-6 font-bold mt-4 text-center">
        {props.question}
      </p>
      <div class="flex justify-center gap-2">
        <button
          class="px-3 py-1 w-36 font-bold font-size-5 color-black bg-#e9e2d3 rounded-full border-#735a3f b-2 hover:bg-#e9e2d3 hover:shadow-[inset_0_0_16px_rgba(255,255,255,1)] hover:border-white"
          onClick={() => props.onCancel()}
        >
          {t("ui.buttonCancel")}
        </button>
        <button
          class="px-3 py-1 w-36 font-bold font-size-5 color-black bg-#e9e2d3 rounded-full border-#735a3f b-2 hover:bg-#e9e2d3 hover:shadow-[inset_0_0_16px_rgba(255,255,255,1)] hover:border-white"
          onClick={() => props.onConfirm()}
        >
          {t("ui.buttonConfirm")}
        </button>
      </div>
    </dialog>
  );
}
