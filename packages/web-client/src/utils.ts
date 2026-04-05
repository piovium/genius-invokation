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

import type { Deck } from "@gi-tcg/typings";

export interface PlayerInfo {
  isGuest: boolean;
  id: number | string;
  name: string;
  deck: Deck;
}

export function getAvatarUrl(userId: number) {
  return `https://avatars.githubusercontent.com/u/${userId}?v=4`;
}

function hashCode(s: string) {
  let h = 0;
  for(let i = 0; i < s.length; i++)
      h = Math.imul(31, h) + s.charCodeAt(i) | 0;
  return h;
}

export function getPlayerAvatarUrl(player: PlayerInfo) {
  if (player.isGuest) {
    const hash = Math.abs(hashCode(player.name));
    return `/avatars/${AVATARS[hash % AVATARS.length]}`;
  } else {
    return getAvatarUrl(player.id as number);
  }
}

export async function copyToClipboard(content: string) {
  if (navigator.clipboard) {
    await navigator.clipboard.writeText(content);
  } else {
    const textarea = document.createElement("textarea");
    textarea.value = content;
    textarea.style.position = "fixed";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    try {
      document.execCommand("copy");
    } finally {
      document.body.removeChild(textarea);
    }
  }
}

export function roomIdToCode(id: number) {
  return String(id).padStart(4, "0");
}

export function roomCodeToId(code: string) {
  return Number.parseInt(code, 10);
}
