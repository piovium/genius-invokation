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

/** "GI", then the protocol version both ends speak. */
const MAGIC_BYTES = [0x47, 0x49] as const;
const VERSION = 1;
/** Kind byte of each frame variant. */
const KIND = {
  notification: 1,
  rpc: 2,
  actionResponse: 3,
} as const;
/** Header sizes: the fixed prefix, and that prefix plus two float64 BE timers. */
const HEADER_BYTES = 8;
const TIMER_BYTES = 16;
const RPC_HEADER_BYTES = HEADER_BYTES + TIMER_BYTES;
/** Byte offsets of the id and the two float64 BE RPC timers within the header. */
const ID_OFFSET = 4;
const TIMER_CURRENT_OFFSET = 8;
const TIMER_TOTAL_OFFSET = 16;
const MAX_GAME_PAYLOAD_MIB = 8;
export const MAX_GAME_PAYLOAD_BYTES = MAX_GAME_PAYLOAD_MIB * 1024 * 1024;
export const MAX_GAME_FRAME_BYTES = MAX_GAME_PAYLOAD_BYTES + RPC_HEADER_BYTES;

function invalid(reason: string): never {
  throw new Error(`Invalid binary game frame: ${reason}`);
}

/** Offset the protobuf payload starts at; RPC frames push it past the timers. */
function payloadOffsetOf(kind: number): number {
  return kind === KIND.rpc ? RPC_HEADER_BYTES : HEADER_BYTES;
}

interface FrameHeader {
  kind: number;
  id: number;
  payload: Uint8Array;
}

/** Split a frame into the header fields the binary envelope carries. */
function describeFrame(frame: GameWireFrame): FrameHeader {
  switch (frame.type) {
    case "notification":
      return { kind: KIND.notification, id: 0, payload: frame.data };
    case "rpc":
      return { kind: KIND.rpc, id: frame.data.id, payload: frame.data.request };
    case "actionResponse":
      return {
        kind: KIND.actionResponse,
        id: frame.id,
        payload: frame.response,
      };
  }
}

function checkId(id: number): void {
  if (!Number.isInteger(id) || id < 0 || id > 0xffff_ffff)
    invalid("id must be uint32");
}

function checkPayload(payload: Uint8Array): void {
  if (!(payload instanceof Uint8Array) || payload.byteLength === 0)
    invalid("missing protobuf payload");
  if (payload.byteLength > MAX_GAME_PAYLOAD_BYTES)
    invalid(`protobuf payload exceeds ${MAX_GAME_PAYLOAD_MIB} MiB`);
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

/** MAGIC_BYTES, VERSION, kind byte, uint32 BE ID; RPC adds two float64 BE timers. */
export function encodeGameFrame(frame: GameWireFrame): Uint8Array<ArrayBuffer> {
  const type = frame?.type;
  if (type !== "notification" && type !== "rpc" && type !== "actionResponse")
    invalid("unsupported kind");
  const { kind, id, payload } = describeFrame(frame);
  checkId(id);
  checkPayload(payload);
  const payloadOffset = payloadOffsetOf(kind);
  const bytes = new Uint8Array(payloadOffset + payload.byteLength);
  const view = new DataView(bytes.buffer);
  bytes.set([...MAGIC_BYTES, VERSION, kind]);
  view.setUint32(ID_OFFSET, id, false);
  if (type === "rpc") {
    checkTimer(frame.data.timer);
    view.setFloat64(TIMER_CURRENT_OFFSET, frame.data.timer.current, false);
    view.setFloat64(TIMER_TOTAL_OFFSET, frame.data.timer.total, false);
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
  if (bytes[0] !== MAGIC_BYTES[0] || bytes[1] !== MAGIC_BYTES[1])
    invalid("incorrect GI magic");
  if (bytes[2] !== VERSION) invalid("unsupported version");
  const kind = bytes[3];
  if (
    kind !== KIND.notification &&
    kind !== KIND.rpc &&
    kind !== KIND.actionResponse
  )
    invalid("unsupported kind");
  const payloadOffset = payloadOffsetOf(kind);
  if (bytes.byteLength < payloadOffset) invalid("truncated RPC timer");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const id = view.getUint32(ID_OFFSET, false);
  const payload = bytes.subarray(payloadOffset);
  checkPayload(payload);
  if (kind === KIND.notification) {
    if (id !== 0) invalid("notification id must be zero");
    return { type: "notification", data: payload };
  }
  if (kind === KIND.actionResponse)
    return { type: "actionResponse", id, response: payload };
  const timer = {
    current: view.getFloat64(TIMER_CURRENT_OFFSET, false),
    total: view.getFloat64(TIMER_TOTAL_OFFSET, false),
  };
  checkTimer(timer);
  return { type: "rpc", data: { id, timer, request: payload } };
}
