import { defineConfig } from "tsdown";

export default defineConfig({
  platform: "node",
  entry: {
    "profiles/physical_version": "src/profiles/physical_version.ts",
    "version_maps/physical_version": "src/version_maps/physical_version.ts",
  },
  dts: true,
  sourcemap: true,
});
