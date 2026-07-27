// Copyright (C) 2026 Piovium Labs
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as
// published by the Free Software Foundation, either version 3 of the
// License, or (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Affero General Public License for more details.
//
// You should have received a copy of the GNU Affero General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>.

/**
 * Migrate legacy GTS query helpers (`:$` and `:$$`) and action targets to the
 * fluent query API.
 *
 * String literals and structurally-known template literals are converted.
 * Single external entity targets (`@self`, `@targets.0`, and similar) become
 * their direct GTS expressions because action methods already accept entities.
 * Query expressions supplied through a variable are intentionally left alone:
 * they can depend on runtime values (for example, `SIMULANKA_QUERY`) and need
 * a hand-written fluent equivalent.
 *
 * Usage:
 *   gnx ./scripts/migrate_legacy_queries.ts [--write] [files...]
 */

import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import grammar from "../../core/src/query-legacy/query.ohm-bundle.js";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = path.resolve(SCRIPT_DIR, "..");
const SOURCE_ROOT = path.join(PACKAGE_ROOT, "src");

interface CliOptions {
  write: boolean;
  files: string[];
}

interface Replacement {
  start: number;
  end: number;
  text: string;
}

interface ScanResult {
  replacements: Replacement[];
  dynamicQueries: number;
  unsupportedQueries: UnsupportedQuery[];
}

type QueryTargetKind = "character" | "entity";

interface TargetArgument {
  index: number;
  kind: QueryTargetKind;
}

interface UnsupportedQuery {
  offset: number;
  source: string;
  reason: string;
}

interface FileResult {
  path: string;
  changed: boolean;
  converted: number;
  dynamicQueries: number;
  unsupportedQueries: UnsupportedQuery[];
}

class TranslationError extends Error {}

const MACROS: Readonly<Record<string, string>> = {
  "my characters with energy < maxEnergy limit 1": "$.macros.myEnergyNotFull",
  "opp characters with health > 0 limit 1": "$.macros.oppActivePrioritized",
  "my characters order by health limit 1": "$.macros.myMinHealth",
  "opp characters order by health limit 1": "$.macros.oppMinHealth",
  "my characters order by 0 - health limit 1": "$.macros.myMaxHealth",
  "opp characters order by 0 - health limit 1": "$.macros.oppMaxHealth",
  "my characters order by health - maxHealth limit 1": "$.macros.myMostInjured",
  "opp characters order by health - maxHealth limit 1":
    "$.macros.oppMostInjured",
  "my characters order by maxHealth - health limit 1":
    "$.macros.myLeastInjured",
  "opp characters order by maxHealth - health limit 1":
    "$.macros.oppLeastInjured",
  "my hands with diceCost > 0": "$.macros.myHandsNotFree",
  "opp hands with diceCost > 0": "$.macros.oppHandsNotFree",
  "my pile with diceCost > 0": "$.macros.myPileNotFree",
  "opp pile with diceCost > 0": "$.macros.oppPileNotFree",
};

/**
 * GTS action methods whose argument is a legacy query target. Keep this list
 * deliberately tied to the builder API: strings in other positions (such as
 * `:summon(Foo, "opp")`) are ordinary option values, not queries.
 */
const TARGET_ARGUMENTS: Readonly<Record<string, readonly TargetArgument[]>> = {
  apply: [{ index: 1, kind: "character" }],
  attachCostIncrease: [{ index: 0, kind: "entity" }],
  attachCostReduction: [{ index: 0, kind: "entity" }],
  characterStatus: [{ index: 1, kind: "character" }],
  cleanAura: [{ index: 1, kind: "character" }],
  consumeNightsoul: [{ index: 0, kind: "character" }],
  damage: [{ index: 2, kind: "character" }],
  dispose: [{ index: 0, kind: "entity" }],
  equip: [{ index: 1, kind: "character" }],
  gainEnergy: [{ index: 1, kind: "character" }],
  gainNightsoul: [{ index: 0, kind: "character" }],
  heal: [{ index: 1, kind: "character" }],
  increaseMaxHealth: [{ index: 1, kind: "character" }],
  swapCharacterPosition: [
    { index: 0, kind: "character" },
    { index: 1, kind: "character" },
  ],
  switchActive: [{ index: 0, kind: "character" }],
  transformDefinition: [{ index: 0, kind: "entity" }],
};

