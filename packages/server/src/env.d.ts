import type { JWTPayload } from "hono/utils/jwt/types";

declare module "hono" {
  interface ContextVariableMap {
    jwtPayload: JWTPayload;
  }
}
