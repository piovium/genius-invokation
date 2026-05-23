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

export interface CurrentTurnHintProps {
  phase: PbPhaseType;
  opp: boolean;
}

export function CurrentTurnHint(props: CurrentTurnHintProps) {
  const { t } = useUiContext();
  return (
    <Show when={props.phase <= PbPhaseType.ROLL}>
      <div
        class="h-6 min-w-20 px-3 rounded-full text-3.5 text-center line-height-6 font-bold current-turn-hint pointer-events-none select-none"
        data-opp={props.opp}
      >
        {t(props.opp ? "capsule.hintOppSideFirst" : "capsule.hintMySideFirst")}
      </div>
    </Show>
  );
}
