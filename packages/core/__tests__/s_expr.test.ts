import { describe, expect, test } from "bun:test";
import { parseSExpr } from "../src/query/s_expr";

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
});
