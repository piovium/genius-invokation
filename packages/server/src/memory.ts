/**
 * Ask V8 to compact the heap and release free pages back to the operating
 * system. Node exposes `gc()` only under `--expose-gc`; without that flag this
 * is a no-op, leaving V8 to its own idle schedule, which the quiet gap between
 * games is too short to trigger.
 */
export function releaseIdleMemory() {
  globalThis.gc?.({ type: "major", execution: "sync" });
}
