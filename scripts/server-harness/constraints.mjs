#!/usr/bin/env node
// 迁移目标约束：候选服务必须使用 Elysia 原生写法，且不得保留 Prisma 遗留。
// 只读扫描候选服务（packages/server）与仓库依赖清单，不修改任何文件。
// 冻结旧服务基线的 harness 工具属于对照侧，允许引用旧服务的 Prisma 迁移。
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repository = fileURLToPath(new URL("../../", import.meta.url));

export const CANDIDATE_DIRECTORY = "packages/server";

/** 每条规则的含义，报告和 --help 共用。 */
export const RULES = {
  "prisma-directory": "候选服务不得保留 prisma/ 目录（schema、迁移 SQL 或生成产物）。",
  "prisma-dependency": "依赖、lockfile 与 allowBuilds 不得再出现 prisma 或 @prisma/*。",
  "prisma-reference":
    "候选服务的源码、构建脚本与文档不得再引用 Prisma（含 _prisma_migrations 兼容逻辑）。",
  "nest-file-name":
    "源码文件名不得使用 NestJS 风格的 controller/service/module 等后缀。",
  "nest-dependency":
    "不得依赖或导入 @nestjs/*、reflect-metadata、class-validator、class-transformer。",
  "nest-class":
    "不得声明 NestJS 风格的容器类或异常类层次，改用 Elysia 插件、status 与 error。",
  "elysia-native-route":
    "注册路由的模块必须是 Elysia 插件：导入 elysia 并构造 Elysia 实例。",
  "bun-dependency": "依赖、packageManager 与脚本不得改用 Bun；运行时固定 Node.js。",
  "bun-runtime":
    "候选服务代码与容器镜像不得使用 Bun 全局对象、bun: 模块、Bun shebang 或 Bun 基础镜像。",
};

/** 允许的例外，随报告输出，避免把例外当成违规去修。 */
export const ALLOWED_EXCEPTIONS = [
  "运行时保持 Node.js；Elysia 的 Bun 专属能力不属于本路线范围。",
  "房间 WebSocket 传输：Node 下没有 Elysia 原生 ws，继续使用 ws 包挂载，是本路线唯一登记的传输例外。",
  "路由需要显式响应头时返回原生 Response（Node 适配器会覆盖部分字符串响应的 Content-Type）。",
  "harness 的基线工具（scripts/server-harness/**）为冻结的旧服务准备数据库，允许引用旧服务的 Prisma 迁移 SQL。",
];

const IGNORED_DIRECTORIES = new Set([
  "node_modules",
  "dist",
  "temp",
  ".git",
  "coverage",
  ".turbo",
]);

const TEXT_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".mts",
  ".cts",
  ".js",
  ".mjs",
  ".cjs",
  ".json",
  ".md",
  ".sql",
  ".prisma",
  ".yml",
  ".yaml",
  ".sh",
  ".ps1",
  ".toml",
  ".txt",
  ".env",
]);

const NEST_FILE_SUFFIX =
  /\.(controller|service|module|guard|decorator|pipe|interceptor|middleware|filter|resolver)\.(c|m)?tsx?$/i;
const NEST_CLASS_SUFFIX =
  /(Service|Controller|Module|Guard|Pipe|Interceptor|Middleware|Decorator|Resolver|Filter)$/;
