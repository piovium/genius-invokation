import { test, expect } from "vitest";
import getData from "../../data/src/index.ts";
import { Game, type DeckConfig } from "../src";

const deck0: DeckConfig = {
  characters: [1417, 1511, 1709],
  cards: [
    313001, 332011, 215111, 312004, 214171, 322012, 332045, 332042, 331802,
    332006, 332042, 223041, 223041, 226031, 226031, 312009, 312009, 312010,
    312010, 313002, 313002, 321002, 321004, 321017, 321017, 322008, 322012,
    322012, 322025, 332004, 332004, 332006, 332032, 332032, 332041, 332041,
  ],
  noShuffle: true,
};
const deck1: DeckConfig = {
  characters: [1101, 1116, 1409],
  cards: [
    330006, 323008, 332003, 332040, 322008, 332037, 333006, 332004, 312023,
    330006, 332011, 321004, 321004, 321024, 321024, 322018, 322018, 331202,
    331202, 332004, 332004, 332006, 332006, 332025, 332031, 332032, 332032,
    332040, 332040, 333015, 331004,
  ],
  noShuffle: true,
};

const createBot = () => ({
  notify: () => {},
  rpc: () => Promise.resolve({ response: { $case: "declareEnd", value: {} } }),
});

const createGame = () => {
  const state = Game.createInitialState({
    decks: [deck0, deck1],
    data: getData(),
  });
  const game = new Game(state);
  game.players[0].io = createBot();
  game.players[1].io = createBot();
  return game;
};

test("giveUp(0) makes player 1 the winner", async () => {
  const game = createGame();
  const startPromise = game.start();
  game.giveUp(0);
  await startPromise;
  expect(game.state.phase).toBe("gameEnd");
  expect(game.state.winner).toBe(1);
});

test("giveUp(1) makes player 0 the winner", async () => {
  const game = createGame();
  const startPromise = game.start();
  game.giveUp(1);
  await startPromise;
  expect(game.state.phase).toBe("gameEnd");
  expect(game.state.winner).toBe(0);
});
