import { expect, test } from "bun:test";
import {
  queryToExpression,
  runQuery,
  toExpression,
  $,
  prettyStringifySExpr,
  stringifySExpr,
} from "../src/query";
import { AttachmentHandle } from "../src/builder/type";
import { StateSymbol, type EntityState, type GameState } from "../src/base/state";
import { DiceType } from "@gi-tcg/typings";

const VERSION_INFO = {
  from: "official",
  value: {
    predicate: "until",
    version: "v3.3.0",
  },
} as const;

const characterDefinition = {
  __definition: "characters",
  id: 1001,
  skills: [],
  tags: ["pyro"],
  type: "character",
  varConfigs: {} as never,
  version: VERSION_INFO,
  associatedNightsoulsBlessing: null,
  specialEnergy: null,
  enabledLunarReactions: [],
} as const;

const eventCardDefinition = {
  __definition: "entities",
  type: "eventCard",
  id: 2001,
  version: VERSION_INFO,
  obtainable: true,
  visibleVarName: null,
  tags: [],
  hintText: null,
  disableTuning: false,
  varConfigs: {} as never,
  disposeWhenUsageIsZero: false,
  skills: [],
  descriptionDictionary: {},
} as const;

const attachmentDefinition = {
  __definition: "attachments",
  type: "attachment",
  id: 3001,
  tags: [],
  version: VERSION_INFO,
  visibleVarName: null,
  varConfigs: {} as never,
  descriptionDictionary: {},
  skills: [],
  modifications: () => [],
} as const;

function makeEntity(id: number, attachments: EntityState["attachments"] = []): EntityState {
  return {
    [StateSymbol]: "entity",
    id,
    definition: eventCardDefinition,
    variables: {} as never,
    attachments,
  };
}

function makeQueryState(): GameState {
  return {
    [StateSymbol]: "game",
    data: {} as never,
    config: {
      errorLevel: "strict",
      randomSeed: 1,
      initialHandsCount: 5,
      maxHandsCount: 10,
      maxPileCount: 200,
      maxRoundsCount: 15,
      maxSupportsCount: 4,
      maxSummonsCount: 4,
      initialDiceCount: 8,
      maxDiceCount: 16,
    },
    versionBehavior: {
      defaultRecreateBehavior: "overwrite",
      foodOmitInjuredOnly: false,
      disposeMaxCostHandsAbortPreview: false,
      diceCostApplyAttachments: false,
    },
    iterators: { random: 1, id: 1 },
    phase: "action",
    roundNumber: 1,
    currentTurn: 0,
    winner: null,
    players: [0, 1].map((who) => ({
      [StateSymbol]: "player",
      who: who as 0 | 1,
      initialPile: [],
      pile: [],
      activeCharacterId: 10 + who,
      hands:
        who === 0
          ? [
              makeEntity(20, [
                {
                  [StateSymbol]: "attachment",
                  id: 30,
                  definition: attachmentDefinition,
                  variables: {} as never,
                },
              ]),
            ]
          : [],
      characters: [
        {
          [StateSymbol]: "character",
          id: 10 + who,
          definition: characterDefinition,
          entities: [],
          variables: {
            alive: 1,
            health: 10,
            maxHealth: 10,
            energy: 0,
            maxEnergy: 2,
            aura: 0,
          },
        },
      ],
      combatStatuses: [],
      supports: [],
      summons: [],
      dice: [] as DiceType[],
      declaredEnd: false,
      hasDefeated: false,
      canCharged: false,
      canPlunging: false,
      legendUsed: false,
      skipNextTurn: false,
      defeatedSwitching: false,
      roundSkillLog: new Map(),
      phaseDamageLog: [],
      phaseReactionLog: [],
      removedEntities: [],
    })) as GameState["players"],
    extensions: [],
  };
}

test("'Fluent API' building tests", () => {
  expect(
    prettyStringifySExpr(
      queryToExpression(
        $.my.hand.exclude($.with($.def(206 as AttachmentHandle))),
      ),
    ),
  ).toBe(dedent`
    (exclude (intersection (defeated ignore)
                           (who my)
                           (area hands true))
             (with (intersection (defeated ignore)
                                 (definition 206))))
  `);

  expect(
    prettyStringifySExpr(
      queryToExpression(
        $.my.character.orderBy("health", "-", "maxHealth").limit(1),
      ),
    ),
  ).toBe(dedent`
    (orderBy (intersection (defeated ignore)
                           (who my)
                           (area characters true))
             [(expr (- health maxHealth))]
             1)
  `);

  expect(
    prettyStringifySExpr(
      queryToExpression(
        $.my.pile.cost(">", 0)
      )
    )
  ).toBe(dedent`
    (intersection (defeated ignore)
                  (who my)
                  (area pile true)
                  (variables (expr (> (special:diceCost)
                                      0))))
  `);
});

test("stringify of functions", () => {
  expect(
    prettyStringifySExpr(
      queryToExpression($.my.summon.var(({ usage }) => usage >= 2)),
    ),
  ).toBe(dedent`
    (intersection (defeated ignore)
                  (who my)
                  (area summons true)
                  (variables (fn "({ usage }) => usage >= 2")))
  `);

  const obj = {
    seemsAlive({ health }: Record<string, number>) {
      return health > 0;
    },
  };
  expect(
    prettyStringifySExpr(
      queryToExpression($.opp.character.var(obj.seemsAlive)),
    ),
  ).toBe(dedent`
    (intersection (defeated ignore)
                  (who opp)
                  (area characters true)
                  (variables (fn "function seemsAlive({ health }) {\\n      return health > 0;\\n    }")))
  `);
});

test("runQuery handles empty arithmetic and boolean expressions", () => {
  const state = makeQueryState();
  const query = {
    [toExpression]: () =>
      [
        "orderBy",
        ["area", "hands", "true"],
        [["expr", ["+"]], ["expr", ["and", ["not", ["or"]]]]],
        2,
      ] as const,
  } as any;

  expect(runQuery(state, 0, query).map((entity) => entity.id)).toEqual([20]);
});

test("runQuery respects byPath false for area filters", () => {
  const state = makeQueryState();
  const handWithAttachments = {
    [toExpression]: () => ["area", "hands", "false"] as const,
  } as any;

  expect(runQuery(state, 0, $.my.hand).map((entity) => entity.id)).toEqual([20]);
  expect(runQuery(state, 0, handWithAttachments).map((entity) => entity.id)).toEqual([
    20,
    30,
  ]);
});

function dedent(strings: TemplateStringsArray, ...values: unknown[]): string {
  const content = strings.reduce((acc, str, i) => {
    const value = i < values.length ? String(values[i]) : "";
    return acc + str + value;
  }, "");
  const lines = content.replace(/\r\n/g, "\n").split("\n");

  while (lines.length > 0 && lines[0].trim() === "") {
    lines.shift();
  }
  while (lines.length > 0 && lines[lines.length - 1].trim() === "") {
    lines.pop();
  }

  const minIndent = lines.reduce((min, line) => {
    if (line.trim() === "") {
      return min;
    }
    const indent = line.match(/^\s*/)?.[0].length ?? 0;
    return Math.min(min, indent);
  }, Number.POSITIVE_INFINITY);

  if (!Number.isFinite(minIndent) || minIndent === 0) {
    return lines.join("\n");
  }

  return lines.map((line) => line.slice(minIndent)).join("\n");
}