let activeInterpolations: ReadonlyMap<string, string> | null = null;
let activeTargetKind: QueryTargetKind | null = null;
let activeMasterIsSelf = false;

const querySemantics = grammar.createSemantics().addOperation("fluent()", {
  Query(orQuery: any, orderBy: any, limit: any) {
    let result = orQuery.fluent();
    if (orderBy.numChildren > 0) {
      const source = orderBy.children[0].sourceString
        .replace(/^order by\s+/, "")
        .trim();
      result = appendOrderBy(result, source);
    }
    if (limit.numChildren > 0) {
      const count = limit.children[0].sourceString
        .replace(/^limit\s+/, "")
        .trim();
      result += `.limit(${count})`;
    }
    return result;
  },
  OrQuery_or(left: any, _or: any, right: any) {
    return `${left.fluent()}.union(${right.fluent()})`;
  },
  AndQuery_and(left: any, _and: any, right: any) {
    return `${left.fluent()}.intersection(${right.fluent()})`;
  },
  RelationalQuery_has(subject: any, _has: any, object: any) {
    return `${subject.fluent()}.has(${object.fluent()})`;
  },
  RelationalQuery_at(subject: any, _at: any, object: any) {
    return `${subject.fluent()}.at(${object.fluent()})`;
  },
  UnaryQuery_not(_not: any, query: any) {
    return `$.not(${query.fluent()})`;
  },
  UnaryQuery_recentFrom(_recent: any, query: any) {
    return `$.recentOppFrom(${query.fluent()})`;
  },
  UnaryQuery_has(_has: any, query: any) {
    return `$.has(${query.fluent()})`;
  },
  UnaryQuery_at(_at: any, query: any) {
    return `$.at(${query.fluent()})`;
  },
  PrimaryQuery_canonical(who: any, type: any, with_: any) {
    const whoSource = who.numChildren > 0 ? who.children[0].sourceString : "";
    let result = canonicalQuery(whoSource, type.sourceString);
    if (with_.numChildren > 0) {
      result = with_.children[0].fluent()(result);
    }
    return result;
  },
  PrimaryQuery_canonicalAny(who: any, with_: any) {
    const whoSource = who.numChildren > 0 ? who.children[0].sourceString : "";
    let result = canonicalQuery(whoSource, "any");
    result = with_.fluent()(result);
    return result;
  },
  PrimaryQuery_external(_at: any, properties: any) {
    return externalQuery(`@${properties.sourceString}`);
  },
  PrimaryQuery_paren(_left: any, query: any, _right: any) {
    return `(${query.fluent()})`;
  },
  WithSpecifier(_with: any, body: any) {
    return body.fluent();
  },
  WithBody_id(_id: any, _equals: any, expression: any) {
    const value = renderNumericExpression(expression.sourceString);
    return (query: string) => `${query}.id(${value})`;
  },
  WithBody_defId(_definition: any, _id: any, _equals: any, expression: any) {
    const value = renderDefinitionExpression(expression.sourceString);
    return (query: string) => `${query}.def(${value})`;
  },
  WithBody_tag(_tag: any, specifier: any) {
    const source = specifier.sourceString.trim();
    const direct = /^\(([^)]*)\)$/.exec(source);
    if (direct) {
      const tags = direct[1]!
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean)
        .map((tag) => JSON.stringify(tag));
      return (query: string) => `${query}.tag(${tags.join(", ")})`;
    }
    const indirect = /^(weapon|element)\s+of\s+\((.*)\)$/.exec(source);
    if (indirect) {
      const kind = JSON.stringify(indirect[1]!);
      const query = translateQuery(indirect[2]!);
      return (base: string) => `${base}.tagOf(${kind}, ${query})`;
    }
    throw new TranslationError(`unsupported tag specifier '${source}'`);
  },
  WithBody_prop(property: any, operator: any, expression: any) {
    const name = propertyName(property.sourceString);
    const value = renderVariableOrNumber(expression.sourceString);
    return (query: string) =>
      `${query}.var(${name}, ${JSON.stringify(operator.sourceString)}, ${value})`;
  },
  _terminal() {
    return this.sourceString;
  },
  _iter(...children: any[]) {
    return children.map((child) => child.fluent());
  },
  _default(this: { sourceString: string }, ...children: any[]) {
    if (children.length === 1) {
      return children[0].fluent();
    }
    throw new TranslationError(
      `unsupported query syntax '${this.sourceString}'`,
    );
  },
} as any);

