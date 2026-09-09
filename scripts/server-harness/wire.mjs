// Binary game envelopes for the migration harness; control messages stay JSON.
// Header: GI magic, version 1, kind, uint32 BE RPC id. An RPC request adds
// current/total timer float64 BE values before its unmodified protobuf bytes.
export const MAX_GAME_PAYLOAD_BYTES = 8 * 1024 * 1024;
const HEADER_BYTES = 8;
const TIMER_BYTES = 16;
const KINDS = { notification: 1, rpc: 2, actionResponse: 3 };

function fail(message) {
  throw new Error(`Invalid binary game frame: ${message}`);
}

function validateId(id) {
  if (!Number.isInteger(id) || id < 0 || id > 0xffff_ffff) fail("id must be uint32");
}

function validateTimer(timer) {
  // The legacy timer includes mutation animation time and a timeout grace
  // period, so current may exceed total or fall below zero.
  if (!timer || !Number.isFinite(timer.current) || !Number.isFinite(timer.total)) {
    fail("timer current and total must be finite numbers");
  }
}

function validatePayload(payload) {
  if (!(payload instanceof Uint8Array)) fail("protobuf payload must be Uint8Array");
  if (payload.byteLength === 0) fail("missing protobuf payload");
  if (payload.byteLength > MAX_GAME_PAYLOAD_BYTES) fail("protobuf payload exceeds 8 MiB");
}

export function encodeGameFrame(event) {
  const kind = Object.hasOwn(KINDS, event?.type) ? KINDS[event.type] : undefined;
  if (!kind) fail("unsupported game event type");
  const id = kind === 1 ? 0 : kind === 2 ? event.data?.id : event.id;
  validateId(id);
  if (kind === 1 && event.id !== undefined && event.id !== 0) fail("notification id must be zero");
  const payload = kind === 1 ? event.data : kind === 2 ? event.data?.request : event.response;
  validatePayload(payload);
  const timer = kind === 2 ? event.data?.timer : null;
  if (kind === 2) validateTimer(timer);
  const payloadOffset = HEADER_BYTES + (kind === 2 ? TIMER_BYTES : 0);
  const bytes = new Uint8Array(payloadOffset + payload.byteLength);
  const view = new DataView(bytes.buffer);
  bytes.set([0x47, 0x49, 1, kind]);
  view.setUint32(4, id, false);
  if (timer) {
    view.setFloat64(8, timer.current, false);
    view.setFloat64(16, timer.total, false);
  }
  bytes.set(payload, payloadOffset);
  return bytes;
}

export function decodeGameFrame(input) {
  const bytes = input instanceof ArrayBuffer ? new Uint8Array(input) : input;
  if (!(bytes instanceof Uint8Array)) fail("expected Uint8Array or ArrayBuffer");
  if (bytes.byteLength < HEADER_BYTES) fail("truncated header");
  if (bytes[0] !== 0x47 || bytes[1] !== 0x49) fail("incorrect GI magic");
  if (bytes[2] !== 1) fail(`unknown version ${bytes[2]}`);
  const kind = bytes[3];
  if (kind !== 1 && kind !== 2 && kind !== 3) fail(`unknown kind ${kind}`);
  const payloadOffset = HEADER_BYTES + (kind === 2 ? TIMER_BYTES : 0);
  if (bytes.byteLength < payloadOffset) fail("truncated RPC timer");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const id = view.getUint32(4, false);
  if (kind === 1 && id !== 0) fail("notification id must be zero");
  const payload = bytes.subarray(payloadOffset);
  validatePayload(payload);
  if (kind === 1) return { type: "notification", data: payload };
  if (kind === 3) return { type: "actionResponse", id, response: payload };
  const timer = { current: view.getFloat64(8, false), total: view.getFloat64(16, false) };
  validateTimer(timer);
  return { type: "rpc", data: { id, request: payload, timer } };
}
