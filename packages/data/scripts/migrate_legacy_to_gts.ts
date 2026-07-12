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

import ts from "typescript";
import { constants as fsConstants } from "node:fs";
import { access, mkdir, readFile, readdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const INDEX_LICENSE = `// Copyright (C) 2026 Piovium Labs
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

`;

type RootBuilder =
  | "attachment"
  | "card"
  | "character"
  | "combatStatus"
  | "skill"
  | "status"
  | "summon";

type FrameMode =
  | "attachment"
  | "card"
  | "character"
  | "entity"
  | "event"
  | "passive"
  | "skill"
  | "technique"
  | "techniqueSkill";

interface CliOptions {
  write: boolean;
  force: boolean;
  stdout: boolean;
  outDir: string | null;
  files: string[];
}

interface ChainStep {
  name: string;
  args: readonly ts.Expression[];
}

interface ChainInfo {
  rootName: RootBuilder;
  rootArgs: readonly ts.Expression[];
  steps: ChainStep[];
}

interface Replacement {
  start: number;
  end: number;
  text: string;
}

interface FileResult {
  path: string;
  outputPath: string;
  changed: boolean;
  converted: number;
  skipped: SkippedDefinition[];
  content: string;
}

interface SkippedDefinition {
  line: number;
  name: string;
  reason: string;
}

interface Frame {
  mode: FrameMode;
  block: GtsBlock;
  eventParentMode?: FrameMode;
}

class ConversionError extends Error {}

class GtsBlock {
  readonly entries: (string | GtsBlock)[] = [];
  readonly actions: string[] = [];
  pendingIf: string | null = null;
  pendingElse = false;
  elseReady = false;

  constructor(readonly header: string) {}

  addLine(line: string): void {
    this.entries.push(line);
  }

  addBlock(block: GtsBlock): void {
    this.entries.push(block);
  }

  addAction(lines: string[]): void {
    const normalized = stripEmptyEdgeLines(lines);
    if (normalized.length === 0) {
      return;
    }
    if (this.pendingIf !== null) {
      this.actions.push(`if (${this.pendingIf}) {`);
      this.actions.push(...indentRaw(normalized, 1));
      this.actions.push("}");
      this.pendingIf = null;
      this.pendingElse = false;
      this.elseReady = true;
      return;
    }
    if (this.pendingElse) {
      if (!this.elseReady) {
        throw new ConversionError(
          "encountered .else() without a preceding .if()",
        );
      }
      this.actions.push("else {");
      this.actions.push(...indentRaw(normalized, 1));
      this.actions.push("}");
      this.pendingElse = false;
      this.elseReady = false;
      return;
    }
    this.actions.push(...normalized);
    this.elseReady = false;
  }

  render(indent = 0): string[] {
    const pad = "  ".repeat(indent);
    const result = [`${pad}${this.header} {`];
    for (const entry of this.entries) {
      if (typeof entry === "string") {
        result.push(...indentMultiline(entry, indent + 1));
      } else {
        result.push(...entry.render(indent + 1));
      }
    }
    const actions = this.renderActions();
    for (const action of actions) {
      result.push(...indentMultiline(action, indent + 1));
    }
    result.push(`${pad}}`);
    return result;
  }

  private renderActions(): string[] {
    if (this.actions.length === 0) {
      return [];
    }
    const first = firstToken(this.actions);
    if (first === null || first === ":" || SPECIAL_DIRECT_TOKENS.has(first)) {
      return this.actions;
    }
    return ["void 0;", ...this.actions];
  }
}

const ROOT_BUILDERS = new Set<string>([
  "attachment",
  "card",
  "character",
  "combatStatus",
  "skill",
  "status",
  "summon",
]);

const COST_METHODS: Record<string, string> = {
  costAnemo: "DiceType.Anemo",
  costCryo: "DiceType.Cryo",
  costDendro: "DiceType.Dendro",
  costElectro: "DiceType.Electro",
  costEnergy: "DiceType.Energy",
  costGeo: "DiceType.Geo",
  costHydro: "DiceType.Hydro",
  costPyro: "DiceType.Pyro",
  costSame: "DiceType.Aligned",
  costVoid: "DiceType.Void",
};

const CONTEXT_SHORTCUTS = new Set<string>([
  "abortPreview",
  "adventure",
  "apply",
  "attach",
  "attachCostIncrease",
  "attachCostReduction",
  "characterStatus",
  "cleanAura",
  "combatStatus",
  "consumeNightsoul",
  "consumeUsage",
  "consumeUsagePerRound",
  "continueNextTurn",
  "convertDice",
  "createHandCard",
  "createPileCards",
  "damage",
  "dispose",
  "disposeMaxCostHands",
  "drawCards",
  "emitCustomEvent",
  "equip",
  "finishAdventure",
  "gainEnergy",
  "gainNightsoul",
  "generateDice",
  "heal",
  "immune",
  "increaseMaxHealth",
  "moveEntity",
  "rerollDice",
  "selectAndCreateHandCard",
  "selectAndPlay",
  "selectAndSummon",
  "setExtensionState",
  "setVariable",
  "addVariable",
  "addVariableWithMax",
  "summon",
  "swapCharacterPosition",
  "swapPlayerHandCards",
  "switchActive",
  "switchCards",
  "transformDefinition",
  "triggerEndPhaseSkill",
  "undrawCards",
  "useSkill",
]);

const EVENT_ARG_SHORTCUTS = new Set<string>([
  "addCost",
  "addRerollCount",
  "cancel",
  "cancelEffects",
  "changeDamageType",
  "decreaseDamage",
  "decreaseHeal",
  "deductAllCost",
  "deductCost",
  "deductOmniCost",
  "deductVoidCost",
  "divideDamage",
  "fixDice",
  "increaseDamage",
  "increaseDamageByReaction",
  "increasePiercingOtherDamage",
  "markImmune",
  "multiplyDamage",
  "reApplyTo",
  "setFastAction",
]);

const SPECIAL_DIRECT_TOKENS = new Set<string>([
  "break",
  "case",
  "catch",
  "class",
  "const",
  "continue",
  "debugger",
  "default",
  "delete",
  "do",
  "else",
  "export",
  "extends",
  "false",
  "finally",
  "for",
  "function",
  "if",
  "import",
  "in",
  "instanceof",
  "new",
  "null",
  "return",
  "super",
  "switch",
  "this",
  "throw",
  "true",
  "try",
  "typeof",
  "var",
  "void",
  "while",
  "with",
  "let",
  "static",
  "yield",
  "await",
  "enum",
  "implements",
  "interface",
  "package",
  "private",
  "protected",
  "public",
  "as",
  "async",
  "from",
  "get",
  "of",
  "set",
  "type",
  "define",
]);

const PACKAGE_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const SRC_ROOT = path.resolve(PACKAGE_ROOT, "src");

const sourceFileCache = new WeakMap<ts.Node, ts.SourceFile>();

function usage(): never {
  console.error(`Usage: gnx ./scripts/migrate_legacy_to_gts.ts [options] [files...]

Options:
  --write          Write converted files. Defaults to dry run.
  --force          Overwrite existing .gts output files.
  --out-dir <dir>  Write outputs under a separate directory.
  --stdout         Print the converted content. Requires exactly one file.
  --help           Show this help.

Without files, the script scans packages/data/src for .ts and .gts files.
.ts inputs are written as sibling .gts files; .gts inputs are updated in 
place unless --out-dir is used.`);
  process.exit(1);
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    write: false,
    force: false,
    stdout: false,
    outDir: null,
    files: [],
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    switch (arg) {
      case "--help":
      case "-h":
        usage();
        break;
      case "--write":
        options.write = true;
        break;
      case "--force":
        options.force = true;
        break;
      case "--stdout":
        options.stdout = true;
        break;
      case "--out-dir": {
        const value = argv[++i];
        if (!value) {
          throw new Error("--out-dir requires a value");
        }
        options.outDir = path.resolve(process.cwd(), value);
        break;
      }
      default:
        if (arg.startsWith("--")) {
          throw new Error(`Unknown option ${arg}`);
        }
        options.files.push(path.resolve(process.cwd(), arg));
        break;
    }
  }
  if (options.stdout && options.files.length !== 1) {
    throw new Error("--stdout requires exactly one input file");
  }
  return options;
}

