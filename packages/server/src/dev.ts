import { $ } from "execa";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { config } from "dotenv";

config({ path: path.resolve(import.meta.dirname, "../.env") });
if (process.env.NODE_ENV === "production")
  throw new Error("Dev server should not be started in production mode");
process.env.NODE_USE_ENV_PROXY = "1";
if (!process.env.DATABASE_URL) {
  process.env.PGLITE_DATA_DIR ??= path.resolve(
    import.meta.dirname,
    "../.pglite",
  );
}
// Initialize/migrate before launching the watcher so only one process owns PGlite.
await $({ stdio: "inherit" })`pnpm db:migrate`;
// ts-node/SWC preserves Nest's emitDecoratorMetadata, unlike tsx.
const preload = pathToFileURL(
  path.resolve(import.meta.dirname, "../scripts/ts_preload.js"),
).href;
const inspect = process.argv.includes("--inspect")
  ? ["--inspect=127.0.0.1:9229"]
  : [];
const child = await $({
  stdio: "inherit",
  reject: false,
})`node --experimental-vm-modules --enable-source-maps --import ${preload} ${inspect} --watch ${path.resolve(import.meta.dirname, "main.ts")}`;
process.exitCode = child.exitCode ?? 1;
