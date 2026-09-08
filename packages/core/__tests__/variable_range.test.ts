import { expect, test, vi } from "vitest";
import type { EntityState, GameState } from "../src/base/state";
import { createVariableConfig } from "../src/gts/vm_impl/entity";
import { SkillContext } from "../src/runtime/skill_context";
import { getInsertedStateVariables } from "../src/utils";

const config = createVariableConfig(2, { append: { value: 1 }, range: 3 });
const definition = { varConfigs: { usage: config } };
const state = {
  versionBehavior: { defaultRecreateBehavior: "takeMax" },
} as GameState;

test.each([
  [null, 10, 3],
  [null, -2, 0],
  [2, undefined, 3],
  [3, 2, 3],
  [5, 1, 3],
  [1, -5, 0],
])(
  "creation and recreation clamp values (%s, %s)",
  (oldValue, incoming, expected) => {
    const result = getInsertedStateVariables({
      state,
      oldState:
        oldValue === null
          ? null
          : ({
              definition,
              variables: { usage: oldValue },
            } as unknown as EntityState),
      newStateTemplate: { definition },
      opt:
        incoming === undefined
          ? undefined
          : { overrideVariables: { usage: incoming } },
    });
    expect(result.usage).toBe(expected);
  },
);

test.each(["overwrite", "takeMax"] as const)(
  "%s recreation shares bounds",
  (type) => {
    expect(
      getInsertedStateVariables({
        state,
        oldState: { variables: { usage: 2 } } as unknown as EntityState,
        newStateTemplate: {
          definition: {
            varConfigs: { usage: { ...config, recreateBehavior: { type } } },
          },
        },
        opt: { overrideVariables: { usage: 10 } },
      }).usage,
    ).toBe(3);
  },
);

test("setVariable clamps before calculating change information; addVariable shares it", () => {
  const setVariableImpl = vi.fn();
  const target = {
    definition,
    variables: { usage: 2 },
  } as unknown as EntityState;
  const context = Object.assign(Object.create(SkillContext.prototype), {
    setVariableImpl,
  }) as SkillContext<any>;
  context.setVariable("usage", 10, target);
  expect(setVariableImpl).toHaveBeenLastCalledWith(
    target,
    expect.objectContaining({
      newValue: 3,
      diffValue: 1,
      direction: "increase",
    }),
  );
  context.addVariable("usage", -10, target);
  expect(setVariableImpl).toHaveBeenLastCalledWith(
    target,
    expect.objectContaining({
      newValue: 0,
      diffValue: -2,
      direction: "decrease",
    }),
  );
});

test("unbounded append preserves its custom increment and negative values", () => {
  const unbounded = createVariableConfig(-2, { append: { value: 4 } });
  expect(unbounded).toMatchObject({
    lowerBound: -Infinity,
    upperBound: Infinity,
    recreateBehavior: { type: "append", appendValue: 4 },
  });
  expect(
    getInsertedStateVariables({
      state,
      oldState: null,
      newStateTemplate: { definition: { varConfigs: { usage: unbounded } } },
    }).usage,
  ).toBe(-2);
  expect(createVariableConfig(0, { range: 0 })).toMatchObject({
    lowerBound: 0,
    upperBound: 0,
  });
});