async function collectDefaultFiles(): Promise<string[]> {
  const result: string[] = [];
  await walk(SRC_ROOT, result);
  return result
    .filter((file) => /\.(?:gts|ts)$/.test(file))
    // .filter((file) => !file.includes(`${path.sep}old_versions${path.sep}`))
    .sort();
}

async function walk(dir: string, result: string[]): Promise<void> {
  const entries = await readdir(dir, { withFileTypes: true });
  await Promise.all(
    entries.map(async (entry) => {
      const next = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(next, result);
      } else if (entry.isFile()) {
        result.push(next);
      }
    }),
  );
}

async function fileExists(file: string): Promise<boolean> {
  try {
    await access(file, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function outputPathFor(input: string, options: CliOptions): string {
  const relFromSrc = path.relative(SRC_ROOT, input);
  const base =
    options.outDir === null
      ? input.endsWith(".ts")
        ? input.slice(0, -3) + ".gts"
        : input
      : path.join(options.outDir, relFromSrc).replace(/\.(?:ts|gts)$/, ".gts");
  return path.resolve(base);
}

function sourceFileOf(node: ts.Node): ts.SourceFile {
  const cached = sourceFileCache.get(node);
  if (cached) {
    return cached;
  }
  const sourceFile = node.getSourceFile();
  sourceFileCache.set(node, sourceFile);
  return sourceFile;
}

function textOf(node: ts.Node): string {
  const sourceFile = sourceFileOf(node);
  return sourceFile.text.slice(node.getStart(sourceFile), node.end);
}

function unwrapExpression(expr: ts.Expression): ts.Expression {
  let current = expr;
  while (
    ts.isParenthesizedExpression(current) ||
    ts.isAsExpression(current) ||
    ts.isTypeAssertionExpression(current) ||
    ts.isSatisfiesExpression(current) ||
    ts.isNonNullExpression(current)
  ) {
    current = current.expression;
  }
  return current;
}

function getChain(expr: ts.Expression): ChainInfo | null {
  const steps: ChainStep[] = [];
  let current = unwrapExpression(expr);
  while (ts.isCallExpression(current)) {
    const callee = unwrapExpression(current.expression);
    if (ts.isPropertyAccessExpression(callee)) {
      steps.push({
        name: callee.name.text,
        args: current.arguments,
      });
      current = unwrapExpression(callee.expression);
      continue;
    }
    if (ts.isIdentifier(callee) && ROOT_BUILDERS.has(callee.text)) {
      return {
        rootName: callee.text as RootBuilder,
        rootArgs: current.arguments,
        steps: steps.reverse(),
      };
    }
    return null;
  }
  return null;
}

function getBindingName(name: ts.BindingName): string | null {
  if (ts.isIdentifier(name)) {
    return name.text;
  }
  if (ts.isArrayBindingPattern(name) && name.elements.length === 1) {
    const [element] = name.elements;
    if (
      element &&
      ts.isBindingElement(element) &&
      ts.isIdentifier(element.name)
    ) {
      return element.name.text;
    }
  }
  return null;
}

function isExported(statement: ts.VariableStatement): boolean {
  return (
    statement.modifiers?.some(
      (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword,
    ) ?? false
  );
}

function makeIdLine(
  idArg: ts.Expression,
  bindingName: string,
  exported: boolean,
): string {
  const access = exported ? "" : " private";
  return `id ${renderArg(idArg)} as${access} ${bindingName};`;
}

function rootMode(root: RootBuilder): FrameMode {
  if (root === "card" || root === "character" || root === "skill") {
    return root;
  }
  if (root === "attachment") {
    return "attachment";
  }
  return "entity";
}

function current(frames: Frame[]): Frame {
  return frames[frames.length - 1]!;
}

function popFrame(frames: Frame[], expected: FrameMode): void {
  if (current(frames).mode !== expected) {
    throw new ConversionError(
      `.${expected} terminator found outside ${expected} block`,
    );
  }
  frames.pop();
}

function closeEventIfNeeded(frames: Frame[]): void {
  if (current(frames).mode === "event") {
    frames.pop();
  }
}

const ACTION_ALLOWED_FRAMES = new Set<FrameMode>([
  "card",
  "skill",
  "passive",
  "techniqueSkill",
  "event",
]);

function allowsTopLevelAction(frame: Frame): boolean {
  return ACTION_ALLOWED_FRAMES.has(frame.mode);
}

function isSupportBlock(frame: Frame): boolean {
  return frame.block.header.startsWith("support");
}

function applyStep(
  step: ChainStep,
  frames: Frame[],
  state: { needsDiceType: boolean; needsDollar: boolean },
): void {
  if (step.name === "done") {
    return;
  }
  const frame = current(frames);

  if (step.name === "if") {
    requireArgs(step, 1);
    frame.block.pendingIf = convertCondition(step.args[0]);
    frame.block.pendingElse = false;
    return;
  }
  if (step.name === "else") {
    requireArgs(step, 0);
    frame.block.pendingElse = true;
    return;
  }
  if (step.name === "do") {
    requireArgs(step, 1);
    if (!allowsTopLevelAction(frame)) {
      throw new ConversionError(
        ".do() direct actions are not mapped at this block level",
      );
    }
    frame.block.addAction(convertAction(step.args[0]));
    return;
  }
  if (step.name === "callSnippet") {
    frame.block.addAction([renderCallSnippet(step.args)]);
    return;
  }
  if (CONTEXT_SHORTCUTS.has(step.name)) {
    if (!allowsTopLevelAction(frame)) {
      throw new ConversionError(
        `.${step.name}() is not mapped at this block level`,
      );
    }
    frame.block.addAction([`:${step.name}(${renderArgs(step.args)});`]);
    return;
  }
  if (EVENT_ARG_SHORTCUTS.has(step.name)) {
    if (!allowsTopLevelAction(frame)) {
      throw new ConversionError(
        `.${step.name}() is not mapped at this block level`,
      );
    }
    frame.block.addAction([`:e.${step.name}(${renderArgs(step.args)});`]);
    return;
  }

  switch (frame.mode) {
    case "attachment":
      applyAttachmentStep(step, frame);
      return;
    case "card":
      applyCardStep(step, frames, state);
      return;
    case "character":
      applyCharacterStep(step, frame);
      return;
    case "entity":
    case "passive":
    case "technique":
      applyEntityStep(step, frames, state);
      return;
    case "event":
      applyEventStep(step, frames);
      return;
    case "skill":
      applySkillStep(step, frames, state);
      return;
    case "techniqueSkill":
      applyTechniqueSkillStep(step, frames, state);
      return;
    default:
      assertNever(frame.mode);
  }
}

function applyCommonVersionStep(step: ChainStep, frame: Frame): boolean {
  switch (step.name) {
    case "since":
    case "until":
      requireArgs(step, 1);
      frame.block.addLine(`${step.name} ${renderArg(step.args[0]!)};`);
      return true;
    case "associateExtension":
      requireArgs(step, 1);
      frame.block.addLine(`associateExtension ${renderArg(step.args[0]!)};`);
      return true;
    case "reserve":
      requireArgs(step, 0);
      if (frame.mode === "skill") {
        const hasSkillType = frame.block.entries.some(
          (entry) =>
            typeof entry === "string" && entry.startsWith("skillType "),
        );
        if (!hasSkillType) {
          frame.block.addLine("skillType passive;");
        }
      }
      frame.block.addLine("reserved;");
      return true;
    default:
      return false;
  }
}

function applyAttachmentStep(step: ChainStep, frame: Frame): void {
  if (applyCommonVersionStep(step, frame)) {
    return;
  }
  switch (step.name) {
    case "tags":
      frame.block.addLine(`tags ${renderBareArgs(step.args)};`);
      return;
    case "addCost":
    case "deductCost":
    case "changeCostType":
    case "changeTuningTarget":
      requireArgs(step, 1);
      frame.block.addLine(`${step.name} ${renderArg(step.args[0]!)};`);
      return;
    case "disableTuning":
    case "makeEffectless":
      requireArgs(step, 0);
      frame.block.addLine(`${step.name};`);
      return;
    default:
      applyEntityLikeStep(step, frame);
      return;
  }
}

function applyCharacterStep(step: ChainStep, frame: Frame): void {
  if (applyCommonVersionStep(step, frame)) {
    return;
  }
  switch (step.name) {
    case "tags":
      frame.block.addLine(`tags ${renderBareArgs(step.args)};`);
      return;
    case "skills":
      frame.block.addLine(`skills ${renderArgs(step.args)};`);
      return;
    case "health":
    case "energy":
      requireArgs(step, 1);
      frame.block.addLine(`${step.name} ${renderArg(step.args[0]!)};`);
      return;
    case "specialEnergy":
      if (step.args.length < 1 || step.args.length > 2) {
        throw new ConversionError(
          ".specialEnergy() expects one or two arguments",
        );
      }
      frame.block.addLine(`specialEnergy ${renderArgs(step.args)};`);
      return;
    case "associateNightsoul":
      requireArgs(step, 1);
      frame.block.addLine(`associateNightsoul ${renderArg(step.args[0]!)};`);
      return;
    case "enableLunarReactions":
      frame.block.addLine(
        `enabledLunarReactions ${renderBareArgs(step.args)};`,
      );
      return;
    default:
      throw unsupported(step);
  }
}

function applySkillStep(
  step: ChainStep,
  frames: Frame[],
  state: { needsDiceType: boolean; needsDollar: boolean },
): void {
  const frame = current(frames);
  if (applyCommonVersionStep(step, frame)) {
    return;
  }
  if (applyInitiativeStep(step, frame, state)) {
    return;
  }
  switch (step.name) {
    case "type": {
      requireArgs(step, 1);
      const value = stringLiteralValue(step.args[0]!);
      if (value === "passive") {
        const block = new GtsBlock("skillType passive");
        frame.block.addBlock(block);
        frames.push({ mode: "passive", block });
      } else {
        frame.block.addLine(`skillType ${renderBareArg(step.args[0]!)};`);
      }
      return;
    }
    default:
      throw unsupported(step);
  }
}

function applyTechniqueSkillStep(
  step: ChainStep,
  frames: Frame[],
  state: { needsDiceType: boolean; needsDollar: boolean },
): void {
  const frame = current(frames);
  if (applyInitiativeStep(step, frame, state)) {
    return;
  }
  switch (step.name) {
    case "usage":
      frame.block.addLine(renderUsage("usage", step.args, false));
      return;
    case "usagePerRound":
      frame.block.addLine(renderUsage("usage", step.args, true));
      return;
    case "usageCanAppend":
      frame.block.addLine(renderUsageCanAppend(step.args));
      return;
    case "endProvide":
      requireArgs(step, 0);
      popFrame(frames, "techniqueSkill");
      return;
    default:
      throw unsupported(step);
  }
}

function applyCardStep(
  step: ChainStep,
  frames: Frame[],
  state: { needsDiceType: boolean; needsDollar: boolean },
): void {
  const frame = current(frames);
  if (applyCommonVersionStep(step, frame)) {
    return;
  }
  if (applyInitiativeStep(step, frame, state)) {
    return;
  }
  switch (step.name) {
    case "tags":
      frame.block.addLine(`tags ${renderBareArgs(step.args)};`);
      return;
    case "undiscoverable":
      requireArgs(step, 0);
      frame.block.addLine(`${step.name};`);
      return;
    case "disableTuning":
      throw new ConversionError("disableTuning is not mapped");
    case "event":
      requireArgs(step, 0);
      frame.block.addLine("event;");
      return;
    case "eventTalent": {
      if (step.args.length < 1 || step.args.length > 2) {
        throw new ConversionError(
          ".eventTalent() expects one or two arguments",
        );
      }
      frame.block.addLine(`eventTalent ${renderTalentArgs(step.args)};`);
      return;
    }
    case "legend": {
      requireArgs(step, 0);
      frame.block.addLine("legend;");
      return;
    }
    case "food":
      frame.block.addLine(renderFood(step.args, false));
      return;
    case "combatFood":
      frame.block.addLine(renderFood(step.args, true));
      return;
    case "adventureSpot": {
      requireArgs(step, 0);
      frame.block.addLine("undiscoverable;");
      const block = new GtsBlock("support place");
      block.addLine("adventureSpot;");
      frame.block.addBlock(block);
      frames.push({ mode: "entity", block });
      return;
    }
    case "elementalBlessing": {
      requireArgs(step, 2);
      frame.block.addLine("undiscoverable;");
      const block = new GtsBlock("support");
      block.addLine(`elementalBlessing ${renderArgs(step.args)};`);
      frame.block.addBlock(block);
      frames.push({ mode: "entity", block });
      return;
    }
    case "weapon":
    case "artifact":
    case "support":
    case "talent":
    case "technique":
      pushCardInnerBlock(step, frames, state);
      return;
    case "on":
    case "once":
      pushEventBlock(step, frames);
      return;
    case "nightsoulTechnique": {
      requireArgs(step, 0);
      const block = new GtsBlock("technique");
      block.addLine("nightsoul;");
      frame.block.addBlock(block);
      frames.push({ mode: "technique", block });
      return;
    }
    case "onDispose": {
      requireArgs(step, 1);
      const block = new GtsBlock("on selfDiscard");
      block.addAction(convertAction(step.args[0]!));
      frame.block.addBlock(block);
      return;
    }
    case "descriptionOnDraw":
    case "descriptionOnHCI":
    case "doSameWhenDisposed":
    case "equipment":
    case "onArbitraryEvent":
    case "onHCI":
    case "toCombatStatus":
    case "toStatus":
      throw unsupported(step);
    default:
      throw unsupported(step);
  }
}

function applyEntityStep(
  step: ChainStep,
  frames: Frame[],
  state: { needsDiceType: boolean; needsDollar: boolean },
): void {
  const frame = current(frames);
  if (applyCommonVersionStep(step, frame)) {
    return;
  }
  if (step.name === "endPhaseDamage") {
    pushEndPhaseDamage(frames, step.args);
    return;
  }
  if (applyEntityLikeStep(step, frame)) {
    return;
  }
  switch (step.name) {
    case "provideSkill": {
      requireArgs(step, 1);
      if (frame.mode !== "technique") {
        throw new ConversionError(
          ".provideSkill() is only mapped inside .technique()",
        );
      }
      const block = new GtsBlock("skill");
      block.addLine(`id ${renderArg(step.args[0]!)};`);
      frame.block.addBlock(block);
      frames.push({ mode: "techniqueSkill", block });
      return;
    }
    case "on":
    case "once":
      pushEventBlock(step, frames);
      return;
    case "endOn":
      popFrame(frames, "event");
      return;
    case "endProvide":
      throw new ConversionError(
        ".endProvide() found outside technique skill block",
      );
    default:
      if (frame.mode === "technique" && step.name === "nightsoul") {
        frame.block.addLine(renderNoArgOrOptionAttr("nightsoul", step.args));
        return;
      }
      throw unsupported(step);
  }
}

function applyEntityLikeStep(step: ChainStep, frame: Frame): boolean {
  switch (step.name) {
    case "tags":
      frame.block.addLine(`tags ${renderBareArgs(step.args)};`);
      return true;
    case "replaceDescription":
      requireArgs(step, 2);
      frame.block.addLine(`replaceDescription ${renderArgs(step.args)};`);
      return true;
    case "variable":
      if (step.args.length < 2 || step.args.length > 3) {
        throw new ConversionError(".variable() expects two or three arguments");
      }
      frame.block.addLine(
        renderAttrWithOptions(
          `variable ${renderBareArg(step.args[0]!)}, ${renderArg(step.args[1]!)}`,
          step.args[2],
        ),
      );
      return true;
    case "variableCanAppend":
      frame.block.addLine(renderVariableCanAppend(step.args));
      return true;
    case "usage":
      frame.block.addLine(renderEntityUsage(step.args));
      return true;
    case "usageCanAppend":
      frame.block.addLine(renderUsageCanAppend(step.args));
      return true;
    case "duration":
      frame.block.addLine(renderValueAndOptionsAttr("duration", step.args));
      return true;
    case "oneDuration":
      frame.block.addLine(renderNoArgOrOptionAttr("oneDuration", step.args));
      return true;
    case "shield":
      if (step.args.length < 1 || step.args.length > 2) {
        throw new ConversionError(".shield() expects one or two arguments");
      }
      frame.block.addLine(`shield ${renderArgs(step.args)};`);
      return true;
    case "nightsoulsBlessing":
      frame.block.addLine(
        renderValueAndOptionsAttr("nightsoulsBlessing", step.args),
      );
      return true;
    case "prepare":
      frame.block.addLine(renderValueAndOptionsAttr("prepare", step.args));
      return true;
    case "hint":
      if (step.args.length < 1 || step.args.length > 2) {
        throw new ConversionError(".hint() expects one or two arguments");
      }
      if (isSupportBlock(frame)) {
        throw new ConversionError(
          ".hint() is not mapped inside support blocks",
        );
      }
      frame.block.addLine(`hint ${renderArgs(step.args)};`);
      return true;
    case "hintIcon":
      requireArgs(step, 1);
      frame.block.addLine(`hint ${renderArg(step.args[0]!)};`);
      return true;
    case "conflictWith":
      requireArgs(step, 1);
      frame.block.addLine(`conflictWith ${renderArg(step.args[0]!)};`);
      return true;
    case "unique":
      if (step.args.length >= 1) {
        frame.block.addLine(`conflictWith crossCharacter, ${renderArgs(step.args)};`);
      } else {
        frame.block.addLine("conflictWith crossCharacter;");
      }
      return true;
    case "defineSnippet":
      frame.block.addLine(renderDefineSnippet(step.args));
      return true;
    case "noDefaultDispose":
      frame.block.addLine("noDefaultDispose;");
      return true;
    case "hintText":
    default:
      return false;
  }
}

function applyEventStep(step: ChainStep, frames: Frame[]): void {
  const frame = current(frames);
  switch (step.name) {
    case "usage":
      frame.block.addLine(renderUsage("usage", step.args, false));
      return;
    case "usagePerRound":
      frame.block.addLine(renderUsage("usage", step.args, true));
      return;
    case "usageCanAppend":
      frame.block.addLine(renderUsageCanAppend(step.args));
      return;
    case "listenTo":
      requireArgs(step, 1);
      frame.block.addLine(`listenTo ${renderListenTo(step.args[0]!)};`);
      return;
    case "listenToPlayer":
      requireArgs(step, 0);
      frame.block.addLine("listenTo samePlayer;");
      return;
    case "listenToAll":
      requireArgs(step, 0);
      frame.block.addLine("listenTo all;");
      return;
    case "enablePileTriggering":
      requireArgs(step, 0);
      if (frame.eventParentMode !== "card") {
        throw unsupported(step);
      }
      frame.block.addLine("enablePileTriggering;");
      return;
    case "asSkillType":
      frame.block.addLine(`asSkillType ${renderBareArgs(step.args)};`);
      return;
    case "enableHandTriggering":
      frame.block.addLine("enableHandTriggering;");
      return;
    case "endOn":
      requireArgs(step, 0);
      popFrame(frames, "event");
      return;
    case "on":
    case "once":
      closeEventIfNeeded(frames);
      pushEventBlock(step, frames);
      return;
    default:
      throw unsupported(step);
  }
}

function applyInitiativeStep(
  step: ChainStep,
  frame: Frame,
  state: { needsDiceType: boolean; needsDollar: boolean },
): boolean {
  if (step.name in COST_METHODS) {
    requireArgs(step, 1);
    state.needsDiceType = true;
    frame.block.addLine(
      `cost ${COST_METHODS[step.name]}, ${renderArg(step.args[0]!)};`,
    );
    return true;
  }
  switch (step.name) {
    case "cost":
      requireArgs(step, 2);
      frame.block.addLine(`cost ${renderArgs(step.args)};`);
      return true;
    case "addTarget":
      throw unsupported(step);
    case "filter":
      requireArgs(step, 1);
      frame.block.addLine(`filter ${renderShortcutFunction(step.args[0]!)};`);
      return true;
    case "hidden":
    case "noEnergy":
    case "prepared":
      requireArgs(step, 0);
      frame.block.addLine(`${step.name};`);
      return true;
    case "forceCharged":
    case "forcePlunging":
      throw unsupported(step);
    default:
      return false;
  }
}

function pushCardInnerBlock(
  step: ChainStep,
  frames: Frame[],
  state: { needsDiceType: boolean; needsDollar: boolean },
): void {
  const frame = current(frames);
  let header: string;
  let mode: FrameMode = "entity";
  switch (step.name) {
    case "weapon":
      requireArgs(step, 1);
      header = `weapon ${renderBareArg(step.args[0]!)}`;
      break;
    case "artifact":
      requireArgs(step, 0);
      header = "artifact";
      break;
    case "support":
      header =
        step.args.length === 0
          ? "support"
          : `support ${renderBareArgs(step.args)}`;
      break;
    case "talent":
      if (step.args.length < 1 || step.args.length > 2) {
        throw new ConversionError(".talent() expects one or two arguments");
      }
      header = `talent ${renderTalentArgs(step.args)}`;
      break;
    case "technique":
      if (step.args.length > 1) {
        throw new ConversionError(".technique() expects zero or one argument");
      }
      header = "technique";
      mode = "technique";
      break;
    default:
      throw unsupported(step);
  }
  const block = new GtsBlock(header);
  if (step.name === "technique" && step.args.length === 1) {
    const target = step.args[0]!;
    if (isDefaultTechniqueTarget(target)) {
      // GTS defaults to all my characters.
    } else {
      block.addLine(`target ${renderTargetArg(target, state)};`);
    }
  }
  frame.block.addBlock(block);
  frames.push({ mode, block });
}

function pushEventBlock(step: ChainStep, frames: Frame[]): void {
  if (step.args.length < 1 || step.args.length > 2) {
    throw new ConversionError(`.${step.name}() expects one or two arguments`);
  }
  const frame = current(frames);
  const block = new GtsBlock(`${step.name} ${renderEventName(step.args[0]!)}`);
  if (step.args[1]) {
    block.addLine(`when ${renderShortcutFunction(step.args[1]!)};`);
  }
  frame.block.addBlock(block);
  frames.push({ mode: "event", block, eventParentMode: frame.mode });
}

function pushEndPhaseDamage(
  frames: Frame[],
  args: readonly ts.Expression[],
): void {
  if (args.length < 2 || args.length > 3) {
    throw new ConversionError(
      ".endPhaseDamage() expects two or three arguments",
    );
  }
  const frame = current(frames);
  const icon = stringLiteralValue(args[0]!);
  const target = args[2] ? `, ${renderArg(args[2])}` : "";
  const block = new GtsBlock("on endPhase");
  if (icon === "swirledAnemo") {
    frame.block.addLine(`hint swirled, ${renderArg(args[1]!)};`);
    block.addAction([
      `:damage(:self.variables.hintIcon, ${renderArg(args[1]!)}${target});`,
    ]);
  } else {
    frame.block.addLine(`hint ${renderArg(args[0]!)}, ${renderArg(args[1]!)};`);
    block.addAction([
      `:damage(${renderArg(args[0]!)}, ${renderArg(args[1]!)}${target});`,
    ]);
  }
  frame.block.addBlock(block);
  frames.push({ mode: "event", block, eventParentMode: frame.mode });
}

function renderEventName(expr: ts.Expression): string {
  const value = stringLiteralValue(expr);
  if (value !== null) {
    return bareOrQuoted(value);
  }
  return renderArg(expr);
}

function renderTalentArgs(args: readonly ts.Expression[]): string {
  if (args.length === 1) {
    return renderArg(args[0]!);
  }
  return `${renderArg(args[0]!)}, ${renderBareArg(args[1]!)}`;
}

function renderFood(args: readonly ts.Expression[], combat: boolean): string {
  if (combat) {
    if (args.length > 1) {
      throw new ConversionError(".combatFood() expects zero or one argument");
    }
    return renderAttrWithOptions("food combat", args[0]);
  }
  if (args.length > 1) {
    throw new ConversionError(".food() expects zero or one argument");
  }
  return renderAttrWithOptions("food", args[0]);
}

function renderTargetArg(
  arg: ts.Expression,
  state: { needsDollar: boolean },
): string {
  if (ts.isArrowFunction(arg)) {
    if (arg.parameters.length !== 1) {
      throw new ConversionError("target lambda must have one parameter");
    }
    const param = arg.parameters[0]!.name;
    if (!ts.isIdentifier(param) || param.text !== "$") {
      throw new ConversionError("target lambda parameter must be named $");
    }
    state.needsDollar = true;
    if (ts.isBlock(arg.body)) {
      throw new ConversionError("block target lambdas are not mapped");
    }
    return textOf(arg.body);
  }
  const value = stringLiteralValue(arg);
  if (value !== null) {
    throw new ConversionError(
      "legacy string target queries do not have an identical GTS VM mapping",
    );
  }
  return renderArg(arg);
}

function isDefaultTechniqueTarget(arg: ts.Expression): boolean {
  return stringLiteralValue(arg) === "my characters";
}

function renderDefineSnippet(args: readonly ts.Expression[]): string {
  if (args.length < 1 || args.length > 2) {
    throw new ConversionError(".defineSnippet() expects one or two arguments");
  }
  if (args.length === 1) {
    return `defineSnippet ${renderShortcutFunction(args[0]!)};`;
  }
  return `defineSnippet ${renderBareArg(args[0]!)}, ${renderShortcutFunction(args[1]!)};`;
}

function renderCallSnippet(args: readonly ts.Expression[]): string {
  if (args.length > 2) {
    throw new ConversionError(".callSnippet() expects at most two arguments");
  }
  if (args.length === 0) {
    return ":callSnippet();";
  }
  const name = stringLiteralValue(args[0]!);
  if (name === null) {
    throw new ConversionError(".callSnippet() name must be a string literal");
  }
  const projection = args[1] ? renderArg(args[1]) : "";
  return `:callSnippet.${name}(${projection});`;
}

function renderValueAndOptionsAttr(
  name: string,
  args: readonly ts.Expression[],
): string {
  if (args.length < 1 || args.length > 2) {
    throw new ConversionError(`.${name}() expects one or two arguments`);
  }
  return renderAttrWithOptions(`${name} ${renderArg(args[0]!)}`, args[1]);
}

function renderNoArgOrOptionAttr(
  name: string,
  args: readonly ts.Expression[],
): string {
  if (args.length > 1) {
    throw new ConversionError(`.${name}() expects zero or one argument`);
  }
  return renderAttrWithOptions(name, args[0]);
}

function renderVariableCanAppend(args: readonly ts.Expression[]): string {
  if (args.length < 2 || args.length > 5) {
    throw new ConversionError(
      ".variableCanAppend() expects two to five arguments",
    );
  }
  const [name, value, max, appendOrOpt, opt] = args;
  const optionLines: string[] = [];
  if (!max) {
    optionLines.push("append;");
  } else if (appendOrOpt && isNumberLikeExpression(appendOrOpt)) {
    optionLines.push(renderAppendOption(max!, appendOrOpt));
    if (opt) {
      optionLines.push(...renderOptionsObject(opt));
    }
  } else {
    optionLines.push(renderAppendOption(max!));
    if (appendOrOpt) {
      optionLines.push(...renderOptionsObject(appendOrOpt));
    }
  }
  return renderAttrWithOptionLines(
    `variable ${renderBareArg(name!)}, ${renderArg(value!)}`,
    optionLines,
  );
}

function renderEntityUsage(args: readonly ts.Expression[]): string {
  if (args.length < 1 || args.length > 2) {
    throw new ConversionError(".usage() expects one or two arguments");
  }
  return renderAttrWithOptions(`usage ${renderArg(args[0]!)}`, args[1]);
}

function renderUsageCanAppend(args: readonly ts.Expression[]): string {
  if (args.length < 1 || args.length > 3) {
    throw new ConversionError(
      ".usageCanAppend() expects one to three arguments",
    );
  }
  const optionLines =
    args.length >= 2 ? [renderAppendOption(args[1]!, args[2])] : ["append;"];
  return renderAttrWithOptionLines(`usage ${renderArg(args[0]!)}`, optionLines);
}

function renderUsage(
  attr: string,
  args: readonly ts.Expression[],
  perRoundSugar: boolean,
): string {
  if (args.length < 1 || args.length > 2) {
    throw new ConversionError(
      `.${perRoundSugar ? "usagePerRound" : "usage"}() expects one or two arguments`,
    );
  }
  const count = args[0]!;
  const optionsArg = args[1];
  const optionLines = optionsArg ? renderOptionsObject(optionsArg) : [];
  let perRound = perRoundSugar;
  const withoutPerRound = optionLines.filter((line) => {
    if (/^perRound(?:\s|;)/.test(line)) {
      perRound = true;
      return false;
    }
    return true;
  });
  const head = perRound
    ? `${attr} perRound, ${renderArg(count)}`
    : `${attr} ${renderArg(count)}`;
  return renderAttrWithOptionLines(head, withoutPerRound);
}

function renderAppendOption(
  limit: ts.Expression,
  value?: ts.Expression,
): string {
  if (value) {
    return `append {\n${indentMultiline(`limit ${renderArg(limit)};\nvalue ${renderArg(value)};`, 1).join("\n")}\n};`;
  }
  if (isInfinityExpression(limit)) {
    return "append;";
  }
  return `append ${renderArg(limit)};`;
}

function renderListenTo(expr: ts.Expression): string {
  if (
    ts.isPropertyAccessExpression(expr) &&
    textOf(expr.expression) === "ListenTo"
  ) {
    switch (expr.name.text) {
      case "All":
        return "all";
      case "Myself":
        return "myself";
      case "SameArea":
        return "sameArea";
      case "SamePlayer":
        return "samePlayer";
    }
  }
  const value = stringLiteralValue(expr);
  if (value !== null) {
    return bareOrQuoted(value);
  }
  return renderArg(expr);
}

function renderShortcutFunction(fn: ts.Expression): string {
  const converted = convertFunction(fn);
  const typeAnnotation = converted.returnType ? `<${converted.returnType}>` : "";
  if (converted.kind === "expr") {
    return `:${typeAnnotation}( ${converted.code} )`;
  }
  return `:${typeAnnotation}{\n${indentRaw(splitLines(converted.code), 1).join("\n")}\n}`;
}

function convertCondition(fn: ts.Expression | undefined): string {
  if (!fn) {
    throw new ConversionError(".if() expects one condition argument");
  }
  const converted = convertFunction(fn);
  if (converted.kind === "expr") {
    return converted.code;
  }
  return `(() => {\n${indentRaw(splitLines(converted.code), 1).join("\n")}\n})()`;
}

function convertAction(fn: ts.Expression | undefined): string[] {
  if (!fn) {
    throw new ConversionError(".do() expects one operation argument");
  }
  const converted = convertFunction(fn);
  if (converted.kind === "expr") {
    return [`${converted.code};`];
  }
  return splitLines(converted.code);
}

function convertFunction(fn: ts.Expression): {
  kind: "block" | "expr";
  code: string;
  returnType: string | null;
} {
  const unwrapped = unwrapExpression(fn);
  if (!ts.isArrowFunction(unwrapped) && !ts.isFunctionExpression(unwrapped)) {
    throw new ConversionError("expected an inline function");
  }
  const params = unwrapped.parameters.map((param) => {
    if (!ts.isIdentifier(param.name)) {
      throw new ConversionError(
        "only identifier function parameters are supported",
      );
    }
    return param.name.text;
  });
  const contextParam = params[0] ?? null;
  const eventParam = params[1] ?? null;
  const returnType = unwrapped.type ? textOf(unwrapped.type) : null;

  if (ts.isBlock(unwrapped.body)) {
    const code = replaceContextReferences(
      unwrapped.body,
      contextParam,
      eventParam,
    );
    return {
      kind: "block",
      code: collapseMultilineTemplateLiterals(dedent(code)),
      returnType,
    };
  }
  return {
    kind: "expr",
    code: collapseMultilineTemplateLiterals(
      replaceContextReferences(unwrapped.body, contextParam, eventParam),
    ),
    returnType,
  };
}

function blockBodyText(block: ts.Block): string {
  const sourceFile = sourceFileOf(block);
  return sourceFile.text.slice(block.getStart(sourceFile) + 1, block.end - 1);
}

function collapseMultilineTemplateLiterals(code: string): string {
  return code.replace(/`(?:[^`\\]|\\.)*`/gs, (match) => {
    if (!match.includes("\n")) {
      return match;
    }
    const content = match.slice(1, -1);
    const collapsed = content.replace(/\\`/g, "`").replace(/\s+/g, " ").trim();
    return `\`${collapsed}\``;
  });
}

