// Deliberately small, dependency-free wire adapter for the current server protocol.
// This is a harness adapter, not a general protobuf implementation. See codec.test.mjs
// for checked-in schema fingerprints and independent golden wire examples.
const MAX_MESSAGE_BYTES = 8 * 1024 * 1024;
const MAX_FIELDS = 100_000;
const MAX_ACTIONS = 4096;
const MAX_REPEATED = 4096;
const RPC_METHODS = [null, "rerollDice", "switchHands", "chooseActive", "action", "selectCard"];
const ACTION_METHODS = [null, "switchActive", "playCard", "useSkill", "elementalTuning", "declareEnd"];

export const SCHEMA_FINGERPRINTS = Object.freeze({
  "rpc.proto": "96b9e229b23f7a238b255801bf481c0338573aa711090116af865045e3a48efd",
  "state.proto": "8064b34fa7ac38dc8b8c244119d762e245f9c7f32d811d0d896456c8956f8b73",
  "notification.proto": "12a82b8312cbf65b806065fd182046935c885af58a64f3bd24180378c66cf324",
});

function fail(message) {
  throw new Error(`Invalid protobuf: ${message}`);
}

function decodeBase64(value) {
  if (typeof value !== "string" || value.length > Math.ceil(MAX_MESSAGE_BYTES / 3) * 4) {
    fail("expected base64 within the 8 MiB message limit");
  }
  if (value.length % 4 !== 0 || /[^A-Za-z0-9+/=]/.test(value)) {
    fail("malformed base64");
  }
  const bytes = Buffer.from(value, "base64");
  if (bytes.length > MAX_MESSAGE_BYTES || bytes.toString("base64") !== value) {
    fail("noncanonical base64 or oversized message");
  }
  return bytes;
}

function decodeInput(value) {
  if (typeof value === "string") return decodeBase64(value);
  if (!(value instanceof Uint8Array) || value.byteLength > MAX_MESSAGE_BYTES) {
    fail("expected Uint8Array or base64 within the 8 MiB message limit");
  }
  return value;
}

function varint(reader) {
  let result = 0n;
  for (let index = 0; index < 10; index++) {
    if (reader.offset >= reader.bytes.length) fail("truncated varint");
    const byte = reader.bytes[reader.offset++];
    if (index === 9 && byte > 1) fail("varint exceeds 64 bits");
    result |= BigInt(byte & 0x7f) << BigInt(index * 7);
    if (!(byte & 0x80)) {
      if (index > 0 && byte === 0) fail("noncanonical varint");
      return result;
    }
  }
  fail("unterminated varint");
}

function uint32(value) {
  if (value > 0xffff_ffffn) fail("uint32 overflow");
  return Number(value);
}

function int32(value) {
  const signed = BigInt.asIntN(32, value);
  if (value !== BigInt.asUintN(32, signed) && value !== BigInt.asUintN(64, signed)) {
    fail("int32 overflow");
  }
  return Number(signed);
}

function sint32(value) {
  const encoded = uint32(value);
  return (encoded >>> 1) ^ -(encoded & 1);
}

function* fields(bytes, budget) {
  const reader = { bytes, offset: 0 };
  while (reader.offset < bytes.length) {
    if (++budget.fields > MAX_FIELDS) fail("too many fields");
    const tag = uint32(varint(reader));
    const number = tag >>> 3;
    const wire = tag & 7;
    if (number === 0) fail("field number zero");
    let value;
    if (wire === 0) {
      value = varint(reader);
    } else {
      let size;
      if (wire === 2) size = uint32(varint(reader));
      else if (wire === 1) size = 8;
      else if (wire === 5) size = 4;
      else fail(`unsupported wire type ${wire}`);
      if (size > bytes.length - reader.offset) fail("truncated field");
      value = bytes.subarray(reader.offset, reader.offset + size);
      reader.offset += size;
    }
    yield { number, wire, value };
  }
}

function wire(field, expected) {
  if (field.wire !== expected) fail(`field ${field.number} has wrong wire type`);
  return field.value;
}

function repeated(field, decode, result) {
  if (field.wire === 0) {
    result.push(decode(field.value));
  } else {
    const reader = { bytes: wire(field, 2), offset: 0 };
    while (reader.offset < reader.bytes.length) {
      if (result.length >= MAX_REPEATED) fail("too many repeated values");
      result.push(decode(varint(reader)));
    }
  }
  if (result.length > MAX_REPEATED) fail("too many repeated values");
}

function encodeVarint(value) {
  let rest = BigInt(value);
  const bytes = [];
  do {
    const byte = Number(rest & 0x7fn);
    rest >>= 7n;
    bytes.push(byte | (rest ? 0x80 : 0));
  } while (rest);
  return Buffer.from(bytes);
}

function scalar(number, value) {
  if (value === 0) return Buffer.alloc(0);
  return Buffer.concat([encodeVarint(number * 8), encodeVarint(value)]);
}

function message(number, bytes) {
  return Buffer.concat([encodeVarint(number * 8 + 2), encodeVarint(bytes.length), bytes]);
}

function encodeSint32(value) {
  return Number(BigInt.asUintN(32, (BigInt(value) << 1n) ^ (BigInt(value) >> 31n)));
}

function readAction(bytes, budget) {
  let action = null;
  let validity = 0;
  const dice = [];
  for (const field of fields(bytes, budget)) {
    if (field.number >= 1 && field.number <= 5) {
      if (action !== null) fail("multiple action alternatives");
      action = ACTION_METHODS[field.number];
      // Validate the action envelope while leaving unused action details opaque.
      for (const ignored of fields(wire(field, 2), budget)) void ignored;
    } else if (field.number === 12) {
      repeated(field, uint32, dice);
    } else if (field.number === 13) {
      validity = int32(wire(field, 0));
    }
  }
  if (dice.some((die) => die > 8)) fail("unknown dice type");
  return { action, validity, dice };
}

