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
import { serve } from "@hono/node-server";
import { root } from "./app.module";
import { initializeServices, roomsService } from "./services";
import type { AddressInfo } from "node:net";

export async function startServer() {
  await using disposeStack = await initializeServices();
  const { promise, resolve, reject } = Promise.withResolvers<AddressInfo>();
  const server = serve(
    {
      fetch: root.fetch,
      port: Number(process.env.PORT ?? 3000),
      hostname: "::",
      serverOptions: {
        keepAliveTimeout: 65000,
        requestTimeout: 0,
      },
    },
    resolve,
  );
  server.once("error", reject);
  const { address, port } = await promise;
  server.off("error", reject);
  disposeStack.use(server);
  disposeStack.defer(() => roomsService.waitForShutdown());
  console.log(`Server listening at http://[${address}]:${port}`);
  return disposeStack.move();
}

if (import.meta.main) {
  const disposeStack = await startServer();
  let stopping = false;
  const onShutdown = () => {
    if (stopping) {
      return;
    }
    stopping = true;
    void disposeStack.disposeAsync().then(
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