function replaceContextReferences(
  bodyNode: ts.ConciseBody,
  contextParam: string | null,
  eventParam: string | null,
): string {
  const sourceFile = bodyNode.getSourceFile();
  const bodyStart = bodyNode.getStart(sourceFile);
  const bodyEnd = bodyNode.getEnd();
  const bodyText = sourceFile.text.slice(bodyStart, bodyEnd);
  const replacements = computeContextReplacements(
    bodyNode,
    contextParam,
    eventParam,
  );
  replacements.sort((a, b) => b.start - a.start);
  let result = bodyText;
  for (const { start, end, replacement } of replacements) {
    result =
      result.slice(0, start - bodyStart) +
      replacement +
      result.slice(end - bodyStart);
  }
  if (ts.isBlock(bodyNode)) {
    result = result.slice(1, -1);
  }
  return result;
}

function computeContextReplacements(
  bodyNode: ts.ConciseBody,
  contextParam: string | null,
  eventParam: string | null,
): Array<{ start: number; end: number; replacement: string }> {
  const sourceFile = bodyNode.getSourceFile();
  const targetParams = new Set<string>();
  if (contextParam) targetParams.add(contextParam);
  if (eventParam) targetParams.add(eventParam);

  const replacements: Array<{ start: number; end: number; replacement: string }> =
    [];
  const scopeStack: string[] = [];
  if (contextParam) scopeStack.push(contextParam);
  if (eventParam) scopeStack.push(eventParam);

  function isActive(name: string): boolean {
    if (!targetParams.has(name)) return false;
    const firstIndex = scopeStack.indexOf(name);
    const lastIndex = scopeStack.lastIndexOf(name);
    return firstIndex !== -1 && firstIndex === lastIndex;
  }

  function pushParamNames(params: ts.NodeArray<ts.ParameterDeclaration>): void {
    for (const param of params) {
      if (ts.isIdentifier(param.name)) {
        const name = param.name.text;
        if (targetParams.has(name)) scopeStack.push(name);
      }
    }
  }

  function popParamNames(params: ts.NodeArray<ts.ParameterDeclaration>): void {
    for (const param of params) {
      if (ts.isIdentifier(param.name)) {
        const name = param.name.text;
        if (targetParams.has(name)) scopeStack.pop();
      }
    }
  }

  function visit(node: ts.Node): void {
    if (
      ts.isArrowFunction(node) ||
      ts.isFunctionExpression(node) ||
      ts.isFunctionDeclaration(node)
    ) {
      pushParamNames(node.parameters);
      if (node.body) visit(node.body);
      popParamNames(node.parameters);
      return;
    }
    if (ts.isCatchClause(node)) {
      if (node.variableDeclaration && ts.isIdentifier(node.variableDeclaration.name)) {
        const name = node.variableDeclaration.name.text;
        if (targetParams.has(name)) scopeStack.push(name);
      }
      if (node.block) visit(node.block);
      if (node.variableDeclaration && ts.isIdentifier(node.variableDeclaration.name)) {
        const name = node.variableDeclaration.name.text;
        if (targetParams.has(name)) scopeStack.pop();
      }
      return;
    }
    if (ts.isIdentifier(node)) {
      if (isPropertyName(node)) {
        return;
      }
      const name = node.text;
      if (isActive(name)) {
        const parent = node.parent;
        if (contextParam && name === contextParam) {
          if (
            ts.isPropertyAccessExpression(parent) &&
            parent.expression === node
          ) {
            replacements.push({
              start: parent.getStart(sourceFile),
              end: parent.getEnd(),
              replacement: `:${parent.name.text}`,
            });
          } else {
            throw new ConversionError(
              `standalone context parameter '${contextParam}' cannot be mapped to GTS`,
            );
          }
        } else if (eventParam && name === eventParam) {
          if (
            ts.isPropertyAccessExpression(parent) &&
            parent.expression === node
          ) {
            const dot = parent.questionDotToken ? "?." : ".";
            replacements.push({
              start: parent.getStart(sourceFile),
              end: parent.getEnd(),
              replacement: `:e${dot}${parent.name.text}`,
            });
          } else {
            replacements.push({
              start: node.getStart(sourceFile),
              end: node.getEnd(),
              replacement: ":e",
            });
          }
        }
      }
      return;
    }
    ts.forEachChild(node, visit);
  }

  visit(bodyNode);
  return replacements;
}

