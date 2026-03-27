import { For, Show, type JSX } from "solid-js";

import { getDefinitionName, getImageUrl } from "../state";

export interface PreviewTileProps {
  definition: { id: number; type: string };
  mode?: "card" | "icon";
  title?: string;
  subtitle?: string;
  badges?: readonly string[];
  active?: boolean;
  onClick?: () => void;
  actions?: JSX.Element;
}

export function PreviewTile(props: PreviewTileProps) {
  const mode = () => props.mode ?? "card";
  return (
    <div
      class={`rounded-3xl border p-3 transition ${
        props.active
          ? "border-amber-200/45 bg-amber-300/10"
          : "border-white/10 bg-slate-950/25"
      }`}
    >
      <button
        type="button"
        class="flex w-full flex-col gap-3 text-left"
        disabled={!props.onClick}
        onClick={() => props.onClick?.()}
      >
        <img
          src={getImageUrl(props.definition, mode())}
          alt={props.title ?? getDefinitionName(props.definition)}
          class={`w-full rounded-2xl border border-white/10 bg-slate-950/50 ${
            mode() === "card" ? "gi-editor-card-image" : "gi-editor-icon-image"
          }`}
        />
        <div class="space-y-1">
          <p class="text-sm font-semibold text-amber-50">
            {props.title ?? getDefinitionName(props.definition)}
          </p>
          <Show when={props.subtitle}>
            <p class="text-xs text-slate-300/80">{props.subtitle}</p>
          </Show>
        </div>
      </button>
      <Show when={props.badges && props.badges.length > 0}>
        <div class="mt-3 flex flex-wrap gap-1.5">
          <For each={props.badges}>{(badge) => <Badge>{badge}</Badge>}</For>
        </div>
      </Show>
      <Show when={props.actions}>
        <div class="mt-3 flex flex-wrap gap-2">{props.actions}</div>
      </Show>
    </div>
  );
}

export function Badge(props: { children: JSX.Element }) {
  return (
    <span class="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-slate-100">
      {props.children}
    </span>
  );
}

export function SummaryLine(props: { label: string; value: JSX.Element }) {
  return (
    <div class="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-950/25 px-3 py-2 text-sm">
      <span class="text-slate-300">{props.label}</span>
      <span class="text-right font-medium text-slate-50">{props.value}</span>
    </div>
  );
}
