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

type InjectionPosition = keyof typeof PLACEHOLDERS;

const PLACEHOLDER_ENTRIES = Object.entries(PLACEHOLDERS) as [
  InjectionPosition,
  string,
][];

const CACHE_CONTROL_REVALIDATE = "public, no-cache, must-revalidate";
const CACHE_CONTROL_IMMUTABLE = "public, max-age=31536000, immutable";

export function injectHtml(
  html: string,
  injections: Partial<Record<InjectionPosition, string>>,
): string {
  return PLACEHOLDER_ENTRIES.reduce(
    (result, [position, placeholder]) =>
      result.replace(placeholder, injections[position] ?? ""),
    html,
  );
}

/** `*` matches every validator; weak validators compare by their opaque tag. */
function matchesEtag(header: string | null, etag: string): boolean {
  if (!header) return false;
  const target = etag.replace(/^W\//, "");
  return header.split(",").some((candidate) => {
    const value = candidate.trim();
    return value === "*" || value.replace(/^W\//, "") === target;
  });
}

type IndexEntry = { body: string; etag: string };

export interface FrontendHandlerOptions {
  /** Directory holding the built web client. */
  directory?: string;
  /** Public prefix the client is served under. */
  basePath?: string;
  /** Inject the `noindex` robots tag that keeps beta builds out of search. */
  beta?: boolean;
}

export function createFrontendHandler({
  directory = process.env.FRONTEND_DIRECTORY ??
    resolve(import.meta.dirname, "frontend"),
  basePath = WEB_CLIENT_BASE_PATH,
  beta = IS_BETA,
}: FrontendHandlerOptions = {}): (request: Request) => Promise<Response> {
  const root = resolve(directory);
  const segments = basePath.split("/").filter(Boolean);
  const base = `/${segments.join("/")}${segments.length ? "/" : ""}`;
  const rootPath = base.slice(0, -1) || "/";
  let index: Promise<IndexEntry> | undefined;
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
          name === "sw.js" ? CACHE_CONTROL_REVALIDATE : CACHE_CONTROL_IMMUTABLE,
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
    // Only the HTML entry is read into memory, because beta builds inject a
    // robots tag into it. Assets are always streamed from disk.
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
        "cache-control": CACHE_CONTROL_REVALIDATE,
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
