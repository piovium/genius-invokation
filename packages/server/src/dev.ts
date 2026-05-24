import { startPrismaDevServer } from "@prisma/dev";
import { $ } from "execa";
import getPort from "get-port";
import path from "path";
import { pathToFileURL } from "node:url";
import { config } from "dotenv";

if (process.env.NODE_ENV === "production") {
  throw new Error("Dev server should not be started in production mode");
}

config({ path: path.resolve(import.meta.dirname, "../.env") });
process.env.NODE_USE_ENV_PROXY = "1";

async function startLocalPrisma(name: string) {
  const port = await getPort();

  return await startPrismaDevServer({
    name,
    port,
    persistenceMode: "stateful",
  });
}

// We use ts-node not our 'gnx' (tsx underlying) because of lack of support for `--emitDecoratorMetadata`
// https://github.com/privatenumber/tsx/issues/347

const importFlags = [
  `--import`,
  pathToFileURL(path.resolve(import.meta.dirname, "../scripts/ts_preload.js"))
    .href,
];

async function localDev() {
  const server = await startLocalPrisma("gi-tcg-server-dev");
  try {
    await $({
      env: { DATABASE_URL: server.ppg.url },
      stdio: "inherit",
    })`pnpm prisma migrate dev`;
    await $({
      stdio: "inherit",
    })`pnpm prisma generate`;
    await $({
      env: {
        DATABASE_URL: server.database.connectionString,
        DATABASE_CONNECTION_LIMIT: "1",
      },
      reject: false,
      stdio: "inherit",
    })`node ${importFlags} --watch ${path.resolve(import.meta.dirname, "main.ts")}`;
  } finally {
    await server.close!();
  }
}

async function remoteDev() {
  await $({
    env: { DATABASE_URL: process.env.DATABASE_URL! },
  })`pnpm prisma migrate dev`;
  await $({
    stdio: "inherit",
  })`pnpm prisma generate`;
  await $({
    env: { DATABASE_URL: process.env.DATABASE_URL! },
    reject: false,
    stdio: "inherit",
  })`node ${importFlags} --watch ${path.resolve(import.meta.dirname, "main.ts")}`;
}

if (process.env.DATABASE_URL) {
  await remoteDev();
} else {
  await localDev();
}
