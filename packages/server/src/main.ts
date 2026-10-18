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

import console from "node:console";
import { serve, type ServerType } from "@hono/node-server";
import { root } from "./app.module";
import { frontend } from "./frontend";
import { initializeServices, roomsService, shutdownServices } from "./services";

export async function startServer() {
  let server: ServerType | undefined;
  try {
    if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET is not set");
    await initializeServices();
    await frontend(root);
    await new Promise<void>((resolve, reject) => {
      server = serve(
        {
          fetch: root.fetch,
          port: Number(process.env.PORT ?? 3000),
          hostname: "::",
          serverOptions: {
            keepAliveTimeout: 65000,
            requestTimeout: 0,
          },
        },
        (address) => {
          server?.off("error", reject);
          console.log(
            `Server listening at http://[${address.address}]:${address.port}`,
          );
          resolve();
        },
      );
      server.once("error", reject);
    });
  } catch (error) {
    server?.close();
    await shutdownServices().catch(console.error);
    throw error;
  }

  let stopping: Promise<void> | undefined;
  const shutdown = () =>
    (stopping ??= (async () => {
      // Keep accepting game actions until existing rooms have finished.
      await roomsService.waitForShutdown();
      try {
        await new Promise<void>((resolve, reject) => {
          server!.close((error) => (error ? reject(error) : resolve()));
        });
      } finally {
        await shutdownServices();
      }
    })());
  return { server: server!, shutdown };
}

if (import.meta.main) {
  const { shutdown } = await startServer();
  let stopping = false;
  const onShutdown = () => {
    if (stopping) return;
    stopping = true;
    void shutdown().then(
      () => process.exit(0),
      (error) => {
        console.error(error);
        process.exit(1);
      },
    );
  };
  process.on("SIGINT", onShutdown);
  process.on("SIGTERM", onShutdown);
  process.on("SIGQUIT", onShutdown);
}
