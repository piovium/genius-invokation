import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import { answerRpc, readNotification, SCHEMA_FINGERPRINTS } from "./codec.mjs";

const base64 = (hex) => Buffer.from(hex.replaceAll(" ", ""), "hex").toString("base64");
const answerHex = (hex, options) => {
  const { response, ...result } = answerRpc(base64(hex), options);
  return { ...result, hex: Buffer.from(response, "base64").toString("hex") };
};

test("wire subset matches reviewed proto source fingerprints (LF normalized)", () => {
  for (const [file, expected] of Object.entries(SCHEMA_FINGERPRINTS)) {
    const source = readFileSync(new URL(`../../proto/${file}`, import.meta.url), "utf8").replaceAll("\r\n", "\n");
    assert.equal(createHash("sha256").update(source).digest("hex"), expected,
      `${file} changed: review the harness wire subset and update golden fixtures before accepting a new fingerprint`);
  }
});

test("empty reroll and switch-hands replies retain their method envelopes", () => {
  assert.deepEqual(answerHex("0a00"), { method: "rerollDice", hex: "0a00" });
  assert.deepEqual(answerHex("1200"), { method: "switchHands", hex: "1200" });
});

test("chooseActive decodes zigzag IDs from packed and unpacked candidates", () => {
  // -7 -> zigzag 13; second candidate is +3 -> zigzag 6.
  for (const request of ["1a040a020d06", "1a04080d0806"]) {
    assert.deepEqual(answerHex(request), { method: "chooseActive", hex: "1a02080d" });
  }
  assert.equal(answerHex("1a0608ffffffff0f").hex, "1a0608ffffffff0f"); // int32 minimum
  assert.equal(answerHex("1a020800").hex, "1a00"); // default scalar omitted
});

test("selectCard converts int32 candidates into a sint32 response", () => {
  // Candidate 150 uses uint varint 96 01; response zigzag 300 is ac 02.
  assert.deepEqual(answerHex("2a040a029601"), { method: "selectCard", hex: "2a0308ac02" });
  assert.equal(answerHex("2a03089601").hex, "2a0308ac02");
  // int32 -1 is encoded as a sign-extended 10-byte varint, then zigzag as 1.
  assert.equal(answerHex("2a0b08ffffffffffffffffff01").hex, "2a020801");
});

test("combat skips invalid skills, prefers legal skills over cards and uses advertised dice", () => {
  // Actions: invalid useSkill; legal playCard; legal useSkill with dice [3,8]; declareEnd.
  const request = "22160a041a0068030a0212000a061a00620203080a022a00";
  assert.deepEqual(answerHex(request), { method: "action", action: "useSkill", hex: "2206080212020308" });
  assert.deepEqual(answerHex(request, { strategy: "long" }), { method: "action", action: "declareEnd", hex: "22020803" });
});

test("packed and unpacked advertised dice produce the same packed response", () => {
  const packed = "22080a061a0062020308";
  const unpacked = "22080a061a0060036008";
  for (const request of [packed, unpacked]) {
    assert.deepEqual(answerHex(request), { method: "action", action: "useSkill", hex: "220412020308" });
  }
});

test("combat falls back to legal card or declare-end without inventing actions", () => {
  assert.deepEqual(answerHex("22040a021200"), { method: "action", action: "playCard", hex: "2200" });
  assert.deepEqual(answerHex("22040a022a00"), { method: "action", action: "declareEnd", hex: "2200" });
  assert.throws(() => answerHex("22060a042a006801"), /no legal/);
  assert.throws(() => answerHex("22040a021a00", { strategy: "long" }), /no legal/);
});

test("notification reads phase, round and optional winner without retaining full state", () => {
  assert.deepEqual(readNotification(base64("0a040805100f")), { phase: 5, roundNumber: 15, winner: null });
  assert.deepEqual(readNotification(base64("0a060805100f2000")), { phase: 5, roundNumber: 15, winner: 0 });
  assert.deepEqual(readNotification(base64("0a060805100f2001")), { phase: 5, roundNumber: 15, winner: 1 });
  assert.deepEqual(readNotification(base64("0a00")), { phase: 0, roundNumber: 0, winner: null });
  assert.deepEqual(readNotification(base64("0a060805100f2a001200")), { phase: 5, roundNumber: 15, winner: null });
});

test("unknown varint, fixed32, fixed64 and length-delimited fields can be skipped", () => {
  const unknown = "5001550102030459010203040506070862020102";
  assert.equal(answerHex(`0a00${unknown}`).hex, "0a00");
  assert.deepEqual(readNotification(base64(`0a040805100f${unknown}`)), { phase: 5, roundNumber: 15, winner: null });
});

// Independent small protobuf goldens: field 5 players, player fields 6 dice,
// 7 pile, 8 hand. Hidden cards retain instance ID 1, visible hand definition 42.
const smallMessage = (tag, bytes) => Buffer.concat([Buffer.from([tag, bytes.length]), bytes]);
function privateSnapshot({ viewer = 0, ownPile = "0802", opponentHand = "0802", opponentExtra = "", ownHand = "0802102a" } = {}) {
  const own = Buffer.concat([Buffer.from("320103", "hex"), smallMessage(0x3a, Buffer.from(ownPile, "hex")), smallMessage(0x42, Buffer.from(ownHand, "hex"))]);
  const opponent = Buffer.concat([Buffer.from("320200003a020802", "hex"), smallMessage(0x42, Buffer.from(opponentHand, "hex")), Buffer.from(opponentExtra, "hex")]);
  const players = viewer === 0 ? [own, opponent] : [opponent, own];
  return smallMessage(0x0a, Buffer.concat([Buffer.from("08031001", "hex"), ...players.map((p) => smallMessage(0x2a, p))]));
}

