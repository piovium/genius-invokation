// Copyright (C) 2026 Piovium Labs
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as
// published by the Free Software Foundation, either version 3 of the
// License, or (at your option) any later version.

import { expect, test, vi } from "vitest";
import { Game } from "../src/game";

function createGame() {
  return new Game(
    Game.createInitialState({
      decks: [
        { characters: [], cards: [] },
        { characters: [], cards: [] },
      ],
      data: {
        characters: new Map(),
        entities: new Map(),
        attachments: new Map(),
        extensions: new Map(),
      },
    }),
  );
}

const failure = new Error("callback failed");
const callbacks = {
  throw: () => {
    throw failure;
  },
  reject: () => Promise.reject(failure),
};

for (const [kind, fail] of Object.entries(callbacks)) {
  test(`notify ${kind} does not interrupt the game or the other player`, async () => {
    const game = createGame();
    game.mutate({ type: "changePhase", hasChange: true, newPhase: "gameEnd" });
    game.players[0].io.notify = fail;
    const notify = vi.fn();
    game.players[1].io.notify = notify;
    await expect(game.start()).resolves.toBeNull();
    expect(notify).toHaveBeenCalled();
    expect(Object.isFrozen(game)).toBe(true);
  });

  test(`initial pause ${kind} rejects start and freezes the game`, async () => {
    const game = createGame();
    game.onPause = fail;
    await expect(game.start()).rejects.toBe(failure);
    expect(Object.isFrozen(game)).toBe(true);
    const state = game.state;
    game.mutate({ type: "setWinner", winner: 1 });
    expect(game.state).toBe(state);
  });

  test(`giveUp pause ${kind} rejects start and freezes the game`, async () => {
    const game = createGame();
    const paused = Promise.withResolvers<void>();
    game.onPause = vi
      .fn()
      .mockImplementationOnce(() => paused.promise)
      .mockImplementation(fail);
    const finished = game.start();
    const rejected = expect(finished).rejects.toBe(failure);
    game.giveUp(0);
    await rejected;
    expect(Object.isFrozen(game)).toBe(true);
    paused.resolve();
  });
}
