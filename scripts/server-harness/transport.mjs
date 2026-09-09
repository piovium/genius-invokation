// Black-box adapters only: the WebSocket contract is a migration target.
// No server implementation or application dependencies are loaded here.
import { decodeGameFrame, encodeGameFrame } from "./wire.mjs";

const MAX_MESSAGE_CHARS = 8 * 1024 * 1024;

function positiveInteger(value, name) {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new Error(`${name} must be a positive safe integer`);
  }
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isTimer(value) {
  return (
    isRecord(value) &&
    Number.isFinite(value.current) &&
    Number.isFinite(value.total)
  );
}

function isRpcId(value) {
  return Number.isSafeInteger(value) && value >= 0;
}

function parseJson(text) {
  if (typeof text !== "string" || text.length > MAX_MESSAGE_CHARS) {
    throw new Error("Expected a bounded JSON text message");
  }
  let value;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error("Invalid JSON in transport message");
  }
  if (!isRecord(value) || typeof value.type !== "string") {
    throw new Error("Invalid transport envelope: expected an object with type");
  }
  return value;
}

function validateEnvelope(value) {
  let valid = false;
  switch (value.type) {
    case "waiting":
    case "ping":
      valid = true;
      break;
    case "initialized":
      valid = value.who === 0 || value.who === 1;
      break;
    case "notification":
      valid = typeof value.data === "string";
      break;
    case "rpc":
      valid =
        value.data === null ||
        (isRecord(value.data) &&
          isRpcId(value.data.id) &&
          typeof value.data.request === "string" &&
          isTimer(value.data.timer));
      break;
    case "oppRpc":
      valid = value.oppTimer === null || isTimer(value.oppTimer);
      break;
    case "error":
      if (typeof value.message !== "string") break;
      throw new Error(`Server transport error: ${value.message}`);
  }
  if (!valid) {
    throw new Error(`Invalid transport envelope for type ${value.type}`);
  }
  return value;
}

function createMailbox(timeoutMs, maxBufferedEvents) {
  const events = [];
  const waiters = [];
  const cleanups = new Set();
  let failure = null;
  let ended = null;

  function rejectWaiters(error) {
    for (const waiter of waiters.splice(0)) {
      clearTimeout(waiter.timer);
      waiter.reject(error);
    }
  }

  function fail(reason) {
    if (failure) return;
    failure = reason instanceof Error ? reason : new Error(String(reason));
    // A broken stream must not appear healthy by draining stale queued events.
    events.length = 0;
    rejectWaiters(failure);
    for (const cleanup of cleanups) {
      try {
        cleanup(failure);
      } catch {
        // Preserve the first failure even if a resource is already closed.
      }
    }
    cleanups.clear();
  }

  return {
    fail,
    end(reason) {
      if (failure || ended) return;
      ended = reason;
      // A clean EOF can follow the final game notification before the consumer
      // gets CPU time. Deliver already received events, then report the EOF.
      rejectWaiters(ended);
    },
    addCleanup(cleanup) {
      if (failure) cleanup(failure);
      else cleanups.add(cleanup);
    },
    assertOpen() {
      if (failure) throw failure;
      if (ended) throw ended;
    },
    assertNotFailed() {
      if (failure) throw failure;
    },
    push(event) {
      if (failure || ended) return;
      const waiter = waiters.shift();
      if (waiter) {
        clearTimeout(waiter.timer);
        waiter.resolve(event);
      } else if (events.length >= maxBufferedEvents) {
        fail(new Error(`Transport event queue exceeded ${maxBufferedEvents}`));
      } else {
        events.push(event);
      }
    },
    async next(waitMs = timeoutMs) {
      positiveInteger(waitMs, "next timeoutMs");
      if (failure) throw failure;
      if (events.length) return events.shift();
      if (ended) throw ended;
      if (waiters.length >= maxBufferedEvents) {
        throw new Error("Too many concurrent transport next() calls");
      }
      return new Promise((resolve, reject) => {
        const waiter = { resolve, reject, timer: null };
        waiter.timer = setTimeout(() => {
          waiters.splice(waiters.indexOf(waiter), 1);
          reject(new Error(`Timed out waiting for transport event (${waitMs}ms)`));
        }, waitMs);
        waiters.push(waiter);
      });
    },
    close() {
      fail(new Error("Transport session closed"));
    },
  };
}

