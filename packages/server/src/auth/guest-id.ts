import { createId, isCuid } from "@paralleldrive/cuid2";

/** The tag prefixing guest IDs, distinguishing them from account IDs. */
const GUEST_TAG = "guest";

export function createGuestId(): string {
  return `${GUEST_TAG}-${createId()}`;
}

/** True when `id` is a string tagged as a guest and carrying a cuid2 body. */
export function isGuestId(id: unknown): id is string {
  if (typeof id !== "string") return false;
  const [tag, cuid] = id.split("-");
  return tag === GUEST_TAG && !!cuid && isCuid(cuid);
}
