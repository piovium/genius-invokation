/** Binary game messages shared by the server and browser. Control frames use JSON. */
export interface GameRpcTimer {
  current: number;
  total: number;
}

export interface GameRpcRequest {
  id: number;
  timer: GameRpcTimer;
  request: Uint8Array;
}

export type GameWireFrame =
  | { type: "notification"; data: Uint8Array }
  | { type: "rpc"; data: GameRpcRequest }
  | { type: "actionResponse"; id: number; response: Uint8Array };

const HEADER_BYTES = 8;
const RPC_HEADER_BYTES = 24;
export const MAX_GAME_PAYLOAD_BYTES = 8 * 1024 * 1024;
export const MAX_GAME_FRAME_BYTES = MAX_GAME_PAYLOAD_BYTES + RPC_HEADER_BYTES;

function invalid(reason: string): never {
  throw new Error(`Invalid binary game frame: ${reason}`);
}

function checkId(id: number): void {
  if (!Number.isInteger(id) || id < 0 || id > 0xffff_ffff)
    invalid("id must be uint32");
}

function checkPayload(payload: Uint8Array): void {
  if (!(payload instanceof Uint8Array) || payload.byteLength === 0)
    invalid("missing protobuf payload");
  if (payload.byteLength > MAX_GAME_PAYLOAD_BYTES)
    invalid("protobuf payload exceeds 8 MiB");
}

function checkTimer(timer: GameRpcTimer): void {
  // Animation time and the server's grace interval can make current exceed
  // total or fall below zero. Both values must still be finite.
  if (
    !timer ||
    !Number.isFinite(timer.current) ||
    !Number.isFinite(timer.total)
  )
    invalid("timer must contain finite numbers");
}

/** GI magic, version 1, kind byte, uint32 BE ID; RPC adds two float64 BE timers. */
export function encodeGameFrame(frame: GameWireFrame): Uint8Array<ArrayBuffer> {
  const kind =
    frame?.type === "notification"
      ? 1
      : frame?.type === "rpc"
        ? 2
        : frame?.type === "actionResponse"
          ? 3
          : invalid("unsupported kind");
  const id =
    frame.type === "notification"
      ? 0
      : frame.type === "rpc"
        ? frame.data.id
        : frame.id;
  const payload =
    frame.type === "notification"
      ? frame.data
      : frame.type === "rpc"
        ? frame.data.request
        : frame.response;
  checkId(id);
  checkPayload(payload);
  const payloadOffset = kind === 2 ? RPC_HEADER_BYTES : HEADER_BYTES;
  const bytes = new Uint8Array(payloadOffset + payload.byteLength);
  const view = new DataView(bytes.buffer);
  bytes.set([0x47, 0x49, 1, kind]);
  view.setUint32(4, id, false);
  if (frame.type === "rpc") {
    checkTimer(frame.data.timer);
    view.setFloat64(8, frame.data.timer.current, false);
    view.setFloat64(16, frame.data.timer.total, false);
  }
  bytes.set(payload, payloadOffset);
  return bytes;
}

export function decodeGameFrame(
  input: ArrayBuffer | Uint8Array,
): GameWireFrame {
  const bytes = input instanceof ArrayBuffer ? new Uint8Array(input) : input;
  if (!(bytes instanceof Uint8Array))
    invalid("expected ArrayBuffer or Uint8Array");
  if (bytes.byteLength < HEADER_BYTES) invalid("truncated header");
  if (bytes[0] !== 0x47 || bytes[1] !== 0x49) invalid("incorrect GI magic");
  if (bytes[2] !== 1) invalid("unsupported version");
  const kind = bytes[3];
  if (kind !== 1 && kind !== 2 && kind !== 3) invalid("unsupported kind");
  const payloadOffset = kind === 2 ? RPC_HEADER_BYTES : HEADER_BYTES;
  if (bytes.byteLength < payloadOffset) invalid("truncated RPC timer");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const id = view.getUint32(4, false);
  const payload = bytes.subarray(payloadOffset);
  checkPayload(payload);
  if (kind === 1) {
    if (id !== 0) invalid("notification id must be zero");
    return { type: "notification", data: payload };
  }
  if (kind === 3) return { type: "actionResponse", id, response: payload };
  const timer = {
    current: view.getFloat64(8, false),
    total: view.getFloat64(16, false),
  };
  checkTimer(timer);
  return { type: "rpc", data: { id, timer, request: payload } };
}
