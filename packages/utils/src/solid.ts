import { affects, createMemo, isPending, refresh } from "solid-js";

type RequestResult<T> =
  | { status: "loading"; value: undefined; error?: never }
  | { status: "ready"; value: T; error?: never }
  | { status: "error"; value: undefined; error: unknown };

// These views render their own inline placeholders and errors while the rest
// of the page (in particular, the playing board) stays interactive.
export function createRequest<T>(load: () => T | PromiseLike<T>) {
  const result = createMemo<RequestResult<T>>(
    async () => {
      try {
        return { status: "ready", value: await load() };
      } catch (error) {
        return { status: "error", value: undefined, error };
      }
    },
    { loadingValue: { status: "loading", value: undefined } },
  );
  return {
    value: () => result().value,
    loading: () => result().status === "loading" || isPending(result),
    error: () => result().error,
    refetch: () => {
      affects(result);
      return refresh(result);
    },
  };
}
