import { createId, isCuid } from "@paralleldrive/cuid2";

/** Guest IDs are a cuid2 body behind a tag that tells them apart from account IDs. */
const GUEST_TAG = "guest";

export function createGuestId() {
  return `${GUEST_TAG}-${createId()}`;
}
export function isGuestId(id: unknown): id is string {
  if (typeof id !== "string") return false;
  const [tag, cuid] = id.split("-");
  return tag === GUEST_TAG && !!cuid && isCuid(cuid);
}
