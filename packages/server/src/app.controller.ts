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

import {
  Controller,
  Get,
  Headers,
  ImATeapotException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { Public } from "./auth/auth.guard";
import { CORE_VERSION, CURRENT_VERSION, VERSIONS } from "@gi-tcg/core";
import simpleGit, { type LogResult } from "simple-git";
import { redis } from "./redis";

const git = simpleGit();

const fallbackGitLog = (): LogResult => {
  const latestLog: LogResult["latest"] = {
    message: "",
    hash: "unknown",
    author_email: "unknown@.local",
    author_name: "unknown",
    body: "",
    date: new Date().toISOString(),
    refs: "",
  };
  if (process.env.RAILWAY_SERVICE_NAME) {
    latestLog.message = process.env.RAILWAY_GIT_COMMIT_MESSAGE || "";
    latestLog.hash = process.env.RAILWAY_GIT_COMMIT_SHA || "unknown";
    latestLog.author_email = `${process.env.RAILWAY_SERVICE_NAME}@${process.env.RAILWAY_PUBLIC_DOMAIN}`;
    latestLog.author_name = process.env.RAILWAY_GIT_AUTHOR || "unknown";
    latestLog.refs = `HEAD -> ${process.env.RAILWAY_GIT_BRANCH}, origin/${process.env.RAILWAY_GIT_BRANCH}`;
  }
  return {
    latest: latestLog,
    all: [latestLog],
    total: 1,
  };
};

@Controller()
export class AppController {
  constructor() {}

  @Public()
  @Get("/version")
  async getVersion() {
    const { latest } = await git.log({ maxCount: 1 }).catch(fallbackGitLog);
    return {
      revision: latest,
      supportedGameVersions: VERSIONS,
      currentGameVersion: CURRENT_VERSION,
      coreVersion: CORE_VERSION,
    };
  }

  @Public()
  @Get("/teapot")
  imATeapot() {
    throw new ImATeapotException("I'm a teapot~");
  }

  @Public()
  @Get("/hello")
  getHello(): string {
    return "Hello World!";
  }

  @Public()
  @Get("/healthz")
  async healthz(@Headers("host") host: string) {
    if (process.env.REDIS_URL && host === process.env.HEALTHZ_HOST) {
      const activeRoomsCount = await redis?.hlen("meta:active_rooms");
      if (activeRoomsCount) {
        await redis?.set("meta:deploying", Date.now());
        await redis?.expire("meta:deploying", 1 * 60 * 60);
        throw new ServiceUnavailableException(
          `There are still ${activeRoomsCount} active rooms.`,
        );
      }
      await redis?.del("meta:deploying");
    }
  }
}
