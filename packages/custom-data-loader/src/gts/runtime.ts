export * from "@gi-tcg/core/gts/runtime";
export * from "@gi-tcg/core/builder";

declare global {
  const DamageType: typeof import("@gi-tcg/core/builder").DamageType;
  const DiceType: typeof import("@gi-tcg/core/builder").DiceType;
  const Aura: typeof import("@gi-tcg/core/builder").Aura;
  const Reaction: typeof import("@gi-tcg/core/builder").Reaction;
  const $: typeof import("@gi-tcg/core/builder").$;
  const ListenTo: typeof import("@gi-tcg/core/builder").ListenTo;
  const customEvent: typeof import("@gi-tcg/core/builder").customEvent;
  const flip: typeof import("@gi-tcg/core/builder").flip;
  const pair: typeof import("@gi-tcg/core/builder").pair;
  const type: typeof import("@gi-tcg/core/builder").type;
}
