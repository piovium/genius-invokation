// Development uses the same Node PostgreSQL driver and schema as production.
// Run pnpm migrate before first use.
if (process.env.NODE_ENV === "production") {
  throw new Error("Development entry cannot run in production");
}
await import("./main");
