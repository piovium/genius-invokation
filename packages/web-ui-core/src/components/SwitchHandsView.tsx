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

import { Button } from "./Button";
import { useUiContext } from "../hooks/context";

export interface SwitchHandsViewProps {
  shown: boolean;
  onConfirm: () => void;
}

export function SwitchHandsView(props: SwitchHandsViewProps) {
  const { t } = useUiContext();
  return (
    <div
      class="w-full h-full hidden data-[shown]:flex flex-col items-center justify-center select-none z-3 pointer-events-none min-w-0 min-h-0 "
      bool:data-shown={props.shown}
    >
      <h3 class="h-10 font-bold text-3xl text-white/80 mb-66 pointer-events-none">
        {t("view.replaceHandsTitle")}
      </h3>
      <Button class="pointer-events-auto" onClick={props.onConfirm}>
        {t("view.confirmButton")}
      </Button>
    </div>
  );
}
