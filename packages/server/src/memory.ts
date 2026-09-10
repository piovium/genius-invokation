/**
 * Ask V8 to compact the heap and return the free pages to the operating system.
 * Node exposes `gc()` only under `--expose-gc`, and without this call V8 waits
 * for its own idle schedule, which a quiet window between games never reaches.
 * Where the flag is absent this does nothing and V8 stays in charge.
 */
export function releaseIdleMemory() {
  globalThis.gc?.({ type: "major", execution: "sync" });
}