function isPropertyName(node: ts.Identifier): boolean {
  const parent = node.parent;
  if (!parent) return false;
  if (ts.isPropertyAssignment(parent) && parent.name === node) return true;
  if (ts.isShorthandPropertyAssignment(parent) && parent.name === node) return true;
  if (ts.isPropertySignature(parent) && parent.name === node) return true;
  if (ts.isMethodDeclaration(parent) && parent.name === node) return true;
  if (ts.isEnumMember(parent) && parent.name === node) return true;
  if (ts.isGetAccessorDeclaration(parent) && parent.name === node) return true;
  if (ts.isSetAccessorDeclaration(parent) && parent.name === node) return true;
  return false;
}

function readStringLike(
  code: string,
  start: number,
  quote: string,
): { text: string; end: number } {
  let i = start + 1;
  while (i < code.length) {
    const ch = code[i]!;
    if (ch === "\\") {
      i += 2;
      continue;
    }
    if (ch === quote) {
      return { text: code.slice(start, i + 1), end: i + 1 };
    }
    i++;
  }
  return { text: code.slice(start), end: code.length };
}

function renderAttrWithOptions(head: string, options?: ts.Expression): string {
  if (!options) {
    return `${head};`;
  }
  return renderAttrWithOptionLines(head, renderOptionsObject(options));
}

