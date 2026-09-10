import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import test from "node:test";
import {
  collectViolations,
  findMatches,
  RULES,
} from "./constraints.mjs";

async function fixture(t, files) {
  const folder = await mkdtemp(join(tmpdir(), "gi-harness-constraints-"));
  t.after(async () => {
    assert.equal(dirname(resolve(folder)), resolve(tmpdir()));
    assert.ok(basename(folder).startsWith("gi-harness-constraints-"));
    await rm(folder, { recursive: true, force: true });
  });
  for (const [path, content] of Object.entries(files)) {
    const target = join(folder, path);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, content, "utf8");
  }
  return folder;
}

function rules(violations) {
  return new Set(violations.map((violation) => violation.rule));
}

const nativeRoutes = [
  'import { Elysia, t } from "elysia";',
  "export const roomRoutes = new Elysia({ prefix: \"/rooms\" })",
  '  .get("/", () => []);',
  "",
].join("\n");

test("native Elysia service without Prisma legacy passes", async (t) => {
  const root = await fixture(t, {
    "package.json": JSON.stringify({ name: "genius-invokation", devDependencies: {} }),
    "packages/server/package.json": JSON.stringify({ dependencies: { elysia: "1.4.30" } }),
    "packages/server/src/rooms/routes.ts": nativeRoutes,
    "pnpm-workspace.yaml": "packages:\n  - \"packages/*\"\n\nallowBuilds:\n  esbuild: true\n",
  });
  const result = await collectViolations(root);
  assert.equal(result.passed, true);
  assert.deepEqual(result.violations, []);
  assert.equal(result.candidateFiles, 2);
});

test("Prisma directory, references and dependencies are rejected", async (t) => {
  const root = await fixture(t, {
    "packages/server/prisma/schema.prisma": "datasource db { provider = \"postgresql\" }\n",
    "packages/server/src/db/migrate.ts": [
      "// adopt _prisma_migrations into __drizzle_migrations",
      "const legacy = await readPrismaHistory();",
      "",
    ].join("\n"),
    "packages/server/package.json": JSON.stringify({ dependencies: { "@prisma/client": "7.8.0" } }),
    "packages/server/README.md": "原 prisma/schema.prisma 保留供历史对照。\n",
    "pnpm-workspace.yaml": "allowBuilds:\n  prisma: true\n  \"@prisma/engines\": true\n",
    "pnpm-lock.yaml": "packages:\n\nsnapshots:\n\n  prisma@7.8.0:\n    resolution: {integrity: sha512-x}\n",
  });
  const result = await collectViolations(root);
  assert.equal(result.passed, false);
  assert.deepEqual(
    [...rules(result.violations)].sort(),
    ["prisma-dependency", "prisma-directory", "prisma-reference"],
  );
  assert.ok(result.byRule["prisma-reference"] >= 2, "every Prisma mention must be reported");
  assert.ok(result.byRule["prisma-dependency"] >= 4, "deps, allowBuilds and lockfile entries count");
});

test("NestJS file names, imports and container classes are rejected", async (t) => {
  const root = await fixture(t, {
    "packages/server/src/app.controller.ts": 'import { Elysia } from "elysia";\n',
    "packages/server/src/users/users.service.ts": "export class UsersService {}\n",
    "packages/server/src/rooms/rooms.module.ts": "export const rooms = [];\n",
    "packages/server/src/auth/auth.guard.ts": 'import { Injectable, UnauthorizedException } from "@nestjs/common";\n',
    "packages/server/src/errors.ts": [
      "export class HttpException extends Error {}",
      "export class BadRequestException extends HttpException {}",
      "",
    ].join("\n"),
  });
  const result = await collectViolations(root);
  assert.equal(result.passed, false);
  assert.equal(result.byRule["nest-file-name"], 4);
  assert.equal(result.byRule["nest-dependency"], 1);
  // UsersService、HttpException 与继承它的 BadRequestException
  assert.equal(result.byRule["nest-class"], 3);
});

test("modules that register routes must be Elysia plugins", async (t) => {
  const root = await fixture(t, {
    "packages/server/src/legacy.ts": [
      'import { createServer } from "node:http";',
      "const server = createServer();",
      'server.get("/rooms", () => []);',
      "",
    ].join("\n"),
    "packages/server/src/rooms/routes.ts": nativeRoutes,
  });
  const result = await collectViolations(root);
  const routeViolations = result.violations.filter(
    (violation) => violation.rule === "elysia-native-route",
  );
  assert.equal(routeViolations.length, 2);
  assert.ok(routeViolations.every((violation) => violation.path.endsWith("legacy.ts")));
  // Map.get("x") and Set.delete("x") are not route registrations.
  const collection = await fixture(t, {
    "packages/server/src/db/cache.ts": [
      "const cache = new Map();",
      'cache.get("users");',
      'cache.delete("users");',
      "",
    ].join("\n"),
  });
  assert.equal((await collectViolations(collection)).passed, true);
});

test("Bun runtime, dependencies, scripts and images are rejected", async (t) => {
  const root = await fixture(t, {
    "packages/server/package.json": JSON.stringify({
      packageManager: "bun@1.3.14",
      scripts: { dev: "bun run src/main.ts" },
      dependencies: { "@types/bun": "1.3.14" },
    }),
    "packages/server/src/main.ts": [
      'import { test } from "bun:test";',
      "const server = Bun.serve({ port: 3000 });",
      "",
    ].join("\n"),
    "packages/server/Dockerfile": "FROM oven/bun:1-alpine\n",
  });
  const result = await collectViolations(root);
  assert.equal(result.passed, false);
  assert.deepEqual([...rules(result.violations)].sort(), ["bun-dependency", "bun-runtime"]);
  // packageManager、@types/bun 依赖与 bun 脚本
  assert.equal(result.byRule["bun-dependency"], 3);
  // bun: 模块导入、Bun 全局对象与 Bun 基础镜像
  assert.equal(result.byRule["bun-runtime"], 3);
});

test("documentation may explain that Bun is out of scope", async (t) => {
  const root = await fixture(t, {
    "packages/server/README.md": "运行时保持 Node.js，不使用 Bun；部署与实验均使用 Node.js。\n",
    "packages/server/src/rooms/routes.ts": nativeRoutes,
  });
  assert.equal((await collectViolations(root)).passed, true);
});

test("harness baseline tooling may still prepare the frozen old service database", async (t) => {
  const root = await fixture(t, {
    "packages/server/src/rooms/routes.ts": nativeRoutes,
    "scripts/server-harness/environment/compose.yaml":
      "- ${HARNESS_BASELINE_SQL_DIR}:/harness/migrations:ro\n",
    "scripts/server-harness/environment/prepare.mjs": "const dir = process.env.HARNESS_BASELINE_SQL_DIR;\n",
  });
  const result = await collectViolations(root);
  assert.equal(result.passed, true);
});

test("findMatches reports one-based line numbers", () => {
  assert.deepEqual(findMatches("a\nprisma\n", /prisma/i), [{ line: 2, text: "prisma" }]);
});

test("the real repository produces a structured, complete report", async () => {
  const result = await collectViolations();
  assert.ok(result.candidateFiles > 0, "candidate service must be scanned");
  assert.deepEqual(Object.keys(result.byRule).sort(), Object.keys(RULES).sort());
  for (const violation of result.violations) {
    assert.ok(RULES[violation.rule], `unknown rule ${violation.rule}`);
    assert.ok(typeof violation.path === "string" && violation.path.length > 0);
    assert.ok(typeof violation.message === "string" && violation.message.length > 0);
    assert.ok(violation.line === null || Number.isSafeInteger(violation.line));
  }
});
