import assert from "node:assert/strict";
import { test } from "node:test";
import { Game, type RpcRequest } from "@gi-tcg/core";
import { RpcResponse as PbRpcResponse } from "@gi-tcg/typings";
import { Player } from "./player";
import { RoomCommandError, type RoomEvent } from "./types";
import { guestPlayerInfo, testRoomConfig } from "./test-support";

const config = testRoomConfig();
const request: RpcRequest = { request: { $case: "switchHands", value: {} } };
// Protobuf-encoded Response { switchHands: {} }, matching `request` above.
const response = Uint8Array.of(0x12, 0);
// A different SwitchHandsResponse for the same RPC ID: it removes hand id 2.
const otherResponse = Uint8Array.of(0x12, 2, 8, 2);
const SESSION_ID = "session-test";
// The Player retains a bounded ACK window; issue more RPCs than it holds so
// the oldest acknowledgements are evicted.
const RPC_COUNT = 48;
const RECOVERY_WINDOW = 32;
const createPlayer = (id = "guest-test", sessionId = SESSION_ID) => {
  const instance = new Player(guestPlayerInfo(id), sessionId);
  instance.setTimeoutConfig(config);
  return instance;
};
const hasCode = (code: RoomCommandError["code"]) => (error: unknown) =>
  error instanceof RoomCommandError && error.code === code;

test("real Player accepts one RPC, validates its response once and replays the same ACK", async () => {
  const instance = createPlayer();
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
    assert.equal(first.sessionId, SESSION_ID);
    assert.throws(
      // A different SwitchHandsResponse for the same RPC must be rejected.
      () => instance.receiveResponse(0, otherResponse),
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
  const instance = createPlayer();
  let executions = 0;
  try {
    for (let id = 0; id < RPC_COUNT; id++) {
      const pending = instance.rpc(request).then(() => {
        executions++;
      });
      instance.receiveResponse(id, response);
      await pending;
    }
    const firstEvictedId = RPC_COUNT - RECOVERY_WINDOW - 1;
    const firstRetainedId = RPC_COUNT - RECOVERY_WINDOW;
    assert.throws(
      () => instance.receiveResponse(firstEvictedId, response),
      hasCode("STALE_RPC"),
    );
    assert.equal(
      instance.receiveResponse(firstRetainedId, response).id,
      firstRetainedId,
    );
    assert.equal(
      instance.receiveResponse(RPC_COUNT - 1, response).id,
      RPC_COUNT - 1,
    );
    assert.equal(executions, RPC_COUNT);
  } finally {
    instance.dispose();
  }
});

test("finished subscriptions expose the sync boundary and permit recovery of a lost final ACK", async () => {
  const instance = createPlayer();
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

test("completing a player rejects its outstanding IO and clears the current action", async () => {
  const instance = createPlayer();
  const pending = instance.rpc(request);
  const rejected = assert.rejects(pending, /Game finished/);
  instance.complete();
  await rejected;
  assert.deepEqual(instance.currentAction(), { type: "rpc", data: null });
});

test("real engine switch-hands IO advances once and rejects invalid card choices before acceptance", async () => {
  const players = [
    createPlayer("guest-one"),
    createPlayer("guest-two"),
  ] as const;
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
      () => players[0].receiveResponse(id0, otherResponse),
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
