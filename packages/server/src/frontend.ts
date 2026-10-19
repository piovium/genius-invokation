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
import { Hono, type Handler } from "hono";
import { etag } from "hono/etag";
import { IS_BETA, WEB_CLIENT_BASE_PATH } from "@gi-tcg/config";

const HTML_INJECTION_PLACEHOLDERS = {
  head: "<!-- server:head -->",
  body: "<!-- server:body -->",
} as const;

const PUBLIC_DIR = path.resolve(import.meta.dirname, "../public");

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

export const frontendApp = new Hono().use(etag());

if (process.env.NODE_ENV === "production") {
  const indexHtml = await readFile(
    path.join(PUBLIC_DIR, "index.html"),
    "utf8",
  ).catch((cause) => {
    throw new Error(
      `Cannot read frontend index.html in ${PUBLIC_DIR}; build server and its dependencies before starting production.`,
      { cause },
    );
  });

  for await (const entry of glob("**/*", {
    cwd: PUBLIC_DIR,
    withFileTypes: true,
  })) {
    if (!entry.isFile()) {
      continue;
    }
    const filepath = path.join(entry.parentPath, entry.name);
    const name = path.relative(PUBLIC_DIR, filepath).replaceAll(path.sep, "/");
    if (name === "index.html") {
      continue;
    }
    const buffer = new Uint8Array(await readFile(filepath));
    const type = mime.getType(name) ?? "application/octet-stream";
    frontendApp.get(`${WEB_CLIENT_BASE_PATH}${name}`, (c) => {
      c.header(
        "Cache-Control",
        name === "sw.js"
          ? "public, no-cache, must-revalidate"
          : "public, max-age=31536000, immutable",
      );
      c.header("Content-Type", type);
      return c.body(buffer);
    });
  }

  const indexHtmlContent = injectHtml(indexHtml, {
    head: IS_BETA ? '<meta name="robots" content="noindex">' : "",
  });
  const indexHtmlBuffer = new TextEncoder().encode(indexHtmlContent);
  const indexHtmlHandler: Handler = (c) => {
    c.header("Cache-Control", "public, no-cache, must-revalidate");
    c.header("Content-Type", "text/html");
    return c.body(indexHtmlBuffer);
  };
  const baseNoSuffix = WEB_CLIENT_BASE_PATH.replace(/(.+)\/$/, "$1");
  frontendApp.get(baseNoSuffix, indexHtmlHandler);
  frontendApp.get(`${WEB_CLIENT_BASE_PATH}*`, indexHtmlHandler);
}
