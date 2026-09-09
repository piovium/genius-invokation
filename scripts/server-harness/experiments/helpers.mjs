import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { encodeGameFrame, decodeGameFrame } from "../wire.mjs";

export function nodeAvailability() {
  return { available: Number(process.versions.node.split('.')[0]) >= 24,
    command: process.execPath, version: process.versions.node, reason: 'Node 24+ is required' };
}

export async function startExperimentServer() {
  const runtime = nodeAvailability();
  if (!runtime.available) throw new Error(`Real WebSocket experiments require Node: ${runtime.reason}. Use Node 24+ and install the isolated experiment dependency.`);
  const child = spawn(runtime.command, [fileURLToPath(new URL("./server.mjs", import.meta.url)), "--selftest"], { stdio: ["ignore", "pipe", "pipe"], windowsHide: true });
  let stderr = "";
  child.stderr.setEncoding("utf8");
  child.stderr.on("data", (chunk) => { stderr = (stderr + chunk).slice(-8192); });
  const exited = new Promise((resolve) => {
    child.once("exit", (code, signal) => resolve({ code, signal }));
    child.once("close", (code, signal) => resolve({ code, signal }));
    child.once("error", (error) => resolve({ error: error.message }));
  });
  let stopped = false;
  const stop = async () => {
    if (stopped) return;
    stopped = true;
    if (child.exitCode === null && child.signalCode === null) child.kill();
    const forced = setTimeout(() => child.kill("SIGKILL"), 2000);
    let deadline;
    try {
      await Promise.race([
        exited,
        new Promise((_, reject) => { deadline = setTimeout(() => reject(new Error("Node fixture failed to stop within 5 seconds")), 5000); }),
      ]);
    } finally { clearTimeout(forced); clearTimeout(deadline); }
  };
  let ready;
  try {
    ready = await new Promise((resolve, reject) => {
      let stdout = "";
      const timer = setTimeout(() => finish(new Error(`Node fixture startup timed out: ${stderr}`)), 10000);
      const onExit = (code) => finish(new Error(`Node fixture exited (${code}): ${stderr}`));
      const onError = (error) => finish(error);
      const finish = (error, value) => {
        clearTimeout(timer);
        child.off("exit", onExit);
        child.off("error", onError);
        child.stdout.off("data", onData);
        error ? reject(error) : resolve(value);
      };
      const onData = (chunk) => {
        stdout += chunk.toString("utf8");
        if (stdout.length > 4096) return finish(new Error("Unexpected fixture startup output"));
        if (!stdout.includes("\n")) return;
        try {
          const value = JSON.parse(stdout.split("\n")[0]);
          if (value.type !== "harness-ready" || !Number.isInteger(value.port) || value.port < 1 || value.port > 65535) throw new Error("Invalid fixture ready record");
          finish(null, value);
        } catch (error) { finish(error); }
      };
      child.once("exit", onExit);
      child.once("error", onError);
      child.stdout.on("data", onData);
    });
  } catch (error) { await stop(); throw error; }
  const origin = `http://127.0.0.1:${ready.port}`;
  const request = async (path, options) => {
    const response = await fetch(`${origin}${path}`, { ...options, signal: AbortSignal.timeout(3000) });
    if (!response.ok) throw new Error(`Fixture HTTP ${response.status}: ${await response.text()}`);
    return response.json();
  };
  return {
    origin, baseUrl: `${origin}/api`, runtime: { name: "Node", version: runtime.version, pid: child.pid }, stop,
    createRoom: (options = {}) => request("/__harness/rooms", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(options) }),
    stats: (roomId) => request(`/__harness/rooms/${encodeURIComponent(roomId)}/stats`),
  };
}

export function socketUrl(server, room, player = room.players[0]) {
  return `${server.baseUrl.replace(/^http/, "ws")}/rooms/${encodeURIComponent(room.roomId)}/players/${encodeURIComponent(player.playerId)}/ws`;
}

// A journal retains messages received before a close, including the ACK/close race.
export async function connectSocket(url, { timeoutMs = 3000 } = {}) {
  const socket = new WebSocket(url);
  socket.binaryType = "arraybuffer";
  const messages = [];
  const pending = new Set();
  let closed = null;
  let failure = null;
  let resolveClosed;
  const closure = new Promise((resolve) => { resolveClosed = resolve; });
  function drain() {
    for (const waiter of pending) {
      const index = messages.findIndex((entry) => !entry.consumed && waiter.predicate(entry.value, entry));
      if (index !== -1) {
        const entry = messages[index]; entry.consumed = true;
        pending.delete(waiter); clearTimeout(waiter.timer); waiter.resolve(entry.value);
      } else if (failure || closed) {
        pending.delete(waiter); clearTimeout(waiter.timer);
        waiter.reject(failure || new Error(`Socket closed ${closed.code}: ${closed.reason}`));
      }
    }
  }
  socket.addEventListener("message", (event) => {
    try {
      const binary = typeof event.data !== "string";
      messages.push({ value: binary ? decodeGameFrame(new Uint8Array(event.data)) : JSON.parse(event.data), binary, consumed: false });
    } catch (error) { failure = error; }
    drain();
  });
  socket.addEventListener("close", (event) => { closed = { code: event.code, reason: event.reason, wasClean: event.wasClean }; resolveClosed(closed); drain(); });
  socket.addEventListener("error", () => { failure = new Error("WebSocket transport failed"); drain(); });
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => { socket.close(); reject(new Error("WebSocket connect timed out")); }, timeoutMs);
    socket.addEventListener("open", () => { clearTimeout(timer); resolve(); }, { once: true });
    socket.addEventListener("error", () => { clearTimeout(timer); reject(new Error("WebSocket connect failed")); }, { once: true });
  });
  return {
    socket, messages,
    send: (value) => socket.send(JSON.stringify(value)),
    sendResponse: (id, response = Uint8Array.of(0x12, 0)) => socket.send(encodeGameFrame({ type: "actionResponse", id, response })),
    next(predicate = () => true, waitMs = timeoutMs) {
      return new Promise((resolve, reject) => {
        const waiter = { predicate, resolve, reject, timer: null };
        waiter.timer = setTimeout(() => { pending.delete(waiter); reject(new Error("Expected WebSocket message timed out")); }, waitMs);
        pending.add(waiter); drain();
      });
    },
    waitClosed(waitMs = timeoutMs) {
      if (closed) return Promise.resolve(closed);
      let timer;
      return Promise.race([closure, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error("Expected WebSocket close timed out")), waitMs); })]).finally(() => clearTimeout(timer));
    },
    async close() { if (socket.readyState < 2) socket.close(1000, "SELFTEST_DONE"); return this.waitClosed(); },
  };
}

export async function authenticate(server, room, player = room.players[0]) {
  const client = await connectSocket(socketUrl(server, room, player));
  try {
    client.send({ type: "auth", token: player.token });
    const ready = await client.next((value) => value.type === "ready");
    const initialized = await client.next((value) => value.type === "initialized");
    const rpc = await client.next((value) => value.type === "rpc");
    return { ...client, ready, initialized, rpc };
  } catch (error) { await client.close().catch(() => {}); throw error; }
}