// CR, LF and CRLF are all delimiters. In particular a CR at the end of one
// network chunk must consume a following LF without inventing a blank line.
function createSseParser(onMessage) {
  let line = "";
  let skipLf = false;
  let data = [];
  let eventChars = 0;

  function acceptLine(value) {
    if (value === "") {
      if (data.length) onMessage(data.join("\n"));
      data = [];
      eventChars = 0;
      return;
    }
    eventChars += value.length;
    if (eventChars > MAX_MESSAGE_CHARS) {
      throw new Error("SSE event exceeded message size limit");
    }
    if (value.startsWith(":")) return;
    const colon = value.indexOf(":");
    const field = colon < 0 ? value : value.slice(0, colon);
    let content = colon < 0 ? "" : value.slice(colon + 1);
    if (content.startsWith(" ")) content = content.slice(1);
    if (field === "data") data.push(content);
  }

  return (chunk) => {
    let start = 0;
    for (let i = 0; i < chunk.length; i++) {
      if (skipLf) {
        skipLf = false;
        if (chunk[i] === "\n") {
          start = i + 1;
          continue;
        }
      }
      if (chunk[i] !== "\r" && chunk[i] !== "\n") continue;
      line += chunk.slice(start, i);
      if (line.length > MAX_MESSAGE_CHARS) {
        throw new Error("SSE line exceeded message size limit");
      }
      acceptLine(line);
      line = "";
      skipLf = chunk[i] === "\r";
      start = i + 1;
    }
    line += chunk.slice(start);
    if (line.length > MAX_MESSAGE_CHARS) {
      throw new Error("SSE line exceeded message size limit");
    }
  };
}

async function connectSse({ prefix, token, timeoutMs, mailbox }) {
  const lifetime = new AbortController();
  mailbox.addCleanup(() => lifetime.abort());
  const connectTimer = setTimeout(() => {
    mailbox.fail(new Error(`SSE connection timed out (${timeoutMs}ms)`));
  }, timeoutMs);
  let response;
  try {
    response = await fetch(`${prefix}/notification`, {
      headers: { authorization: `Bearer ${token}`, accept: "text/event-stream" },
      signal: lifetime.signal,
    });
    mailbox.assertOpen();
    if (!response.ok) {
      throw new Error(`SSE connection returned HTTP ${response.status}`);
    }
    if (!/^text\/event-stream(?:\s*;|$)/i.test(response.headers.get("content-type") ?? "")) {
      throw new Error("SSE connection did not return text/event-stream");
    }
    if (!response.body) throw new Error("SSE connection has no response body");
  } catch (error) {
    mailbox.fail(error);
    mailbox.assertOpen();
  } finally {
    clearTimeout(connectTimer);
  }

  const reader = response.body.getReader();
  mailbox.addCleanup(() => void reader.cancel().catch(() => {}));
  const decoder = new TextDecoder("utf-8", { fatal: true });
  const parse = createSseParser((text) => {
    mailbox.push(validateEnvelope(parseJson(text)));
    mailbox.assertOpen();
  });
  // The task owns its catch: no rejected background promise escapes the runner.
  void (async () => {
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          parse(decoder.decode());
          mailbox.end(new Error("SSE stream disconnected"));
          return;
        }
        parse(decoder.decode(value, { stream: true }));
      }
    } catch (error) {
      mailbox.fail(error);
    } finally {
      reader.releaseLock();
    }
  })();

  async function post(command, body) {
    mailbox.assertOpen();
    try {
      const reply = await fetch(`${prefix}/${command}`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify(body),
        signal: AbortSignal.any([
          lifetime.signal,
          AbortSignal.timeout(timeoutMs),
        ]),
      });
      await reply.body?.cancel();
      if (!reply.ok) {
        throw new Error(`${command} returned HTTP ${reply.status}`);
      }
      // The server may close SSE on game end before this separate HTTP request
      // receives its success response. EOF blocks new commands but must not
      // abort an already submitted final action.
      mailbox.assertNotFailed();
    } catch (error) {
      mailbox.assertNotFailed();
      throw error;
    }
  }

  return {
    next: mailbox.next,
    close: mailbox.close,
    async sendResponse(id, response) {
      validateResponse(id, response);
      await post("actionResponse", { id, response });
    },
    async giveUp() {
      await post("giveUp", {});
    },
  };
}

