

import { PbPhaseType } from "@gi-tcg/typings";
import { Show } from "solid-js";
import { useUiContext } from "../hooks/context";

export interface CurrentTurnHintProps {
  phase: PbPhaseType;
  opp: boolean;
}

export function CurrentTurnHint(props: CurrentTurnHintProps) {
  const { t } = useUiContext();
  return (
    <Show when={props.phase <= PbPhaseType.ROLL}>
      <div
        class="min-h-8 min-w-24 max-w-40 px-3 py-1 flex items-center justify-center text-center leading-tight rounded-full b-2 font-bold text-2.7 current-turn-hint text-color-[var(--fg-color)] border-[var(--fg-color)] bg-[var(--bg-color)]"
        data-opp={props.opp}
      >
        {t("sideFirst", { side: props.opp ? t("oppSide") : t("mySide") })}
      </div>
    </Show>
  );
}
