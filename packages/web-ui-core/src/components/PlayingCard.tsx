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

import { Image } from "./Image";
import type { PlayingCardInfo } from "./Chessboard";
import CardFrameNormal from "../svg/CardFrameNormal.svg?fb";

export interface PlayingCardProps extends PlayingCardInfo {
  opp: boolean;
}

export function PlayingCard(props: PlayingCardProps) {
  return (
    <div
      class="place-self-center w-35 h-60 mb-24 rounded-lg grid children:grid-area-[1/1] playing-card"
      bool:data-opp={props.opp}
      bool:data-no-effect={props.noEffect}
    >
      <Image
        class="h-full w-full p-1%"
        imageId={props.data.definitionId}
        fallback="card"
      />
      <CardFrameNormal class="h-full w-full pointer-events-none" />
    </div>
  );
}
