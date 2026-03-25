// Copyright (C) 2025 Guyutongxue
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
import type { RoundAndPhaseNotificationInfo } from "../mutations";
import {
  createEffect,
  createMemo,
  createSignal,
  Match,
  Show,
  Switch,
} from "solid-js";
import { useUiContext } from "../hooks/context";

export interface RoundAndPhaseNotificationProps {
  class?: string;
  who: 0 | 1;
  roundNumber: number;
  currentTurn: 0 | 1;
  info: RoundAndPhaseNotificationInfo;
}

export function RoundAndPhaseNotification(
  props: RoundAndPhaseNotificationProps,
) {
  const { t } = useUiContext();
  const phaseText = createMemo<Record<PbPhaseType, string>>(() => ({
    [PbPhaseType.ROLL]: t("phase.rollPhase"),
    [PbPhaseType.ACTION]: t("phase.actionPhase"),
    [PbPhaseType.END]: t("phase.endPhase"),
    [PbPhaseType.INIT_ACTIVES]: "",
    [PbPhaseType.INIT_HANDS]: "",
    [PbPhaseType.GAME_END]: "",
  }));
  const opp = createMemo(() => props.who !== props.info.who);
  const [isFirst, setIsFirst] = createSignal(true);
  createEffect(() => {
    // 宣布回合结束总是先手方先宣布，随后后手方宣布，周而复始
    if (props.info.value === "declareEnd") {
      setIsFirst((prev) => !prev);
    }
  });
  return (
    <div
      class={`grid grid-cols-1 grid-rows-1 justify-items-center items-center pointer-events-none select-none ${props.class} children:row-span-full children:col-span-full`}
      data-opp={opp()}
    >
      <Switch>
        <Match when={typeof props.info.value === "number"}>
          <div
            class="w-210 h-6 flex flex-row justify-center items-center action-hint text-#f5ebd2 font-bold text-3.5 animate-[phase-notification_500ms_both] data-[delay]:animate-[phase-notification_500ms_800ms_both]"
            bool:data-delay={props.info.showRound}
          >
            {phaseText()[props.info.value as PbPhaseType]}
          </div>
        </Match>
        <Match
          when={
            props.info.value === "action" || props.info.value === "declareEnd"
          }
        >
          <div
            class="w-210 h-6 flex flex-row justify-center items-center font-bold text-3.5 action-hint-who animate-[phase-notification_500ms_both]"
            bool:data-opp={opp()}
          >
            {props.info.value === "action"
              ? t(opp() ? "phase.oppActionTurn" : "phase.myActionTurn")
              : t(
                  opp()
                    ? "phase.oppDeclareEndTurn"
                    : "phase.myDeclareEndTurn",
                )}
            <Show when={props.info.value === "declareEnd" && !isFirst()}>
              {t("phase.gainFirst")}
            </Show>
          </div>
        </Match>
      </Switch>
      <Show when={props.info.showRound}>
        <div
          class="w-210 h-6 pb-6 flex flex-col justify-center items-center font-bold text-3.5 action-hint-who animate-[phase-notification_800ms_both]"
          bool:data-opp={props.currentTurn !== props.who}
        >
          <h5 class="font-bold text-3">
            {t("phase.round", { round: props.roundNumber })}
          </h5>
          <span>
            {t(
              props.currentTurn === props.who
                ? "phase.mySideFirst"
                : "phase.oppSideFirst",
            )}
          </span>
        </div>
      </Show>
    </div>
  );
}
