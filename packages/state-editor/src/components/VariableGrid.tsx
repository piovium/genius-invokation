import { For } from "solid-js";
import { NumberField } from "./Fields";

export function VariableGrid(props: {
  entries: readonly [string, number][];
  disabled?: boolean;
  readOnlyKeys?: readonly string[];
  onChange: (key: string, value: number) => void;
}) {
  const readOnly = () => new Set(props.readOnlyKeys ?? []);
  return (
    <div class="grid gap-3 sm:grid-cols-2">
      <For each={props.entries}>
        {([key, value]) => (
          <NumberField
            label={key}
            value={value}
            disabled={props.disabled}
            readOnly={readOnly().has(key)}
            onChange={(nextValue) => props.onChange(key, nextValue)}
          />
        )}
      </For>
    </div>
  );
}
