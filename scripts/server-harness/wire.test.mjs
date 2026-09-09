import assert from "node:assert/strict";
import test from "node:test";
import { decodeGameFrame, encodeGameFrame, MAX_GAME_PAYLOAD_BYTES } from "./wire.mjs";

const hex = (value) => new Uint8Array(Buffer.from(value.replaceAll(" ", ""), "hex"));
const fixtures = [
  [{ type: "notification", data: hex("0a040805100f") }, "47490101 00000000 0a040805100f"],
  [{ type: "rpc", data: { id: 0x01020304, timer: { current: 2.5, total: 10 }, request: hex("1200") } },
    "47490102 01020304 4004000000000000 4024000000000000 1200"],
  [{ type: "actionResponse", id: 0xffff_ffff, response: hex("1200") }, "47490103 ffffffff 1200"],
];

test("binary envelope matches independent byte-order goldens for all game kinds", () => {
  for (const [event, golden] of fixtures) {
    assert.deepEqual(encodeGameFrame(event), hex(golden));
    assert.deepEqual(decodeGameFrame(hex(golden)), event);
    assert.deepEqual(decodeGameFrame(hex(golden).buffer), event);
  }
});

test("decoder respects view byte offsets and returns unmodified protobuf bytes", () => {
  for (const [event, golden] of fixtures) {
    const padded = hex(`deadbeef ${golden} feedface`);
    const source = padded.subarray(4, padded.length - 4);
    const decoded = decodeGameFrame(source);
    assert.deepEqual(decoded, event);
    const payload = decoded.type === "notification" ? decoded.data : decoded.type === "rpc" ? decoded.data.request : decoded.response;
    assert.equal(payload.buffer, source.buffer, "decoding should not allocate a second payload copy");
  }
});

test("binary timer preserves animation allowance, negative grace time and fractional seconds", () => {
  for (const timer of [{ current: 130.5, total: 120 }, { current: -1, total: 0 }]) {
    const event = { type: "rpc", data: { id: 0, request: hex("0a00"), timer } };
    assert.deepEqual(decodeGameFrame(encodeGameFrame(event)), event);
  }
});

test("encoder rejects invalid ids, payload representations, size and nonfinite timers", () => {
  for (const id of [-1, 0x1_0000_0000, 0.1, NaN, Infinity, "1", undefined]) {
    assert.throws(() => encodeGameFrame({ type: "actionResponse", id, response: hex("1200") }), /uint32/);
  }
  for (const data of ["CgA=", [], new ArrayBuffer(2), null, new Uint8Array(0), new Uint8Array(MAX_GAME_PAYLOAD_BYTES + 1)]) {
    assert.throws(() => encodeGameFrame({ type: "notification", data }), /payload/);
  }
  for (const timer of [null, {}, { current: NaN, total: 10 }, { current: 1, total: Infinity }]) {
    assert.throws(() => encodeGameFrame({ type: "rpc", data: { id: 1, request: hex("1200"), timer } }), /finite/);
  }
  assert.throws(() => encodeGameFrame({ type: "notification", id: 1, data: hex("0a00") }), /zero/);
  for (const event of [null, {}, { type: "rpc", data: null }, { type: "waiting" }, { type: "toString" }]) {
    assert.throws(() => encodeGameFrame(event), /Invalid binary game frame/);
  }
});

test("decoder rejects header and timer truncation, unknown formats, missing and oversized payloads", () => {
  const request = hex(fixtures[1][1]);
  for (let length = 0; length <= 24; length++) {
    assert.throws(() => decodeGameFrame(request.subarray(0, length)), /truncated|missing/);
  }
  for (const [offset, value, expected] of [[0, 0, /magic/], [1, 0, /magic/], [2, 2, /version/], [3, 0, /kind/], [3, 4, /kind/]]) {
    const frame = request.slice();
    frame[offset] = value;
    assert.throws(() => decodeGameFrame(frame), expected);
  }
  const nonzeroId = hex(fixtures[0][1]);
  nonzeroId[7] = 1;
  assert.throws(() => decodeGameFrame(nonzeroId), /zero/);
  for (const offset of [8, 16]) {
    const frame = request.slice();
    new DataView(frame.buffer).setFloat64(offset, NaN, false);
    assert.throws(() => decodeGameFrame(frame), /finite/);
  }
  for (const input of ["bytes", null, new DataView(request.buffer), new Uint16Array(8)]) {
    assert.throws(() => decodeGameFrame(input), /Uint8Array or ArrayBuffer/);
  }
  const oversized = new Uint8Array(8 + MAX_GAME_PAYLOAD_BYTES + 1);
  oversized.set(hex("4749010100000000"));
  assert.throws(() => decodeGameFrame(oversized), /8 MiB/);
  assert.equal(decodeGameFrame(oversized.subarray(0, oversized.length - 1)).data.length, MAX_GAME_PAYLOAD_BYTES);
});