/** Answer only legal, advertised choices; no game data or full state is retained. */
export function answerRpc(input, { strategy = "combat" } = {}) {
  if (strategy !== "combat" && strategy !== "long") throw new Error(`Unknown strategy: ${strategy}`);
  const budget = { fields: 0 };
  let rpc = null;
  for (const field of fields(decodeInput(input), budget)) {
    if (field.number >= 1 && field.number <= 5) {
      if (rpc) fail("multiple RPC alternatives");
      rpc = { number: field.number, bytes: wire(field, 2) };
    }
  }
  if (!rpc) fail("missing RPC method");
  const method = RPC_METHODS[rpc.number];
  const candidates = [];
  const actions = [];
  for (const field of fields(rpc.bytes, budget)) {
    if (field.number !== 1) continue;
    if (method === "chooseActive" || method === "selectCard") {
      repeated(field, method === "chooseActive" ? sint32 : int32, candidates);
    } else if (method === "action") {
      if (actions.length >= MAX_ACTIONS) fail("too many actions");
      actions.push(readAction(wire(field, 2), budget));
    }
  }
  let payload = Buffer.alloc(0);
  let selectedAction;
  if (method === "chooseActive" || method === "selectCard") {
    if (candidates.length === 0) fail(`${method} has no candidates`);
    payload = scalar(1, encodeSint32(candidates[0]));
  } else if (method === "action") {
    const preferences = strategy === "long" ? ["declareEnd"] : ["useSkill", "playCard", "declareEnd"];
    let index = -1;
    for (const preference of preferences) {
      index = actions.findIndex((item) => item.validity === 0 && item.action === preference);
      if (index !== -1) break;
    }
    if (index === -1) fail(`no legal ${strategy} action`);
    const selected = actions[index];
    selectedAction = selected.action;
    payload = Buffer.concat([
      scalar(1, index),
      selected.dice.length ? message(2, Buffer.concat(selected.dice.map(encodeVarint))) : Buffer.alloc(0),
    ]);
  }
  const response = message(rpc.number, payload);
  return {
    response: typeof input === "string" ? response.toString("base64") : new Uint8Array(response),
    method,
    ...(selectedAction ? { action: selectedAction } : {}),
  };
}

// Snapshot masking follows core/io.ts exposeState/exposeEntity. Visible tags and
// hints are deliberately not prohibited: the current engine exposes those even
// on hidden cards. This check does not cover mutations or RPC action previews.
function checkHiddenCard(bytes, budget) {
  for (const field of fields(bytes, budget)) {
    if ((field.number === 2 || field.number === 8) && int32(wire(field, 0)) !== 0) {
      fail("private snapshot exposes a hidden card identity or type");
    }
    if ([4, 5, 7].includes(field.number)) {
      wire(field, 2);
      fail("private snapshot exposes hidden card description, cost or attachment");
    }
  }
}

function checkPlayerPrivacy(bytes, index, viewer, budget, privacy) {
  const opponent = index !== viewer;
  for (const field of fields(bytes, budget)) {
    if (field.number === 7 || (field.number === 8 && opponent)) {
      checkHiddenCard(wire(field, 2), budget);
      privacy.hiddenCardsChecked++;
    } else if (field.number === 8) {
      for (const cardField of fields(wire(field, 2), budget)) {
        if (cardField.number === 2 && int32(wire(cardField, 0)) > 0) privacy.ownHandCardsObserved++;
      }
    } else if (field.number === 6 && opponent) {
      const dice = [];
      repeated(field, uint32, dice);
      if (dice.some((die) => die !== 0)) fail("private snapshot exposes opponent dice");
      privacy.opponentDiceChecked += dice.length;
    } else if (field.number === 101 && opponent) {
      wire(field, 2);
      fail("private snapshot exposes opponent initiative skills");
    }
  }
}

/** Retain lifecycle/coverage counters only; optionally verify the viewer's snapshot. */
export function readNotification(input, { viewer } = {}) {
  if (viewer !== undefined && viewer !== 0 && viewer !== 1) fail("invalid snapshot viewer");
  const budget = { fields: 0 };
  let state = null;
  for (const field of fields(decodeInput(input), budget)) {
    if (field.number === 1) {
      if (state) fail("duplicate notification state");
      state = wire(field, 2);
    }
  }
  if (!state) fail("notification state missing");
  let phase = 0;
  let roundNumber = 0;
  let winner = null;
  let playerCount = 0;
  const privacy = { hiddenCardsChecked: 0, opponentDiceChecked: 0, ownHandCardsObserved: 0 };
  for (const field of fields(state, budget)) {
    if (field.number === 1) phase = int32(wire(field, 0));
    else if (field.number === 2) roundNumber = int32(wire(field, 0));
    else if (field.number === 4) winner = int32(wire(field, 0));
    else if (field.number === 5 && viewer !== undefined) {
      if (playerCount >= 2) fail("private snapshot must contain exactly two players");
      checkPlayerPrivacy(wire(field, 2), playerCount++, viewer, budget, privacy);
    }
  }
  if (phase < 0 || phase > 5) fail("unknown game phase");
  if (roundNumber < 0) fail("negative round number");
  if (winner !== null && winner !== 0 && winner !== 1) fail("invalid winner");
  if (viewer !== undefined && playerCount !== 2) fail("private snapshot must contain exactly two players");
  return { phase, roundNumber, winner, ...(viewer !== undefined ? { privacy } : {}) };
}
