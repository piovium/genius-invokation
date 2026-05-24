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

import { DamageType } from "@gi-tcg/typings";
import { DICE_COLOR } from "./Dice";
import type { DamageInfo } from "./Chessboard";
import { createMemo } from "solid-js";
import { StrokedTextContent } from "./StrokedText";
import DamageIcon from "../svg/DamageIcon.svg?fb";
import HealIcon from "../svg/HealIcon.svg?fb";

export interface DamageProps {
  info: DamageInfo | null;
  shown: boolean;
}

export const DAMAGE_COLOR: Record<number, string> = {
  ...DICE_COLOR, 
  [DamageType.Piercing]: "void",
  [DamageType.Heal]: "heal",
};

export function Damage(props: DamageProps) {
  const damageType = createMemo(() => props.info?.damageType);
  const damageValue = createMemo(() => props.info?.value ?? 0);
  return (
    <div
      class={`self-center z-5 w-21 h-21 hidden data-[shown]:grid preserve-3d children:grid-area-[1/1] damage`}
      bool:data-shown={props.shown}
      style={{
        color: `var(--c-${DAMAGE_COLOR[damageType() ?? 0]})`,
      }}    
    >
      <HealIcon
        class="h-full w-full data-[hidden]:hidden"
        bool:data-hidden={damageType() !== DamageType.Heal}
      />
      <DamageIcon
        class="h-full w-full data-[hidden]:hidden"
        bool:data-hidden={damageType() === DamageType.Heal}
      />
      <StrokedTextContent
        class="font-bold text-center text-9 self-center text-nowrap"
        text={`${
          damageType() === DamageType.Heal ? "+" : "-"
        }${damageValue()}`}
        strokeColor="#fffae3"
        strokeWidth={7}
      />
    </div>
  );
}
