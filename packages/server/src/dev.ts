// Development uses the same Node PostgreSQL driver and schema as production.
// Run pnpm migrate before first use. The import below stays dynamic so the
// guard runs before the server module loads.
if (process.env.NODE_ENV === "production")
  throw new Error("Development entry cannot run in production");
await import("./main");
