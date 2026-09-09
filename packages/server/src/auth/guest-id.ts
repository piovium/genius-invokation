import { createId, isCuid } from "@paralleldrive/cuid2";

export function createGuestId() {
  return "guest-" + createId();
}
export function isGuestId(id: unknown): id is string {
  if (typeof id !== "string") return false;
  const [tag, cuid] = id.split("-");
  return tag === "guest" && !!cuid && isCuid(cuid);
}
