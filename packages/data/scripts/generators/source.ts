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

async function getExistsComments(path: string): Promise<CommentInfo[]> {
  const content = await readFile(path, "utf-8");
  const file = ts.createSourceFile(path, content, ts.ScriptTarget.Latest);
  const result: CommentInfo[] = [];

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
    const parseCtx = parser.parseString(text);
    if (parseCtx.log.messages.length > 0) {
      throw new Error(`Syntax error in file ${path}: ${parseCtx.log.messages[0].text}`);
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
      const { line, character } = ts.getLineAndCharacterOfPosition(file, range.pos);
      console.warn(`${path}:${line + 1}:${character + 1} has incomplete documentation`);
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
  return description.split("\n").map((l) => l.replace(/\{|\}/g, "").trim()).filter((l) => !!l);
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


const OLD_VERSION_PATH = path.resolve(BASE_PATH, `old_versions/${OLD_VERSION}.ts`);

if (SAVE_OLD_CODES && !existsSync(OLD_VERSION_PATH)) {
  await writeFile(OLD_VERSION_PATH, `import { card, skill, $ } from "@gi-tcg/core/builder";\n`);
}

let untitledId = 1;
export function identifier(name: string) {
  return pascalCase(name || `untitled_${untitledId++}`);
}

export async function writeSourceCode(
  filepath: string,
  init: string,
  infos: SourceInfo[],
  noSort = false,
): Promise<void> {
  filepath = path.resolve(BASE_PATH, filepath);
  await mkdir(path.dirname(filepath), { recursive: true });

  if (!noSort) {
    infos.sort((a, b) => a.id - b.id);
  }

  let newInfos: SourceInfo[] = [];
  let resultText = LICENSE + init;
  if (existsSync(filepath)) {
    const existsComments = await getExistsComments(filepath);
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
    resultText = await readFile(filepath, "utf-8");
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
        OLD_VERSION_PATH, `
/**
 * @id ${item.id}
 * @name ${item.name}
 * @description
 * ${writeDescriptionAsComment(item.description)}
 */
${item.code.replace(/export /, "").replace(/\n(  \.since\(".*?"\)\n)?/, `\n  .until("${OLD_VERSION}")\n`)}
`
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
  await writeFile(filepath, resultText);
}
