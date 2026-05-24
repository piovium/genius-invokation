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

  const title = () => {
    if (props.data.type === "switchActive") {
      return `${t(`notification.${props.opp ? "opp" : "my"}SwitchRole`)}${characterName()}`;
    } else {
      return skillName();
    }
  };

  const description = () => {
    if (props.data.type === "switchActive") {
      return props.data.skillType === "overloaded"
        ? t("notification.overloaded")
        : characterName();
    } else {
      return typeText(props.data.skillType);
    }
  };

  return (
    <div
      class="place-self-center mb-69 min-h-15 w-64 rounded-lg b-2 flex select-none notification-box"
      bool:data-opp={props.opp}
      style={{
        "--enter-offset": props.opp ? "2rem" : "-2rem",
      }}
    >
      <Image
        imageId={props.data.characterDefinitionId}
        type="icon"
        class="h-10 w-10 rounded-full b-[var(--inner-border-color)] border-2 m-2"
        fallback="skill"
      />
      <div class="w-45 line-height-none">
        <h5 class="font-bold color-#ede4d8 my-2">{title()}</h5>
        <p class="text-[var(--text-color)] font-size-80% font-bold my-2">
          {description()}
        </p>
      </div>
      <Show when={props.data.skillDefinitionId}>
        {(skillDefinitionId) => (
          <Image
            imageId={skillDefinitionId()}
            type="icon"
            class="h-8 w-8 mr--4 my-3 rounded-full bg-[var(--inner-background-color)] b-[var(--inner-border-color)] border-2"
            data-opp={props.opp}
            fallback="skill"
          />
        )}
      </Show>
    </div>
  );
}
