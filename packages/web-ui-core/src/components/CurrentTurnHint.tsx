// Copyright (C) 2025 Guyutongxue
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
// along with this program.  If not, see <http://www.gnu.org/licenses/>.

import { PbPhaseType } from "@gi-tcg/typings";
import { Show } from "solid-js";
import { useUiContext } from "../hooks/context";
import { AutoResizeText } from "./AutoResizeText";

export interface CurrentTurnHintProps {
  phase: PbPhaseType;
  opp: boolean;
}

export function CurrentTurnHint(props: CurrentTurnHintProps) {
  const { t } = useUiContext();
  return (
    <Show when={props.phase <= PbPhaseType.ROLL}>
      <div
        class="h-8 w-24 flex items-center justify-center rounded-full b-2 line-height-none font-bold current-turn-hint text-color-[var(--fg-color)] border-[var(--fg-color)] bg-[var(--bg-color)]"
        data-opp={props.opp}
      >
        <AutoResizeText>
          {t(
            props.opp ? "capsule.hintOppSideFirst" : "capsule.hintMySideFirst",
          )}
        </AutoResizeText>
      </div>
    </Show>
  );
}
