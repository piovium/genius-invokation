import { type ArgumentsHost, Catch, ConflictException } from "@nestjs/common";
import { BaseExceptionFilter } from "@nestjs/core";
import { DrizzleQueryError } from "drizzle-orm";

@Catch(DrizzleQueryError)
export class DatabaseExceptionFilter extends BaseExceptionFilter {
  catch(exception: DrizzleQueryError, host: ArgumentsHost) {
    const cause = exception.cause as { code?: string } | undefined;
    super.catch(
      cause?.code === "23505"
        ? new ConflictException("Record already exists")
        : exception,
      host,
    );
  }
}
