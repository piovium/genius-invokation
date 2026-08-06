// Copyright (C) 2026 Piovium Labs
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as
// published by the Free Software Foundation, either version 3 of the
// License, or (at your option) any later version.

import { defineConfig } from "vitest/config";
import solid from "vite-plugin-solid";

export default defineConfig({
  plugins: [solid({ ssr: true, solid: { hydratable: false } })],
  test: {
    environment: "node",
    watch: false,
  },
  ssr: {
    resolve: {
      conditions: ["development", "import", "default"],
    },
  },
});
