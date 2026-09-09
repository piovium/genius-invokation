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

import { readFile, stat } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { Readable } from "node:stream";
import { lookup } from "mrmime";
import { resolve, sep } from "node:path";
import { createHash } from "node:crypto";
import { IS_BETA, WEB_CLIENT_BASE_PATH } from "@gi-tcg/config";

const PLACEHOLDERS = {
  head: "<!-- server:head -->",
  body: "<!-- server:body -->",
} as const;
export function injectHtml(
  html: string,
  injections: Partial<Record<keyof typeof PLACEHOLDERS, string>>,
) {
  return (Object.keys(PLACEHOLDERS) as (keyof typeof PLACEHOLDERS)[]).reduce(
    (result, position) =>
      result.replace(PLACEHOLDERS[position], injections[position] ?? ""),
    html,
  );
}
function matchesEtag(header: string | null, etag: string) {
  return (
    header
      ?.split(",")
      .some(
        (item) =>
          item.trim() === "*" ||
          item.trim().replace(/^W\//, "") === etag.replace(/^W\//, ""),
      ) ?? false
  );
}
export function createFrontendHandler({
  directory = process.env.FRONTEND_DIRECTORY ??
    resolve(import.meta.dirname, "frontend"),
  basePath = WEB_CLIENT_BASE_PATH,
  beta = IS_BETA,
} = {}) {
  const root = resolve(directory);
  const base =
    "/" +
    basePath.split("/").filter(Boolean).join("/") +
    (basePath === "/" ? "" : "/");
  const rootPath = base === "/" ? "/" : base.slice(0, -1);
  let index: Promise<{ body: string; etag: string }> | undefined;
  return async (request: Request): Promise<Response> => {
    if (request.method !== "GET" && request.method !== "HEAD")
      return new Response(null, { status: 405 });
    const pathname = new URL(request.url).pathname;
    if (
      (pathname !== rootPath && !pathname.startsWith(base)) ||
      pathname === base + "api" ||
      pathname.startsWith(base + "api/")
    )
      return new Response(null, { status: 404 });
    let name: string;
    try {
      name = decodeURIComponent(pathname.slice(base.length));
    } catch {
      return new Response(null, { status: 400 });
    }
    if (
      name.includes("\\") ||
      name.includes("\0") ||
      name.split("/").some((part) => part === ".." || part === ".")
    )
      return new Response(null, { status: 404 });
    const path = resolve(root, name);
    if (path !== root && !path.startsWith(root + sep))
      return new Response(null, { status: 404 });
    const info =
      name && name !== "index.html" ? await stat(path).catch(() => null) : null;
    if (info?.isFile()) {
      const etag =
        'W/"' + info.size.toString(16) + "-" + info.mtimeMs.toString(16) + '"';
      const headers = {
        "content-type": lookup(path) || "application/octet-stream",
        etag,
        "cache-control":
          name === "sw.js"
            ? "public, no-cache, must-revalidate"
            : "public, max-age=31536000, immutable",
      };
      if (matchesEtag(request.headers.get("if-none-match"), etag))
        return new Response(null, { status: 304, headers });
      return new Response(
        request.method === "HEAD"
          ? null
          : (Readable.toWeb(createReadStream(path)) as unknown as BodyInit),
        { headers },
      );
    }
    // Only the small HTML entry is read into memory for the existing beta tag
    // injection. Large JS/CSS/image assets remain file responses.
    index ??= readFile(resolve(root, "index.html"), "utf8")
      .then((html) => {
        const body = injectHtml(html, {
          head: beta ? '<meta name="robots" content="noindex">' : "",
        });
        return {
          body,
          etag:
            '"' + createHash("sha256").update(body).digest("base64url") + '"',
        };
      })
      .catch((error) => {
        index = undefined;
        throw error;
      });
    try {
      const entry = await index;
      const headers = {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "public, no-cache, must-revalidate",
        etag: entry.etag,
      };
      return matchesEtag(request.headers.get("if-none-match"), entry.etag)
        ? new Response(null, { status: 304, headers })
        : new Response(request.method === "HEAD" ? null : entry.body, {
            headers,
          });
    } catch {
      return new Response(null, { status: 404 });
    }
  };
}
