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
      class={`opacity-0 pointer-events-none data-[shown]:pointer-events-auto data-[shown]:opacity-100 transition-opacity flex flex-col items-center gap-2 ${
        props.class ?? ""
      }`}
      bool:data-shown={props.step}
    >
      <Show when={props.step?.isEffectless}>
        <div class="text-#ffdada bg-#ca2527/80 rounded-full px-2 py-0 text-3.5 font-bold shadow-[0_0_16px_#ca2527aa,0_0_12px_#ca2527bb,0_0_8px_#ca2527cc]">
          {t("bottom.invalidatedCardEffectHint")}
        </div>
      </Show>
      <Button onClick={() => props.step && props.onClick?.(props.step)}>
        {props.step?.confirmText}
      </Button>
    </div>
  );
}
