import { createSignal, For } from "solid-js";
import type { SelectOptionRequest } from "@gi-tcg/typings";
import { Button } from "./Button";
import { useUiContext } from "../hooks/context";

export interface SelectOptionViewProps {
  shown: boolean;
  request: SelectOptionRequest;
  onConfirm: (selectedIndex: number) => void;
}

export function SelectOptionView(props: SelectOptionViewProps) {
  const { t } = useUiContext();
  const [selectedIndex, setSelectedIndex] = createSignal<number | null>(null);
  return (
    <div
      class="w-full h-full hidden data-[shown]:flex flex-col items-center justify-center gap-5 p-8 min-w-0 min-h-0 z-3 text-white/80"
      bool:data-shown={props.shown}
    >
      <div class="w-full max-w-180 min-h-0 overflow-y-auto flex flex-col gap-5 p-2">
        <h3 class="font-bold text-6 text-center whitespace-pre-wrap break-words">
          {props.request.prompt}
        </h3>
        <div
          class="flex flex-col gap-3"
          role="group"
          aria-label={props.request.prompt}
        >
          <For each={props.request.options}>
            {(option, index) => (
              <button
                type="button"
                class="w-full p-4 rounded bg-black/50 border-2 border-white/30 data-[selected]:border-#d4bc8e data-[selected]:bg-white/20 text-4 text-left whitespace-pre-wrap break-words cursor-pointer"
                bool:data-selected={selectedIndex() === index()}
                aria-pressed={selectedIndex() === index()}
                onClick={() => setSelectedIndex(index())}
              >
                {option.text}
              </button>
            )}
          </For>
        </div>
      </div>
      <Button
        class="shrink-0 disabled:opacity-50"
        disabled={selectedIndex() === null}
        onClick={() => {
          const index = selectedIndex();
          if (index !== null) {
            props.onConfirm(index);
          }
        }}
      >
        {t("view.confirmButton")}
      </Button>
    </div>
  );
}