function canonicalQuery(who: string, type: string): string {
  let query = "$";
  const normalizedWho =
    who.trim() === "all" ? "" : who.trim().replace(/^all\s+/, "");
  if (normalizedWho === "my" || normalizedWho === "opp") {
    query += `.${normalizedWho}`;
  } else if (normalizedWho !== "") {
    throw new TranslationError(`unsupported query owner '${who}'`);
  }

  const normalizedType = type.trim();
  if (normalizedType === "any") {
    return query === "$" ? "$.any" : query;
  }
  if (/^active(?: character)?(?:s)?$/.test(normalizedType)) {
    return `${query}.active`;
  }
  if (/^prev(?: character)?(?:s)?$/.test(normalizedType)) {
    return `${query}.prev`;
  }
  if (/^next(?: character)?(?:s)?$/.test(normalizedType)) {
    return `${query}.next`;
  }
  if (/^standby(?: character)?(?:s)?$/.test(normalizedType)) {
    return `${query}.standby`;
  }
  if (/^defeated characters?$/.test(normalizedType)) {
    return `${query}.character.onlyDefeated`;
  }
  if (/^characters? includes? defeated$/.test(normalizedType)) {
    return `${query}.character.includesDefeated`;
  }
  if (/^characters?$/.test(normalizedType)) {
    return `${query}.character`;
  }
  if (/^summons?$/.test(normalizedType)) {
    return `${query}.summon`;
  }
  if (/^combat status(?:es)?$/.test(normalizedType)) {
    return `${query}.combatStatus`;
  }
  if (/^status(?:es)?$/.test(normalizedType)) {
    return `${query}.typeStatus`;
  }
  if (/^supports?$/.test(normalizedType)) {
    return `${query}.support`;
  }
  if (/^equipments?$/.test(normalizedType)) {
    return `${query}.typeEquipment`;
  }
  if (/^hands?(?: cards?)?$/.test(normalizedType)) {
    return `${query}.hand`;
  }
  if (/^piles?(?: cards?)?$/.test(normalizedType)) {
    return `${query}.pile`;
  }
  if (/^cards?$/.test(normalizedType)) {
    const owner = query === "$" ? "$" : query;
    return `${owner}.hand.union(${owner}.pile)`;
  }
  throw new TranslationError(`unsupported query type '${type}'`);
}

function externalQuery(source: string): string {
  const idQuery = activeTargetKind === "character" ? "$.character.id" : "$.id";
  const selectedTarget = /^@targets\.(\d+)$/.exec(source);
  if (selectedTarget) {
    return `${idQuery}(:e.targets[${selectedTarget[1]}].id)`;
  }
  const external: Record<string, string> = {
    "@self": `${idQuery}(:self.id)`,
    // `@master` always resolves to the character that owns `self`, including
    // when `self` is already that character. The explicit character query is
    // needed so GTS keeps the surrounding `self` type instead of inferring it
    // from the generic entity-target overload.
    "@master": `$.character.id(:self${activeMasterIsSelf ? "" : ".master"}.id)`,
    "@event.skillCaller": `${idQuery}(:e.skillCaller.id)`,
    "@event.switchTo": `${idQuery}(:e.switchInfo.to.id)`,
    "@damage.target": `${idQuery}(:e.target.id)`,
  };
  const result = external[source];
  if (!result) {
    throw new TranslationError(`unsupported external query '${source}'`);
  }
  return result;
}

