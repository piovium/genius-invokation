import type { Accessor } from "solid-js";

export function guard<T, U extends T>(
  signal: Accessor<T>,
  predicate: (value: T) => value is U,
): U | undefined {
  const value = signal();
  return predicate(value) ? value : void 0;
}
