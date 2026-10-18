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

import { Hono } from "hono";
import { type } from "arktype";
import { sValidator } from "@hono/standard-validator";
import { authService } from "../services";

const GitHubCallbackDto = type({ code: "string > 0" });

export const AuthController = new Hono().get(
  "/github/callback",
  sValidator("query", GitHubCallbackDto),
  async (c) => {
    const { code } = c.req.valid("query");
    const { accessToken } = await authService.login(code);
    return c.html(
      `<!DOCTYPE html>
<title>Login Success</title>
<p>Redirecting back...</p>
<script>
  window.addEventListener("error", (event) => {
    document.body.innerHTML += \`\${event.type}: \${event.message}\\n\`;
  });
  window.opener.postMessage({ type: "login", token: "${accessToken}" }, "*");
  window.close();
</script>`,
    );
  },
);
