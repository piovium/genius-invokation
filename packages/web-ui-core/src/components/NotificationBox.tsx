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

import type { NotificationBoxInfo } from "./Chessboard";
import { Image } from "./Image";
import { Show } from "solid-js";
import { PbSkillType } from "@gi-tcg/typings";
import { useUiContext } from "../hooks/context";

export interface NotificationBoxProps {
  opp: boolean;
  data: NotificationBoxInfo;
}

export function NotificationBox(props: NotificationBoxProps) {
  const { assetsManager, t } = useUiContext();

  const skillName = () =>
    typeof props.data.skillDefinitionId === "number"
      ? assetsManager().getNameSync(props.data.skillDefinitionId)
      : void 0;
  const characterName = () =>
    assetsManager().getNameSync(props.data.characterDefinitionId);

  const typeText = (
    type: NotificationBoxInfo["skillType"],
  ): string | undefined => {
    switch (type) {
      case PbSkillType.NORMAL:
        return t("notification.normalAttack");
      case PbSkillType.ELEMENTAL:
        return t("notification.elementalSkill");
      case PbSkillType.BURST:
        return t("notification.elementalBurst");
      case PbSkillType.CHARACTER_PASSIVE:
        return t("notification.passiveSkill");
    }
  };

  return (
    <div
      class="absolute top-[calc(50%-10.5rem)] z-100 h-15 min-w-60 data-[opp=false]:left-15 data-[opp=true]:right-15 text-white rounded-2 shadow-lg notification-box border-2 animate-[notification-box_700ms_both]"
      data-opp={props.opp}
      style={{
        "--enter-offset": props.opp ? "2rem" : "-2rem",
      }}
    >
      <div class="w-full h-full rounded-1.5 b-[var(--inner-border-color)] border-1 flex flex-row gap-2 items-center p-3">
        <div>
          <Image
            imageId={props.data.characterDefinitionId}
            type="icon"
            class="h-10 w-10 rounded-full b-[var(--inner-border-color)] border-2 relative"
            fallback="general"
          />
        </div>
        <div class="flex-col">
          <Show
            when={props.data.type === "switchActive"}
            fallback={
              <>
                <h5 class="font-bold color-#ede4d8">{skillName()}</h5>
                <p class="text-[var(--text-color)] font-size-80% font-bold">
                  {typeText(props.data.skillType)}
                </p>
                <Show when={props.data.skillDefinitionId}>
                  {(skillDefinitionId) => (
                    <>
                      <div class="absolute h-8 w-8 rounded-full bg-[var(--inner-background-color)] b-[var(--inner-border-color)] border-1 translate-x-50% translate-y--50% right-0 top-50% justify-center items-center p-0.3">
                        <Image
                          imageId={skillDefinitionId()}
                          type="icon"
                          class="h-full w-full"
                          data-opp={props.opp}
                          fallback="general"
                        />
                      </div>
                    </>
                  )}
                </Show>
              </>
            }
          >
            <h5 class="font-bold color-#ede4d8">
              {t(
                props.opp
                  ? "notification.oppSwitchRole"
                  : "notification.mySwitchRole",
              )}
              {characterName()}
            </h5>
            <Show when={props.data.skillDefinitionId}>
              {(skillDefinitionId) => (
                <>
                  <p
                    class="text-[var(--text-color)] font-size-80% font-bold"
                    data-opp={props.opp}
                  >
                    {characterName()}
                  </p>
                  <div class="absolute h-8 w-8 rounded-full bg-[var(--inner-background-color)] b-[var(--inner-border-color)] border-1 translate-x-50% translate-y--50% right-0 top-50% justify-center items-center p-0.3">
                    <Image
                      imageId={skillDefinitionId()}
                      type="icon"
                      class="h-full w-full"
                      fallback="general"
                    />
                  </div>
                </>
              )}
            </Show>
            <Show when={props.data.skillType === "overloaded"}>
              <p class="text-[var(--text-color)] font-size-80% font-bold">
                {t("notification.overloaded")}
              </p>
            </Show>
          </Show>
        </div>
      </div>
    </div>
  );
}
