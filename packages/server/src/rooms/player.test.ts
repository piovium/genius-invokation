import assert from "node:assert/strict";
import { test } from "node:test";
import { Game, CURRENT_VERSION, type RpcRequest } from "@gi-tcg/core";
import { RpcResponse as PbRpcResponse } from "@gi-tcg/typings";
import { Player } from "./player";
import { RoomCommandError, type RoomConfig, type RoomEvent } from "./types";

const config: RoomConfig = {
  initTotalActionTime: 45,
  rerollTime: 40,
  roundTotalActionTime: 60,
  actionTime: 25,
  watchable: false,
  private: true,
  allowGuest: true,
  gameVersion: CURRENT_VERSION,
};
const request: RpcRequest = { request: { $case: "switchHands", value: {} } };
const response = Uint8Array.of(0x12, 0);
const player = (id = "guest-test", sessionId = "session-test") => {
  const instance = new Player(
    { id, isGuest: true, name: id, deck: { characters: [], cards: [] } },
    sessionId,
  );
  instance.setTimeoutConfig(config);
  return instance;
};
const hasCode = (code: string) => (error: unknown) =>
  error instanceof RoomCommandError && error.code === code;

test("real Player accepts once synchronously across concurrent callers and replays its original ACK", async () => {
  const instance = player();
  let accepted = 0;
  const pending = instance.rpc(request).then((value) => {
    accepted++;
    return value;
  });
  try {
    assert.throws(
      () => instance.receiveResponse(1, response),
      hasCode("FUTURE_RPC"),
    );
    assert.throws(
      () => instance.receiveResponse(0, Uint8Array.of(0)),
      hasCode("INVALID_RESPONSE"),
    );
    const first = instance.receiveResponse(0, response);
    const duplicate = instance.receiveResponse(0, response);
    assert.equal(duplicate, first);
    assert.equal(first.sessionId, "session-test");
    assert.throws(
      () => instance.receiveResponse(0, Uint8Array.of(0x12, 2, 8, 2)),
      hasCode("CONFLICT"),
    );
    assert.deepEqual(await pending, PbRpcResponse.decode(response));
    assert.equal(accepted, 1);
    assert.equal(
      instance.receiveResponse(0, response),
      first,
      "Reconnect after engine IO resumes still obtains the original ACK",
    );
  } finally {
    instance.dispose();
  }
});

test("the last 32 accepted RPCs remain recoverable while evicted commands never execute again", async () => {
  const instance = player();
  let executions = 0;
  try {
    for (let id = 0; id < 48; id++) {
      const pending = instance.rpc(request).then(() => {
        executions++;
      });
      instance.receiveResponse(id, response);
      await pending;
    }
    assert.throws(
      () => instance.receiveResponse(15, response),
      hasCode("STALE_RPC"),
    );
    assert.equal(instance.receiveResponse(16, response).id, 16);
    assert.equal(instance.receiveResponse(47, response).id, 47);
    assert.equal(executions, 48);
  } finally {
    instance.dispose();
  }
});

test("finished subscriptions expose the sync boundary and permit recovery of a lost final ACK", async () => {
  const instance = player();
  const pending = instance.rpc(request);
  const ack = instance.receiveResponse(0, response);
  await pending;
  instance.complete();
  const events: RoomEvent[] = [];
  let closed = false;
  instance.subscribe({
    send: (event) => events.push(event),
    close: () => {
      closed = true;
    },
  });
  assert.ok(
    events.some((event) => event.type === "rpc" && event.data === null),
  );
  assert.equal(closed, false);
  assert.equal(instance.receiveResponse(0, response), ack);
  instance.dispose();
  assert.equal(closed, true);
});

test("completing a player cancels outstanding IO and its timeout instead of retaining a game", async () => {
  const instance = player();
  const pending = instance.rpc(request);
  const rejected = assert.rejects(pending, /Game finished/);
  instance.complete();
  await rejected;
  assert.deepEqual(instance.currentAction(), { type: "rpc", data: null });
});

test("real engine switch-hands IO advances once and rejects invalid card choices before acceptance", async () => {
  const players = [player("guest-one"), player("guest-two")] as const;
  const game = new Game(
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
      randomSeed: 20260910,
    }),
  );
  const pending = [
    Promise.withResolvers<number>(),
    Promise.withResolvers<number>(),
  ] as const;
  for (const who of [0, 1] as const) {
    game.players[who].io = players[who];
    players[who].onInitialized(who, game, players[who === 0 ? 1 : 0]);
    players[who].subscribe({
      send: (event) => {
        if (event.type === "rpc" && event.data)
          pending[who].resolve(event.data.id);
      },
      close: () => {},
    });
  }
  const finished = game.start();
  try {
    const [id0, id1] = await Promise.all([
      pending[0].promise,
      pending[1].promise,
    ]);
    assert.equal(game.state.phase, "initHands");
    assert.throws(
      () => players[0].receiveResponse(id0, Uint8Array.of(0x12, 2, 8, 2)),
      hasCode("INVALID_RESPONSE"),
    );
    assert.equal(game.state.phase, "initHands");
    const ack = players[0].receiveResponse(id0, response);
    assert.equal(players[0].receiveResponse(id0, response), ack);
    players[1].receiveResponse(id1, response);
    // Both real engine IO promises have received validated responses. Ending
    // this minimal no-card game exercises its actual completion notification.
    game.giveUp(0);
    assert.equal(await finished, 1);
    assert.equal(game.state.phase, "gameEnd");
    assert.equal(game.state.winner, 1);
    assert.equal(players[0].receiveResponse(id0, response), ack);
  } finally {
    players[0].dispose();
    players[1].dispose();
    if (!Object.isFrozen(game)) game.terminate();
  }
});
