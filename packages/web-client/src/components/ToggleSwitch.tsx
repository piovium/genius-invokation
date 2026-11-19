// Copyright (C) 2024-2025 Guyutongxue
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
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

import type { JSX } from "@solidjs/web";

export function ToggleSwitch(props: JSX.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label class="relative inline-block h-6 aspect-ratio-[2/1]">
      <input type="checkbox" class="w-0 h-0 opacity-0 peer" {...props} />
      <span class="absolute cursor-pointer top-0 left-0 w-full h-full rounded-full bg-gray-500 b-2 b-gray-500 transition-colors transition-duration-400 peer-checked:bg-primary peer-checked:b-primary outline-primary outline-offset-2 peer-focus-visible-outline-solid flex flex-row items-center justify-start before:content-[''] before:h-full before:aspect-ratio-square before:bg-white before:transition-all before:transition-duration-400 before:rounded-full peer-checked:before:translate-x-[calc(100%+2px)] peer-disabled:opacity-60 peer-disabled:pointer-events-none" />
    </label>
  );
}
