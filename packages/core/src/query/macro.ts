import type { IDollar } from "./dollar";
import type { InferResult, IQuery } from "./utils";

export function createMacros($: IDollar) {
  type CharacterQuery = IQuery<InferResult<typeof $.character>>;
  type ActionCardQuery = IQuery<InferResult<typeof $.hand | typeof $.pile>>;
  // Helper for TypeScript bundling
  const ch = (query: CharacterQuery) => query;
  const ac = (query: ActionCardQuery) => query;
  const MACROS = {
    myActive: ch($.my.active),
    oppActive: ch($.opp.active),

    myEnergyNotFull: ch($.my.character.var("energy", "<", "maxEnergy")),

    oppActivePrioritized: ch($.opp.character.var("health", ">", 0).limit(1)),

    myMinHealth: ch($.my.character.orderBy("health").limit(1)),
    oppMinHealth: ch($.opp.character.orderBy("health").limit(1)),
    myMaxHealth: ch($.my.character.orderBy(0, "-", "health").limit(1)),
    oppMaxHealth: ch($.opp.character.orderBy(0, "-", "health").limit(1)),

    myMostInjured: ch(
      $.my.character.orderBy("health", "-", "maxHealth").limit(1),
    ),
    oppMostInjured: ch(
      $.opp.character.orderBy("health", "-", "maxHealth").limit(1),
    ),
    myLeastInjured: ch(
      $.my.character.orderBy("maxHealth", "-", "health").limit(1),
    ),
    oppLeastInjured: ch(
      $.opp.character.orderBy("maxHealth", "-", "health").limit(1),
    ),

    myHandsOrderByCost: ac($.my.hand.orderBy(0, "-", $.keys.diceCost)),
    oppHandsOrderByCost: ac($.opp.hand.orderBy(0, "-", $.keys.diceCost)),

    myHandsNotFree: ac($.my.hand.cost(">", 0)),
    oppHandsNotFree: ac($.opp.hand.cost(">", 0)),
    myPileNotFree: ac($.my.pile.cost(">", 0)),
    oppPileNotFree: ac($.opp.pile.cost(">", 0)),
  };
  Object.freeze(MACROS);

  const proto = Object.getPrototypeOf($);
  Object.defineProperty(proto, "macros", {
    get() {
      return MACROS;
    },
    enumerable: true,
  });

  return MACROS;
}

export type Macro = ReturnType<typeof createMacros>;
