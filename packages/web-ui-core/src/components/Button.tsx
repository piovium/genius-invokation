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
// along with this program.  If not, see <http://www.gnu.org/licenses/>.

import { children, type JSX } from "solid-js";
import ButtonNormal from "../svg/ButtonNormal.svg?fb";
import ButtonHover from "../svg/ButtonHover.svg?fb";
import ButtonActive from "../svg/ButtonActive.svg?fb";
import { AutoResizeText } from "./AutoResizeText";

export interface ButtonProps {
  class?: string;
  children: JSX.Element;
  onClick: (e: MouseEvent) => void;
}

export function Button(props: ButtonProps) {
  const ch = children(() => props.children);
  return (
    <button
      class={`w-41 h-9 grid group/confirm_btn bg-transparent place-items-center ${
        props.class ?? ""
      }`}
      onClick={(e) => props.onClick(e)}
    >
      <ButtonNormal class="grid-area-[1/1] w-full" />  
      <ButtonHover class="grid-area-[1/1] w-full hidden group-[:hover:not(:active)]/confirm_btn:block" />          
      <ButtonActive class="grid-area-[1/1] w-full hidden group-active/confirm_btn:block" />
      <AutoResizeText class="grid-area-[1/1] w-30 text-center font-bold text-black/70">
        {ch()}
      </AutoResizeText>
    </button>
  );
}
