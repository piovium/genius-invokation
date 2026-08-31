// Copyright (C) 2024-2026 Piovium Labs
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as
// published by the Free Software Foundation, either version 3 of the
// License, or (at your option) any later version.

import { DamageType, Reaction } from "@gi-tcg/typings";
import type { SwirlableElement } from "./base/reaction";
import { SkillContextOptions, type ModifyReactionEventArg, type SkillDescription } from "./base/skill";
import type {
  CardHandle,
  CombatStatusHandle,
  StatusHandle,
  SummonHandle,
} from "./data/type";
import { $ } from "./query";
import {
  SkillContext,
  type CallingAreaType,
  type TypedSkillContext,
} from "./runtime/skill_context";

export const CALLED_FROM_REACTION: unique symbol = Symbol();

const Frozen = 106 as StatusHandle;
const Crystallize = 111 as CombatStatusHandle;
const BurningFlame = 115 as SummonHandle;
const DendroCore = 116 as CombatStatusHandle;
const CatalyzingField = 117 as CombatStatusHandle;
const Thundercloud = 205 as SummonHandle;
const LunarSymphony = 211 as CardHandle;

export type ReactionDescription = SkillDescription<ModifyReactionEventArg>;
type ReactionContextMeta = {
  readonly: false;
  callerVars: never;
  eventArgType: ModifyReactionEventArg;
  callerType: never;
  callingArea: CallingAreaType;
  associatedExtension: never;
  gtsSnippets: {};
};
type ReactionAction = (context: TypedSkillContext<ReactionContextMeta>) => void;

const descriptions: Partial<Record<Reaction, ReactionDescription>> = {};

function defineReaction(reaction: Reaction, action: ReactionAction) {
  descriptions[reaction] = SkillContext.encapsulate(
    SkillContextOptions.plain,
    (context) => {
      Reflect.set(context, CALLED_FROM_REACTION, reaction);
      action(context as unknown as TypedSkillContext<ReactionContextMeta>);
    },
  );
}

function charactersExcept(context: TypedSkillContext<ReactionContextMeta>) {
  const characters =
    context.eventArg.where === "my" ? $.my.character : $.opp.character;
  return characters.exclude($.id(context.eventArg.target.id));
}

function initialize() {
  defineReaction(Reaction.Overloaded, (context) => {
    if (context.eventArg.target.isActive()) {
      context.switchActive(
        context.eventArg.where === "my" ? $.my.next : $.opp.next,
      );
    }
  });

  const pierceToOther: ReactionAction = (context) => {
    if (context.eventArg.fromDamage) {
      context.damage(DamageType.Piercing, 1, charactersExcept(context));
    }
  };
  defineReaction(Reaction.Superconduct, pierceToOther);
  defineReaction(Reaction.ElectroCharged, pierceToOther);

  defineReaction(Reaction.Frozen, (context) => {
    context.characterStatus(Frozen, $.id(context.eventArg.target.id));
  });

  const swirl = (element: SwirlableElement): ReactionAction => {
    return (context) => context.damage(element, 1, charactersExcept(context));
  };
  defineReaction(Reaction.SwirlCryo, swirl(DamageType.Cryo));
  defineReaction(Reaction.SwirlHydro, swirl(DamageType.Hydro));
  defineReaction(Reaction.SwirlPyro, swirl(DamageType.Pyro));
  defineReaction(Reaction.SwirlElectro, swirl(DamageType.Electro));

  defineReaction(Reaction.CrystallizeCryo, (context) =>
    context.combatStatus(Crystallize, context.eventArg.here),
  );
  defineReaction(Reaction.CrystallizeHydro, (context) =>
    context.combatStatus(Crystallize, context.eventArg.here),
  );
  defineReaction(Reaction.CrystallizePyro, (context) =>
    context.combatStatus(Crystallize, context.eventArg.here),
  );
  defineReaction(Reaction.CrystallizeElectro, (context) =>
    context.combatStatus(Crystallize, context.eventArg.here),
  );
  defineReaction(Reaction.Burning, (context) =>
    context.summon(BurningFlame, context.eventArg.here),
  );
  defineReaction(Reaction.Bloom, (context) =>
    context.combatStatus(DendroCore, context.eventArg.here),
  );
  defineReaction(Reaction.Quicken, (context) =>
    context.combatStatus(CatalyzingField, context.eventArg.here),
  );
  defineReaction(Reaction.LunarElectroCharged, (context) =>
    context.summon(Thundercloud, context.eventArg.here),
  );
  defineReaction(Reaction.LunarBloom, (context) => {
    const query =
      context.eventArg.here === "my"
        ? $.macros.myHandsNotFree
        : $.macros.oppHandsNotFree;
    const hands = context.queryAll(query);
    if (hands.length > 0) {
      context.attachCostReduction(context.random(hands));
    }
  });
  defineReaction(Reaction.LunarCrystallizeHydro, (context) => {
    context.createHandCard(LunarSymphony, context.eventArg.here);
  });
}

let initialized = false;
export function getReactionDescription(
  reaction: Reaction,
): ReactionDescription | null {
  if (!initialized) {
    initialized = true;
    initialize();
  }
  return descriptions[reaction] ?? null;
}
