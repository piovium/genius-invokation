import { Show } from "solid-js";
import { useUiContext } from "../hooks/context";

export interface FastActionMarkerProps {
  shown?: boolean;
}

export function FastActionMarker(props: FastActionMarkerProps) {
  const { t } = useUiContext();
  return (
    <Show when={props.shown}>
      <div class="absolute bottom-10% left-50% translate-x--50% max-w-44 text-center leading-tight text-yellow-100 bg-#e7892c/80 rounded-full px-3 py-1 text-3 font-bold shadow-[0_0_16px_#e7892caa,0_0_12px_#e7892cbb,0_0_8px_#e7892ccc]">
        {t("fastAction")}
      </div>
    </Show>
  );
}