function renderAttrWithOptionLines(
  head: string,
  optionLines: string[],
): string {
  if (optionLines.length === 0) {
    return `${head};`;
  }
  return `${head} {\n${indentRaw(optionLines, 1).join("\n")}\n};`;
}

function renderOptionsObject(expr: ts.Expression): string[] {
  const unwrapped = unwrapExpression(expr);
  if (!ts.isObjectLiteralExpression(unwrapped)) {
    throw new ConversionError("options must be an object literal");
  }
  const result: string[] = [];
  for (const property of unwrapped.properties) {
    if (!ts.isPropertyAssignment(property)) {
      throw new ConversionError(
        "only simple option property assignments are supported",
      );
    }
    const name = propertyName(property.name);
    const value = unwrapExpression(property.initializer);
    if (ts.isObjectLiteralExpression(value)) {
      result.push(
        `${name} {\n${indentRaw(renderOptionsObject(value), 1).join("\n")}\n};`,
      );
    } else if (value.kind === ts.SyntaxKind.TrueKeyword) {
      result.push(`${name};`);
    } else if (value.kind === ts.SyntaxKind.FalseKeyword) {
      result.push(`${name} false;`);
    } else {
      result.push(`${name} ${renderArg(value)};`);
    }
  }
  return result;
}

function propertyName(name: ts.PropertyName): string {
  if (
    ts.isIdentifier(name) ||
    ts.isStringLiteral(name) ||
    ts.isNumericLiteral(name)
  ) {
    return name.text;
  }
  throw new ConversionError("computed option names are not supported");
}

