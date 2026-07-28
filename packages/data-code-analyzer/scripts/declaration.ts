import { Expression, Node, ts, VariableDeclaration } from "ts-morph";
import { EXTENSION_ID_OFFSET } from "@gi-tcg/core/data";
import { base } from "./index";
import path from "node:path";

export interface Location {
  filename: string;
  line: number;
  column: number;
}

interface ChainCallEntry {
  fnName: string;
  args: readonly Node[];
  location: Location;
}

interface InitializerAnalyzeResult {
  ids: number[];
  chain: ChainCallEntry[];
}

interface EntityInfo {
  id: number;
}

const getLocation = (node: Node): Location => {
  return {
    filename: path.relative(base, node.getSourceFile().getFilePath()).replace(/\\/g, '/'),
    line: node.getStartLineNumber(),
    column: node.getStartLinePos(),
  };
};

export const ALLOWED_FACTORIES = [
  "character",
  "skill",
  "card",
  "status",
  "combatStatus",
  "summon",
  "support",
  "extension",
];

export type TcgEntityDeclaration = TcgDataDeclaration & { id: number };

export class TcgDataDeclaration {
  readonly entityInfo: EntityInfo | null = null;
  readonly initializer: Expression | null = null;
  readonly isExported: boolean;

  constructor(
    public readonly name: string,
    /** if declaration is array binding, provides name's index */
    public readonly nameIndex: number | null,
    public readonly declaration: VariableDeclaration,
  ) {
    this.isExported = declaration.isExported();
    this.initializer = declaration.getInitializer() ?? null;
    if (this.initializer) {
      const result = TcgDataDeclaration.#analyzeInitializer(this.initializer);
      if (result) {
        this.entityInfo = {
          id: result.ids[nameIndex ?? 0],
        };
      }
    }
  }

  static #analyzedInitializer = new Map<
    Expression,
    InitializerAnalyzeResult | null
  >();

  static #parseId(idArg: Node): number | null {
    if (idArg.isKind(ts.SyntaxKind.NumericLiteral)) {
      return idArg.getLiteralValue();
    } else {
      return null;
    }
  }
  static #analyzeInitializer(
    initializer: Expression,
  ): InitializerAnalyzeResult | null {
    if (this.#analyzedInitializer.has(initializer)) {
      return this.#analyzedInitializer.get(initializer)!;
    }
    let node: Node = initializer;

    const chainCalls: ChainCallEntry[] = [];
    const ids: number[] = [];
    while (true) {
      if (!node.isKind(ts.SyntaxKind.CallExpression)) {
        this.#analyzedInitializer.set(initializer, null);
        return null;
      }
      const callee = node.getExpression();
      const args = node.getArguments();
      if (callee.isKind(ts.SyntaxKind.PropertyAccessExpression)) {
        const name = callee.getNameNode();
        const text = name.getText();
        const expression = callee.getExpression();
        const location = getLocation(name);
        chainCalls.push({
          fnName: text,
          location: location,
          args,
        });
        if (text === "toStatus" || text === "toCombatStatus") {
          if (args.length < 1) {
            console.warn(
              `toStatus/toCombatStatus call without id in ${initializer
                .getSourceFile()
                .getFilePath()}:${initializer.getStartLineNumber()}`,
            );
          } else {
            const idArg = args[0];
            const idVal = this.#parseId(idArg);
            if (idVal !== null) {
              ids.unshift(idVal);
            } else {
              console.warn(
                `toStatus/toCombatStatus call with non-numeric id in ${initializer
                  .getSourceFile()
                  .getFilePath()}:${initializer.getStartLineNumber()}`,
              );
            }
          }
        }
        node = expression;
        continue;
      } else if (callee.isKind(ts.SyntaxKind.Identifier)) {
        const text = callee.getText();
        const location = getLocation(callee);
        chainCalls.push({
          fnName: text,
          location,
          args,
        });
        if (!ALLOWED_FACTORIES.includes(text)) {
          this.#analyzedInitializer.set(initializer, null);
          return null;
        }
        const isExtension = text === "extension";
        if (args.length < 1) {
          console.warn(
            `Factory call without id in ${initializer
              .getSourceFile()
              .getFilePath()}:${initializer.getStartLineNumber()}`,
          );
        } else {
          const idArg = args[0];
          let idVal = this.#parseId(idArg);
          if (idVal !== null) {
            if (isExtension) {
              idVal += EXTENSION_ID_OFFSET;
            }
            ids.unshift(idVal);
          } else {
            console.warn(
              `Factory call with non-numeric id in ${initializer
                .getSourceFile()
                .getFilePath()}:${initializer.getStartLineNumber()}`,
            );
          }
        }
        break;
      } else {
        this.#analyzedInitializer.set(initializer, null);
        return null;
      }
    }
    if (chainCalls[0].fnName === "reserve") {
      this.#analyzedInitializer.set(initializer, null);
      return null;
    }
    const result: InitializerAnalyzeResult = {
      ids,
      chain: chainCalls.toReversed(),
    };
    this.#analyzedInitializer.set(initializer, result);
    return result;
  }

  get id() {
    return this.entityInfo?.id ?? null;
  }
  isEntity(): this is TcgEntityDeclaration {
    return this.id !== null;
  }

  getCode() {
    return this.initializer?.getText()?.replace(/\r\n/g, "\n") ?? "";
  }

  getJsDocComment() {
    const docComments =
      this.declaration
        .getAncestors()
        .find((n) => n.isKind(ts.SyntaxKind.VariableStatement))
        ?.getLeadingCommentRanges()
        .filter(
          (range) => range.getKind() === ts.SyntaxKind.MultiLineCommentTrivia,
        ) ?? [];
    return docComments.map((range) => range.getText()).join("\n");
  }

  getLocation() {
    return getLocation(this.declaration);
  }

  *referencingIdentifiers() {
    if (!this.initializer) {
      return;
    }
    for (const node of this.initializer?.getDescendants() ?? []) {
      if (node.isKind(ts.SyntaxKind.Identifier)) {
        yield node;
      }
    }
  }
}
