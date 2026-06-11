// Copyright (C) 2026 Piovium Labs
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

import { defineConfig } from "vitest/config";
import gts from "@gi-tcg/unplugin-gts/vite";

export default defineConfig({
  test: {
    watch: false,
    setupFiles: [`${import.meta.dirname}/vitest.setup.ts`],
    env: {
      NODE_OPTIONS: "--expose-gc",
    },
  },
  plugins: [
    gts(),
  ],
  ssr: {
    // https://vitest.dev/guide/common-errors.html#custom-package-conditions-are-not-resolved
    resolve: {
      conditions: ["development", "import", "default"],
    },
  },
});
