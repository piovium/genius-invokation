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

import type { Deck } from "@gi-tcg/typings";
import shareIdMap from "./data/share_id.json";

const BLOCK_WORDS: string[] = [
  "2g1c",
  "64",
  "89",
  "1s",
  "anal",
  "anus",
  "ass",
  "ash0le",
  "ba9",
  "bitch",
  "boob",
  "boner",
  "b00bz",
  "b1tch",
  "b17ch",
  "bi7ch",
  "bbw",
  "bdsm",
  "beaner",
  "bimbos",
  "c4",
  "cag",
  "cunt",
  "cock",
  "c0cks",
  "chink",
  "clit",
  "coons",
  "cum",
  "darkie",
  "dick",
  "dildo",
  "dilld0",
  "dommes",
  "dvda",
  "ecchi",
  "erotic",
  "fuck",
  "fag1t",
  "fagg1t",
  "faggot",
  "fck",
  "fecal",
  "felch",
  "feltch",
  "femdom",
  "flg",
  "gay",
  "gwg",
  "girlon",
  "goatcx",
  "goatse",
  "gokkun",
  "grope",
  "guro",
  "hjt",
  "hentai",
  "hitler",
  "honkey",
  "hooker",
  "incest",
  "j8",
  "jba",
  "jiz",
  "jzm",
  "juggs",
  "kike",
  "kinky",
  "lolita",
  "milf",
  "mof0",
  "ntr",
  "nambla",
  "negro",
  "nignog",
  "nigga",
  "nigger",
  "nipple",
  "nympho",
  "orgasm",
  "orgy",
  "pcp", // might be removed
  "puki",
  "penis",
  "pussy",
  "pu55i",
  "pu55y",
  "porn",
  "p0rn",
  "paki",
  "panty",
  "poof",
  "poon",
  "pthc",
  "pubes",
  "punany",
  "queaf",
  "queef",
  "queer",
  "quim",
  "rbq",
  "rape",
  "raping",
  "rapist",
  "rectum",
  "rimjob",
  "sex",
  "shit",
  "sadism",
  "scat",
  "semen",
  "shota",
  "skeet",
  "slut",
  "smut",
  "sodomy",
  "spic",
  "spooge",
  "spunk",
  "suck",
  "tits",
  "tiedup",
  "titty",
  "tosser",
  "tranny",
  "tushy",
  "twat",
  "twink",
  "vagina",
  "vulva",
  "wank",
  "whore",
  "wh0re",
  "xjp",
  "yaoi",
  "yiffy",
];
const BLOCK_WORDS_RE = new RegExp(BLOCK_WORDS.join("|"), "i");

/** 解析原始分享码为分享码 id 数组 */
export function decodeRaw(src: string) {
  const arr = Array.from(atob(src), (c) => c.codePointAt(0)!);
  if (arr.length !== 51) {
    throw new Error("Invalid input");
  }
  const last = arr.pop()!;
  const reordered = [
    ...Array.from({ length: 25 }, (_, i) => (arr[2 * i]! - last) & 0xff),
    ...Array.from({ length: 25 }, (_, i) => (arr[2 * i + 1]! - last) & 0xff),
    0,
  ];
  const result = Array.from({ length: 17 }).flatMap((_, i) => [
    (reordered[i * 3]! << 4) + (reordered[i * 3 + 1]! >> 4),
    ((reordered[i * 3 + 1]! & 0xf) << 8) + reordered[i * 3 + 2]!,
  ]);
  result.pop();
  return result;
}

/** 将原始分享码 id 数组编码为分享码 */
export function encodeRaw(arr: readonly number[]) {
  if (arr.length !== 33) {
    throw new Error("Invalid input: should be exactly 33 number");
  }
  const padded = [...arr, 0];
  const reordered = Array.from({ length: 17 }).flatMap((_, i) => [
    padded[i * 2]! >> 4,
    ((padded[i * 2]! & 0xf) << 4) + (padded[i * 2 + 1]! >> 8),
    arr[i * 2 + 1]! & 0xff,
  ]);
  for (let last = 0; last < 0xff; last++) {
    const original = Array.from({ length: 25 }).flatMap((_, i) => [
      (reordered[i]! + last) & 0xff,
      (reordered[i + 25]! + last) & 0xff,
    ]);
    const encoded = btoa(String.fromCodePoint(...original, last));
    if (!BLOCK_WORDS_RE.test(encoded)) {
      return encoded;
    }
  }
  throw new Error("Not found");
}

/**
 * 将分享码 id 转换为卡牌定义 id
 * @param shareId 分享码 id
 * @returns 卡牌定义 id
 */
function shareIdToId(shareId: number): number {
  const map = shareIdMap as Record<string, number>;
  const id = map[shareId];
  if (!id) {
    throw new Error(`Invalid share ID ${shareId}`);
  }
  return Number(id);
}

/**
 * 将卡牌定义 id 转换为分享码 id
 * @param id 卡牌定义 id
 * @returns 分享码 id
 */
function idToShareId(id: number): number {
  const map = shareIdMap as Record<string, number>;
  const shareId = Object.entries(map).find(([, v]) => v === id);
  if (!shareId) {
    throw new Error(`Invalid ID ${id}`);
  }
  return Number(shareId[0]);
}

/**
 * 将牌组编码为分享码
 * @param deck 牌组（卡牌定义 id）
 * @returns 分享码
 */
export function staticEncode(deck: Deck) {
  const raw = [...deck.characters, ...deck.cards].map(idToShareId);
  return encodeRaw(raw);
}

/**
 * 将分享码解析为牌组
 * @param src 分享码
 * @returns 解析得到的牌组（卡牌定义 id）
 */
export function staticDecode(src: string) {
  const raw = decodeRaw(src).map(shareIdToId);
  return {
    characters: raw.slice(0, 3),
    cards: raw.slice(3),
  };
}
