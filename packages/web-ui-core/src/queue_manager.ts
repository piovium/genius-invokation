// Copyright (C) 2024-2025 Guyutongxue
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
// along with this program.  If not, see <http://www.gnu.org/licenses/>.

type Task<T = unknown> = () => Promise<T>;

interface Entry<M> {
  task: Task;
  meta?: M;
}

interface Waiter<M> {
  matches: (meta: M) => boolean;
  resolve: () => void;
}

/**
 * 串行任务队列，每个任务可附带元数据（如动画所属的行动轮次），
 * 并支持基于元数据的等待查询。
 */
export class QueueManager<M> {
  private queue: Entry<M>[] = [];
  private currentMeta: M | undefined = void 0;
  private isProcessing: boolean = false;
  private waiters: Waiter<M>[] = [];

  push<T>(task: Task<T>, meta?: M): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const taskWithPromise = async () => {
        try {
          const ret = await task();
          resolve(ret);
        } catch (error) {
          reject(error);
        }
      };

      this.queue.push({ task: taskWithPromise, meta });
      if (!this.isProcessing) {
        this.processQueue();
      }
    });
  }

  /** 当前正在执行及队列中等待的任务所附带的元数据 */
  pending(): M[] {
    const metas = this.queue.flatMap((entry) =>
      entry.meta === void 0 ? [] : [entry.meta],
    );
    return this.currentMeta === void 0 ? metas : [this.currentMeta, ...metas];
  }

  /** 等待直到没有匹配 predicate 的任务（包括正在执行的任务） */
  waitUntilNoMatch(matches: (meta: M) => boolean): Promise<void> {
    if (!this.pending().some(matches)) {
      return Promise.resolve();
    }
    return new Promise<void>((resolve) => {
      this.waiters.push({ matches, resolve });
    });
  }

  /** 等待当前已入队的所有任务完成，但不阻塞后续入队 */
  drain(): Promise<void> {
    return this.push(async () => {});
  }

  private async processQueue(): Promise<void> {
    this.isProcessing = true;
    while (this.queue.length > 0) {
      const entry = this.queue.shift()!;
      this.currentMeta = entry.meta;
      await entry.task();
      this.currentMeta = void 0;
      this.checkWaiters();
    }
    this.isProcessing = false;
    this.checkWaiters();
  }

  private checkWaiters(): void {
    const pending = this.pending();
    this.waiters = this.waiters.filter(({ matches, resolve }) => {
      if (pending.some(matches)) {
        return true;
      }
      resolve();
      return false;
    });
  }
}
