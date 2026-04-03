import {
  For,
  Show,
  createEffect,
  createMemo,
  createSignal,
  splitProps,
  type ComponentProps,
  type JSX,
} from "solid-js";
import type { AssetOption } from "../types";
import { matchesSearch } from "../state/assets";

export function SectionTitle(props: { title: string; description?: string }) {
  return (
    <div class="flex items-start justify-between gap-3">
      <div>
        <h3 class="text-sm font-semibold tracking-[0.24em] text-amber-100/90 uppercase">
          {props.title}
        </h3>
        <Show when={props.description}>
          <p class="mt-1 text-xs text-slate-300/80">{props.description}</p>
        </Show>
      </div>
    </div>
  );
}

export function Surface(props: {
  title?: string;
  children: JSX.Element;
  class?: string;
}) {
  return (
    <section
      class={`rounded-3xl border border-[var(--gi-editor-border)] bg-[var(--gi-editor-panel)] p-4 shadow-[var(--gi-editor-shadow)] ${props.class ?? ""}`}
    >
      <Show when={props.title}>
        <h2 class="mb-4 text-lg font-semibold text-amber-50">{props.title}</h2>
      </Show>
      {props.children}
    </section>
  );
}

export function FieldLabel(props: { label: string; hint?: string }) {
  return (
    <label class="flex flex-col gap-2 text-sm text-slate-200">
      <span class="font-medium text-amber-50">{props.label}</span>
      <Show when={props.hint}>
        <span class="text-xs text-slate-400">{props.hint}</span>
      </Show>
    </label>
  );
}

export interface NumberFieldProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  mode?: "integer" | "number";
  min?: number;
  max?: number;
  disabled?: boolean;
  readOnly?: boolean;
  hint?: string;
}

export function NumberField(props: NumberFieldProps) {
  // eslint-disable-next-line solid/reactivity
  const [text, setText] = createSignal(String(props.value));
  // eslint-disable-next-line no-unassigned-vars
  let inputRef!: HTMLInputElement;

  createEffect(() => {
    const nextValue = String(props.value);
    if (document.activeElement !== inputRef && text() !== nextValue) {
      setText(nextValue);
    }
  });

  const validate = (raw: string) => {
    if (!inputRef) {
      return false;
    }
    if (raw.trim() === "") {
      inputRef.setCustomValidity("请输入数值");
      return false;
    }
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) {
      inputRef.setCustomValidity("请输入有效数字");
      return false;
    }
    if (props.mode !== "number" && !Number.isSafeInteger(parsed)) {
      inputRef.setCustomValidity("请输入安全整数");
      return false;
    }
    if (typeof props.min === "number" && parsed < props.min) {
      inputRef.setCustomValidity(`数值不能小于 ${props.min}`);
      return false;
    }
    if (typeof props.max === "number" && parsed > props.max) {
      inputRef.setCustomValidity(`数值不能大于 ${props.max}`);
      return false;
    }
    inputRef.setCustomValidity("");
    props.onChange(parsed);
    return true;
  };

  return (
    <div class="flex flex-col gap-2">
      <FieldLabel label={props.label} hint={props.hint} />
      <input
        ref={inputRef}
        class="rounded-2xl border border-white/10 bg-slate-950/40 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-amber-200/50 disabled:cursor-not-allowed disabled:opacity-60"
        type="number"
        step={props.mode === "number" ? "any" : "1"}
        min={props.min}
        max={props.max}
        value={text()}
        disabled={props.disabled}
        readOnly={props.readOnly}
        required
        onInput={(event) => {
          const nextValue = event.currentTarget.value;
          setText(nextValue);
          validate(nextValue);
        }}
        onBlur={(event) => {
          validate(event.currentTarget.value);
          if (event.currentTarget.validity.valid) {
            setText(String(props.value));
          }
        }}
      />
    </div>
  );
}

export interface BooleanFieldProps {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}