function validateResponse(id, response) {
  if (!isRpcId(id) || typeof response !== "string") {
    throw new Error("actionResponse requires a nonnegative integer id and base64 response string");
  }
}

async function connectWebSocket({
  prefix,
  token,
  timeoutMs,
  mailbox,
  WebSocketImpl,
}) {
  if (typeof WebSocketImpl !== "function") {
    throw new Error("WebSocket is unavailable; use Node.js 24 or newer");
  }
  const url = new URL(`${prefix}/ws`);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  const socket = new WebSocketImpl(url.toString());
  socket.binaryType = "arraybuffer";
  const pending = new Map();
  let ready = false;
  let readyMetadata;
  let readySessionId;
  let resolveReady;
  let rejectReady;
  const authenticated = new Promise((resolve, reject) => {
    resolveReady = resolve;
    rejectReady = reject;
  });
  const connectTimer = setTimeout(() => {
    mailbox.fail(new Error(`WebSocket authentication timed out (${timeoutMs}ms)`));
  }, timeoutMs);

  function onOpen() {
    try {
      socket.send(JSON.stringify({ type: "auth", token }));
    } catch (error) {
      mailbox.fail(error);
    }
  }

  function onMessage(event) {
    try {
      if (typeof event.data !== "string") {
        if (!ready) throw new Error("WebSocket message received before ready");
        const value = decodeGameFrame(event.data);
        if (value.type === "actionResponse") throw new Error("Unexpected server actionResponse game frame");
        mailbox.push(value);
        return;
      }
      const value = parseJson(event.data);
      if (value.type === "ready") {
        if (ready) throw new Error("Duplicate WebSocket ready message");
        if (typeof value.sessionId !== "string" || !value.sessionId.trim() || value.sessionId.length > 128) {
          throw new Error("WebSocket ready requires a nonempty sessionId of at most 128 characters");
        }
        ready = true;
        readyMetadata = value;
        readySessionId = value.sessionId;
        clearTimeout(connectTimer);
        resolveReady();
        return;
      }
      if (value.type === "error") validateEnvelope(value);
      if (!ready) throw new Error("WebSocket message received before ready");
      if (value.type === "notification" || value.type === "actionResponse" || (value.type === "rpc" && value.data !== null)) {
        throw new Error(`WebSocket ${value.type} requires a binary game frame`);
      }
      if (value.type === "ack" || value.type === "commandError") {
        const { command, id } = value;
        if (
          (command !== "actionResponse" && command !== "giveUp") ||
          (command === "actionResponse" && !isRpcId(id)) ||
          (command === "giveUp" && id !== undefined) ||
          (value.type === "commandError" && typeof value.message !== "string")
        ) {
          throw new Error("Invalid WebSocket command acknowledgement");
        }
        if (value.type === "ack" && value.sessionId !== readySessionId) {
          throw new Error("WebSocket acknowledgement sessionId does not match ready session");
        }
        const key = command === "giveUp" ? command : `${command}:${id}`;
        const entry = pending.get(key);
        if (!entry) throw new Error("Unmatched WebSocket command acknowledgement");
        pending.delete(key);
        clearTimeout(entry.timer);
        if (value.type === "commandError") {
          entry.reject(new Error(`${command} rejected: ${value.message}`));
        } else {
          entry.resolve();
        }
        return;
      }
      mailbox.push(validateEnvelope(value));
    } catch (error) {
      mailbox.fail(error);
    }
  }

  function onClose(event) {
    const error = new Error(`WebSocket disconnected (code ${event.code ?? "unknown"})`);
    if (ready && (event.code === 1000 || event.code === 1001)) {
      mailbox.end(error);
      cleanupSocket(error);
    } else {
      mailbox.fail(error);
    }
  }

  function onError() {
    mailbox.fail(new Error("WebSocket connection error"));
  }

  socket.addEventListener("open", onOpen);
  socket.addEventListener("message", onMessage);
  socket.addEventListener("close", onClose);
  socket.addEventListener("error", onError);
  let socketCleaned = false;
  function cleanupSocket(error) {
    if (socketCleaned) return;
    socketCleaned = true;
    clearTimeout(connectTimer);
    rejectReady(error);
    for (const entry of pending.values()) {
      clearTimeout(entry.timer);
      entry.reject(error);
    }
    pending.clear();
    socket.removeEventListener("open", onOpen);
    socket.removeEventListener("message", onMessage);
    socket.removeEventListener("close", onClose);
    socket.removeEventListener("error", onError);
    socket.close();
  }
  mailbox.addCleanup(cleanupSocket);
  await authenticated;
  mailbox.assertNotFailed();

  async function command(type, id, response) {
    mailbox.assertOpen();
    const frame = type === "actionResponse"
      ? encodeGameFrame({ type, id, response })
      : JSON.stringify({ type });
    const key = type === "giveUp" ? type : `${type}:${id}`;
    if (pending.has(key)) throw new Error(`Command already pending: ${key}`);
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        mailbox.fail(new Error(`WebSocket ${key} acknowledgement timed out (${timeoutMs}ms)`));
      }, timeoutMs);
      pending.set(key, { resolve, reject, timer });
      try {
        socket.send(frame);
      } catch (error) {
        mailbox.fail(error);
      }
    });
  }

  return {
    ready: readyMetadata,
    next: mailbox.next,
    close: mailbox.close,
    async sendResponse(id, response) {
      await command("actionResponse", id, response);
    },
    async giveUp() {
      await command("giveUp");
    },
  };
}

