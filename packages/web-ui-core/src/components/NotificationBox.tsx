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

import { getNameSync } from "@gi-tcg/assets-manager";
import type { NotificationBoxInfo } from "./Chessboard";
import { Image } from "./Image";
import { createEffect, Show } from "solid-js";
import { PbSkillType } from "@gi-tcg/typings";

export interface NotificationBoxProps {
  opp: boolean;
  data: NotificationBoxInfo;
}

export function NotificationBox(props: NotificationBoxProps) {
  const typeText = (
    type: NotificationBoxInfo["skillType"],
  ): string | undefined => {
    switch (type) {
      case PbSkillType.NORMAL:
        return "普通攻击";
      case PbSkillType.ELEMENTAL:
        return "元素战技";
      case PbSkillType.BURST:
        return "元素爆发";
      case PbSkillType.CHARACTER_PASSIVE:
        return "被动技能";
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
                <h5 class="font-bold color-#ede4d8">
                  {getNameSync(props.data.skillDefinitionId as number)}
                </h5>
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
              {props.opp ? "对方" : "我方"}切换角色：
              {getNameSync(props.data.characterDefinitionId)}
            </h5>
            <Show when={props.data.skillDefinitionId}>
              {(skillDefinitionId) => (
                <>
                  <p
                    class="text-[var(--text-color)] font-size-80% font-bold"
                    data-opp={props.opp}
                  >
                    {getNameSync(props.data.characterDefinitionId)}
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
                超载
              </p>
            </Show>
          </Show>
        </div>
      </div>
    </div>
  );
}