test("snapshot privacy checks both viewers and both encodings without retaining cards", () => {
  for (const viewer of [0, 1]) {
    const bytes = privateSnapshot({ viewer });
    for (const input of [new Uint8Array(bytes), bytes.toString("base64")]) {
      assert.deepEqual(readNotification(input, { viewer }), {
        phase: 3, roundNumber: 1, winner: null,
        privacy: { hiddenCardsChecked: 3, opponentDiceChecked: 2, ownHandCardsObserved: 1 },
      });
    }
  }
  // Existing exposeEntity leaves tags/hints visible even when identity is hidden.
  assert.doesNotThrow(() => readNotification(privateSnapshot({ opponentHand: "080210003001aa030161" }), { viewer: 0 }));
});

test("snapshot privacy rejects card identities, metadata, dice and skills leaked on an authorized connection", () => {
  for (const patch of [
    { ownPile: "0802102a" },
    { opponentHand: "0802102a" },
    { opponentHand: "08024001" },
    { opponentHand: "08022200" },
    { opponentHand: "08022a00" },
    { opponentHand: "08023a00" },
    { opponentExtra: "3003" }, // unpacked die
    { opponentExtra: "320103" }, // packed die
    { opponentExtra: "aa0600" }, // initiative_skill field 101
  ]) {
    for (const viewer of [0, 1]) assert.throws(() => readNotification(privateSnapshot({ ...patch, viewer }), { viewer }), /private snapshot exposes/);
  }
  assert.throws(() => readNotification(base64("0a00"), { viewer: 0 }), /exactly two players/);
  assert.throws(() => readNotification(base64("0a062a002a002a00"), { viewer: 0 }), /exactly two players/);
  assert.throws(() => readNotification(privateSnapshot(), { viewer: 2 }), /invalid snapshot viewer/);
  assert.equal(readNotification(privateSnapshot({ ownHand: "0802" }), { viewer: 0 }).privacy.ownHandCardsObserved, 0,
    "An overmasked own hand must not establish positive private-view coverage");
});

test("malformed base64, wire values, envelopes and truncation are rejected", () => {
  for (const input of ["?", "Cg", "Cg=", "Ch==", "Cg==\n"]) {
    assert.throws(() => answerRpc(input), /Invalid protobuf/);
  }
  for (const hex of [
    "", "00", "0a", "0a02", "0affffffff0f", "0880", "0800", // envelope errors
    "0a001200", "1a00", "2a00", "2200", // ambiguity or missing candidates
    "0a0055aabb", "0a00590102", "0a0053", // truncated fixed or unsupported group
    "0a005080808080808080808080", "0a0050ffffffffffffffffff02", // overflowing varint
    "0a00508000", "1a06088080808010", // overlong varint / oversized uint32
    "22080a061a0062020309", // invalid die
    "22060a041a002a00", // ambiguous action
    "22050a031a0108", // truncated nested action scalar
  ]) {
    assert.throws(() => answerHex(hex), /Invalid protobuf/, hex);
  }
  for (const hex of ["", "1200", "0801", "0a0408051080", "0a020806", "0a022002", "0a000a00"]) {
    assert.throws(() => readNotification(base64(hex)), /Invalid protobuf/, hex);
  }
});

test("decoder rejects all nonempty prefixes of a golden request with an incomplete envelope", () => {
  const bytes = Buffer.from("22080a061a0062020308", "hex");
  for (let length = 1; length < bytes.length; length++) {
    assert.throws(() => answerRpc(bytes.subarray(0, length).toString("base64")), /Invalid protobuf/);
  }
});

test("decoder bounds message size and repeated values", () => {
  assert.throws(() => answerRpc("A".repeat(12 * 1024 * 1024)), /8 MiB/);
  // 4097 unpacked candidates (8194 bytes): length varint 82 40.
  assert.throws(() => answerHex(`1a8240${"0802".repeat(4097)}`), /too many repeated/);
});

test("binary RPC requests and notifications match base64 results without converting payloads to text", () => {
  for (const hex of ["0a00", "1200", "1a040a020d06", "2a040a029601", "22080a061a0062020308"]) {
    const request = new Uint8Array(Buffer.from(hex, "hex"));
    const before = request.slice();
    const result = answerRpc(request);
    const legacy = answerRpc(base64(hex));
    assert.ok(result.response instanceof Uint8Array);
    assert.deepEqual({ ...result, response: Buffer.from(result.response).toString("base64") }, legacy);
    assert.deepEqual(request, before);
  }
  const state = new Uint8Array(Buffer.from("0a060805100f2001", "hex"));
  assert.deepEqual(readNotification(state), { phase: 5, roundNumber: 15, winner: 1 });
  for (const input of [new Uint8Array(8 * 1024 * 1024 + 1), new ArrayBuffer(4), [], null]) {
    assert.throws(() => answerRpc(input), /8 MiB/);
    assert.throws(() => readNotification(input), /8 MiB/);
  }
  assert.throws(() => answerRpc(new Uint8Array([0x12])), /truncated/);
  assert.throws(() => readNotification(new Uint8Array([0x0a])), /truncated/);
});

test("deck fixture contains three unique characters and 30 cards within duplicate limits", () => {
  const deck = JSON.parse(readFileSync(new URL("./deck.json", import.meta.url), "utf8"));
  assert.equal(new Set(deck.characters).size, 3);
  assert.equal(deck.characters.length, 3);
  assert.equal(deck.cards.length, 30);
  const counts = new Map();
  for (const id of deck.cards) counts.set(id, (counts.get(id) ?? 0) + 1);
  assert.ok([...counts.values()].every((count) => count <= 2));
});
