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

import mime from "mime";
import type { FastifyInstance, RouteHandlerMethod } from "fastify";
import fastifyEtag from "@fastify/etag";
import { WEB_CLIENT_BASE_PATH } from "@gi-tcg/config";

export async function frontend(app: FastifyInstance) {
  await app.register(fastifyEtag);

  if (process.env.NODE_ENV === "production") {
    const {
      default: { "index.html": indexHtml, ...rest },
    } = await import("@gi-tcg/web-client");

    for (const [name, content] of Object.entries(rest)) {
      const buffer = Buffer.from(content, "base64");
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

    const indexHtmlBuffer = Buffer.from(indexHtml!, "base64");
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
