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

export interface IdBoxProps {
  defId: number;
  id?: number;
}

export function IdBox(props: IdBoxProps) {
  return (
    <p class="mt-[0.5em] font-mono id-box">
      DefID: <span class="select-text">{props.defId}</span>
      <Show when={props.id}>
        <span class="inline-block w-[1em]" />
        ID: <span class="select-text">{props.id}</span>
      </Show>
    </p>
  );
}
