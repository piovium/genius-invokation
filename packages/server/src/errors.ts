import { status } from "elysia";

/**
 * An HTTP failure raised by the game services.
 *
 * Services throw it from any depth; the route boundary in `app.ts` renders it
 * with Elysia's `status()` helper.
 */
export class HttpError extends Error {
  constructor(
    readonly statusCode: number,
    message: string,
  ) {
    super(message);
  }
}
export const badRequest = (message: string) => new HttpError(400, message);
export const unauthorized = (message = "Unauthorized") =>
  new HttpError(401, message);
export const forbidden = (message = "Forbidden") => new HttpError(403, message);
export const notFound = (message = "Not Found") => new HttpError(404, message);
export const conflict = (message = "Conflict") => new HttpError(409, message);
export const teapot = (message = "I'm a teapot") => new HttpError(418, message);
export const internalError = (message = "Internal Server Error") =>
  new HttpError(500, message);
export const unavailable = (message = "Service Unavailable") =>
  new HttpError(503, message);

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
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * Drizzle wraps driver errors, each of which may carry its own SQLSTATE, so a
 * single failure can be several causes deep.
 */
function* driverErrorChain(error: unknown) {
  let current = error;
  for (let depth = 0; depth < 4 && isRecord(current); depth += 1) {
    yield current;
    current = current.cause;
  }
}

/**
 * The two PostgreSQL integrity violations that are the client's fault, not ours.
 */
const conflictMessageBySqlState = new Map([
  ["23505", "Record already exists"],
  ["23503", "Related record is missing or still in use"],
]);

/** The conflict message for one driver error code, or undefined for any other. */
const conflictMessageFor = (code: unknown) =>
  typeof code === "string" ? conflictMessageBySqlState.get(code) : undefined;

/**
 * Render a `{ statusCode, message }` error body with Elysia's `status()`
 * helper, used by `errorResponse` and the boundary in `app.ts`.
 */
export const errorStatus = (statusCode: number, message: string) =>
  status(statusCode, { statusCode, message });

/**
 * Render a boundary failure as an Elysia response.
 *
 * Driver failures are reported through stable HTTP statuses: SQL text, bind
 * values, OAuth tokens and connection strings must never reach the client.
 */
export function errorResponse(error: unknown) {
  if (error instanceof HttpError)
    return errorStatus(error.statusCode, error.message);
  for (const cause of driverErrorChain(error)) {
    const message =
      conflictMessageFor(cause.code) ?? conflictMessageFor(cause.errno);
    if (message !== undefined) return errorStatus(409, message);
  }
  return errorStatus(500, "Internal Server Error");
}
