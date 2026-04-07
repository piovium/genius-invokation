import { describe, expect, test } from "bun:test";
import { parseSExpr, prettyStringifySExpr } from "../src/query/s_expr";

describe("S-expression Parser", () => {
  test("basic", () => {
    const exampleExpr = `
; This is a complex example S-expression
{ config
  (port 8080)
  (host "api.example.com") ; a JSON string for the host
  (enabled true)  ; booleans are just identifiers
  (retry-delays [100 500 1000 -2.5e2])
  (features ["feature-a" "feature-b"])
  (metadata { 
    :version "1.2.3"
    :author "gemini" 
  })
}`;

    expect(parseSExpr(exampleExpr)).toEqual([
      "config",
      ["port", 8080],
      ["host", "api.example.com"],
      ["enabled", "true"],
      ["retry-delays", [100, 500, 1000, -250]],
      ["features", ["feature-a", "feature-b"]],
      ["metadata", [":version", "1.2.3", ":author", "gemini"]],
    ]);
  });

  test("unmatched parentheses", () => {
    expect(() => parseSExpr("(foo (bar)")).toThrow(
      "Unexpected end of input: unclosed list started with '('.",
    );
    expect(() => parseSExpr("[foo)")).toThrow(
      "Unexpected character ')' at position 4, expected closing bracket for '['.",
    );
  });

  test("invalid formats", () => {
    expect(() => parseSExpr("1.2.3")).toThrow(
      "Invalid number format '1.2.3' at position 0.",
    );
    expect(parseSExpr("+")).toEqual("+");
    expect(parseSExpr("-")).toEqual("-");
    expect(() => parseSExpr("-1f")).toThrow(
      "Invalid number format '-1f' at position 0.",
    );
  });

  test("pretty stringify with indentation", () => {
    expect(
      prettyStringifySExpr([
        "config",
        ["port", 8080],
        ["host", "api.example.com"],
        ["features", ["feature-a", "feature-b"]],
      ]),
    ).toBe(`(config (port 8080)
        (host api.example.com)
        (features (feature-a feature-b)))`);
  });

  test("pretty stringify aligns nested cdr items", () => {
    expect(
      prettyStringifySExpr([
        "leading-item",
        ["first-arg", ["nested-call", "value"], ["another-call", "value"]],
        ["second-arg", "tail"],
      ]),
    ).toBe(`(leading-item (first-arg (nested-call value)
                         (another-call value))
              (second-arg tail))`);
  });

  test("parseString handles backslashes correctly", () => {
    // A trailing escaped backslash: "foo\\" — the \\ is an escaped backslash,
    // so the quote after it is the real closing quote (not escaped).
    expect(parseSExpr('"foo\\\\"')).toEqual("foo\\");
    // A quote escaped by an odd number of backslashes: "foo\\\"bar"
    // The \\\ before the inner " means one escaped backslash + escaped quote.
    expect(parseSExpr('"foo\\\\\\"bar"')).toEqual('foo\\"bar');
    // Normal escaped quote still works: "hello \"world\""
    expect(parseSExpr('"hello \\"world\\""')).toEqual('hello "world"');
  });

  test("pretty stringify only quotes strings when needed", () => {
    expect(
      prettyStringifySExpr([
        "plain",
        "api.example.com",
        "+",
        "1.2.3",
        "hello world",
        'he said "hi"',
        "",
      ]),
    ).toBe(
      '(plain api.example.com + "1.2.3" "hello world" "he said \\"hi\\"" "")',
    );
  });
});
