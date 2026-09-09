import assert from "node:assert/strict";
import { setTimeout as delay } from "node:timers/promises";
import test from "node:test";
import {
  MemorySampler,
  parseProcStatus,
  parsePsRss,
  parseWindowsMemory,
  readProcessMemory,
} from "./memory.mjs";

test("Linux status converts KiB and retains the process lifetime peak", () => {
  assert.deepEqual(
    parseProcStatus("Name:\ttarget\nVmHWM:\t1536 kB\nVmRSS:\t1024 kB\n"),
    {
      rssBytes: 1024 * 1024,
      peakRssBytes: 1536 * 1024,
      source: "linux:/proc/status",
    },
  );
  assert.equal(parseProcStatus("VmRSS: 0 kB\n").peakRssBytes, null);
  assert.throws(() => parseProcStatus("Name:\tdead-process\n"), /VmRSS/);
});

test("Windows JSON reports bytes directly and rejects missing metrics", () => {
  assert.deepEqual(
    parseWindowsMemory('\uFEFF{"WorkingSet64":4194304,"PeakWorkingSet64":8388608}\r\n'),
    {
      rssBytes: 4194304,
      peakRssBytes: 8388608,
      source: "windows:Get-Process",
    },
  );
  assert.throws(() => parseWindowsMemory('{"WorkingSet64":10}'), /PeakWorkingSet64/);
  assert.throws(
    () => parseWindowsMemory('{"WorkingSet64":-1,"PeakWorkingSet64":8}'),
    /WorkingSet64/,
  );
});

test("macOS ps converts KiB without inventing a lifetime peak", () => {
  assert.deepEqual(parsePsRss("  2048\n"), {
    rssBytes: 2097152,
    peakRssBytes: null,
    source: "darwin:ps",
  });
  for (const invalid of ["", "-1", "12 13", "NaN"]) {
    assert.throws(() => parsePsRss(invalid), /RSS/);
  }
});

test("reads this process through the actual platform sampler", async () => {
  const memory = await readProcessMemory(process.pid);
  assert.ok(memory.rssBytes > 0);
  assert.ok(Number.isSafeInteger(memory.rssBytes));
  if (process.platform === "darwin") {
    assert.equal(memory.peakRssBytes, null);
  } else {
    assert.ok(memory.peakRssBytes >= memory.rssBytes);
  }
  await assert.rejects(readProcessMemory("1; exit"), /positive safe integer/);
  await assert.rejects(readProcessMemory(-1), /positive safe integer/);
});

test("concurrent requests are serialized and retain their requested phases", async () => {
  let active = 0;
  let maxActive = 0;
  let releaseFirst;
  let startedFirst;
  const firstRead = new Promise((resolve) => { startedFirst = resolve; });
  const firstGate = new Promise((resolve) => { releaseFirst = resolve; });
  let reads = 0;
  const sampler = new MemorySampler({
    pid: process.pid,
    readMemory: async () => {
      active++;
      maxActive = Math.max(maxActive, active);
      if (++reads === 1) {
        startedFirst();
        await firstGate;
      }
      active--;
      return { rssBytes: reads * 1024, peakRssBytes: null, source: "test" };
    },
  });
  const idle = sampler.sample("idle");
  await firstRead;
  const game = sampler.sample("game");
  const stopping = sampler.stop();
  releaseFirst();
  await Promise.all([idle, game, stopping]);
  assert.equal(maxActive, 1);
  assert.deepEqual(sampler.samples.map((sample) => sample.phase), ["idle", "game"]);
  assert.ok(sampler.samples.every((sample) => sample.timestamp >= sample.sampleStartedAt));
});

test("background failures remain visible and stop rejects", async () => {
  const failure = new Error("target exited");
  let reads = 0;
  const sampler = new MemorySampler({
    pid: process.pid,
    intervalMs: 1,
    readMemory: async () => {
      if (++reads === 2) {
        throw failure;
      }
      return { rssBytes: 1024, peakRssBytes: 1024, source: "test" };
    },
  });
  await sampler.start();
  // Keep the process alive while its unreferenced sampling timer runs.
  const deadline = Date.now() + 1000;
  while (!sampler.error && Date.now() < deadline) {
    await delay(5);
  }
  assert.equal(sampler.error, failure);
  await assert.rejects(sampler.stop(), (error) => error === failure);
  await assert.rejects(sampler.sample(), (error) => error === failure);
  assert.equal(reads, 2);
});

test("stop cancels background sampling and drains an in-flight read", async () => {
  let releaseRead;
  const gate = new Promise((resolve) => { releaseRead = resolve; });
  let reads = 0;
  const sampler = new MemorySampler({
    pid: process.pid,
    intervalMs: 1,
    readMemory: async () => {
      reads++;
      await gate;
      return { rssBytes: 1024, peakRssBytes: 1024, source: "test" };
    },
  });
  const starting = sampler.start();
  const stopping = sampler.stop();
  releaseRead();
  await Promise.all([starting, stopping]);
  await delay(10);
  assert.equal(reads, 1);
  assert.equal(sampler.samples.length, 1);
});