const NEST_IMPORT =
  /(?:from|require\()\s*\(?\s*["'](@nestjs\/[^"']+|reflect-metadata|class-validator|class-transformer)["']/;
const PRISMA_PACKAGE = /^(@prisma\/|prisma$)/;
const NEST_PACKAGE =
  /^(@nestjs\/|reflect-metadata$|class-validator$|class-transformer$)/;
const PRISMA_REFERENCE = /prisma/i;
// Elysia 路由路径以 / 开头；不使用前置斜杠会把 Map.get("x")、Set.delete("x")
// 这类普通集合调用误判为路由注册。
const ROUTE_REGISTRATION = /\.(get|post|put|patch|delete|options|head|all)\(\s*["'`]\//;
const CLASS_DECLARATION = /\bclass\s+([A-Za-z_$][\w$]*)/g;
const CODE_EXTENSIONS = new Set([".ts", ".tsx", ".mts", ".cts", ".js", ".mjs", ".cjs"]);
const BUN_PACKAGES = new Set(["bun", "bun-types", "@types/bun"]);
const BUN_CODE = [
  { pattern: /\bBun\./, detail: "使用了 Bun 全局对象" },
  { pattern: /["']bun(?::[a-z-]+)?["']/, detail: "导入了 bun 模块" },
  { pattern: /^#!.*\bbun\b/, detail: "shebang 指向 bun" },
  { pattern: /process\.versions\.bun/, detail: "读取 Bun 运行时版本" },
];
const BUN_IMAGE = /^\s*FROM\s+\S*bun\S*/i;
const BUN_COMMAND = /(?:^|\s)bun(?:\s|$)/;

function isCodeFile(path) {
  const name = path.slice(path.lastIndexOf("/") + 1).toLowerCase();
  if (name.startsWith("dockerfile")) return true;
  const dot = name.lastIndexOf(".");
  return dot >= 0 && CODE_EXTENSIONS.has(name.slice(dot));
}

function isTextFile(path) {
  const lower = path.toLowerCase();
  const name = lower.slice(lower.lastIndexOf("/") + 1);
  if (name.startsWith("dockerfile") || name.startsWith(".env")) return true;
  if (name.endsWith(".dockerignore") || name.endsWith(".gitattributes")) return true;
  const dot = name.lastIndexOf(".");
  return dot >= 0 && TEXT_EXTENSIONS.has(name.slice(dot));
}

function toPosix(path) {
  return path.split(sep).join("/");
}

async function walk(directory, collected = []) {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT" || error.code === "ENOTDIR") return collected;
    throw error;
  }
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      if (!IGNORED_DIRECTORIES.has(entry.name)) await walk(path, collected);
      continue;
    }
    if (entry.isFile()) collected.push(path);
  }
  return collected;
}

/** 返回文本中每一处匹配的行号与内容，供人工定位。 */
export function findMatches(text, pattern) {
  const matches = [];
  for (const [index, line] of text.split(/\r?\n/).entries()) {
    if (pattern.test(line)) matches.push({ line: index + 1, text: line.trim() });
  }
  return matches;
}

function classNames(text) {
  const names = [];
  CLASS_DECLARATION.lastIndex = 0;
  let match;
  while ((match = CLASS_DECLARATION.exec(text)) !== null) names.push(match[1]);
  return names;
}

async function readText(path) {
  try {
    return await readFile(path, "utf8");
  } catch (error) {
    if (error.code === "ENOENT" || error.code === "EISDIR") return null;
    throw error;
  }
}

async function readJson(path) {
  const text = await readText(path);
  if (text === null) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch (error) {
    if (error.code === "ENOENT" || error.code === "ENOTDIR") return false;
    throw error;
  }
}

async function collectCandidateViolations(root, add) {
  const candidateRoot = join(root, CANDIDATE_DIRECTORY);
  if (await exists(join(candidateRoot, "prisma"))) {
    add("prisma-directory", `${CANDIDATE_DIRECTORY}/prisma`, "候选服务仍保留 prisma/ 目录。");
  }
  const files = await walk(candidateRoot);
  for (const file of files) {
    const path = toPosix(relative(root, file));
    if (NEST_FILE_SUFFIX.test(path)) {
      add("nest-file-name", path, "文件名使用了 NestJS 风格后缀。");
    }
    if (!isTextFile(path)) continue;
    const text = await readText(file);
    if (text === null) continue;
    for (const match of findMatches(text, PRISMA_REFERENCE)) {
      add("prisma-reference", path, `仍引用 Prisma：${match.text.slice(0, 120)}`, match.line);
    }
    for (const match of findMatches(text, NEST_IMPORT)) {
      add(
        "nest-dependency",
        path,
        `导入了 NestJS 生态模块：${match.text.slice(0, 120)}`,
        match.line,
      );
    }
    for (const name of classNames(text)) {
      if (NEST_CLASS_SUFFIX.test(name) || name.endsWith("Exception")) {
        add(
          "nest-class",
          path,
          `声明了兼容层类 ${name}；Elysia 原生写法使用插件、status 与 error。`,
        );
      }
    }
    // Bun 只可能出现在代码、脚本与镜像里；文档中的说明性文字不参与判定。
    if (isCodeFile(path)) {
      const basename = path.slice(path.lastIndexOf("/") + 1).toLowerCase();
      if (basename.startsWith("dockerfile")) {
        for (const match of findMatches(text, BUN_IMAGE)) {
          add("bun-runtime", path, `容器基础镜像使用 Bun：${match.text.slice(0, 120)}`, match.line);
        }
      } else {
        for (const { pattern, detail } of BUN_CODE) {
          for (const match of findMatches(text, pattern)) {
            add("bun-runtime", path, `${detail}：${match.text.slice(0, 120)}`, match.line);
          }
        }
      }
    }
    if (!path.endsWith(".ts") && !path.endsWith(".tsx")) continue;
    if (!ROUTE_REGISTRATION.test(text)) continue;
    if (!/(?:from|require\()\s*\(?\s*["']elysia["']/.test(text)) {
      add("elysia-native-route", path, "注册了路由但没有导入 elysia。");
    }
    if (!text.includes("new Elysia(")) {
      add("elysia-native-route", path, "注册了路由但没有构造 Elysia 实例，无法作为插件组合。");
    }
  }
  return files.length;
}

function dependencyNames(manifest) {
  const names = [];
  for (const field of [
    "dependencies",
    "devDependencies",
    "peerDependencies",
    "optionalDependencies",
  ]) {
    if (manifest?.[field]) names.push(...Object.keys(manifest[field]));
  }
  if (manifest?.overrides) names.push(...Object.keys(manifest.overrides));
  return names;
}

function allowBuildEntries(workspace) {
  const lines = workspace.split(/\r?\n/);
  const start = lines.findIndex((line) => /^allowBuilds:\s*$/.test(line));
  if (start === -1) return [];
  const entries = [];
  for (const line of lines.slice(start + 1)) {
    if (!/^\s/.test(line)) break;
    const match = /^\s+"?([^":]+)"?:/.exec(line);
    if (match) entries.push(match[1].trim());
  }
  return entries;
}

async function collectManifestViolations(root, add) {
  const manifests = [join(root, "package.json")];
  const packagesDirectory = join(root, "packages");
  let entries = [];
  try {
    entries = await readdir(packagesDirectory, { withFileTypes: true });
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  for (const entry of entries) {
    if (entry.isDirectory()) manifests.push(join(packagesDirectory, entry.name, "package.json"));
  }
  for (const manifestPath of manifests) {
    const manifest = await readJson(manifestPath);
    if (manifest === null) continue;
    const path = toPosix(relative(root, manifestPath));
    for (const name of dependencyNames(manifest)) {
      if (PRISMA_PACKAGE.test(name)) add("prisma-dependency", path, `依赖清单仍包含 ${name}。`);
      if (NEST_PACKAGE.test(name)) add("nest-dependency", path, `依赖清单仍包含 ${name}。`);
      if (BUN_PACKAGES.has(name)) add("bun-dependency", path, `依赖清单仍包含 ${name}。`);
    }
    if (typeof manifest.packageManager === "string" && /^bun@/.test(manifest.packageManager)) {
      add("bun-dependency", path, `packageManager 指向 ${manifest.packageManager}。`);
    }
    if (manifest.engines?.bun) {
      add("bun-dependency", path, "engines 声明了 Bun。");
    }
    for (const [name, command] of Object.entries(manifest.scripts ?? {})) {
      if (typeof command === "string" && BUN_COMMAND.test(command)) {
        add("bun-dependency", path, `脚本 ${name} 调用了 bun：${command.slice(0, 120)}`);
      }
    }
  }
  const workspaceText = await readText(join(root, "pnpm-workspace.yaml"));
  if (workspaceText !== null) {
    for (const name of allowBuildEntries(workspaceText)) {
      if (PRISMA_PACKAGE.test(name)) {
        add("prisma-dependency", "pnpm-workspace.yaml", `allowBuilds 仍为 ${name} 放行构建脚本。`);
      }
      if (NEST_PACKAGE.test(name)) {
        add("nest-dependency", "pnpm-workspace.yaml", `allowBuilds 仍为 ${name} 放行构建脚本。`);
      }
    }
  }
  const lockfile = await readText(join(root, "pnpm-lock.yaml"));
  if (lockfile !== null) {
    const keys = /^\s{2,}(?:'|")?(@prisma\/[a-z0-9.-]+|prisma)@/;
    const references = /^\s+(@prisma\/[a-z0-9.-]+|prisma):\s/;
    for (const match of findMatches(lockfile, keys)) {
      add("prisma-dependency", "pnpm-lock.yaml", `lockfile 仍解析 ${match.text.slice(0, 80)}`, match.line);
    }
    for (const match of findMatches(lockfile, references)) {
      add("prisma-dependency", "pnpm-lock.yaml", `lockfile 仍引用 ${match.text.slice(0, 80)}`, match.line);
    }
  }
}

function summarize(violations) {
  const byRule = {};
  for (const id of Object.keys(RULES)) byRule[id] = 0;
  for (const violation of violations) {
    byRule[violation.rule] = (byRule[violation.rule] ?? 0) + 1;
  }
  return byRule;
}

export async function collectViolations(root = repository) {
  const violations = [];
  const add = (rule, path, message, line = null) =>
    violations.push({ rule, path, message, line });
  const candidateFiles = await collectCandidateViolations(root, add);
  await collectManifestViolations(root, add);
  return {
    root: resolve(root),
    candidateFiles,
    violations,
    byRule: summarize(violations),
    passed: violations.length === 0,
  };
}

export async function checkConstraints(root = repository) {
  const result = await collectViolations(root);
  return {
    kind: "SERVER_MIGRATION_CONSTRAINTS",
    checkedAt: new Date().toISOString(),
    runtime: { node: process.versions.node, platform: process.platform },
    ...result,
    rules: RULES,
    allowedExceptions: ALLOWED_EXCEPTIONS,
    scope:
      "只读静态检查候选服务（packages/server）与仓库依赖清单；不运行服务、不读取 .env、不修改文件。通过本检查只说明未发现 Prisma 遗留与 NestJS 兼容层写法，不代表功能或内存验收。",
  };
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 1 && (args[0] === "--help" || args[0] === "-h")) {
    process.stdout.write(
      `${JSON.stringify(
        {
          usage:
            "node scripts/server-harness/constraints.mjs [--root <directory>] [--output <report.json>]",
          exitCodes: { 0: "未发现违规", 1: "存在违规", 2: "用法或检查失败" },
          rules: RULES,
        },
        null,
        2,
      )}\n`,
    );
    return;
  }
  let root = repository;
  let output;
  for (let index = 0; index < args.length; index += 1) {
    const flag = args[index];
    const value = args[index + 1];
    if ((flag !== "--root" && flag !== "--output") || !value || value.startsWith("--")) {
      throw new Error(
        "Usage: node scripts/server-harness/constraints.mjs [--root <directory>] [--output <report.json>]",
      );
    }
    if (flag === "--root") root = resolve(value);
    else output = resolve(value);
    index += 1;
  }
  const report = await checkConstraints(root);
  const json = `${JSON.stringify(report, null, 2)}\n`;
  if (output) {
    await mkdir(dirname(output), { recursive: true });
    await writeFile(output, json, "utf8");
  }
  process.stdout.write(json);
  // 人读摘要写 stderr，stdout 始终是可解析的报告。
  process.stderr.write(`迁移目标约束：${report.passed ? "通过" : `${report.violations.length} 项违规`}\n`);
  for (const [rule, count] of Object.entries(report.byRule)) {
    if (count > 0) process.stderr.write(`  ${rule}: ${count}\n`);
  }
  process.exitCode = report.passed ? 0 : 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(() => {
    process.stdout.write(
      `${JSON.stringify(
        {
          kind: "SERVER_MIGRATION_CONSTRAINTS",
          passed: false,
          error: "约束检查失败。检查参数与可选输出路径；使用 --help 查看用法。",
        },
        null,
        2,
      )}\n`,
    );
    process.exitCode = 2;
  });
}