function renderArgs(args: readonly ts.Expression[]): string {
  return args.map(renderArg).join(", ");
}

function renderBareArgs(args: readonly ts.Expression[]): string {
  return args.map(renderBareArg).join(", ");
}

function renderArg(expr: ts.Expression): string {
  const unwrapped = unwrapExpression(expr);
  if (ts.isArrowFunction(unwrapped) || ts.isFunctionExpression(unwrapped)) {
    return `(${textOf(expr)})`;
  }
  const value = stringLiteralValue(expr);
  if (value !== null) {
    return JSON.stringify(value);
  }
  if (
    ts.isAsExpression(expr) ||
    ts.isSatisfiesExpression(expr) ||
    ts.isTypeAssertionExpression(expr)
  ) {
    return `(${textOf(expr)})`;
  }
  return textOf(expr);
}

function renderBareArg(expr: ts.Expression): string {
  const value = stringLiteralValue(expr);
  if (value !== null) {
    return bareOrQuoted(value);
  }
  return textOf(expr);
}

const RESERVED_IDENTIFIERS = new Set([
  // ECMAScript reserved words
  "break", "case", "catch", "class", "const", "continue", "debugger", "default",
  "delete", "do", "else", "export", "extends", "false", "finally", "for", "function",
  "if", "import", "in", "instanceof", "new", "null", "return", "super", "switch",
  "this", "throw", "true", "try", "typeof", "var", "void", "while", "with",
  // Strict mode reserved words
  "let", "static", "yield", "await",
  // Future reserved words
  "enum", "implements", "interface", "package", "private", "protected", "public",
  // TypeScript / GTS keywords
  "type", "define", "as",
]);

