import { For, Show, type JSX } from "solid-js";

import type { CharacterState } from "@gi-tcg/core";
import { Aura } from "@gi-tcg/typings";

import { getImageUrl } from "../state/assets";
import { DiceIcon } from "./DiceIcon";
import { getDefinitionName } from "../state/catalog";

const AURA_IMAGE_IDS: Record<number, number[]> = {
  [Aura.None]: [],
  [Aura.Cryo]: [1],
  [Aura.Hydro]: [2],
  [Aura.Pyro]: [3],
  [Aura.Electro]: [4],
  [Aura.Dendro]: [7],
  [Aura.CryoDendro]: [1, 7],
};

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

export interface CharacterPreviewProps {
  character: CharacterState | null;
  isActive: boolean;
}

export interface CardCollectionPreviewProps {
  items: readonly { definition: { id: number; type: string } }[];
  max: number;
}

export interface EntityAreaPreviewProps {
  items: readonly { definition: { id: number; type: string } }[];
  max: number;
  label: string;
}

export interface CombatStatusPreviewProps {
  items: readonly { definition: { id: number; type: string } }[];
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
          class={`w-full rounded-2xl ${mode() === "card" ? "gi-editor-card-image" : "gi-editor-icon-image"}`}
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

export function CharacterPreview(props: CharacterPreviewProps) {
  const equipments = () => {
    if (!props.character) return [];
    return props.character.entities.filter(
      (entity) => entity.definition.type === "equipment",
    );
  };

  const statuses = () => {
    if (!props.character) return [];
    return props.character.entities.filter(
      (entity) => entity.definition.type === "status",
    );
  };

  const statusDisplay = () => {
    const items = statuses();
    if (items.length <= 4) {
      return { items, showMore: false };
    }
    return {
      items: items.slice(0, 3),
      showMore: true,
      count: items.length - 3,
    };
  };

  const auraImage = () => {
    if (!props.character) return [];
    return AURA_IMAGE_IDS[props.character.variables.aura];
  };

  return (
    <Show
      when={props.character}
      fallback={
        <div class="text-center py-4 text-slate-500 text-sm">未选择角色</div>
      }
    >
      {(char) => (
        <>
          <Show when={!props.isActive}>
            <div class="h-4" />
          </Show>
          <div class="flex flex-col items-center">
            <div class="flex h-5 mt--2">
              <For each={auraImage()}>
                {(id) => (
                  <div class="w-5 h-5 rounded-full overflow-hidden bg-slate-800/50 flex-shrink-0">
                    <img
                      src={getImageUrl({ id }, "icon")}
                      alt=""
                      class="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                )}
              </For>
            </div>
            <div class="w-80% h-auto aspect-[7/12] rounded-lg overflow-hidden bg-slate-800/50 flex-shrink-0 b-solid b-2 b-slate-400 box-border relative">
              <img
                src={getImageUrl(char().definition, "card")}
                alt=""
                class="w-full h-full object-cover"
                loading="lazy"
              />
              <div class="absolute flex bottom-0 flex-col bg-slate-800/80 p-1 w-full box-border">
                <div class="flex items-center gap-1 w-full justify-center">
                  <span class="text-amber-200 text-xs truncate">
                    {getDefinitionName(char().definition)}
                  </span>
                </div>
                <div class="grid grid-cols-2 text-[10px] text-center">
                  <span class="text-rose-300">生命</span>
                  <span class="text-cyan-300">能量</span>
                  <span class="text-rose-300">
                    {char().variables.health}/{char().variables.maxHealth}
                  </span>
                  <span class="text-cyan-300">
                    {char().variables.energy}/{char().variables.maxEnergy}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <Show when={props.isActive}>
            <div class="h-4 text-[10px] text-cyan-400/80 text-center">
              出战角色
            </div>
          </Show>
          <Show when={equipments().length > 0}>
            <div class="grid grid-cols-4 items-center gap-0.5">
              <For each={equipments()}>
                {(entity) => (
                  <div class="w-full h-auto aspect-square rounded overflow-hidden">
                    <img
                      src={getImageUrl(entity.definition, "icon")}
                      alt=""
                      class="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                )}
              </For>
            </div>
          </Show>
          <Show when={statuses().length > 0}>
            <div class="grid grid-cols-4 items-start gap-0.5">
              <For each={statusDisplay().items}>
                {(entity) => (
                  <div class="w-full h-auto aspect-square rounded overflow-hidden">
                    <img
                      src={getImageUrl(entity.definition, "icon")}
                      alt=""
                      class="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                )}
              </For>
              <Show when={statusDisplay().showMore}>
                <div class="w-full h-auto aspect-square rounded-full bg-slate-400/20 flex items-center justify-center text-[8px] text-slate-400">
                  +{statusDisplay().count}
                </div>
              </Show>
            </div>
          </Show>
        </>
      )}
    </Show>
  );
}

export function PilePreview(props: CardCollectionPreviewProps) {
  const displayItems = () => {
    if (props.items.length <= 10) {
      return { items: props.items, showMore: false };
    }
    return { items: props.items.slice(0, 9), showMore: true };
  };

  return (
    <div class="space-y-1">
      <div class="flex items-center justify-between">
        <span class="text-cyan-200">{props.items.length} 张卡牌</span>
        <span class="text-slate-500">上限 {props.max}</span>
      </div>
      <div class="w-full bg-slate-800 rounded-full h-1.5 mt-2">
        <div
          class="bg-cyan-500 h-1.5 rounded-full transition-all"
          style={{
            width: `${Math.min((props.items.length / props.max) * 100, 100)}%`,
          }}
        />
      </div>
      <div class="grid grid-cols-5 items-start gap-1 pt-4">
        <For each={displayItems().items}>
          {(item) => (
            <div class="w-full h-auto rounded overflow-hidden bg-slate-800/50">
              <img
                src={getImageUrl(item.definition, "card")}
                alt=""
                class="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
          )}
        </For>
        {displayItems().showMore && (
          <div class="w-full h-auto aspect-[7/12] rounded-0.5 b-solid box-border b-slate-400 b-2 bg-slate-800/50 flex items-center justify-center text-[10px] text-slate-400">
            +{props.items.length - 9}
          </div>
        )}
      </div>
    </div>
  );
}

export function HandsPreview(props: CardCollectionPreviewProps) {
  return (
    <div class="space-y-1">
      <div class="flex items-center justify-between">
        <span class="text-cyan-200">{props.items.length} 张卡牌</span>
        <span class="text-slate-500">上限 {props.max}</span>
      </div>
      <div class="w-full bg-slate-800 rounded-full h-1.5 mt-2">
        <div
          class="bg-cyan-500 h-1.5 rounded-full transition-all"
          style={{
            width: `${Math.min((props.items.length / props.max) * 100, 100)}%`,
          }}
        />
      </div>
      <div class="flex items-center gap-1 pt-2 overflow-hidden">
        <For each={props.items}>
          {(item) => (
            <div class="w-7 h-12 rounded overflow-hidden bg-slate-800/50 flex-shrink-0">
              <img
                src={getImageUrl(item.definition, "card")}
                alt=""
                class="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
          )}
        </For>
      </div>
    </div>
  );
}

export function DicePreview(props: { dice: number[] }) {
  return (
    <div class="space-y-1">
      <div class="text-emerald-200 text-xs text-nowrap">{props.dice.length}个</div>
      <div class="flex flex-col">
        <For each={props.dice}>
          {(diceType) => (
            <div class="w-full h-auto rounded-full overflow-hidden bg-slate-800/30 mb--3">
              <DiceIcon type={diceType} />
            </div>
          )}
        </For>
      </div>
    </div>
  );
}

export function EntityAreaPreview(props: EntityAreaPreviewProps) {
  return (
    <div class="space-y-1">
      <div class="flex items-center justify-between">
        <span class="text-purple-200">
          {props.items.length} 个{props.label}
        </span>
        <span class="text-slate-500">上限 {props.max}</span>
      </div>
      <div class="grid grid-cols-2 gap-3 p-1 pt-2">
        <For each={props.items}>
          {(item) => (
            <div class="w-full h-auto aspect-[3/4] rounded-lg overflow-hidden bg-slate-800/50 b-solid b-2 b-slate-400">
              <img
                src={getImageUrl(item.definition, "card")}
                alt=""
                class="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
          )}
        </For>
      </div>
    </div>
  );
}

export function CombatStatusPreview(props: CombatStatusPreviewProps) {
  const displayItems = () => {
    if (props.items.length <= 5) {
      return { items: props.items, showMore: false };
    }
    return { items: props.items.slice(0, 4), showMore: true };
  };

  return (
    <div class="space-y-1 flex flex-row items-center justify-between">
      <div class="text-emerald-200">{props.items.length} 个状态</div>
      <div class="flex items-center gap-1 mt-1">
        <For each={displayItems().items}>
          {(item) => (
            <div class="w-6 h-6 rounded overflow-hidden bg-slate-800/50">
              <img
                src={getImageUrl(item.definition, "icon")}
                alt=""
                class="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
          )}
        </For>
        <Show when={displayItems().showMore}>
          <div class="w-6 h-6 rounded-full bg-slate-400/20 flex items-center justify-center text-[10px] text-slate-400">
            +{props.items.length - 4}
          </div>
        </Show>
      </div>
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
