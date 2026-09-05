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

import path from "node:path";
import { EXTENSION_ID_OFFSET } from "@gi-tcg/core/data";
import { parse, type AST } from "@gi-tcg/gts-transpiler";
import type { Location } from "../src/types";
import { walk } from "zimmerframe";

export interface EntityDefinition {
  id: number;
  bindingNames: string[];
  code: string;
  location: Location;
  node: AST.GTSDefineStatement;
}

export interface EntityBinding {
  kind: "entity";
  entity: EntityDefinition;
  exported: boolean;
}

export interface VariableBinding {
  kind: "variable";
  initializer: AST.Expression;
  exported: boolean;
}

export type Binding = EntityBinding | VariableBinding;

interface ImportBinding {
  filename: string;
  importedName: string;
}

function getName(node: AST.Identifier | AST.Literal): string | null {
  if (node.type === "Identifier") {
    return node.name;
  }
  return typeof node.value === "string" ? node.value : null;
}

function getLocation(filename: string, node: AST.Node): Location {
  if (!node.loc) {
    throw new Error(`Missing location for ${filename}`);
  }
  return {
    filename,
    line: node.loc.start.line,
    column: node.loc.start.column,
  };
}

function getAttributeId(
  attribute: AST.GTSNamedAttributeDefinition,
): number | null {
  const id = attribute.body.positionalAttributes.attributes[0];
  return id?.type === "Literal" && typeof id.value === "number"
    ? id.value
    : null;
}

export function getInlineIds(node: AST.Node): Set<number> {
  const result = new Set<number>();
  walk(node, null, {
    GTSNamedAttributeDefinition(node, { next }) {
      if (node.bindingName) {
        const id = getAttributeId(node);
        if (id !== null) {
          result.add(
            getName(node.name) === "idHint" ? id + EXTENSION_ID_OFFSET : id,
          );
        }
      }
      next();
    },
  });
  return result;
}

function getRootId(
  definition: AST.GTSDefineStatement,
  filename: string,
): number {
  const rootName = getName(definition.body.name);
  const idAttributeName = rootName === "extension" ? "idHint" : "id";
  const attributes = definition.body.body.namedAttributes?.attributes ?? [];
  const idAttribute = attributes.find(
    (attribute) => getName(attribute.name) === idAttributeName,
  );
  const id = idAttribute ? getAttributeId(idAttribute) : null;
  if (id === null) {
    throw new Error(
      `Expected numeric ${idAttributeName} in ${filename}:${definition.loc?.start.line ?? 0}`,
    );
  }
  return rootName === "extension" ? id + EXTENSION_ID_OFFSET : id;
}

function getBindingNames(definition: AST.GTSDefineStatement): string[] {
  const result: string[] = [];
  walk(definition as AST.Node, null, {
    GTSNamedAttributeDefinition(node, { next }) {
      const bindingName = node.bindingName;
      if (bindingName) {
        result.push(bindingName.name);
      }
      next();
    },
  });
  return result;
}

export class TcgDataSourceFile {
  readonly definitions: EntityDefinition[] = [];
  readonly bindings = new Map<string, Binding>();
  readonly imports = new Map<string, ImportBinding>();

  constructor(
    public readonly base: string,
    public readonly filepath: string,
    public readonly source: string,
  ) {
    for (const statement of parse(source).body) {
      this.addTopLevelStatement(statement);
    }
  }

  get filename() {
    return path.relative(this.base, this.filepath).replaceAll(path.sep, "/");
  }

  getBinding(name: string, exportedOnly = false): Binding | null {
    const binding = this.bindings.get(name);
    if (!binding || (exportedOnly && !binding.exported)) {
      return null;
    }
    return binding;
  }

  private addTopLevelStatement(statement: AST.Node) {
    if (statement.type === "GTSDefineStatement") {
      this.addDefinition(statement);
      return;
    }
    if (statement.type === "ImportDeclaration") {
      this.addImport(statement);
      return;
    }
    if (statement.type === "VariableDeclaration") {
      this.addVariableDeclaration(statement, false);
      return;
    }
    if (statement.type === "ExportNamedDeclaration") {
      const declaration = statement.declaration;
      if (declaration?.type === "VariableDeclaration") {
        this.addVariableDeclaration(declaration, true);
      }
    }
  }

  private addDefinition(node: AST.GTSDefineStatement) {
    if (!node.range) {
      throw new Error(`Missing range for ${this.filename}`);
    }
    const definition: EntityDefinition = {
      id: getRootId(node, this.filename),
      bindingNames: getBindingNames(node),
      code: this.source.slice(...node.range).replaceAll("\r\n", "\n"),
      location: getLocation(this.filename, node),
      node,
    };
    this.definitions.push(definition);

    walk(node as AST.Node, null, {
      GTSNamedAttributeDefinition: (attribute, { next }) => {
        if (attribute.bindingName) {
          this.addBinding(attribute.bindingName.name, {
            kind: "entity",
            entity: definition,
            exported: attribute.bindingAccessModifier !== "private",
          });
        }
        next();
      },
    });
  }

  private addImport(node: AST.ImportDeclaration) {
    if (typeof node.source.value !== "string") {
      return;
    }
    const filename = path.resolve(
      path.dirname(this.filepath),
      node.source.value,
    );
    for (const specifier of node.specifiers) {
      if (specifier.type !== "ImportSpecifier") {
        continue;
      }
      const { imported, local } = specifier;
      const importedName = getName(imported);
      if (importedName) {
        this.imports.set(local.name, { filename, importedName });
      }
    }
  }

  private addVariableDeclaration(
    node: AST.VariableDeclaration,
    exported: boolean,
  ) {
    for (const declaration of node.declarations) {
      if (declaration.id.type !== "Identifier" || !declaration.init) {
        continue;
      }
      this.addBinding(declaration.id.name, {
        kind: "variable",
        initializer: declaration.init,
        exported,
      });
    }
  }

  private addBinding(name: string, binding: Binding) {
    if (this.bindings.has(name)) {
      throw new Error(`Duplicate binding ${name} in ${this.filename}`);
    }
    this.bindings.set(name, binding);
  }
}
