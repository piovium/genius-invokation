/** Small HTTP errors shared by the Elysia routes and game services. */
export class HttpException extends Error {
  constructor(
    public readonly response: string | string[] | Record<string, unknown>,
    public readonly status: number,
  ) {
    super(
      typeof response === "string"
        ? response
        : Array.isArray(response)
          ? response.join("; ")
          : String(response.message ?? "Request failed"),
    );
    this.name = new.target.name;
  }
  getStatus() {
    return this.status;
  }
  getResponse() {
    return typeof this.response === "object" && !Array.isArray(this.response)
      ? this.response
      : { statusCode: this.status, message: this.response };
  }
}
export class BadRequestException extends HttpException {
  constructor(message: string | string[] = "Bad Request") {
    super(message, 400);
  }
}
export class UnauthorizedException extends HttpException {
  constructor(message = "Unauthorized") {
    super(message, 401);
  }
}
export class ForbiddenException extends HttpException {
  constructor(message = "Forbidden") {
    super(message, 403);
  }
}
export class NotFoundException extends HttpException {
  constructor(message = "Not Found") {
    super(message, 404);
  }
}
export class ConflictException extends HttpException {
  constructor(message = "Conflict") {
    super(message, 409);
  }
}
export class ImATeapotException extends HttpException {
  constructor(message = "I'm a teapot") {
    super(message, 418);
  }
}
export class InternalServerErrorException extends HttpException {
  constructor(message = "Internal Server Error") {
    super(message, 500);
  }
}
export class ServiceUnavailableException extends HttpException {
  constructor(message = "Service Unavailable") {
    super(message, 503);
  }
}

export class Logger {
  constructor(private readonly context = "Server") {}
  log(...values: unknown[]) {
    console.log(`[${this.context}]`, ...values);
  }
  warn(...values: unknown[]) {
    console.warn(`[${this.context}]`, ...values);
  }
  error(...values: unknown[]) {
    console.error(`[${this.context}]`, ...values);
  }
  debug(...values: unknown[]) {
    if (process.env.LOG_LEVEL === "debug")
      console.debug(`[${this.context}]`, ...values);
  }
  verbose(...values: unknown[]) {
    this.debug(...values);
  }
}

export function httpError(error: unknown): {
  status: number;
  body: Record<string, unknown>;
} {
  if (error instanceof HttpException)
    return {
      status: error.status,
      body: error.getResponse() as Record<string, unknown>,
    };
  // Drizzle wraps driver errors in cause. Expose stable HTTP failures, never SQL
  // text, bind values, OAuth tokens or database connection strings.
  let cause = error;
  for (
    let depth = 0;
    depth < 4 && cause && typeof cause === "object";
    depth++
  ) {
    const codes = [
      "code" in cause ? cause.code : null,
      "errno" in cause ? cause.errno : null,
    ];
    if (codes.includes("23505"))
      return {
        status: 409,
        body: { statusCode: 409, message: "Record already exists" },
      };
    if (codes.includes("23503"))
      return {
        status: 409,
        body: {
          statusCode: 409,
          message: "Related record is missing or still in use",
        },
      };
    cause = "cause" in cause ? cause.cause : null;
  }
  return {
    status: 500,
    body: { statusCode: 500, message: "Internal Server Error" },
  };
}
