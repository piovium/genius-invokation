import { Show } from "solid-js";
import type { ClickConfirmButtonActionStep } from "../action";
import { Button } from "./Button";
import { useUiContext } from "../hooks/context";

export interface ConfirmButtonProps {
  class?: string;
  step?: ClickConfirmButtonActionStep;
  onClick?: (step: ClickConfirmButtonActionStep) => void;
}

export function ConfirmButton(props: ConfirmButtonProps) {
  const { t } = useUiContext();
  return (
    <div
      class={`hidden data-[shown]:flex flex-col items-center justify-end gap-2 h-16
         pointer-events-none data-[shown]:pointer-events-auto ${ props.class ?? "" }`}
      bool:data-shown={props.step}
    >
      <Show when={props.step?.isEffectless}>
        <div class="text-#ffdada bg-#ca2527/80 rounded-full px-2 py-0 text-3.5 font-bold shadow-[0_0_4px_4px_#ca2527cd]">
          {t("bottom.invalidatedCardEffectHint")}
        </div>
      </Show>
      <Button onClick={() => props.step && props.onClick?.(props.step)}>
        {props.step?.confirmText}
      </Button>
    </div>
  );
}
