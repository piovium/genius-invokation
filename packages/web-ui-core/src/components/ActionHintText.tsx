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

export interface ActionHintTextProps {
  class?: string;
  text?: string;
}

export function ActionHintText(props: ActionHintTextProps) {
  return (
    <div
      class={`max-w-250 min-h-0 data-[shown]:min-h-6 px-3 py-0.5 pointer-events-none flex flex-row justify-center items-center text-center leading-tight whitespace-normal break-words action-hint text-#f5ebd2 font-bold text-3.2 transition-height ${
        props.class ?? ""
      }`}
      bool:data-shown={props.text}
    >
      {props.text}
    </div>
  );
}