function appendOrderBy(query: string, source: string): string {
  const parts = splitTopLevel(source, ",");
  let result = query;
  for (const part of parts) {
    const binary = /^(.+?)\s*([+\-*/])\s*(.+)$/.exec(part.trim());
    if (binary) {
      result += `.orderBy(${renderVariableOrNumber(binary[1]!)}, ${JSON.stringify(binary[2]!)}, ${renderVariableOrNumber(binary[3]!)})`;
    } else {
      result += `.orderBy(${renderVariableOrNumber(part)})`;
    }
  }
  return result;
}

function splitTopLevel(source: string, separator: string): string[] {
  const result: string[] = [];
  let start = 0;
  let depth = 0;
  for (let index = 0; index < source.length; index++) {
    const ch = source[index]!;
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (depth === 0 && source.startsWith(separator, index)) {
      result.push(source.slice(start, index).trim());
      start = index + separator.length;
    }
  }
  result.push(source.slice(start).trim());
  return result;
}

function propertyName(source: string): string {
  const trimmed = source.trim();
  if (/^[A-Za-z_$][\w$]*$/.test(trimmed)) {
    return JSON.stringify(trimmed);
  }
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return JSON.stringify(JSON.parse(trimmed));
  }
  throw new TranslationError(`unsupported property name '${source}'`);
}

function renderNumericExpression(source: string): string {
  const trimmed = source.trim();
  const interpolation = activeInterpolations?.get(trimmed);
  if (interpolation) {
    return interpolation;
  }
  if (/^-?(?:\d+(?:\.\d*)?|\.\d+)$/.test(trimmed)) {
    return trimmed;
  }
  throw new TranslationError(`unsupported numeric expression '${source}'`);
}

function renderDefinitionExpression(source: string): string {
  const interpolation = activeInterpolations?.get(source.trim());
  if (interpolation) {
    return interpolation;
  }
  const value = renderNumericExpression(source);
  // `.def()` intentionally rejects a numeric literal because it is normally a
  // typed definition handle. Legacy queries also permit raw definition IDs.
  return `${value} as number`;
}

function renderVariableOrNumber(source: string): string {
  const trimmed = source.trim();
  const interpolation = activeInterpolations?.get(trimmed);
  if (interpolation) {
    return interpolation;
  }
  if (/^-?(?:\d+(?:\.\d*)?|\.\d+)$/.test(trimmed)) {
    return trimmed;
  }
  if (/^[A-Za-z_$][\w$]*$/.test(trimmed)) {
    return JSON.stringify(trimmed);
  }
  throw new TranslationError(`unsupported variable expression '${source}'`);
}

function translateQuery(
  source: string,
  interpolations: ReadonlyMap<string, string> = new Map(),
  targetKind: QueryTargetKind | null = null,
  masterIsSelf = false,
): string {
  const normalized = source.trim().replace(/\s+/g, " ");
  const macro = MACROS[normalized];
  if (macro) {
    return macro;
  }
  const match = grammar.match(source);
  if (match.failed()) {
    throw new TranslationError(match.message ?? `invalid query '${source}'`);
  }
  const previousInterpolations = activeInterpolations;
  const previousTargetKind = activeTargetKind;
  const previousMasterIsSelf = activeMasterIsSelf;
  activeInterpolations = interpolations;
  activeTargetKind = targetKind;
  activeMasterIsSelf = masterIsSelf;
  try {
    return querySemantics(match).fluent() as string;
  } finally {
    activeInterpolations = previousInterpolations;
    activeTargetKind = previousTargetKind;
    activeMasterIsSelf = previousMasterIsSelf;
  }
}

function parseArgs(argv: string[]): CliOptions {
  const files: string[] = [];
  let write = false;
  for (const arg of argv) {
    if (arg === "--write") {
      write = true;
    } else if (arg === "--help" || arg === "-h") {
      console.log(
        "Usage: gnx ./scripts/migrate_legacy_queries.ts [--write] [files...]",
      );
      process.exit(0);
    } else if (arg.startsWith("-")) {
      throw new Error(`Unknown option: ${arg}`);
    } else {
      files.push(arg);
    }
  }
  return { write, files };
}

