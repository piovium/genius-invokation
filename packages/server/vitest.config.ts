import { defineConfig } from "vitest/config";
import gts from "@gi-tcg/unplugin-gts/vite";

export default defineConfig({
  publicDir: false,
  plugins: [gts()],
  ssr: { resolve: { conditions: ["development", "import", "default"] } },
  test: {
    include: ["src/**/*.test.ts"],
    restoreMocks: true,
  },
});
