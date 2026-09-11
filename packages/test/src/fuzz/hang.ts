// Copyright (C) 2026 Piovium Labs
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as
// published by the Free Software Foundation, either version 3 of the
// License, or (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Affero General Public License for more details.
//
// You should have received a copy of the GNU Affero General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

import { writeFileSync } from "node:fs";
import inspector from "node:inspector";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  isMainThread,
  parentPort,
  Worker,
  workerData,
} from "node:worker_threads";

/**
 * 同步死循环的诊断：主线程一旦陷入不让出事件循环的循环，`setTimeout` 与
 * `game.terminate()` 都无法触发。这里在同一进程内起一个 watchdog 工作线程，
 * 主线程每开始一个用例、每次 rpc 都上报一次；超过阈值没有新进度时，工作线程通过
 * `inspector.Session.connectToMainThread()` 暂停主线程、抓取其调用栈写入
 * `hang-<index>.json`，然后结束整个进程（父进程据此记为 `hang` 并重启分片）。
 */

export interface HangCapture {
  readonly index: number;
  readonly stuckForMs: number;
  readonly frames: readonly string[];
  readonly capturedAt: string;
}

export interface HangWatchdog {
  /** 主线程开始处理某个用例 */
  progress(index: number): void;
  /** 当前用例仍在推进（每次 rpc 调一次），只刷新时间戳 */
  beat(): void;
  /** 主线程空闲（campaign 结束等），停止计时 */
  idle(): void;
  stop(): Promise<void>;
}

interface WorkerData {
  readonly thresholdMs: number;
  readonly outDir: string;
}

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
/** 栈帧里只留仓库相对路径（不引入 report.ts，避免工作线程加载整个 core） */
function stripRepoRoot(text: string): string {
  return text.split(`file://${REPO_ROOT}/`).join("").split(`${REPO_ROOT}/`).join("");
}

export function hangFilePath(outDir: string, index: number): string {
  return path.join(outDir, `hang-${index}.json`);
}

export function startHangWatchdog(opts: WorkerData): HangWatchdog {
  const worker = new Worker(fileURLToPath(import.meta.url), {
    workerData: opts,
    // 继承 gnx 的加载器参数，工作线程才能加载本 .ts 文件
    execArgv: process.execArgv,
  });
  worker.unref();
  return {
    progress(index) {
      worker.postMessage({ index, at: Date.now() });
    },
    beat() {
      worker.postMessage({ beat: true, at: Date.now() });
    },
    idle() {
      worker.postMessage({ index: null, at: Date.now() });
    },
    async stop() {
      await worker.terminate();
    },
  };
}

function captureMainThread(index: number, stuckForMs: number, outDir: string) {
  const session = new inspector.Session();
  session.connectToMainThread();
  const finish = (frames: string[]) => {
    const capture: HangCapture = {
      index,
      stuckForMs,
      frames,
      capturedAt: new Date().toISOString(),
    };
    try {
      writeFileSync(hangFilePath(outDir, index), JSON.stringify(capture, null, 2));
    } catch {
      // 写不出去也要结束进程
    }
    process.kill(process.pid, "SIGKILL");
  };
  const fallback = setTimeout(
    () => finish(["<Debugger.pause did not return within 10s>"]),
    10_000,
  );
  // tsx/unloader 加载的模块在 callFrame.url 上常为空，用 scriptParsed 事件补全
  const scriptUrls = new Map<string, string>();
  session.on("Debugger.scriptParsed", (msg) => {
    const { scriptId, url } = msg.params as { scriptId: string; url: string };
    if (url) {
      scriptUrls.set(scriptId, url);
    }
  });
  session.on("Debugger.paused", (msg) => {
    clearTimeout(fallback);
    const frames = (
      msg.params.callFrames as {
        functionName: string;
        url: string;
        location: { scriptId: string; lineNumber: number; columnNumber: number };
      }[]
    ).map((f) => {
      const url = f.url || scriptUrls.get(f.location.scriptId) || `script#${f.location.scriptId}`;
      return stripRepoRoot(
        `${f.functionName || "<anonymous>"} (${url}:${f.location.lineNumber + 1}:${
          f.location.columnNumber + 1
        })`,
      );
    });
    finish(frames);
  });
  session.post("Debugger.enable", () => {
    session.post("Debugger.pause");
  });
}

if (!isMainThread && parentPort) {
  const { thresholdMs, outDir } = workerData as WorkerData;
  let current: { index: number | null; at: number } = { index: null, at: Date.now() };
  let capturing = false;
  parentPort.on("message", (m: { index?: number | null; beat?: boolean; at: number }) => {
    if (m.beat) {
      current = { index: current.index, at: m.at };
    } else {
      current = { index: m.index ?? null, at: m.at };
    }
  });
  setInterval(() => {
    if (capturing || current.index === null) {
      return;
    }
    const stuckForMs = Date.now() - current.at;
    if (stuckForMs > thresholdMs) {
      capturing = true;
      captureMainThread(current.index, stuckForMs, outDir);
    }
  }, 1000).unref();
  // 让线程保持存活
  setInterval(() => {}, 1 << 30);
}