export function BooleanField(props: BooleanFieldProps) {
  return (
    <div class="flex items-center justify-between gap-2">
      <FieldLabel label={props.label} />
      <button
        type="button"
        role="switch"
        aria-checked={props.value}
        disabled={props.disabled}
        onClick={() => props.onChange(!props.value)}
        class={`relative inline-flex h-6 w-11 p-0.5 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200/50 disabled:cursor-not-allowed disabled:opacity-60 ${
          props.value ? "bg-amber-400/80" : "bg-slate-600/60"
        }`}
      >
        <span
          class={`pointer-events-none inline-block h-5 w-5 translate-x-0 rounded-full bg-white shadow-lg ring-0 transition-transform duration-200 ease-in-out ${
            props.value ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}

export interface SelectFieldProps {
  label: string;
  value: string | number;
  options: readonly { value: string | number; label: string }[];
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function SelectField(props: SelectFieldProps) {
  return (
    <div class="flex flex-col gap-2">
      <FieldLabel label={props.label} />
      <select
        class="rounded-2xl border border-white/10 bg-slate-950/40 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-amber-200/50 disabled:cursor-not-allowed disabled:opacity-60"
        value={String(props.value)}
        disabled={props.disabled}
        onChange={(event) => props.onChange(event.currentTarget.value)}
      >
        <For each={props.options}>
          {(option) => (
            <option value={String(option.value)}>{option.label}</option>
          )}
        </For>
      </select>
    </div>
  );
}

export interface SearchableSelectProps<TDefinition> {
  label: string;
  options: readonly AssetOption<TDefinition>[];
  buttonText: string;
  placeholder?: string;
  emptyText?: string;
  disabled?: boolean;
  onSelect: (option: AssetOption<TDefinition>) => void;
}

export function SearchableSelect<TDefinition>(
  props: SearchableSelectProps<TDefinition>,
) {
  const [query, setQuery] = createSignal("");
  const filtered = createMemo(() =>
    props.options.filter((option) => matchesSearch(option, query())),
  );
  const [selected, setSelected] = createSignal<string>("");

  createEffect(() => {
    const options = filtered();
    if (options.length === 0) {
      setSelected("");
      return;
    }
    if (!options.some((option) => String(option.id) === selected())) {
      setSelected(String(options[0]?.id));
    }
  });

  const selectCurrent = () => {
    const current = filtered().find(
      (option) => String(option.id) === selected(),
    );
    if (!current) {
      return;
    }
    props.onSelect(current);
  };

  return (
    <div class="flex flex-col gap-2 rounded-2xl border border-white/10 bg-slate-950/20 p-3">
      <FieldLabel label={props.label} />
      <input
        class="rounded-2xl border border-white/10 bg-slate-950/40 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-amber-200/50 disabled:cursor-not-allowed disabled:opacity-60"
        value={query()}
        disabled={props.disabled}
        placeholder={props.placeholder ?? "按名称或编号搜索"}
        onInput={(event) => setQuery(event.currentTarget.value)}
      />
      <select
        class="min-h-32 rounded-2xl border border-white/10 bg-slate-950/40 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-amber-200/50 disabled:cursor-not-allowed disabled:opacity-60"
        size={6}
        value={selected()}
        disabled={props.disabled || filtered().length === 0}
        onChange={(event) => setSelected(event.currentTarget.value)}
      >
        <For each={filtered()}>
          {(option) => (
            <option value={String(option.id)}>
              {option.name} #{option.id}
            </option>
          )}
        </For>
      </select>
      <Show when={filtered().length === 0}>
        <p class="text-xs text-slate-400">{props.emptyText ?? "没有匹配项"}</p>
      </Show>
      <button
        type="button"
        class="gi-editor-button rounded-full border border-amber-200/30 bg-amber-300/10 px-4 py-2 text-sm font-medium text-amber-100 disabled:cursor-not-allowed disabled:opacity-40"
        disabled={props.disabled || filtered().length === 0}
        onClick={selectCurrent}
      >
        {props.buttonText}
      </button>
    </div>
  );
}

export interface ActionButtonProps extends ComponentProps<"button"> {
  label: string;
  disabled?: boolean;
  tone?: "default" | "danger" | "accent";
}

export function ActionButton(props: ActionButtonProps) {
  const [localProps, restProps] = splitProps(props, [
    "label",
    "disabled",
    "tone",
    "class",
  ]);
  const toneClass = createMemo(() => {
    switch (props.tone) {
      case "danger":
        return "border-rose-300/30 bg-rose-400/10 text-rose-100";
      case "accent":
        return "border-cyan-200/30 bg-cyan-300/10 text-cyan-50";
      default:
        return "border-white/10 bg-white/5 text-slate-100";
    }
  });
  return (
    <button
      type="button"
      class={`gi-editor-button rounded-full border px-3 py-1.5 text-xs font-medium ${toneClass()} ${localProps.class || ""}`}
      disabled={localProps.disabled}
      {...restProps}
    >
      {localProps.label}
    </button>
  );
}
