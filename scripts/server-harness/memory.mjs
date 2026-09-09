import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

function requireBytes(value, field) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`Invalid ${field} memory value: ${String(value)}`);
  }
  return value;
}

export function parseProcStatus(status) {
  const rss = /^VmRSS:\s+(\d+)\s+kB\s*$/m.exec(status);
  const peak = /^VmHWM:\s+(\d+)\s+kB\s*$/m.exec(status);
  if (!rss) {
    throw new Error("Process status is missing VmRSS");
  }
  return {
    rssBytes: requireBytes(Number(rss[1]) * 1024, "VmRSS"),
    peakRssBytes: peak
      ? requireBytes(Number(peak[1]) * 1024, "VmHWM")
      : null,
    source: "linux:/proc/status",
  };
}

export function parseWindowsMemory(output) {
  const memory = JSON.parse(output.replace(/^\uFEFF/, "").trim());
  return {
    rssBytes: requireBytes(memory.WorkingSet64, "WorkingSet64"),
    peakRssBytes: requireBytes(memory.PeakWorkingSet64, "PeakWorkingSet64"),
    source: "windows:Get-Process",
  };
}

export function parsePsRss(output) {
  const value = output.trim();
  if (!/^\d+$/.test(value)) {
    throw new Error("ps returned an invalid or missing RSS value");
  }
  return {
    rssBytes: requireBytes(Number(value) * 1024, "ps RSS"),
    peakRssBytes: null,
    source: "darwin:ps",
  };
}

/**
 * Read resident memory for one OS process, including its lifetime peak where
 * available. This deliberately measures the target rather than this harness.
 * It does not include child processes; run a server directly, without a wrapper.
 */
export async function readProcessMemory(pid) {
  if (!Number.isSafeInteger(pid) || pid <= 0) {
    throw new TypeError("pid must be a positive safe integer");
  }
  const options = {
    encoding: "utf8",
    windowsHide: true,
    timeout: 10_000,
    maxBuffer: 16 * 1024,
  };
  try {
    switch (process.platform) {
      case "linux":
        return parseProcStatus(await readFile(`/proc/${pid}/status`, "utf8"));
      case "win32": {
        // pid is validated as an integer before interpolation. No shell is used.
        const { stdout } = await execFileAsync(
          "powershell.exe",
          [
            "-NoProfile",
            "-NonInteractive",
            "-Command",
            `$ErrorActionPreference = 'Stop'; Get-Process -Id ${pid} -ErrorAction Stop | Select-Object WorkingSet64, PeakWorkingSet64 | ConvertTo-Json -Compress`,
          ],
          options,
        );
        return parseWindowsMemory(stdout);
      }
      case "darwin": {
        const { stdout } = await execFileAsync(
          "ps",
          ["-o", "rss=", "-p", String(pid)],
          options,
        );
        return parsePsRss(stdout);
      }
      default:
        throw new Error(`Unsupported memory sampling platform: ${process.platform}`);
    }
  } catch (cause) {
    throw new Error(`Cannot read memory for process ${pid}: ${cause.message}`, {
      cause,
    });
  }
}

/**
 * Serial RSS sampling. Await start() for the first reading and stop() to drain
 * pending readings. Background errors remain visible in error and are thrown
 * by stop() and subsequent sample() calls.
 *
 * Windows starts PowerShell for every reading, so actual resolution can be much
 * slower than intervalMs. peakRssBytes captures the OS lifetime high-water mark,
 * including short peaks between samples; it is NOT a peak for the current phase.
 * macOS has no lifetime high-water mark here, so short peaks may be missed.
 */
export class MemorySampler {
  samples = [];
  #pid;
  #intervalMs;
  #readMemory;
  #phase = "unassigned";
  #running = false;
  #started = false;
  #timer;
  #pending = Promise.resolve();
  #error = null;

  constructor({ pid, intervalMs = 100, readMemory = readProcessMemory }) {
    if (!Number.isSafeInteger(pid) || pid <= 0) {
      throw new TypeError("pid must be a positive safe integer");
    }
    if (!Number.isFinite(intervalMs) || intervalMs < 1) {
      throw new TypeError("intervalMs must be at least 1 millisecond");
    }
    if (typeof readMemory !== "function") {
      throw new TypeError("readMemory must be a function");
    }
    this.#pid = pid;
    this.#intervalMs = intervalMs;
    this.#readMemory = readMemory;
  }

  get error() {
    return this.#error;
  }

  markPhase(phase) {
    if (typeof phase !== "string" || !phase.trim()) {
      throw new TypeError("phase must be a nonempty string");
    }
    this.#phase = phase;
    return this;
  }

  async start() {
    if (this.#started) {
      throw new Error("MemorySampler has already been started");
    }
    this.#started = true;
    this.#running = true;
    const sample = await this.sample();
    this.#schedule();
    return sample;
  }

  async sample(phase) {
    if (phase !== undefined) {
      this.markPhase(phase);
    }
    const samplePhase = this.#phase;
    const pending = this.#pending.then(async () => {
      if (this.#error) {
        throw this.#error;
      }
      try {
        const sampleStartedAt = Date.now();
        const memory = await this.#readMemory(this.#pid);
        const sample = {
          ...memory,
          pid: this.#pid,
          phase: samplePhase,
          sampleStartedAt,
          timestamp: Date.now(),
        };
        this.samples.push(sample);
        return sample;
      } catch (cause) {
        this.#error = cause instanceof Error ? cause : new Error(String(cause));
        this.#running = false;
        clearTimeout(this.#timer);
        throw this.#error;
      }
    });
    // Keep the internal queue handled even when the public sample promise fails.
    this.#pending = pending.then(
      () => undefined,
      () => undefined,
    );
    return pending;
  }

  #schedule() {
    if (!this.#running) {
      return;
    }
    this.#timer = setTimeout(() => {
      this.sample().then(
        () => this.#schedule(),
        () => {
          // sample() retained the failure for callers; never launch more reads.
          this.#running = false;
        },
      );
    }, this.#intervalMs);
    this.#timer.unref();
  }

  async stop() {
    this.#running = false;
    clearTimeout(this.#timer);
    await this.#pending;
    if (this.#error) {
      throw this.#error;
    }
    return this.samples;
  }
}
