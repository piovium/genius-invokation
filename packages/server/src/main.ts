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

import { NestFactory } from "@nestjs/core";
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { AppModule } from "./app.module";
import { RequestMethod, ValidationPipe } from "@nestjs/common";
import { PrismaClientExceptionFilter } from "./db/prisma-exception.filter";
import { WEB_CLIENT_BASE_PATH } from "@gi-tcg/config";
import { frontend } from "./frontend";

const app = await NestFactory.create<NestFastifyApplication>(
  AppModule,
  new FastifyAdapter({
    // Oops. https://github.com/oven-sh/bun/issues/8823
    // http2: true
    keepAliveTimeout: 65000, // 65 seconds (should be longer than ping interval)
    requestTimeout: 0, // Disable request timeout for SSE
  }),
);
app.useGlobalPipes(new ValidationPipe({ transform: true }));
app.useGlobalFilters(new PrismaClientExceptionFilter(app.getHttpAdapter()));
app.setGlobalPrefix(`${WEB_CLIENT_BASE_PATH}api`, {
  exclude: [{ path: "metrics", method: RequestMethod.GET }],
});
await app.register(frontend);

if (process.env.NODE_ENV !== "production") {
  app.enableCors({
    origin: "*",
    methods: ["HEAD", "GET", "POST", "PUT", "PATCH", "DELETE"],
  });
}

await app.listen(process.env.PORT ?? 3000, "::", (err, address) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log(`Server listening at ${address}`);
});
