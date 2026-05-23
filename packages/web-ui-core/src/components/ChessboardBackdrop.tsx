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

export interface ChessboardBackdropProps {
  shown?: boolean;
  onClick?: (e: MouseEvent) => void;
}

export function ChessboardBackdrop(props: ChessboardBackdropProps) {
  return (
    <div
      class={`absolute inset-0 translate-z-0.1
        pointer-events-none data-[shown]:pointer-events-auto
        data-[shown]:bg-black/50 bg-black/0 transition-all
        invisible data-[shown]:visible`}
      bool:data-shown={props.shown}
      onClick={(e) => {
        e.stopPropagation();
        props.onClick?.(e);
      }}
    />
  );
}