function bareOrQuoted(value: string): string {
  return /^[A-Za-z_$][\w$]*$/.test(value) && !RESERVED_IDENTIFIERS.has(value)
    ? value
    : JSON.stringify(value);
}

function stringLiteralValue(expr: ts.Expression): string | null {
  const unwrapped = unwrapExpression(expr);
  if (
    ts.isStringLiteral(unwrapped) ||
    ts.isNoSubstitutionTemplateLiteral(unwrapped)
  ) {
    return unwrapped.text;
  }
  return null;
}

function isNumberLikeExpression(expr: ts.Expression): boolean {
  const unwrapped = unwrapExpression(expr);
  return ts.isNumericLiteral(unwrapped) || isInfinityExpression(unwrapped);
}

function isInfinityExpression(expr: ts.Expression): boolean {
  const unwrapped = unwrapExpression(expr);
  return ts.isIdentifier(unwrapped) && unwrapped.text === "Infinity";
}

function requireArgs(step: ChainStep, count: number): void {
  if (step.args.length !== count) {
    throw new ConversionError(`.${step.name}() expects ${count} argument(s)`);
  }
}

function unsupported(step: ChainStep): ConversionError {
  return new ConversionError(`unsupported builder method .${step.name}()`);
}

function assertNever(value: never): never {
  throw new Error(`Unexpected value ${value}`);
}

function dedent(text: string): string {
  const lines = stripEmptyEdgeLines(splitLines(text));
  const indents = lines
    .filter((line) => line.trim().length > 0)
    .map((line) => line.match(/^\s*/)?.[0].length ?? 0);
  const min = indents.length === 0 ? 0 : Math.min(...indents);
  return lines.map((line) => line.slice(min)).join("\n");
}

function splitLines(text: string): string[] {
  return text.replace(/\r\n?/g, "\n").split("\n");
}

function stripEmptyEdgeLines(lines: readonly string[]): string[] {
  let start = 0;
  let end = lines.length;
  while (start < end && lines[start]!.trim() === "") {
    start++;
  }
  while (end > start && lines[end - 1]!.trim() === "") {
    end--;
  }
  return lines.slice(start, end);
}

function indentRaw(lines: readonly string[], levels: number): string[] {
  const pad = "  ".repeat(levels);
  return lines.map((line) => (line.length === 0 ? "" : pad + line));
}

function indentMultiline(text: string, levels: number): string[] {
  return indentRaw(splitLines(text), levels);
}

function firstToken(lines: readonly string[]): string | null {
  const text = lines.join("\n").trimStart();
  if (text.length === 0) {
    return null;
  }
  if (text[0] === ":") {
    return ":";
  }
  const match = /^[A-Za-z_$][\w$]*/.exec(text);
  return match?.[0] ?? text[0]!;
}

function isIdentifierStart(ch: string): boolean {
  return /[A-Za-z_$]/.test(ch);
}

function isIdentifierPart(ch: string): boolean {
  return /[A-Za-z0-9_$]/.test(ch);
}

function maskGtsDefines(content: string): string {
  let result = content;
  const ranges: [number, number][] = [];
  const defineRegex = /^(\s*)define\s+[A-Za-z_$][\w$]*/gm;
  let match: RegExpExecArray | null;
  while ((match = defineRegex.exec(content))) {
    const start = match.index + match[1]!.length;
    const open = content.indexOf("{", defineRegex.lastIndex);
    if (open === -1) {
      continue;
    }
    const close = findMatchingBrace(content, open);
    if (close === -1) {
      continue;
    }
    let end = close + 1;
    while (/\s/.test(content[end] ?? "")) {
      end++;
    }
    if (content[end] === ";") {
      end++;
    }
    ranges.push([start, end]);
    defineRegex.lastIndex = end;
  }
  for (const [start, end] of ranges.toReversed()) {
    const replacement = content.slice(start, end).replace(/[^\r\n]/g, " ");
    result = result.slice(0, start) + replacement + result.slice(end);
  }
  return result;
}

function findMatchingBrace(content: string, open: number): number {
  let depth = 0;
  for (let i = open; i < content.length; i++) {
    const ch = content[i]!;
    if (ch === "'" || ch === '"' || ch === "`") {
      i = readStringLike(content, i, ch).end - 1;
      continue;
    }
    if (ch === "/" && content[i + 1] === "/") {
      const end = content.indexOf("\n", i + 2);
      i = end === -1 ? content.length : end;
      continue;
    }
    if (ch === "/" && content[i + 1] === "*") {
      const end = content.indexOf("*/", i + 2);
      i = end === -1 ? content.length : end + 1;
      continue;
    }
    if (ch === "{") {
      depth++;
    } else if (ch === "}") {
      depth--;
      if (depth === 0) {
        return i;
      }
    }
  }
  return -1;
}

function lineOf(sourceFile: ts.SourceFile, position: number): number {
  return sourceFile.getLineAndCharacterOfPosition(position).line + 1;
}

function applyReplacements(
  content: string,
  replacements: Replacement[],
): string {
  let result = content;
  for (const replacement of replacements.toSorted(
    (a, b) => b.start - a.start,
  )) {
    result =
      result.slice(0, replacement.start) +
      replacement.text +
      result.slice(replacement.end);
  }
  return result;
}

function ensureBuilderImports(
  content: string,
  names: readonly string[],
): string {
  const missing = names.filter((name) => !builderImportHas(content, name));
  if (missing.length === 0) {
    return content;
  }
  const importRegex =
    /import\s*\{(?<imports>[^}]*)\}\s*from\s*["']@gi-tcg\/core\/builder["'];?/m;
  const match = importRegex.exec(content);
  if (match?.groups?.imports !== undefined) {
    const imports = match.groups.imports
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    const next = [...imports, ...missing].sort((a, b) => a.localeCompare(b));
    const replacement = `import { ${next.join(", ")} } from "@gi-tcg/core/builder";`;
    return (
      content.slice(0, match.index) +
      replacement +
      content.slice(match.index + match[0].length)
    );
  }
  return `import { ${missing.join(", ")} } from "@gi-tcg/core/builder";\n${content}`;
}

