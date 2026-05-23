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

import type { TuningAreaInfo } from "./Chessboard";
import { cssPropertyOfTransform } from "../ui_state";
import TuningIcon from "../svg/TuningIcon.svg?fb";

export interface TuningAreaProps extends TuningAreaInfo {}

export function TuningArea(props: TuningAreaProps) {
  const status = () => {
    if (!props.draggingHand || !props.draggingHand.tuneStep) {
      return "none";
    }
    if (props.draggingHand.status !== "moving") {
      return "hidden";
    }
    if (props.cardHovering) {
      return "shown-hovering";
    }
    return "shown";
  };
  return (
    <div
      class={`absolute top-0 left-0 h-full w-42 flex items-center
        opacity-0 data-[status=shown]:opacity-75 data-[status=shown-hovering]:opacity-100
        invisible data-[status^=shown]:visible tuning-area`}
      data-status={status()}
      bool:data-card-hovering={props.cardHovering}
      style={cssPropertyOfTransform(props.transform)}
    >
      <TuningIcon class="w-8 h-8 m-3" />
    </div>
  );
}
