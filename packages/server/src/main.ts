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

import { createApplication, listenApplication } from "./app";
import { redis } from "./redis";

const service = createApplication();
await service.database.connect();

const port = Number(process.env.PORT ?? 3000);
if (!Number.isInteger(port) || port < 1 || port > 65535)
  throw new Error("Invalid PORT");

const server = await listenApplication(service, {
  port,
  hostname: process.env.HOST ?? "::",
});
console.log(`Server listening at ${server.url}`);

let stopping = false;
async function stop(): Promise<void> {
  if (stopping) return;
  stopping = true;
  await service.rooms.close();
  await server.stop();
  await service.database.close();
  await redis?.quit();
}

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => void stop());
}
