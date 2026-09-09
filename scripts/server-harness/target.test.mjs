import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:http";
import test from "node:test";
import {
  hasLsofPid,
  hasWindowsListener,
  parseLinuxListeningInodes,
  verifyTarget,
} from "./target.mjs";

test("Windows parsing requires the local port, exact PID, and LISTENING state", () => {
  const output = [
    "  Proto  Local Address          Foreign Address        State           PID",
    "  TCP    0.0.0.0:32123          0.0.0.0:0              LISTENING       1234",
    "  TCP    [::1]:32124            [::]:0                 LISTENING       5678",
    "  TCP    127.0.0.1:32125        127.0.0.1:32126        ESTABLISHED     1234",
    "  UDP    0.0.0.0:32127          *:*                    LISTENING       1234",
  ].join("\r\n");
  assert.equal(hasWindowsListener(output, 1234, 32123), true);
  assert.equal(hasWindowsListener(output, 5678, 32124), true);
  assert.equal(hasWindowsListener(output, 123, 32123), false);
  assert.equal(hasWindowsListener(output, 1234, 32124), false);
  assert.equal(hasWindowsListener(output, 1234, 32125), false);
  assert.equal(hasWindowsListener(output, 1234, 32126), false);
  assert.equal(hasWindowsListener(output, 1234, 32127), false);
  assert.equal(hasWindowsListener("", 1234, 32123), false);
});

test("Linux socket tables accept only listener inodes for the local hex port", () => {
  const output = [
    "  sl  local_address rem_address st tx_queue rx_queue tr tm->when retrnsmt uid timeout inode",
    "  0: 0100007F:7D7B 00000000:0000 0A 00000000:00000000 00:00000000 00000000 1000 0 123456 1",
    "  1: 00000000000000000000000001000000:7D7B 00000000000000000000000000000000:0000 0A 00000000:00000000 00:00000000 00000000 1000 0 223456 1",
    "  2: 0100007F:7D7B 0100007F:1122 01 00000000:00000000 00:00000000 00000000 1000 0 323456 1",
    "  3: 0100007F:1122 0100007F:7D7B 0A 00000000:00000000 00:00000000 00000000 1000 0 423456 1",
  ].join("\n");
  assert.deepEqual([...parseLinuxListeningInodes(output, 32123)], ["123456", "223456"]);
  assert.equal(parseLinuxListeningInodes(output, 32124).size, 0);
  assert.equal(parseLinuxListeningInodes("", 32123).size, 0);
});

test("lsof output must contain the exact process record", () => {
  assert.equal(hasLsofPid("p1234\nf11\n", 1234), true);
  assert.equal(hasLsofPid("p1234\n", 123), false);
  assert.equal(hasLsofPid("f1234\n", 1234), false);
  assert.equal(hasLsofPid("", 1234), false);
});

test("rejects unsafe PIDs and remote or non-HTTP base URLs before OS inspection", async () => {
  for (const pid of [0, -1, 1.5, "1; exit", Number.MAX_SAFE_INTEGER + 1]) {
    await assert.rejects(verifyTarget(pid, "http://localhost:32123"), /positive safe integer/);
  }
  for (const url of ["https://example.com", "http://192.168.1.1", "http://localhost.example.com", "file:///tmp/server"]) {
    await assert.rejects(verifyTarget(process.pid, url), /loopback|localhost|HTTP/);
  }
});

test("verifies a real HTTP listener and rejects an existing unrelated PID or wrong port", async (t) => {
  const server = createServer((request, response) => response.end("ok"));
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())));
  const port = server.address().port;

  const child = spawn(process.execPath, ["-e", [
    "const http = require('node:http');",
    "const server = http.createServer((req, res) => res.end('child'));",
    "server.listen(0, '127.0.0.1', () => process.send(server.address().port));",
  ].join("\n")], { stdio: ["ignore", "ignore", "ignore", "ipc"], windowsHide: true });
  t.after(async () => {
    if (child.exitCode === null && child.signalCode === null) {
      const exited = once(child, "exit");
      child.kill();
      await exited;
    }
  });
  const [childPort] = await once(child, "message");

  const result = await verifyTarget(process.pid, `http://127.0.0.1:${port}`);
  assert.equal(result.pid, process.pid);
  assert.equal(result.port, port);
  assert.ok(result.source);
  await assert.rejects(verifyTarget(child.pid, `http://127.0.0.1:${port}`), /Cannot verify target/);
  await assert.rejects(verifyTarget(process.pid, `http://127.0.0.1:${childPort}`), /Cannot verify target/);
});

test("verifies a real IPv6 loopback listener when IPv6 is available", async (t) => {
  const server = createServer((request, response) => response.end("ok"));
  server.listen(0, "::1");
  try {
    await once(server, "listening");
  } catch (error) {
    if (error.code === "EAFNOSUPPORT" || error.code === "EADDRNOTAVAIL") {
      t.skip("IPv6 loopback is unavailable on this host");
      return;
    }
    throw error;
  }
  t.after(() => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())));
  const port = server.address().port;
  const result = await verifyTarget(process.pid, `http://[::1]:${port}`);
  assert.equal(result.pid, process.pid);
  assert.equal(result.port, port);
});
