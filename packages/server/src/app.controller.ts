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
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { Elysia } from "elysia";
import { CORE_VERSION, CURRENT_VERSION, VERSIONS } from "@gi-tcg/core";
import { teapot, unavailable } from "./errors";
import { redis } from "./redis";
const execute = promisify(execFile);
let revision: Promise<Record<string, unknown>> | undefined;
async function getRevision() {
  try {
    const { stdout } = await execute(
      "git",
      ["log", "-1", "--format=%H%x00%an%x00%ae%x00%aI%x00%D%x00%s%x00%b"],
      { windowsHide: true },
    );
    const [hash, author_name, author_email, date, refs, message, body] = stdout
      .trimEnd()
      .split("\0");
    return { hash, author_name, author_email, date, refs, message, body };
  } catch {
    return {
      hash:
        process.env.RAILWAY_GIT_COMMIT_SHA ||
        process.env.GIT_COMMIT ||
        "unknown",
      author_name: process.env.RAILWAY_GIT_AUTHOR || "unknown",
      author_email: process.env.RAILWAY_SERVICE_NAME
        ? process.env.RAILWAY_SERVICE_NAME +
          "@" +
          process.env.RAILWAY_PUBLIC_DOMAIN
        : "unknown@.local",
      date: new Date().toISOString(),
      refs: process.env.RAILWAY_GIT_BRANCH || "",
      message: process.env.RAILWAY_GIT_COMMIT_MESSAGE || "",
      body: "",
    };
  }
}
export function createAppRoutes() {
  return new Elysia()
    .get("/version", async () => ({
      revision: await (revision ??= getRevision()),
      supportedGameVersions: VERSIONS,
      currentGameVersion: CURRENT_VERSION,
      coreVersion: CORE_VERSION,
    }))
    .get("/data_code_analyzer_result", async ({ set }) => {
      set.headers["access-control-allow-origin"] = "*";
      return (await import("@gi-tcg/data-code-analyzer")).analyzeResult;
    })
    .get("/teapot", () => {
      throw teapot("I'm a teapot~");
    })
    .get("/hello", () => "Hello World!")
    .get("/healthz", async ({ request }) => {
      if (redis && request.headers.get("host") === process.env.HEALTHZ_HOST) {
        const activeRoomsCount = await redis.hlen("meta:active_rooms");
        if (activeRoomsCount) {
          await redis.set("meta:deploying", Date.now());
          await redis.expire("meta:deploying", 3600);
          throw unavailable(
            "There are still " + activeRoomsCount + " active rooms.",
          );
        }
        await redis.del("meta:deploying");
      }
      return "";
    });
}
