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

import { parse } from "@gi-tcg/gts-transpiler";
import { expect, test } from "vitest";
import { getReferencedNames } from "../scripts/referenced_names";

test.each<[string, string, string[]]>([
  ["array children", "use(Foo, [Bar, ...Baz])", ["use", "Foo", "Bar", "Baz"]],
  ["unused parameters", "(Foo, Bar) => Outside", ["Outside"]],
  ["parameter shadowing", "(Foo) => Foo", []],
  [
    "properties and shorthand",
    "({ Foo: Bar, Baz, [Key]: Value, method() { return Other; } })",
    ["Bar", "Baz", "Key", "Value", "Other"],
  ],
  ["member keys", "[Foo.Bar, Foo[Key]]", ["Foo", "Key"]],
  [
    "nested object bindings and defaults",
    "({ [Key]: { value: Foo = Fallback }, ...Rest } = Source) => [Foo, Rest]",
    ["Key", "Fallback", "Source"],
  ],
  [
    "array bindings and defaults",
    "([Foo = Fallback, , ...Rest]) => [Foo, Rest, Outside]",
    ["Fallback", "Outside"],
  ],
  [
    "assignment targets are references",
    "({ Foo, [Key]: Bar = Fallback } = Source)",
    ["Foo", "Key", "Bar", "Fallback", "Source"],
  ],
  [
    "member assignment targets are references",
    "[Target[Key]] = Source",
    ["Target", "Key", "Source"],
  ],
  [
    "declarations following references",
    "() => { use(Foo); const Foo = Source; }",
    ["use", "Source"],
  ],
  [
    "closures see later declarations",
    "() => { const fn = () => Foo; const Foo = Source; return fn; }",
    ["Source"],
  ],
  [
    "var has function scope",
    "() => { if (Flag) { var Foo = Source; } return Foo; }",
    ["Flag", "Source"],
  ],
  [
    "let has block scope",
    "() => { { let Foo = Source; use(Foo); } return Foo; }",
    ["Source", "use", "Foo"],
  ],
  [
    "body declarations do not shadow parameter defaults",
    "function fn(value = Foo) { var Foo; return value; }",
    ["Foo"],
  ],
  [
    "defaults see other parameters",
    "(Foo = Bar, Bar = Outside) => Foo",
    ["Outside"],
  ],
  ["named function recursion", "(function Foo() { return Foo(); })", []],
  ["function expression names stay local", "[function Foo() {}, Foo]", ["Foo"]],
  [
    "regular functions bind arguments",
    "function fn() { return arguments; }",
    [],
  ],
  ["arrows inherit arguments", "() => arguments", ["arguments"]],
  [
    "loop bindings stay local",
    "() => { for (const Foo of Source) { use(Foo); } return Foo; }",
    ["Source", "use", "Foo"],
  ],
  [
    "for initializer bindings",
    "() => { for (let Foo = Start; Foo < End; Foo++) { use(Foo); } return Foo; }",
    ["Start", "End", "use", "Foo"],
  ],
  [
    "switch discriminant uses the outer scope",
    "switch (Foo) { case Key: let Foo = Source; use(Foo); }",
    ["Foo", "Key", "Source", "use"],
  ],
  [
    "catch bindings stay local",
    "try { work(); } catch ({ value: Foo }) { use(Foo); } use(Foo);",
    ["work", "use", "Foo"],
  ],
  [
    "class names and computed members",
    "(class Foo extends Base { [Key] = Value; method() { return Foo; } })",
    ["Base", "Key", "Value"],
  ],
  [
    "class static var stays local",
    "class Foo { static { var Local = Source; use(Local); } } use(Local);",
    ["Source", "use", "Local"],
  ],
  [
    "labels are not references",
    "Label: while (Flag) { break Label; }",
    ["Flag"],
  ],
  [
    "types are not runtime references",
    "(value: Input): Output => (value as Cast).field! satisfies Constraint",
    [],
  ],
  ["assertions retain runtime references", "Foo as TypeName", ["Foo"]],
  [
    "type arguments are not references",
    "factory<TypeName>(Value)",
    ["factory", "Value"],
  ],
])("collect references: %s", (_name, source, expected) => {
  expect(getReferencedNames(parse(source))).toEqual(new Set(expected));
});

test("collect references from a standalone identifier", () => {
  expect(getReferencedNames({ type: "Identifier", name: "Foo" })).toEqual(
    new Set(["Foo"]),
  );
});

test("GTS function scopes do not leak into other attributes", () => {
  const node = parse(`
    define skill {
      id 1 as Skill;
      filter :{ const Local = Source; return Local; };
      filter :(Local);
      :use(Other);
      const Local = Value;
      :use(Local);
    };
  `);
  expect(getReferencedNames(node)).toEqual(
    new Set(["Source", "Local", "Other", "Value"]),
  );
});
