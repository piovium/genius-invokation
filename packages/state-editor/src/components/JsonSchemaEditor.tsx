import { For, Match, Show, Switch } from "solid-js";
import type { ExpressiveJSONSchema } from "ya-json-schema-types";

import { ActionButton, BooleanField, NumberField } from "./Fields";
import { createSchemaDefault } from "../state/factory";

interface JsonSchemaEditorProps {
  schema: ExpressiveJSONSchema;
  value: unknown;
  label?: string;
  onChange: (value: unknown) => void;
}

function replaceArrayItem<T>(source: readonly T[], index: number, value: T) {
  const next = [...source];
  next[index] = value;
  return next;
}

export function JsonSchemaEditor(props: JsonSchemaEditorProps) {
  return (
    <Switch
      fallback={<p class="text-sm text-slate-400">该扩展状态无法编辑。</p>}
    >
      <Match when={props.schema?.type === "object"}>
        <div class="space-y-4">
          <For
            each={Object.entries(
              (props.schema?.properties as Record<string, unknown>) ?? {},
            )}
          >
            {([key, schema]) => (
              <div class="rounded-2xl border border-white/10 bg-slate-950/25 p-3">
                <JsonSchemaEditor
                  schema={schema as ExpressiveJSONSchema}
                  value={(props.value as Record<string, unknown> | null)?.[key]}
                  label={key}
                  onChange={(nextValue) =>
                    props.onChange({
                      ...((props.value as Record<string, unknown>) ?? {}),
                      [key]: nextValue,
                    })
                  }
                />
              </div>
            )}
          </For>
        </div>
      </Match>
      <Match
        when={
          props.schema?.type === "array" &&
          Array.isArray(props.schema?.prefixItems)
        }
      >
        <div class="space-y-3">
          <Show when={props.label}>
            <p class="text-sm font-medium text-amber-50">{props.label}</p>
          </Show>
          <For each={props.schema.prefixItems as ExpressiveJSONSchema[]}>
            {(schema, index) => (
              <div class="rounded-2xl border border-white/10 bg-slate-950/25 p-3">
                <JsonSchemaEditor
                  schema={schema as ExpressiveJSONSchema}
                  value={(props.value as ExpressiveJSONSchema[])?.[index()]}
                  label={`[${index()}]`}
                  onChange={(nextValue) =>
                    props.onChange(
                      replaceArrayItem(
                        (props.value as ExpressiveJSONSchema[]) ?? [],
                        index(),
                        nextValue,
                      ),
                    )
                  }
                />
              </div>
            )}
          </For>
        </div>
      </Match>
      <Match when={props.schema?.type === "array"}>
        <div class="space-y-3">
          <div class="flex items-center justify-between gap-3">
            <Show when={props.label}>
              <p class="text-sm font-medium text-amber-50">{props.label}</p>
            </Show>
            <ActionButton
              label="追加一项"
              onClick={() => {
                const current = Array.isArray(props.value) ? props.value : [];
                props.onChange([
                  ...current,
                  createSchemaDefault(
                    props.schema.items as ExpressiveJSONSchema,
                  ),
                ]);
              }}
              disabled={!props.schema?.items}
            />
          </div>
          <For each={Array.isArray(props.value) ? props.value : []}>
            {(item, index) => (
              <div class="space-y-3 rounded-2xl border border-white/10 bg-slate-950/25 p-3">
                <div class="flex items-center justify-between gap-2">
                  <p class="text-sm font-medium text-slate-200">[{index()}]</p>
                  <ActionButton
                    label="移除"
                    tone="danger"
                    onClick={() =>
                      props.onChange(
                        (Array.isArray(props.value) ? props.value : []).filter(
                          (_, itemIndex) => itemIndex !== index(),
                        ),
                      )
                    }
                  />
                </div>
                <JsonSchemaEditor
                  schema={props.schema.items as ExpressiveJSONSchema}
                  value={item}
                  onChange={(nextValue) =>
                    props.onChange(
                      replaceArrayItem(
                        (props.value as ExpressiveJSONSchema[]) ?? [],
                        index(),
                        nextValue,
                      ),
                    )
                  }
                />
              </div>
            )}
          </For>
        </div>
      </Match>
      <Match when={props.schema?.type === "number"}>
        <NumberField
          label={props.label ?? "数值"}
          value={typeof props.value === "number" ? props.value : 0}
          mode="number"
          onChange={(value) => props.onChange(value)}
        />
      </Match>
      <Match when={props.schema?.type === "boolean"}>
        <BooleanField
          label={props.label ?? "布尔值"}
          value={Boolean(props.value)}
          onChange={(value) => props.onChange(value)}
        />
      </Match>
    </Switch>
  );
}