/**
 * Both adapters return game envelopes in wire order. SSE protobuf remains
 * base64 text; WebSocket protobuf uses Uint8Array payloads in binary frames.
 * WebSocket sends auth as the first frame, waits for ready, and requires a
 * matching ack for every command. No reconnection hides transport failures.
 * A next() timeout only cancels that wait; close/failure rejects all waits.
 * Clean EOF/normal WS close drains received envelopes before next() rejects;
 * explicit close and protocol errors discard the queue immediately.
 */
export async function connectTransport({
  kind,
  baseUrl,
  roomId,
  playerId,
  token,
  timeoutMs = 10_000,
  maxBufferedEvents = 512,
  WebSocketImpl = globalThis.WebSocket,
}) {
  positiveInteger(timeoutMs, "timeoutMs");
  positiveInteger(maxBufferedEvents, "maxBufferedEvents");
  if (typeof token !== "string" || !token) throw new Error("A player token is required");
  for (const [name, value] of Object.entries({ roomId, playerId })) {
    if ((typeof value !== "string" && typeof value !== "number") || String(value).length === 0) {
      throw new Error(`${name} is required`);
    }
  }
  const url = new URL(baseUrl);
  if (!["http:", "https:"].includes(url.protocol) || url.search || url.hash || url.username || url.password) {
    throw new Error("baseUrl must be an HTTP(S) API prefix without query, fragment, or credentials");
  }
  const prefix = `${url.toString().replace(/\/$/, "")}/rooms/${encodeURIComponent(roomId)}/players/${encodeURIComponent(playerId)}`;
  const mailbox = createMailbox(timeoutMs, maxBufferedEvents);
  const options = { prefix, token, timeoutMs, mailbox, WebSocketImpl };
  if (kind === "sse") return connectSse(options);
  if (kind === "ws") return connectWebSocket(options);
  throw new Error(`Unsupported transport kind: ${kind}`);
}
