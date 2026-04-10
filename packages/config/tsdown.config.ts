// Copyright (C) 2025 Guyutongxue
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

import { defineConfig } from "tsdown";

// We must ensure the built JS file doesn't contains `import.meta.env.*`
// tsup only replace them when `env` config explicitly provided their value.

const requiredEnvVars = ["WEB_CLIENT_BASE_PATH", "SERVER_HOST"];

const env: Record<string, string> = {};
for (const [key, value] of Object.entries(process.env)) {
  if (/^[A-Z_]+$/.test(key) && value) {
    env[key] = value;
  }
}
for (const key of requiredEnvVars) {
  env[key] ??= "";
}

export default defineConfig({
  platform: "neutral",
  entry: ["./src/index.ts"],
  sourcemap: true,
  dts: !process.env.NO_TYPING,
  minify: true,
  env,
  target: false,
});
