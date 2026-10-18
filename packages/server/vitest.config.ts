import { defineConfig } from "vitest/config";

export default defineConfig({
  publicDir: false,
  test: {
    include: ["src/**/*.test.ts"],
    restoreMocks: true,
  },
});
