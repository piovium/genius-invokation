// Copyright (C) 2024-2025 Guyutongxue
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
import { parse } from "@gi-tcg/gts-transpiler";
import tsdoc, {
  TSDocConfiguration,
  TSDocTagDefinition,
  TSDocParser,
  TSDocTagSyntaxKind,
} from "@microsoft/tsdoc";
import { existsSync } from "node:fs";
import { readFile, writeFile, mkdir, appendFile } from "node:fs/promises";
import path from "node:path";
import { BASE_PATH, LICENSE, SAVE_OLD_CODES, OLD_VERSION } from "./config";
import { pascalCase } from "case-anything";

const config = new TSDocConfiguration();
const tagDefs = [
  new TSDocTagDefinition({
    tagName: "@id",
    syntaxKind: TSDocTagSyntaxKind.BlockTag,
  }),
  new TSDocTagDefinition({
    tagName: "@name",
    syntaxKind: TSDocTagSyntaxKind.BlockTag,
  }),
  new TSDocTagDefinition({
    tagName: "@description",
    syntaxKind: TSDocTagSyntaxKind.BlockTag,
  }),
  new TSDocTagDefinition({
    tagName: "@outdated",
    syntaxKind: TSDocTagSyntaxKind.BlockTag,
  }),
];
config.addTagDefinitions(tagDefs);
config.setSupportForTags(tagDefs, true);
const parser = new TSDocParser(config);

// 并非标准实现；将软回车视为硬回车
function printNode(node: tsdoc.DocNode): string {
  switch (node.kind) {
    case tsdoc.DocNodeKind.Section: {
      const n = node as tsdoc.DocSection;
      return n.nodes.map(printNode).join("");
    }
    case tsdoc.DocNodeKind.Paragraph: {
      const n = node as tsdoc.DocParagraph;
      return n.nodes.map(printNode).join("");
    }
    case tsdoc.DocNodeKind.PlainText: {
      const n = node as tsdoc.DocPlainText;
      return n.text;
    }
    case tsdoc.DocNodeKind.SoftBreak: {
      const n = node as tsdoc.DocSoftBreak;
      return "\n";
    }
    default:
      throw new Error(`Unsupported node kind ${node.kind}`);
  }
}

interface CommentInfo {
  range: {
    pos: number;
    end: number;
  };
  id: number;
  name: string;
  description: string;
  code: string;
}

interface CommentRange {
  type: "ts" | "gts";
  range: {
    pos: number;
    end: number;
  };
  text: string;
  code: string;
}

function* getTsCommentRanges(
  path: string,
  content: string,
): Generator<CommentRange> {
  const file = ts.createSourceFile(path, content, ts.ScriptTarget.Latest);
  for (const node of file.statements) {
    if (node.kind !== ts.SyntaxKind.VariableStatement) {
      continue;
    }
    const comments = ts.getLeadingCommentRanges(content, node.pos);
    if (typeof comments === "undefined") {
      continue;
    }
    const docComments = comments.filter(
      (c) => c.kind === ts.SyntaxKind.MultiLineCommentTrivia,
    );
    if (docComments.length === 0) {
      continue;
    }
    const range = docComments[docComments.length - 1];
    const code = content.substring(range.end + 1, node.end);
    const text = content.substring(range.pos, range.end);
    yield { type: "ts", range, text, code };
  }
}
function* getGtsCommentRanges(
  path: string,
  content: string,
): Generator<CommentRange> {
  const commentsByNextCharPos = new Map<number, CommentRange>();
  const ast = parse(content, {
    onComment(isBlock, text, start, end) {
      if (isBlock) {
        let nextCharPos = end;
        while (/\s/.test(content[nextCharPos])) {
          nextCharPos++;
        }
        commentsByNextCharPos.set(nextCharPos, {
          type: "gts",
          range: { pos: start, end },
          text: content.slice(start, end),
          // We will fill in it later
          code: "",
        });
      }
    },
  });
  for (const stmt of ast.body) {
    const [start, end] = stmt.range!;
    const comment = commentsByNextCharPos.get(start);
    if (comment) {
      yield {
        ...comment,
        code: content.substring(start, end),
      };
    }
  }
}

function buildLineOffsets(content: string): number[] {
  const offsets = [0];
  let pos = content.indexOf("\n");
  while (pos !== -1) {
    offsets.push(pos + 1);
    pos = content.indexOf("\n", pos + 1);
  }
  return offsets;
}

