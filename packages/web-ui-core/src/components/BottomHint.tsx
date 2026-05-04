import { Show } from "solid-js";
import { useUiContext } from "../hooks/context";
import type { BottomHintConfig } from "../action";

export interface BottomHintProps extends BottomHintConfig {
}

export function BottomHint(props: BottomHintProps) {
  const { t } = useUiContext();
  return (
    <Show when={props.bottomHintType !== "none"}>
      <div class="absolute bottom-10% left-50% translate-x--50% text-center text-yellow-100 bg-#e7892c/80 rounded-full px-2 py-0 text-3.5 font-bold shadow-[0_0_16px_#e7892caa,0_0_12px_#e7892cbb,0_0_8px_#e7892ccc]">
        {props.bottomHintText}
      </div>
      {/*
        <Show when={props.step?.isEffectless}>
          <div class="text-#ffdada bg-#ca2527/80 rounded-full px-2 py-0 text-3.5 font-bold shadow-[0_0_4px_4px_#ca2527cd]">
            {t("bottom.invalidatedCardEffectHint")}
          </div>
        </Show>
      */}
    </Show>
  );
}