function builderImportHas(content: string, name: string): boolean {
  const importRegex =
    /import\s*\{(?<imports>[^}]*)\}\s*from\s*["']@gi-tcg\/core\/builder["'];?/m;
  const match = importRegex.exec(content);
  if (!match?.groups?.imports) {
    return false;
  }
  return match.groups.imports
    .split(",")
    .map((item) => item.trim().split(/\s+as\s+/)[0])
    .includes(name);
}

async function processFile(
  inputPath: string,
  options: CliOptions,
): Promise<FileResult> {
  const original = await readFile(inputPath, "utf-8");
  const masked = inputPath.endsWith(".gts")
    ? maskGtsDefines(original)
    : original;
  const sourceFile = ts.createSourceFile(
    inputPath,
    masked,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  sourceFileCache.set(sourceFile, sourceFile);
  const replacements: Replacement[] = [];
  const skipped: SkippedDefinition[] = [];
  let converted = 0;
  let needsDiceType = false;
  let needsDollar = false;

  for (const statement of sourceFile.statements) {
    if (!ts.isVariableStatement(statement)) {
      continue;
    }
    if (statement.declarationList.declarations.length !== 1) {
      continue;
    }
    const declaration = statement.declarationList.declarations[0]!;
    const chain = declaration.initializer
      ? getChain(declaration.initializer)
      : null;
    if (!chain) {
      continue;
    }
    const bindingName = getBindingName(declaration.name) ?? "<anonymous>";
    try {
      const state = { needsDiceType: false, needsDollar: false };
      const replacement = convertDefinitionWithState(
        declaration,
        statement,
        state,
      );
      needsDiceType ||= state.needsDiceType;
      needsDollar ||= state.needsDollar;
      replacements.push({
        start: statement.getStart(sourceFile),
        end: statement.end,
        text: replacement.trimEnd(),
      });
      converted++;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      skipped.push({
        line: lineOf(sourceFile, statement.getStart(sourceFile)),
        name: bindingName,
        reason: message,
      });
    }
  }

  let content =
    replacements.length > 0
      ? applyReplacements(original, replacements)
      : original;
  const importNames: string[] = [];
  if (needsDiceType) {
    importNames.push("DiceType");
  }
  if (needsDollar) {
    importNames.push("$");
  }
  content = ensureBuilderImports(content, importNames);
  const outputPath = outputPathFor(inputPath, options);
  return {
    path: inputPath,
    outputPath,
    changed: content !== original || outputPath !== inputPath,
    converted,
    skipped,
    content: updateRelativeImports(content),
  };
}

function convertDefinitionWithState(
  declaration: ts.VariableDeclaration,
  statement: ts.VariableStatement,
  state: { needsDiceType: boolean; needsDollar: boolean },
): string {
  if (!declaration.initializer) {
    throw new ConversionError("declaration has no initializer");
  }
  const bindingName = getBindingName(declaration.name);
  if (bindingName === null) {
    throw new ConversionError("unsupported binding pattern");
  }
  const chain = getChain(declaration.initializer);
  if (!chain) {
    throw new ConversionError(
      "initializer is not a supported legacy builder chain",
    );
  }
  if (chain.rootArgs.length !== 1) {
    throw new ConversionError(
      `${chain.rootName}() must have exactly one id argument`,
    );
  }
  const root = new GtsBlock(`define ${chain.rootName}`);
  root.addLine(
    makeIdLine(chain.rootArgs[0]!, bindingName, isExported(statement)),
  );
  const frames: Frame[] = [{ mode: rootMode(chain.rootName), block: root }];
  for (const step of chain.steps) {
    applyStep(step, frames, state);
  }
  if (
    frames.some((frame) => frame.block.pendingIf || frame.block.pendingElse)
  ) {
    throw new ConversionError("dangling .if() or .else()");
  }
  if (
    !chain.steps.some((step) => step.name === "done" || step.name === "reserve")
  ) {
    throw new ConversionError("chain is missing .done() or .reserve()");
  }
  return root.render().join("\n") + "\n";
}

function updateRelativeImports(content: string): string {
  return content.replace(
    /(from\s+["'])(\.\.?\/[^"']+)(["'])/g,
    (match, prefix, sourcePath, suffix) => {
      if (sourcePath.endsWith(".ts")) {
        return `${prefix}${sourcePath.slice(0, -3)}.gts${suffix}`;
      }
      const lastSegment = sourcePath.split("/").pop() ?? "";
      if (!lastSegment.includes(".") && !sourcePath.endsWith("/")) {
        return `${prefix}${sourcePath}.gts${suffix}`;
      }
      return match;
    },
  );
}

async function updateAllGtsRelativeImports(): Promise<void> {
  const files = await collectDefaultFiles();
  for (const file of [...files]) {
    if (!file.endsWith(".gts")) continue;
    const content = await readFile(file, "utf-8");
    const updated = updateRelativeImports(content);
    if (updated !== content) {
      await writeFile(file, updated);
    }
  }
}

async function regenerateIndex(): Promise<void> {
  const indexPath = path.join(SRC_ROOT, "index.ts");
  const entries = await readdir(SRC_ROOT, { recursive: true, withFileTypes: true });
  const files = entries
    .filter(
      (entry) =>
        entry.isFile() &&
        entry.name.endsWith(".gts") &&
        entry.parentPath !== SRC_ROOT,
    )
    .map((entry) => path.join(entry.parentPath, entry.name))
    .toSorted((a, b) => a.localeCompare(b));

  const imports = files
    .map((file) => {
      const rel = path.relative(SRC_ROOT, file).replace(/\\/g, "/");
      return `import "./${rel}";`;
    })
    .join("\n");

  const content = `${INDEX_LICENSE}// Generated by scripts/generators/imports.ts
// DO NOT EDIT

import "./begin.ts";

import "./commons.gts";
${imports}

export * from "./end.ts";
export { default } from "./end.ts";
`;
  await writeFile(indexPath, content);
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const files =
    options.files.length > 0 ? options.files : await collectDefaultFiles();
  const results = await Promise.all(
    files.map((file) => processFile(file, options)),
  );

  if (options.stdout) {
    process.stdout.write(results[0]!.content);
    return;
  }

  let written = 0;
  if (options.write) {
    for (const result of results) {
      if (result.converted === 0) {
        continue;
      }
      if (
        result.outputPath !== result.path &&
        !options.force &&
        (await fileExists(result.outputPath))
      ) {
        console.warn(
          `skip write ${path.relative(PACKAGE_ROOT, result.outputPath)}: file exists (use --force)`,
        );
        continue;
      }
      await mkdir(path.dirname(result.outputPath), { recursive: true });
      await writeFile(result.outputPath, result.content);
      if (result.outputPath !== result.path) {
        await unlink(result.path);
      }
      written++;
    }
    await updateAllGtsRelativeImports();
    await regenerateIndex();
  }

  const converted = results.reduce((sum, item) => sum + item.converted, 0);
  const skipped = results.reduce((sum, item) => sum + item.skipped.length, 0);
  const changedFiles = results.filter((result) => result.converted > 0).length;
  console.log(
    `${options.write ? "Wrote" : "Dry run:"} ${converted} definition(s) in ${changedFiles} file(s); skipped ${skipped}.`,
  );
  if (options.write) {
    console.log(`Files written: ${written}.`);
  }
  for (const result of results) {
    if (result.converted > 0) {
      console.log(
        `converted ${result.converted}: ${path.relative(PACKAGE_ROOT, result.path)} -> ${path.relative(PACKAGE_ROOT, result.outputPath)}`,
      );
    }
    for (const skip of result.skipped) {
      console.log(
        `skipped ${path.relative(PACKAGE_ROOT, result.path)}:${skip.line} ${skip.name}: ${skip.reason}`,
      );
    }
  }
}

await main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
