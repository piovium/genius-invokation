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

import { Elysia, t } from "elysia";
import type { AuthService } from "./auth.service";
export function createAuthRoutes(auth: AuthService) {
  return new Elysia({ prefix: "/auth" }).get(
    "/github/callback",
    async ({ query, set }) => {
      const { accessToken } = await auth.login(query.code);
      set.headers["content-type"] = "text/html; charset=utf-8";
      set.headers["cache-control"] = "no-store";
      return (
        '<!DOCTYPE html><title>Login Success</title><p>Redirecting back...</p><script>window.addEventListener("error", event => { document.body.append(document.createTextNode(event.type + ": " + event.message)); });window.opener.postMessage({type:"login",token:' +
        JSON.stringify(accessToken) +
        '},"*");window.close();</script>'
      );
    },
    { query: t.Object({ code: t.String({ minLength: 1 }) }) },
  );
}
