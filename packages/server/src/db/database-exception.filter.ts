import { createMiddleware } from "hono/factory";
import { ConflictException } from "../errors";
import { DrizzleQueryError } from "drizzle-orm";

export const DatabaseExceptionFilter = createMiddleware(async (c, next) => {
  await next();
  if (c.error instanceof DrizzleQueryError) {
    const cause = c.error.cause as { code?: string } | undefined;
    if (cause?.code === "23505") {
      c.res = new ConflictException("Record already exists").getResponse();
    }
  }
});
