import { DEFAULT_ASSETS_MANAGER } from "@gi-tcg/assets-manager";
import type { AssetOption } from "../types";

export function getSafeName(id: number) {
  return DEFAULT_ASSETS_MANAGER.getNameSync(id) ?? `未命名 #${id}`;
}

export function buildSearch(name: string, id: number) {
  return `${name} ${id}`.toLowerCase();
}

export function matchesSearch(option: AssetOption<unknown>, query: string) {
  return option.search.includes(query.trim().toLowerCase());
}

export function getImageUrl(
  definition: { id: number },
  mode: "card" | "icon" = "card",
) {
  return DEFAULT_ASSETS_MANAGER.getImageUrlSync(definition.id, {
    type: mode === "card" ? "cardFace" : "icon",
    thumbnail: mode === "icon",
  });
}

export function decodeDeckShareCode(code: string) {
  return DEFAULT_ASSETS_MANAGER.decode(code.trim());
}
