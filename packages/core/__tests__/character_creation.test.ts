// Copyright (C) 2026 Piovium Labs
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { createRpcResponse, Aura, type ExposedMutation } from "@gi-tcg/typings";
import { expect, test } from "vitest";
import type { CharacterDefinition } from "../src/base/character";
import { applyMutation, type Mutation } from "../src/base/mutation";
import {
  EnterEventArg,
  PlayerEventArg,
  defineSkillInfo,
  SkillContextOptions,
  SwitchActiveEventArg,
  type TriggeredSkillDefinition,
} from "../src/base/skill";
import { DEFAULT_VERSION_INFO } from "../src/base/version";
import { createVariable } from "../src/data/utils";
import type { CharacterHandle } from "../src/data/type";
import { Game } from "../src/game";
import { GiTcgPreviewAbortedError } from "../src/error";
import { StateMutator } from "../src/mutator";
import { SkillContext } from "../src/runtime/skill_context";
import { SkillExecutor } from "../src/skill_executor";

test.each([
  { hostWho: 0, hostRelatedExecution: true },
  { hostWho: 1, hostRelatedExecution: true },
  { hostWho: 1, hostRelatedExecution: false },
] as const)(
  "initial creation follows host order after rolling and before actionPhase, only once: %j",
  async (config) => {
    const rerolled = new Set<number>();
    const enter: TriggeredSkillDefinition = {
      type: "skill",
      id: 900001,
      ownerType: "character",
      skillType: null,
      triggerOn: "onCreateCharacter",
      initiativeSkillConfig: null,
      usagePerRoundVariableName: null,
      filter: (_state, { caller }, event) =>
        event instanceof EnterEventArg && caller.id === event.entity.id,
      action: SkillContext.encapsulate(
        SkillContextOptions.plain,
        (c, [state, { caller }, event]) => {
          expect(event).toMatchObject({
            entity: { id: caller.id },
            overridden: null,
          });
          expect(state.roundNumber).toBe(1);
          expect(rerolled.size).toBe(2);
          expect(state.players.map((p) => p.dice.length)).toEqual([8, 8]);
          const characters = state.players.flatMap((p) => p.characters);
          const entered = characters.reduce(
            (sum, ch) => sum + ch.variables.enterCount,
            0,
          );
          c.setVariable("enterOrder", entered + 1, caller);
          c.setVariable("enterCount", caller.variables.enterCount + 1, caller);
        },
      ),
    };
    const actionPhase: TriggeredSkillDefinition = {
      ...enter,
      id: 900002,
      triggerOn: "onActionPhase",
      filter: () => true,
      action: SkillContext.encapsulate(
        SkillContextOptions.plain,
        (c, [state, { caller }]) => {
          c.setVariable(
            "enteredAtActionPhase",
            state.players
              .flatMap((p) => p.characters)
              .reduce((sum, ch) => sum + ch.variables.enterCount, 0),
            caller,
          );
        },
      ),
    };
    const preparation: TriggeredSkillDefinition = {
      ...enter,
      id: 900003,
      triggerOn: "onSwitchActive",
      usagePerRoundVariableName: "usagePerRound1",
      filter: (_state, { caller }, event) =>
        event instanceof SwitchActiveEventArg &&
        event.switchInfo.to.id === caller.id &&
        caller.variables.usagePerRound1 > 0,
      action: SkillContext.encapsulate(
        SkillContextOptions.plain,
        (c, [_state, { caller }]) => {
          c.setVariable("usagePerRound1", 0, caller);
        },
      ),
    };
    const base = createCharacter(900000);
    const definition = {
      ...base,
      varConfigs: { ...base.varConfigs, usagePerRound1: createVariable(1) },
      skills: [enter, actionPhase, preparation],
    };
    const game = new Game(
      Game.createInitialState({
        ...config,
        decks: [
          {
            characters: [definition.id, definition.id, definition.id],
            cards: [],
          },
          {
            characters: [definition.id, definition.id, definition.id],
            cards: [],
          },
        ],
        data: {
          characters: new Map([[definition.id, definition]]),
          entities: new Map(),
          attachments: new Map(),
          extensions: new Map(),
        },
      }),
    );
    const actionRounds: number[] = [];
    for (const [who, player] of game.players.entries()) {
      player.io.rpc = async ({ request }) => {
        switch (request?.$case) {
          case "switchHands":
            return createRpcResponse("switchHands", { removedHandIds: [] });
          case "chooseActive":
            // The middle character must not move ahead of the leftmost host.
            return createRpcResponse("chooseActive", {
              activeCharacterId: request.value.candidateIds[1],
            });
          case "rerollDice":
            if (game.state.roundNumber === 1) {
              expect(
                game.state.players
                  .flatMap((p) => p.characters)
                  .map((ch) => ch.variables.enterCount),
              ).toEqual([0, 0, 0, 0, 0, 0]);
              expect(
                game.state.players.map((p) =>
                  p.characters.map((ch) => ch.variables.usagePerRound1),
                ),
              ).toEqual([
                [1, 0, 1],
                [1, 0, 1],
              ]);
            }
            rerolled.add(who);
            return createRpcResponse("rerollDice", { diceToReroll: [] });
          case "action": {
            actionRounds.push(game.state.roundNumber);
            expect(
              game.state.players.map((p) =>
                p.characters.map((ch) => ch.variables.usagePerRound1),
              ),
            ).toEqual(
              game.state.roundNumber === 1
                ? [
                    [1, 0, 1],
                    [1, 0, 1],
                  ]
                : [
                    [1, 1, 1],
                    [1, 1, 1],
                  ],
            );
            expect(
              game.state.players
                .flatMap((p) => p.characters)
                .map((ch) => ({
                  order: ch.variables.enterOrder,
                  count: ch.variables.enterCount,
                  atActionPhase: ch.variables.enteredAtActionPhase,
                })),
            ).toEqual(
              (config.hostRelatedExecution && config.hostWho === 1
                ? [4, 5, 6, 1, 2, 3]
                : [1, 2, 3, 4, 5, 6]
              ).map((order) => ({ order, count: 1, atActionPhase: 6 })),
            );
            if (game.state.roundNumber === 2) {
              game.giveUp(0);
            }
            return createRpcResponse("action", {
              chosenActionIndex: request.value.action.findIndex(
                (a) => a.action?.$case === "declareEnd",
              ),
              usedDice: [],
            });
          }
          default:
            throw new Error(`Unexpected RPC: ${request?.$case}`);
        }
      };
    }
    await game.start();
    expect(actionRounds).toEqual([1, 1, 2]);
  },
);

