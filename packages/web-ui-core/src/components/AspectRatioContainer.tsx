// Copyright (C) 2025 Guyutongxue & CherryC9H13N
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

import { children, splitProps, type ComponentProps } from "solid-js";

export function AspectRatioContainer(props: ComponentProps<"div">) {
  const [local, restProps] = splitProps(props, [
    "class",
    "children",
  ]);
  const child = children(() => local.children);
  return (
    <div
      class={`aspect-ratio-[16/9] h-full max-w-full min-h-0 min-w-0 relative pointer-events-none children-pointer-events-auto ${
        local.class ?? ""
      }`}
      {...restProps}
    >
      {child()}
    </div>
  );
}
