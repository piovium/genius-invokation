import console from "node:console";
import { STATUS_CODES } from "node:http";
import { DrizzleQueryError } from "drizzle-orm";
import type { ErrorHandler } from "hono";
import { HTTPException } from "hono/http-exception";

export const handleError: ErrorHandler = (error, c) => {
  if (error instanceof DrizzleQueryError) {
    const cause = error.cause as { code?: string } | undefined;
    if (cause?.code === "23505") {
      error = new ConflictException("Record already exists");
    }
  }
  if (error instanceof HTTPException) {
    return c.json(
      {
        error: error.message || STATUS_CODES[error.status] || "Error",
      },
      error.status,
    );
  }
  console.error(error);
  return c.json({ error: "Internal Server Error" }, 500);
};

export class BadRequestException extends HTTPException {
  constructor(message?: string) {
    super(400, { message });
  }
}

export class UnauthorizedException extends HTTPException {
  constructor(message?: string) {
    super(401, { message });
  }
}

export class ForbiddenException extends HTTPException {
  constructor(message?: string) {
    super(403, { message });
  }
}

export class NotFoundException extends HTTPException {
  constructor(message?: string) {
    super(404, { message });
  }
}

export class ConflictException extends HTTPException {
  constructor(message?: string) {
    super(409, { message });
  }
}

export class ImATeapotException extends HTTPException {
  constructor(message?: string) {
    super(418, { message });
  }
}

export class InternalServerErrorException extends HTTPException {
  constructor(message?: string) {
    super(500, { message });
  }
}

export class ServiceUnavailableException extends HTTPException {
  constructor(message?: string) {
    super(503, { message });
  }
}