test.each(
  ([0, 1] as const).flatMap((who) =>
    (["default", "my", "opp"] as const).map((where) => ({ who, where })),
  ),
)(
  "mid-game createCharacter enters only the new instance and returns a reactive character: %j",
  async ({ who, where }) => {
    const targetWho = where === "opp" ? 1 - who : who;
    const enter: TriggeredSkillDefinition = {
      type: "skill",
      id: 900021,
      ownerType: "character",
      skillType: null,
      triggerOn: "onCreateCharacter",
      initiativeSkillConfig: null,
      usagePerRoundVariableName: null,
      filter: (_state, { caller }, event) =>
        event instanceof EnterEventArg && event.entity.id === caller.id,
      action: SkillContext.encapsulate(
        SkillContextOptions.plain,
        (c, [_state, { caller }, event]) => {
          expect(event).toMatchObject({
            entity: { id: caller.id },
            overridden: null,
          });
          c.setVariable("enterCount", caller.variables.enterCount + 1, caller);
          c.setVariable("health", caller.variables.health + 1, caller);
        },
      ),
    };
    const target = { ...createCharacter(900020), skills: [enter] };
    const spawn: TriggeredSkillDefinition = {
      ...enter,
      id: 900031,
      triggerOn: "onBeforeAction",
      filter: (_state, { caller }) => caller.variables.enterCount === 0,
      action: SkillContext.encapsulate(
        SkillContextOptions.plain,
        (c, [_state, { caller }]) => {
          c.setVariable("enterCount", 1, caller);
          const created =
            where === "default"
              ? c.createCharacter(target.id as CharacterHandle)
              : c.createCharacter(target.id as CharacterHandle, where);
          expect(created.who).toBe(targetWho);
          expect(created.variables.health).toBe(10);
          expect(created.variables.enterCount).toBe(0);
          created.variables.health = 7;
          created.variables.energy = 2;
          // Creation handlers run at the event boundary, after these reactive writes.
          expect(created.variables.enterCount).toBe(0);
        },
      ),
    };
    const spawner = { ...createCharacter(900030), skills: [spawn] };
    const initial = Game.createInitialState({
      decks: [
        {
          characters: who === 0 ? [spawner.id, target.id] : [target.id],
          cards: [],
        },
        {
          characters: who === 1 ? [spawner.id, target.id] : [target.id],
          cards: [],
        },
      ],
      data: {
        characters: new Map([
          [target.id, target],
          [spawner.id, spawner],
        ]),
        entities: new Map(),
        attachments: new Map(),
        extensions: new Map(),
      },
    });
    const game = new Game({
      ...initial,
      phase: "action",
      roundNumber: 2,
      currentTurn: who,
      players: [
        {
          ...initial.players[0],
          activeCharacterId: initial.players[0].characters[0].id,
        },
        {
          ...initial.players[1],
          activeCharacterId: initial.players[1].characters[0].id,
        },
      ],
    });
    game.players[who].io.rpc = async ({ request }) => {
      if (request?.$case !== "action") {
        throw new Error(`Unexpected RPC: ${request?.$case}`);
      }
      game.giveUp(who);
      return createRpcResponse("action", {
        chosenActionIndex: request.value.action.findIndex(
          (a) => a.action?.$case === "declareEnd",
        ),
        usedDice: [],
      });
    };
    await game.start();
    const created = game.state.players[targetWho].characters.at(-1)!;
    expect(created).toMatchObject({
      definition: { id: target.id },
      variables: {
        health: 8,
        maxHealth: 10,
        energy: 2,
        maxEnergy: 3,
        alive: 1,
        aura: Aura.None,
        enterCount: 1,
      },
      entities: [],
    });
    expect(
      initial.players.flatMap((p) => p.characters).map((ch) => ch.id),
    ).not.toContain(created.id);
    for (const player of game.state.players) {
      expect(player.characters).toHaveLength(
        initial.players[player.who].characters.length +
          (player.who === targetWho ? 1 : 0),
      );
      expect(player.activeCharacterId).toBe(
        initial.players[player.who].characters[0].id,
      );
      const existing = initial.players[player.who].characters.find(
        (ch) => ch.definition.id === target.id,
      )!;
      expect(player.characters.find((ch) => ch.id === existing.id)).toEqual(
        existing,
      );
    }
  },
);

