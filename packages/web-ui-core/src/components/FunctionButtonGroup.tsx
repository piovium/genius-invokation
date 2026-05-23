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
import { Show } from "solid-js";
import VisibilityIcon from "../svg/VisibilityIcon.svg?fb";
import HistoryIcon from "../svg/HistoryIcon.svg?fb";
import FullScreen from "../svg/FullScreen.svg?fb";
import NormalScreen from "../svg/NormalScreen.svg?fb";
import ExitIcon from "../svg/Exit.svg?fb";
import { useUiContext } from "../hooks/context";

export interface SpecialViewToggleButtonProps {
  class?: string;
  onClick?: () => void;
}

export function SpecialViewToggleButton(props: SpecialViewToggleButtonProps) {
  return (
    <button
      class={`h-8 w-8 function-button ${props.class ?? ""}`}
      onClick={() => {
        props.onClick?.();
      }}
    >
      <VisibilityIcon class="h-7 w-7" />
    </button>
  );
}

export interface HistoryToggleButtonProps {
  onClick?: () => void;
}

export function HistoryToggleButton(props: HistoryToggleButtonProps) {
  return (
    <button
      class="h-8 w-8 function-button"
      onClick={() => {
        props.onClick?.();
      }}
    >
      <HistoryIcon class="h-7 w-7" />
    </button>
  );
}

export interface FullScreenToggleButtonProps {
  isFullScreen: boolean;
  onClick?: () => void;
}

export function FullScreenToggleButton(props: FullScreenToggleButtonProps) {
  return (
    <button
      class="h-8 w-8 function-button"
      onClick={() => {
        props.onClick?.();
      }}
    >
      <Show
        when={!props.isFullScreen}
        fallback={<NormalScreen class="h-7 w-7" />}
      >
        <FullScreen class="h-7 w-7" />
      </Show>
    </button>
  );
}

export interface ExitButtonProps {
  onClick?: () => void;
}

export function ExitButton(props: ExitButtonProps) {
  const { t } = useUiContext();
  return (
    <button
      class="h-8 w-8 function-button danger"
      title={t("ui.giveUpGame")}
      onClick={() => {
        props.onClick?.();
      }}
    >
      <ExitIcon class="h-7 w-7" />
    </button>
  );
}
