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

import { glob, readFile } from "node:fs/promises";
import path from "node:path";
import mime from "mime";
import type { FastifyInstance, RouteHandlerMethod } from "fastify";
import fastifyEtag from "@fastify/etag";
import { IS_BETA, WEB_CLIENT_BASE_PATH } from "@gi-tcg/config";

const HTML_INJECTION_PLACEHOLDERS = {
  head: "<!-- server:head -->",
  body: "<!-- server:body -->",
} as const;

export function injectHtml(
  html: string,
  injections: Partial<Record<keyof typeof HTML_INJECTION_PLACEHOLDERS, string>>,
) {
  return (
    Object.keys(HTML_INJECTION_PLACEHOLDERS) as Array<
      keyof typeof HTML_INJECTION_PLACEHOLDERS
    >
  ).reduce(
    (result, position) =>
      result.replace(
        HTML_INJECTION_PLACEHOLDERS[position],
        injections[position] ?? "",
      ),
    html,
  );
}

export async function frontend(app: FastifyInstance) {
  await app.register(fastifyEtag);

  if (process.env.NODE_ENV === "production") {
    const publicDir = path.resolve(import.meta.dirname, "../public");
    const indexHtml = await readFile(
      path.join(publicDir, "index.html"),
      "utf8",
    ).catch((cause) => {
      throw new Error(
        `Cannot read frontend index.html in ${publicDir}; build server and its dependencies before starting production.`,
        { cause },
      );
    });

    for await (const entry of glob("**/*", {
      cwd: publicDir,
      withFileTypes: true,
    })) {
      if (!entry.isFile()) {
        continue;
      }
      const filepath = path.join(entry.parentPath, entry.name);
      const name = path.relative(publicDir, filepath).replaceAll(path.sep, "/");
      if (name === "index.html") {
        continue;
      }
      const buffer = await readFile(filepath);
      const type = mime.getType(name) ?? "application/octet-stream";
      app.get(`${WEB_CLIENT_BASE_PATH}${name}`, (_req, reply) => {
        reply
          .header(
            "Cache-Control",
            name === "sw.js"
              ? "public, no-cache, must-revalidate"
              : "public, max-age=31536000, immutable",
          )
          .type(type)
          .send(buffer);
      });
    }

    const indexHtmlContent = injectHtml(indexHtml, {
      head: IS_BETA ? '<meta name="robots" content="noindex">' : "",
    });
    const indexHtmlBuffer = Buffer.from(indexHtmlContent);
    const indexHtmlHandler: RouteHandlerMethod = (_req, reply) => {
      return reply
        .header("Cache-Control", "public, no-cache, must-revalidate")
        .type("text/html")
        .send(indexHtmlBuffer);
    };
    const baseNoSuffix = WEB_CLIENT_BASE_PATH.replace(/(.+)\/$/, "$1");
    app.get(baseNoSuffix, indexHtmlHandler);
    app.get(`${WEB_CLIENT_BASE_PATH}*`, indexHtmlHandler);
  }
}