test("preview aborts character creation before allocating an id or emitting mutations", async () => {
  const definition = createCharacter(900040);
  const initial = Game.createInitialState({
    decks: [
      { characters: [definition.id], cards: [] },
      { characters: [definition.id], cards: [] },
    ],
    data: {
      characters: new Map([[definition.id, definition]]),
      entities: new Map(),
      attachments: new Map(),
      extensions: new Map(),
    },
  });
  const spawn: TriggeredSkillDefinition = {
    type: "skill",
    id: 900041,
    ownerType: "character",
    skillType: null,
    triggerOn: "onBeforeAction",
    initiativeSkillConfig: null,
    usagePerRoundVariableName: null,
    filter: () => true,
    action: SkillContext.encapsulate(SkillContextOptions.plain, (c) => {
      const created = c.createCharacter(definition.id as CharacterHandle);
      created.variables.health = 7;
    }),
  };
  const stateMutations: Mutation[] = [];
  const exposedMutations: ExposedMutation[] = [];
  const mutator = new StateMutator(initial, {
    onNotify: (notification) => {
      stateMutations.push(...notification.stateMutations);
      exposedMutations.push(...notification.exposedMutations);
    },
    onPause: async () => {},
  });
  const executor = new SkillExecutor(mutator, { environment: "preview" });

  await expect(
    executor.finalizeSkill(
      defineSkillInfo({
        caller: initial.players[0].characters[0],
        definition: spawn,
      }),
      new PlayerEventArg(initial, 0),
    ),
  ).rejects.toBeInstanceOf(GiTcgPreviewAbortedError);

  expect(mutator.state).toBe(initial);
  expect(mutator.state.iterators.id).toBe(initial.iterators.id);
  expect(mutator.state.players.map((p) => p.characters.length)).toEqual([1, 1]);
  expect(stateMutations).toEqual([]);
  expect(exposedMutations).toEqual([]);
});

