import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    watch: false,
    env: {
      NODE_OPTIONS: "--expose-gc",
    },
  },
});
