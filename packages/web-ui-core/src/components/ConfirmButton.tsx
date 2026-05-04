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
      <Button onClick={() => props.step && props.onClick?.(props.step)}>
        {props.step?.confirmText}
      </Button>
    </div>
  );
}
