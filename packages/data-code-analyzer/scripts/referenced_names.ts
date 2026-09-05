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

import type { AST } from "@gi-tcg/gts-transpiler";
import { walk, type Context, type Visitors } from "zimmerframe";

// The parser emits TypeScript nodes that are not included in its AST.Node type.
type ReferenceNode =
  | AST.Node
  | {
      type:
        | "TSAsExpression"
        | "TSSatisfiesExpression"
        | "TSNonNullExpression"
        | "TSTypeAssertion"
        | "TSInstantiationExpression";
      expression: AST.Expression;
    }
  | { type: "TSParameterProperty"; parameter: AST.Pattern };

class Scope {
  readonly bindings = new Set<string>();

  constructor(
    readonly parent: Scope | null,
    readonly isFunction = false,
  ) {}

  get varScope(): Scope {
    return this.isFunction || !this.parent ? this : this.parent.varScope;
  }

  has(name: string): boolean {
    return this.bindings.has(name) || (this.parent?.has(name) ?? false);
  }
}

interface ReferenceState {
  scope: Scope;
  // Binding patterns may declare in an outer scope (for example, `var`).
  bindingScope?: Scope;
}

type ReferenceContext = Context<ReferenceNode, ReferenceState>;

function visitFunction(
  node:
    | AST.FunctionDeclaration
    | AST.FunctionExpression
    | AST.ArrowFunctionExpression,
  { state, visit }: ReferenceContext,
) {
  const scope = new Scope(state.scope, true);
  if (node.type !== "ArrowFunctionExpression") {
    scope.bindings.add("arguments");
    if (node.id) {
      scope.bindings.add(node.id.name);
      if (node.type === "FunctionDeclaration") {
        state.scope.bindings.add(node.id.name);
      }
    }
  }
  for (const param of node.params) {
    visit(param, { scope, bindingScope: scope });
  }
  // Body declarations must not shadow references in parameter defaults.
  visit(node.body, { scope: new Scope(scope, true) });
}

function visitBlock(_node: ReferenceNode, { state, next }: ReferenceContext) {
  next({ scope: new Scope(state.scope) });
}

function visitClass(
  node: AST.ClassDeclaration | AST.ClassExpression,
  { state, visit }: ReferenceContext,
) {
  const scope = new Scope(state.scope);
  if (node.id) {
    scope.bindings.add(node.id.name);
    if (node.type === "ClassDeclaration") {
      state.scope.bindings.add(node.id.name);
    }
  }
  if (node.superClass) {
    visit(node.superClass, { scope });
  }
  visit(node.body, { scope });
}

function visitClassMember(
  node: AST.MethodDefinition | AST.PropertyDefinition,
  { state, visit }: ReferenceContext,
) {
  if (node.computed) {
    visit(node.key, { scope: state.scope });
  }
  if (node.value) {
    visit(node.value, { scope: state.scope });
  }
}

/** Collect runtime names that resolve outside the supplied subtree. */
export function getReferencedNames(node: AST.Node): Set<string> {
  const references: { name: string; scope: Scope }[] = [];
  const visitors: Visitors<ReferenceNode, ReferenceState> = {
    _(node, { next, visit }) {
      switch (node.type) {
        case "TSAsExpression":
        case "TSSatisfiesExpression":
        case "TSNonNullExpression":
        case "TSTypeAssertion":
        case "TSInstantiationExpression":
          visit(node.expression);
          return;
        case "TSParameterProperty":
          visit(node.parameter);
          return;
      }
      // Type annotations and type-only declarations do not create dependencies.
      if (!node.type.startsWith("TS")) {
        next();
      }
    },
    Identifier(node, { state }) {
      if (state.bindingScope) {
        state.bindingScope.bindings.add(node.name);
      } else {
        references.push({ name: node.name, scope: state.scope });
      }
    },
    GTSNamedAttributeDefinition(node, { visit }) {
      // GTS bindings belong to the data file, not to the attribute's body.
      visit(node.body);
    },
    GTSShortcutArgumentExpression() {},
    GTSDirectFunction(node, { state, visit }) {
      const scope = new Scope(state.scope, true);
      for (const statement of node.body) {
        visit(statement, { scope });
      }
    },
    GTSShortcutFunctionExpression(node, { state, visit }) {
      visit(node.body, { scope: new Scope(state.scope, true) });
    },
    MemberExpression(node, { state, visit }) {
      visit(node.object, { scope: state.scope });
      if (node.computed) {
        visit(node.property, { scope: state.scope });
      }
    },
    Property(node, { state, visit }) {
      if (node.computed) {
        visit(node.key, { scope: state.scope });
      }
      visit(node.value);
    },
    AssignmentPattern(node, { state, visit }) {
      visit(node.left);
      visit(node.right, { scope: state.scope });
    },
    VariableDeclaration(node, { state, visit }) {
      const bindingScope =
        node.kind === "var" ? state.scope.varScope : state.scope;
      for (const declaration of node.declarations) {
        visit(declaration, { scope: state.scope, bindingScope });
      }
    },
    VariableDeclarator(node, { state, visit }) {
      visit(node.id, {
        scope: state.scope,
        bindingScope: state.bindingScope ?? state.scope,
      });
      if (node.init) {
        visit(node.init, { scope: state.scope });
      }
    },
    FunctionDeclaration: visitFunction,
    FunctionExpression: visitFunction,
    ArrowFunctionExpression: visitFunction,
    BlockStatement: visitBlock,
    ForStatement: visitBlock,
    ForInStatement: visitBlock,
    ForOfStatement: visitBlock,
    SwitchStatement(node, { state, visit }) {
      visit(node.discriminant);
      const scope = new Scope(state.scope);
      for (const switchCase of node.cases) {
        visit(switchCase, { scope });
      }
    },
    CatchClause(node, { state, visit }) {
      const scope = new Scope(state.scope);
      if (node.param) {
        visit(node.param, { scope, bindingScope: scope });
      }
      visit(node.body, { scope });
    },
    ClassDeclaration: visitClass,
    ClassExpression: visitClass,
    MethodDefinition: visitClassMember,
    PropertyDefinition: visitClassMember,
    StaticBlock(_node, { state, next }) {
      next({ scope: new Scope(state.scope, true) });
    },
    LabeledStatement(node, { visit }) {
      visit(node.body);
    },
    BreakStatement() {},
    ContinueStatement() {},
    ImportDeclaration(node, { state }) {
      for (const specifier of node.specifiers) {
        state.scope.bindings.add(specifier.local.name);
      }
    },
    ExportNamedDeclaration(node, { visit }) {
      if (node.declaration) {
        visit(node.declaration);
      } else if (!node.source) {
        for (const specifier of node.specifiers) {
          visit(specifier.local);
        }
      }
    },
    ExportAllDeclaration() {},
  };
  walk<ReferenceNode, ReferenceState>(
    node,
    { scope: new Scope(null, true) },
    visitors,
  );

  // Resolve after collecting declarations, including those following a use.
  return new Set(
    references
      .filter(({ name, scope }) => !scope.has(name))
      .map(({ name }) => name),
  );
}
