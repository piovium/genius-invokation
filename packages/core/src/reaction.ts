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
import {
  SkillContext,
  type TypedSkillContext,
} from "./runtime/context/skill";

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
  shortcutReceiver: unknown;
  gtsSnippets: {};
};
type ReactionAction = (
  context: TypedSkillContext<ReactionContextMeta>,
  event: ReactionDescriptionEventArg,
) => void;

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
    action(context as unknown as TypedSkillContext<ReactionContextMeta>, event);
    return context._terminate();
  };
}

function charactersExcept(event: ReactionDescriptionEventArg) {
  const characters = event.where === "my" ? $.my.character : $.opp.character;
  return characters.exclude($.id(event.id));
}

function initialize() {
  defineReaction(Reaction.Overloaded, (context, event) => {
    if (event.isActive) {
      context.switchActive(event.where === "my" ? $.my.next : $.opp.next);
    }
  });

  const pierceToOther: ReactionAction = (context, event) => {
    if (event.isDamage) {
      context.damage(
        DamageType.Piercing,
        event.piercingOtherDamage,
        charactersExcept(event),
      );
    }
  };
  defineReaction(Reaction.Superconduct, pierceToOther);
  defineReaction(Reaction.ElectroCharged, pierceToOther);

  defineReaction(Reaction.Frozen, (context, event) => {
    context.characterStatus(Frozen, $.id(event.id));
  });

  const swirl = (element: SwirlableElement): ReactionAction => {
    return (context, event) => context.damage(element, 1, charactersExcept(event));
  };
  defineReaction(Reaction.SwirlCryo, swirl(DamageType.Cryo));
  defineReaction(Reaction.SwirlHydro, swirl(DamageType.Hydro));
  defineReaction(Reaction.SwirlPyro, swirl(DamageType.Pyro));
  defineReaction(Reaction.SwirlElectro, swirl(DamageType.Electro));

  defineReaction(Reaction.CrystallizeCryo, (context, event) =>
    context.combatStatus(Crystallize, event.here),
  );
  defineReaction(Reaction.CrystallizeHydro, (context, event) =>
    context.combatStatus(Crystallize, event.here),
  );
  defineReaction(Reaction.CrystallizePyro, (context, event) =>
    context.combatStatus(Crystallize, event.here),
  );
  defineReaction(Reaction.CrystallizeElectro, (context, event) =>
    context.combatStatus(Crystallize, event.here),
  );
  defineReaction(Reaction.Burning, (context, event) =>
    context.summon(BurningFlame, event.here),
  );
  defineReaction(Reaction.Bloom, (context, event) =>
    context.combatStatus(DendroCore, event.here),
  );
  defineReaction(Reaction.Quicken, (context, event) =>
    context.combatStatus(CatalyzingField, event.here),
  );
  defineReaction(Reaction.LunarElectroCharged, (context, event) =>
    context.summon(Thundercloud, event.here),
  );
  defineReaction(Reaction.LunarBloom, (context, event) => {
    const query = event.here === "my" ? $.macros.myHandsNotFree : $.macros.oppHandsNotFree;
    const hands = context.queryAll(query);
    if (hands.length > 0) {
      context.attachCostReduction(context.random(hands));
    }
  });
}

let initialized = false;
export function getReactionDescription(reaction: Reaction): ReactionDescription | null {
  if (!initialized) {
    initialized = true;
    initialize();
  }
  return descriptions[reaction] ?? null;
}