async function getExistsComments(path: string): Promise<CommentInfo[]> {
  const content = await readFile(path, "utf-8");
  const lineOffsets = buildLineOffsets(content);
  const result: CommentInfo[] = [];
  let commentGen = path.endsWith(".gts")
    ? getGtsCommentRanges
    : getTsCommentRanges;
  for (const { range, code, text } of commentGen(path, content)) {
    const parseCtx = parser.parseString(text);
    if (parseCtx.log.messages.length > 0) {
      throw new Error(
        `Syntax error in file ${path}: ${parseCtx.log.messages[0].text}`,
      );
    }
    const blocks = parseCtx.docComment.customBlocks;
    let id: number | null = null;
    let name: string | null = null;
    let description: string | null = null;
    let outdated: string | null = null;
    for (const block of blocks) {
      switch (block.blockTag.tagNameWithUpperCase) {
        case "@ID": {
          id = parseInt(printNode(block.content).trim());
          if (Number.isNaN(id)) {
            throw new Error("Invalid ID format");
          }
          break;
        }
        case "@NAME": {
          name = printNode(block.content).trim();
          break;
        }
        case "@DESCRIPTION": {
          description = printNode(block.content).trim();
          break;
        }
        case "@OUTDATED": {
          outdated = printNode(block.content).trim();
          break;
        }
      }
    }
    if (id === null || name === null || description === null) {
      const line = lineOffsets.findIndex((offset) => offset > range.pos) - 1;
      const character = range.pos - lineOffsets[line];
      console.warn(
        `${path}:${line + 1}:${character + 1} has incomplete documentation`,
      );
      continue;
    }
    if (outdated !== null) {
      description = outdated;
    }
    result.push({ range, id, name, description, code });
  }
  return result;
}

export interface SourceInfo {
  id: number;
  name: string;
  description: string;
  code: string;
}

function replaceBetween(
  origin: string,
  startIndex: number,
  endIndex: number,
  insertion: string,
) {
  return (
    origin.substring(0, startIndex) + insertion + origin.substring(endIndex)
  );
}

function descriptionToLines(description: string): string[] {
  return description
    .split("\n")
    .map((l) => l.replace(/\{|\}/g, "").trim())
    .filter((l) => !!l);
}

function writeDescriptionAsComment(description: string) {
  return descriptionToLines(description).join("\n * ");
}

function sameArray<T>(a: T[], b: T[]): boolean {
  if (a.length !== b.length) {
    return false;
  }
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) {
      return false;
    }
  }
  return true;
}

function sameDescription(a: string, b: string) {
  return sameArray(descriptionToLines(a), descriptionToLines(b));
}

const OLD_VERSION_PATH = path.resolve(
  BASE_PATH,
  `old_versions/${OLD_VERSION}.gts`,
);

if (SAVE_OLD_CODES && !existsSync(OLD_VERSION_PATH)) {
  await writeFile(
    OLD_VERSION_PATH,
    `import { DiceType, DamageType, $ } from "@gi-tcg/core/builder";\n`,
  );
}

let untitledId = 1;
export function identifier(name: string) {
  return pascalCase(name || `untitled_${untitledId++}`);
}

export async function writeSourceCode(
  basename: string,
  init: string,
  infos: SourceInfo[],
  noSort = false,
): Promise<void> {
  const pathNoExt = path.resolve(BASE_PATH, basename);
  await mkdir(path.dirname(pathNoExt), { recursive: true });

  if (!noSort) {
    infos.sort((a, b) => a.id - b.id);
  }

  let newInfos: SourceInfo[] = [];
  let resultText = LICENSE + init;
  let existsPath: string | null = null;
  const gtsPath = pathNoExt + ".gts";
  const tsPath = pathNoExt + ".ts";
  if (existsSync(gtsPath)) {
    existsPath = gtsPath;
  } else if (existsSync(tsPath)) {
    existsPath = tsPath;
  }
  if (existsPath) {
    const existsComments = await getExistsComments(existsPath);
    const rewriteInfos: (CommentInfo & { newDescription: string })[] = [];
    for (const item of infos) {
      const cmt = existsComments.find((c) => c.id === item.id);
      if (cmt) {
        if (!sameDescription(cmt.description, item.description)) {
          rewriteInfos.push({ ...cmt, newDescription: item.description });
        }
      } else {
        newInfos.push(item);
      }
    }
    rewriteInfos.sort((a, b) => a.range.pos - b.range.pos);
    resultText = await readFile(existsPath, "utf-8");
    let offset = 0;
    for (const item of rewriteInfos) {
      const newComment = `/**
 * @id ${item.id}
 * @name ${item.name}
 * @description
 * ${writeDescriptionAsComment(item.newDescription)}
 * @outdated
 * ${writeDescriptionAsComment(item.description)}
 */`;
      resultText = replaceBetween(
        resultText,
        item.range.pos + offset,
        item.range.end + offset,
        newComment,
      );
      offset += newComment.length - (item.range.end - item.range.pos);
      // console.log("=====\n",item.code);
      if (SAVE_OLD_CODES) {
        await appendFile(
          OLD_VERSION_PATH,
          `
/**
 * @id ${item.id}
 * @name ${item.name}
 * @description
 * ${writeDescriptionAsComment(item.description)}
 */
${item.code
  .replace(/export /, "")
  .replace(/ as /, " as private ")
  .replace(/\n(  \.?since(\(| )".*?"(\)|;)\n)?/, (str) =>
    str.replace(/since/, "until").replace(/".*?"/, `"${OLD_VERSION}"`),
  )}
`,
        );
      }
    }
  } else {
    newInfos = infos;
  }
  resultText +=
    "\n" +
    newInfos
      .map(
        (item) => `/**
 * @id ${item.id}
 * @name ${item.name}
 * @description
 * ${writeDescriptionAsComment(item.description)}
 */
${item.code}
`,
      )
      .join("\n");
  resultText = resultText.trim() + "\n";
  await writeFile(existsPath ?? gtsPath, resultText);
}