test("transforming initializes destination variables and preserves existing values, including zero", () => {
  const original = createCharacter(900010);
  const destination: CharacterDefinition = {
    ...createCharacter(900011),
    varConfigs: {
      ...original.varConfigs,
      health: createVariable(12),
      enterCount: createVariable(1),
      destinationUsage: createVariable(2),
    },
  };
  const initial = Game.createInitialState({
    decks: [
      { characters: [original.id], cards: [] },
      { characters: [original.id], cards: [] },
    ],
    data: {
      characters: new Map([
        [original.id, original],
        [destination.id, destination],
      ]),
      entities: new Map(),
      attachments: new Map(),
      extensions: new Map(),
    },
  });
  const transformed = applyMutation(initial, {
    type: "transformDefinition",
    state: initial.players[0].characters[0],
    newDefinition: destination,
  });
  expect(transformed.players[0].characters[0]).toMatchObject({
    id: initial.players[0].characters[0].id,
    definition: { id: destination.id },
    variables: { health: 10, enterCount: 0, destinationUsage: 2 },
  });
  const consumed = applyMutation(transformed, {
    type: "modifyEntityVar",
    state: transformed.players[0].characters[0],
    varName: "destinationUsage",
    oldValue: 2,
    value: 0,
    direction: "decrease",
  });
  const back = applyMutation(consumed, {
    type: "transformDefinition",
    state: consumed.players[0].characters[0],
    newDefinition: original,
  });
  expect(back.players[0].characters[0].variables.destinationUsage).toBe(0);
  const again = applyMutation(back, {
    type: "transformDefinition",
    state: back.players[0].characters[0],
    newDefinition: destination,
  });
  expect(again.players[0].characters[0].variables).toMatchObject({
    health: 10,
    enterCount: 0,
    destinationUsage: 0,
  });
  expect(again.players[1].characters[0]).toEqual(
    initial.players[1].characters[0],
  );
});

function createCharacter(id: number): CharacterDefinition {
  return {
    __definition: "characters",
    type: "character",
    id,
    version: DEFAULT_VERSION_INFO,
    tags: ["hydro", "sword"],
    varConfigs: {
      health: createVariable(10),
      maxHealth: createVariable(10),
      energy: createVariable(0),
      maxEnergy: createVariable(3),
      alive: createVariable(1),
      aura: createVariable(Aura.None),
      enterCount: createVariable(0),
      enterOrder: createVariable(0),
      enteredAtActionPhase: createVariable(0),
    },
    skills: [],
    associatedNightsoulsBlessing: null,
    enabledLunarReactions: [],
    specialEnergy: null,
  };
}
