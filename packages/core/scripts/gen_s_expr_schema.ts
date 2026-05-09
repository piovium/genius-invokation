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
 * 此脚本从 NonTerminalsConfig 生成 s_expr_schema.md 文档。
 *
 * 若未指定 output_path，则输出到 docs/development/query/s_expr_schema.md。
 */

import {
  NonTerminalsConfig,
  type Rule,
  type Argument,
  type NonTerminalConfig,
  // @ts-ignore
} from "../src/query/expr_schema";
import path from "node:path";

function ruleToString(rule: Rule): string {
  if (rule.use) {
    return `[_${rule.use}_](#${rule.use.toLowerCase()})`;
  }
  if (rule.enum) {
    return rule.enum.map((e) => `\`${e}\``).join(" \\| ");
  }
  if (rule.arbitrary) {
    return rule.arbitrary === "number" ? `_number_` : `_string_`;
  }
  if (rule.list) {
    return `(_...${ruleToString(rule.list)}_)`;
  }
  if (rule.leading !== undefined) {
    const parts: string[] = [`\`${rule.leading}\``];
    if (rule.args) {
      for (const arg of rule.args) {
        parts.push(argToString(arg));
      }
    }
    if (rule.restArgs) {
      parts.push(`_...${argToString(rule.restArgs)}_`);
    }
    return `(${parts.join(" ")})`;
  }
  return "_unknown_";
}

function argToString(arg: Argument): string {
  return ruleToString(arg);
}

const config = new NonTerminalsConfig();
type NonTerminalName = keyof NonTerminalsConfig;
const names = Object.keys(config) as NonTerminalName[];

function generateNonTerminalSection(
  name: NonTerminalName,
  ntConfig: NonTerminalConfig,
): string {
  const lines: string[] = [];
  lines.push(`### ${name}`);
  lines.push("");
  if (ntConfig.description) {
    lines.push(ntConfig.description);
    lines.push("");
  }

  lines.push("**产生式规则：**");
  lines.push("");

  for (const rule of ntConfig.rules) {
    if (rule.use) {
      lines.push(`- 委托给 [_${rule.use}_](#${rule.use.toLowerCase()})`);
    } else if (rule.leading !== undefined) {
      const parts: string[] = [`\`${rule.leading}\``];
      if (rule.args) {
        for (const arg of rule.args) {
          parts.push(`<${arg.name}: ${ruleToString(arg)}>`);
        }
      }
      if (rule.restArgs) {
        parts.push(
          `<...${rule.restArgs.name}: ${ruleToString(rule.restArgs)}>`,
        );
      }
      lines.push(`- \`(\` ${parts.join(" ")} \`)\``);
      // rule description
      if (rule.description) {
        lines.push(`  > ${rule.description}`);
      }
      // arg descriptions
      const allArgs = [
        ...(rule.args ?? []),
        ...(rule.restArgs ? [rule.restArgs] : []),
      ];
      for (const arg of allArgs) {
        if (arg.description) {
          lines.push(`  - **${arg.name}**：${arg.description}`);
        }
      }
    } else if (rule.arbitrary) {
      const typeLabel =
        rule.arbitrary === "number" ? "数字字面量" : "字符串字面量";
      lines.push(`- ${typeLabel}`);
      if (rule.description) {
        lines.push(`  > ${rule.description}`);
      }
    } else if (rule.enum) {
      lines.push(`- 枚举值：${rule.enum.map((e) => `\`${e}\``).join("、")}`);
    } else if (rule.list) {
      lines.push(`- 列表：\`(...${ruleToString(rule.list)})\``);
    }
  }

  lines.push("");
  return lines.join("\n");
}

function generate(): string {
  const sections: string[] = [];

  sections.push(`# S-Expr 查询语法：非终结符参考`);
  sections.push("");
  sections.push(
    `本文档由 \`packages/core/scripts/gen_s_expr_schema.ts\` 从 \`NonTerminalsConfig\`（位于 \`packages/core/src/query/expr_schema.ts\`）自动生成。`,
  );
  sections.push("");
  sections.push(
    `查询表达式的顶层非终结符为 [_Query_](#query)。每个非终结符的产生式规则均以 S-Expr 列表形式给出，第一个元素为关键字（\`leading\`），其余元素为参数。`,
  );
  sections.push("");
  sections.push("## 非终结符列表");
  sections.push("");
  for (const name of names) {
    sections.push(`- [${name}](#${name.toLowerCase()})`);
  }
  sections.push("");
  sections.push("## 非终结符详细说明");
  sections.push("");

  for (const name of names) {
    const ntConfig = config[name] as NonTerminalConfig;
    sections.push(generateNonTerminalSection(name, ntConfig));
  }

  return sections.join("\n");
}

const outputPath = path.resolve(
  import.meta.dirname,
  "../../../docs/development/query/s_expr_schema.md",
);
const content = generate();
await Bun.write(outputPath, content);
console.log(`Generated: ${outputPath}`);
