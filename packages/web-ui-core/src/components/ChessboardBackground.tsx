// Copyright (C) 2025 Guyutongxue, CherryC9H13N
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

import { AspectRatioContainer } from "./AspectRatioContainer";
import { WithDelicateUi } from "../primitives/delicate_ui";

export interface ChessboardBackgroundProps {
  color?: string;
}
export function ChessboardBackground(props: ChessboardBackgroundProps) {
  return (
    <WithDelicateUi
      assetId={"ChessboardBackground"}
      fallback={
        <AspectRatioContainer
          class="self-center p-10 chessboard-bg-container"
        >
          <div
            class="h-full w-full rounded-15% brightness-120 b-5 b-#221100 shadow-[inset_0_0_16px_#000000]"
            style={{ "background-color": props.color ?? "#c0cac3" }}
          />
          <div class="absolute top-49.5% left-5% h-1% w-90% bg-black/5"/>
        </AspectRatioContainer>
      }
    >
      {(image) => (
        <div
          class="grid-area-[1/1] aspect-ratio-[16/9] max-h-full max-w-full chessboard-bg-container"
          style={{ "background-color": props.color ?? "#c0cac3" }}
        >
          {image}
        </div>
      )}
    </WithDelicateUi>
  );
}
