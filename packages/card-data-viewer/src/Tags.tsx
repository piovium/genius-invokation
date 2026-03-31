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

import { For } from "solid-js";
import { useAssetsManager } from "./context";
import { typeTagText } from "./text_map";

export interface TagProps {
  tags: string[];
}

export function Tags(props: TagProps) {
  const { t } = useAssetsManager();
  return (
    <ul class="flex flex-row gap-2 flex-wrap mb-3">
      <For each={props.tags}>
        {(tag) => (
          <li class="bg-yellow-8 py-0.5 px-1 text-yellow-1 text-xs rounded-sm">
            {typeTagText(tag, t)}
          </li>
        )}
      </For>
    </ul>
  );
}