async function collectFiles(root: string): Promise<string[]> {
  const entries = await readdir(root, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(root, entry.name);
      if (entry.isDirectory()) {
        return collectFiles(entryPath);
      }
      return entry.isFile() && entry.name.endsWith(".gts") ? [entryPath] : [];
    }),
  );
  return files.flat();
}

async function processFile(
  filePath: string,
  write: boolean,
): Promise<FileResult> {
  const original = await readFile(filePath, "utf-8");
  const scan = scanLegacyQueries(original);
  let content = applyReplacements(original, scan.replacements);
  if (scan.replacements.length > 0) {
    content = ensureDollarImport(content);
  }
  if (write && content !== original) {
    await writeFile(filePath, content);
  }
  return {
    path: filePath,
    changed: content !== original,
    converted: scan.replacements.length,
    dynamicQueries: scan.dynamicQueries,
    unsupportedQueries: scan.unsupportedQueries,
  };
}

function scanLegacyQueries(content: string): ScanResult {
  const replacements: Replacement[] = [];
  const unsupportedQueries: UnsupportedQuery[] = [];
  let dynamicQueries = 0;

  for (let index = 0; index < content.length;) {
    const ch = content[index]!;
    if (ch === '"' || ch === "'" || ch === "`") {
      index = skipString(content, index);
      continue;
    }
    if (ch === "/" && content[index + 1] === "/") {
      const lineEnd = content.indexOf("\n", index + 2);
      index = lineEnd === -1 ? content.length : lineEnd + 1;
      continue;
    }
    if (ch === "/" && content[index + 1] === "*") {
      const commentEnd = content.indexOf("*/", index + 2);
      index = commentEnd === -1 ? content.length : commentEnd + 2;
      continue;
    }

    const call = readLegacyQueryCall(content, index);
    if (!call) {
      index++;
      continue;
    }
    index = call.end;
    if (call.query === null) {
      dynamicQueries++;
      continue;
    }
    try {
      const fluent = translateQuery(
        call.query,
        call.interpolations,
        null,
        isMasterSelf(content, call.start),
      );
      replacements.push({
        start: call.start,
        end: call.end,
        text: `${call.all ? ":queryAll" : ":query"}(${fluent})`,
      });
    } catch (error) {
      unsupportedQueries.push({
        offset: call.start,
        source: call.query,
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  scanTargetArguments(content, replacements, unsupportedQueries);

  return { replacements, dynamicQueries, unsupportedQueries };
}

function scanTargetArguments(
  content: string,
  replacements: Replacement[],
  unsupportedQueries: UnsupportedQuery[],
): void {
  for (let index = 0; index < content.length;) {
    const ch = content[index]!;
    if (ch === '"' || ch === "'" || ch === "`") {
      index = skipString(content, index);
      continue;
    }
    if (ch === "/" && content[index + 1] === "/") {
      const lineEnd = content.indexOf("\n", index + 2);
      index = lineEnd === -1 ? content.length : lineEnd + 1;
      continue;
    }
    if (ch === "/" && content[index + 1] === "*") {
      const commentEnd = content.indexOf("*/", index + 2);
      index = commentEnd === -1 ? content.length : commentEnd + 2;
      continue;
    }

    const call = readTargetCall(content, index);
    if (!call) {
      index++;
      continue;
    }
    index = call.openParen + 1;

    for (const target of call.targets) {
      const argument = call.arguments[target.index];
      if (!argument) continue;
      const literalStart = skipWhitespace(content, argument.start);
      const directTarget = directTargetExpression(
        content.slice(literalStart, argument.end).trim(),
        isMasterSelf(content, literalStart),
      );
      if (directTarget) {
        replacements.push({
          start: literalStart,
          end: argument.end,
          text: directTarget,
        });
        continue;
      }
      if (
        content[literalStart] !== '"' &&
        content[literalStart] !== "'" &&
        content[literalStart] !== "`"
      ) {
        continue;
      }

      const literal = readStringLiteral(content, literalStart);
      if (
        !literal.valid ||
        skipWhitespace(content, literal.end) !== argument.end
      ) {
        continue;
      }
      try {
        const directTarget = directTargetExpression(
          literal.value,
          isMasterSelf(content, literalStart),
        );
        replacements.push({
          start: literalStart,
          end: literal.end,
          text:
            directTarget ??
            translateQuery(
              literal.value,
              literal.interpolations,
              target.kind,
              isMasterSelf(content, literalStart),
            ),
        });
      } catch (error) {
        unsupportedQueries.push({
          offset: literalStart,
          source: literal.value,
          reason: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }
}

function directTargetExpression(
  source: string,
  masterIsSelf = false,
): string | null {
  const normalized = source.replace(/\s+/g, "");
  if (normalized === ":self.master" && masterIsSelf) {
    return ":self";
  }
  if (normalized === ":e.skillCaller") {
    return ':e.skillCaller.cast<"character">()';
  }
  const directExternals: Readonly<Record<string, string>> = {
    "@self": ":self",
    "@master": masterIsSelf ? ":self" : ":self.master",
    "@event.skillCaller": ':e.skillCaller.cast<"character">()',
    "@event.switchTo": ":e.switchInfo.to",
    "@damage.target": ":e.target",
  };
  const directExternal = directExternals[source];
  if (directExternal) return directExternal;

  const selectedTarget = /^@targets\.(\d+)$/.exec(source);
  if (selectedTarget) return `:e.targets[${selectedTarget[1]}]`;

  const idQuery =
    /^\$\.(?:any\.|character\.)?id\(:(?<target>(?:self(?:\.master)?|e\.(?:skillCaller|target)|e\.switchInfo\.to|e\.targets\[\d+\]))\.id\)$/.exec(
      normalized,
    );
  if (!idQuery?.groups?.target) return null;
  if (idQuery.groups.target === "self.master" && masterIsSelf) {
    return ":self";
  }
  if (idQuery.groups.target === "e.skillCaller") {
    return ':e.skillCaller.cast<"character">()';
  }
  return `:${idQuery.groups.target}`;
}

function isMasterSelf(content: string, offset: number): boolean {
  const definition =
    /\bdefine\s+(character|skill|status|combatStatus|summon|support|card|extension)\b/g;
  let lastType: string | null = null;
  for (
    let match = definition.exec(content);
    match && match.index < offset;
    match = definition.exec(content)
  ) {
    lastType = match[1]!;
  }
  return lastType === "character" || lastType === "skill";
}

interface TargetCall {
  openParen: number;
  targets: readonly TargetArgument[];
  arguments: readonly CallArgument[];
}

interface CallArgument {
  start: number;
  end: number;
}

function readTargetCall(content: string, start: number): TargetCall | null {
  if (content[start] !== ":") return null;
  const nameMatch = /^:([A-Za-z_$][\w$]*)/.exec(content.slice(start));
  if (!nameMatch) return null;
  const targets = TARGET_ARGUMENTS[nameMatch[1]!];
  if (!targets) return null;

  const openParen = skipWhitespace(content, start + nameMatch[0].length);
  if (content[openParen] !== "(") return null;
  const closeParen = findMatchingParen(content, openParen);
  if (closeParen <= openParen) return null;
  return {
    openParen,
    targets,
    arguments: splitCallArguments(content, openParen, closeParen),
  };
}

function splitCallArguments(
  content: string,
  openParen: number,
  closeParen: number,
): CallArgument[] {
  const arguments_: CallArgument[] = [];
  let start = openParen + 1;
  let depth = 0;
  for (let index = start; index < closeParen; index++) {
    const ch = content[index]!;
    if (ch === '"' || ch === "'" || ch === "`") {
      index = skipString(content, index) - 1;
      continue;
    }
    if (ch === "/" && content[index + 1] === "/") {
      const lineEnd = content.indexOf("\n", index + 2);
      index = (lineEnd === -1 ? closeParen : lineEnd) - 1;
      continue;
    }
    if (ch === "/" && content[index + 1] === "*") {
      const commentEnd = content.indexOf("*/", index + 2);
      index = (commentEnd === -1 ? closeParen : commentEnd + 2) - 1;
      continue;
    }
    if (ch === "(" || ch === "[" || ch === "{") {
      depth++;
    } else if (ch === ")" || ch === "]" || ch === "}") {
      depth--;
    } else if (ch === "," && depth === 0) {
      arguments_.push({ start, end: index });
      start = index + 1;
    }
  }
  if (start < closeParen || content.slice(openParen + 1, closeParen).trim()) {
    arguments_.push({ start, end: closeParen });
  }
  return arguments_;
}

interface LegacyQueryCall {
  start: number;
  end: number;
  all: boolean;
  query: string | null;
  interpolations: ReadonlyMap<string, string>;
}

function readLegacyQueryCall(
  content: string,
  start: number,
): LegacyQueryCall | null {
  if (!content.startsWith(":$", start)) {
    return null;
  }
  const all = content[start + 2] === "$";
  const openParen = start + (all ? 3 : 2);
  if (content[openParen] !== "(") {
    return null;
  }

  let index = skipWhitespace(content, openParen + 1);
  const argumentStart = index;
  if (
    content[index] !== '"' &&
    content[index] !== "'" &&
    content[index] !== "`"
  ) {
    return {
      start,
      end: findMatchingParen(content, openParen) + 1,
      all,
      query: null,
      interpolations: new Map(),
    };
  }

  const literal = readStringLiteral(content, index);
  index = skipWhitespace(content, literal.end);
  if (content[index] === ",") {
    index = skipWhitespace(content, index + 1);
  }
  if (index !== content.length && content[index] === ")" && literal.valid) {
    return {
      start,
      end: index + 1,
      all,
      query: literal.value,
      interpolations: literal.interpolations,
    };
  }
  return {
    start,
    end: findMatchingParen(content, openParen) + 1,
    all,
    query: null,
    interpolations: new Map(),
  };
}

function readStringLiteral(
  content: string,
  start: number,
): {
  value: string;
  end: number;
  valid: boolean;
  interpolations: ReadonlyMap<string, string>;
} {
  const quote = content[start]!;
  if (quote === "`") {
    return readTemplateLiteral(content, start);
  }
  for (let index = start + 1; index < content.length; index++) {
    const ch = content[index]!;
    if (ch === "\\") {
      index++;
      continue;
    }
    if (ch === quote) {
      const raw = content.slice(start + 1, index);
      if (raw.includes("\\")) {
        return {
          value: raw,
          end: index + 1,
          valid: false,
          interpolations: new Map(),
        };
      }
      if (quote === '"') {
        return {
          value: JSON.parse(content.slice(start, index + 1)),
          end: index + 1,
          valid: true,
          interpolations: new Map(),
        };
      }
      return {
        value: raw,
        end: index + 1,
        valid: true,
        interpolations: new Map(),
      };
    }
  }
  return {
    value: content.slice(start + 1),
    end: content.length,
    valid: false,
    interpolations: new Map(),
  };
}

function readTemplateLiteral(
  content: string,
  start: number,
): {
  value: string;
  end: number;
  valid: boolean;
  interpolations: ReadonlyMap<string, string>;
} {
  const interpolations = new Map<string, string>();
  let value = "";
  for (let index = start + 1; index < content.length; index++) {
    const ch = content[index]!;
    if (ch === "\\") {
      value += content.slice(index, index + 2);
      index++;
      continue;
    }
    if (ch === "`") {
      return { value, end: index + 1, valid: true, interpolations };
    }
    if (ch === "$" && content[index + 1] === "{") {
      const expressionEnd = findMatchingBrace(content, index + 1);
      if (expressionEnd === -1) {
        return { value, end: content.length, valid: false, interpolations };
      }
      const expression = content.slice(index + 2, expressionEnd).trim();
      if (expression.length === 0) {
        return {
          value,
          end: expressionEnd + 1,
          valid: false,
          interpolations,
        };
      }
      const placeholder = String(9_000_000_000 + interpolations.size);
      interpolations.set(placeholder, expression);
      value += placeholder;
      index = expressionEnd;
      continue;
    }
    value += ch;
  }
  return { value, end: content.length, valid: false, interpolations };
}

function skipString(content: string, start: number): number {
  return readStringLiteral(content, start).end;
}

function findMatchingParen(content: string, openParen: number): number {
  let depth = 0;
  for (let index = openParen; index < content.length; index++) {
    const ch = content[index]!;
    if (ch === '"' || ch === "'" || ch === "`") {
      index = skipString(content, index) - 1;
      continue;
    }
    if (ch === "/" && content[index + 1] === "/") {
      const lineEnd = content.indexOf("\n", index + 2);
      index = lineEnd === -1 ? content.length : lineEnd;
      continue;
    }
    if (ch === "/" && content[index + 1] === "*") {
      const commentEnd = content.indexOf("*/", index + 2);
      index = commentEnd === -1 ? content.length : commentEnd + 1;
      continue;
    }
    if (ch === "(") depth++;
    if (ch === ")") {
      depth--;
      if (depth === 0) return index;
    }
  }
  return content.length - 1;
}

function findMatchingBrace(content: string, openBrace: number): number {
  let depth = 0;
  for (let index = openBrace; index < content.length; index++) {
    const ch = content[index]!;
    if (ch === '"' || ch === "'" || ch === "`") {
      index = skipString(content, index) - 1;
      continue;
    }
    if (ch === "/" && content[index + 1] === "/") {
      const lineEnd = content.indexOf("\n", index + 2);
      index = lineEnd === -1 ? content.length : lineEnd;
      continue;
    }
    if (ch === "/" && content[index + 1] === "*") {
      const commentEnd = content.indexOf("*/", index + 2);
      index = commentEnd === -1 ? content.length : commentEnd + 1;
      continue;
    }
    if (ch === "{") depth++;
    if (ch === "}") {
      depth--;
      if (depth === 0) return index;
    }
  }
  return -1;
}

function skipWhitespace(content: string, start: number): number {
  let index = start;
  while (/\s/.test(content[index] ?? "")) index++;
  return index;
}

function applyReplacements(
  content: string,
  replacements: readonly Replacement[],
): string {
  let result = content;
  for (const replacement of [...replacements].sort(
    (a, b) => b.start - a.start,
  )) {
    result =
      result.slice(0, replacement.start) +
      replacement.text +
      result.slice(replacement.end);
  }
  return result;
}

function ensureDollarImport(content: string): string {
  const importPattern =
    /import\s*\{(?<names>[\s\S]*?)\}\s*from\s*["']@gi-tcg\/core\/builder["'];?/;
  const match = importPattern.exec(content);
  if (!match?.groups?.names) {
    throw new Error("Cannot add $: no named @gi-tcg/core/builder import found");
  }
  const names = match.groups.names;
  if (/(^|,)\s*\$\s*(?=,|$)/m.test(names)) {
    return content;
  }
  const openBrace = content.indexOf("{", match.index);
  const insertion = names.includes("\n") ? "\n  $," : " $,";
  return (
    content.slice(0, openBrace + 1) + insertion + content.slice(openBrace + 1)
  );
}

function lineOf(content: string, offset: number): number {
  return content.slice(0, offset).split("\n").length;
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const files =
    options.files.length > 0
      ? options.files.map((file) => path.resolve(process.cwd(), file))
      : await collectFiles(SOURCE_ROOT);
  const results = await Promise.all(
    files.map((file) => processFile(file, options.write)),
  );
  const converted = results.reduce(
    (count, result) => count + result.converted,
    0,
  );
  const dynamic = results.reduce(
    (count, result) => count + result.dynamicQueries,
    0,
  );
  const unsupported = results.flatMap((result) =>
    result.unsupportedQueries.map((query) => ({ file: result.path, query })),
  );
  const changedFiles = results.filter((result) => result.changed).length;

  console.log(
    `${options.write ? "Wrote" : "Dry run:"} ${converted} legacy query expression(s) in ${changedFiles} file(s); ${dynamic} non-literal helper query(ies) left unchanged; ${unsupported.length} known literal(s) need manual migration.`,
  );
  for (const { file, query } of unsupported) {
    const content = await readFile(file, "utf-8");
    console.warn(
      `skipped ${path.relative(PACKAGE_ROOT, file)}:${lineOf(content, query.offset)} ${JSON.stringify(query.source)}: ${query.reason}`,
    );
  }
}

await main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
