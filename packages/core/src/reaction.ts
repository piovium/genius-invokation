// Copyright (C) 2024-2026 Piovium Labs
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as
// published by the Free Software Foundation, either version 3 of the
// License, or (at your option) any later version.

import { DamageType, Reaction } from "@gi-tcg/typings";
import type { SwirlableElement } from "./base/reaction";
import type { SkillDescription } from "./base/skill";
import type {
  CombatStatusHandle,
  StatusHandle,
  SummonHandle,
} from "./data/type";
import { $ } from "./query";
import { SkillContext, type TypedSkillContext } from "./runtime/skill_context";

export const CALLED_FROM_REACTION: unique symbol = Symbol();

const Frozen = 106 as StatusHandle;
const Crystallize = 111 as CombatStatusHandle;
const BurningFlame = 115 as SummonHandle;
const DendroCore = 116 as CombatStatusHandle;
const CatalyzingField = 117 as CombatStatusHandle;
const Thundercloud = 205 as SummonHandle;

export interface ReactionDescriptionEventArg {
  where: "my" | "opp";
  isDamage: boolean;
  id: number;
  isActive: boolean;
  here: "my" | "opp";
  piercingOtherDamage: number;
}

type ReactionDescription = SkillDescription<ReactionDescriptionEventArg>;
type ReactionContextMeta = {
  readonly: false;
  callerVars: never;
  eventArgType: ReactionDescriptionEventArg;
  callerType: never;
  associatedExtension: never;
  gtsSnippets: {};
};
type ReactionAction = (context: TypedSkillContext<ReactionContextMeta>) => void;

const descriptions: Partial<Record<Reaction, ReactionDescription>> = {};

function defineReaction(reaction: Reaction, action: ReactionAction) {
  descriptions[reaction] = (state, skillInfo, event) => {
    const context = new SkillContext(
      state,
      {
        ...skillInfo,
        associatedExtensionId: null,
        gtsSnippets: new Map(),
      },
      event,
    );
    Reflect.set(context, CALLED_FROM_REACTION, reaction);
    action(context as unknown as TypedSkillContext<ReactionContextMeta>);
    return context._terminate();
  };
}

function charactersExcept(event: ReactionDescriptionEventArg) {
  const characters = event.where === "my" ? $.my.character : $.opp.character;
  return characters.exclude($.id(event.id));
}

function initialize() {
  defineReaction(Reaction.Overloaded, (context) => {
    if (context.eventArg.isActive) {
      context.switchActive(
        context.eventArg.where === "my" ? $.my.next : $.opp.next,
      );
    }
  });

  const pierceToOther: ReactionAction = (context) => {
    if (context.eventArg.isDamage) {
      context.damage(
        DamageType.Piercing,
        context.eventArg.piercingOtherDamage,
        charactersExcept(context.eventArg),
      );
    }
  };
  defineReaction(Reaction.Superconduct, pierceToOther);
  defineReaction(Reaction.ElectroCharged, pierceToOther);

  defineReaction(Reaction.Frozen, (context) => {
    context.characterStatus(Frozen, $.id(context.eventArg.id));
  });

  const swirl = (element: SwirlableElement): ReactionAction => {
    return (context) =>
      context.damage(element, 1, charactersExcept(context.eventArg));
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
