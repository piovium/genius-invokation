#!/usr/bin/env node

import { spawn } from "node:child_process";

const args = [
  // https://github.com/privatenumber/tsx/issues/791
  "--disable-warning=DEP0205",
  // `--conditions=${process.env.NODE_ENV ?? "development"}`,
  ...(process.env.NODE_ENV ? [`--conditions=${process.env.NODE_ENV}`] : []),
  "--import",
  import.meta.resolve("@gi-tcg/config/preload"),
  ...process.argv.slice(2),
];

const child = spawn(process.execPath, args, { stdio: "inherit" });
child.on("exit", (code) => process.exit(code ?? 0));
