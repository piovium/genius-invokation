/**
 * A tiny S-expression structure. Can be a string, a number,
 * or a recursive array of other Expressions.
 */

import type { Expression } from "./utils";

/**
 * Parses a string containing a single S-expression into a nested structure.
 *
 * S-expression Grammar:
 * - An expression is a list, a JSON-formatted string, a JSON-formatted number, or an identifier.
 * - A list is a sequence of expressions enclosed in `()`, `[]`, or `{}`.
 * - List elements are separated by whitespace.
 * - Line comments start with `;` and are treated as whitespace.
 * - An identifier is a string of characters not containing whitespace or brackets,
 *   and not starting with a number-like prefix.
 *
 * @param input The string to parse.
 * @returns The parsed S-expression structure.
 * @throws {Error} If the input string is malformed (e.g., unbalanced parentheses, invalid tokens).
 */
export function parseSExpr(input: string): Expression {
  let i = 0; // The current position (cursor) in the input string

  /** Skips whitespace and full-line comments. */
  function skipWhitespace(): void {
    while (i < input.length) {
      const char = input[i];
      if (/\s/.test(char)) {
        i++;
        continue;
      }
      if (char === ";") {
        while (i < input.length && input[i] !== "\n") {
          i++;
        }
        continue;
      }
      break; // Not whitespace or a comment
    }
  }

  /** Parses a list expression like `(foo 1 "bar")`. */
  function parseList(): Expression[] {
    const openParen = input[i];
    const closeParen = { "(": ")", "[": "]", "{": "}" }[openParen]!;
    i++; // Move past the opening parenthesis

    const list: Expression[] = [];
    while (true) {
      skipWhitespace();

      if (i >= input.length) {
        throw new Error(
          `Unexpected end of input: unclosed list started with '${openParen}'.`,
        );
      }

      if (input[i] === closeParen) {
        i++; // Move past the closing parenthesis
        return list;
      }
      if (")]}".includes(input[i])) {
        throw new Error(
          `Unexpected character '${input[i]}' at position ${i}, expected closing bracket for '${openParen}'.`,
        );
      }

      list.push(parseValue());
    }
  }

  /** Parses an "atom": a number, a string, or an identifier. */
  function parseAtom(): string | number {
    const start = i;
    // Read until a delimiter (whitespace, parenthesis, or comment) is found
    while (i < input.length && !/[\s()\[\]{};]/.test(input[i])) {
      i++;
    }
    const token = input.substring(start, i);

    if (token === "") {
      throw new Error("Unexpected empty token.");
    }

    // Check if it's a valid number according to the rules (JSON-like)
    // `isFinite(Number(token))` is a robust check that handles integers, floats, and scientific notation
    // while correctly rejecting mixed alpha-numeric strings like "123a".
    // The `token.trim()` check prevents an empty string from being parsed as `0`.
    const likesNumber = !isNaN(parseFloat(token));
    if (likesNumber && isFinite(Number(token)) && token.trim() !== "") {
      return Number(token);
    }

    // Per the rules, if it looks like a number but isn't one, it's an error.
    if (likesNumber) {
      throw new Error(`Invalid number format '${token}' at position ${start}.`);
    }

    // Otherwise, it's an identifier.
    return token;
  }

  /** Parses a JSON-formatted string literal like `"hello \"world\""`. */
  function parseString(): string {
    // Use JSON.parse for robustness in handling escapes.
    // We need to find the full string token first.
    const start = i;
    i++; // Skip opening quote
    while (i < input.length) {
      if (input[i] === '"' && input[i - 1] !== "\\") {
        i++; // Include closing quote
        break;
      }
      i++;
    }
    const strToken = input.substring(start, i);
    if (strToken.length < 2 || strToken[strToken.length - 1] !== '"') {
      throw new Error("Unexpected end of input: unclosed string literal.");
    }
    return JSON.parse(strToken);
  }

  /** The main dispatcher that decides which parsing function to call. */
  function parseValue(): Expression {
    skipWhitespace();
    const char = input[i];

    if (char === "(" || char === "[" || char === "{") {
      return parseList();
    }
    if (char === '"') {
      return parseString();
    }
    return parseAtom();
  }

  // --- Main Execution ---

  if (input.trim() === "") {
    throw new Error("Input is empty or contains only whitespace.");
  }

  const result = parseValue();

  // Check for any trailing characters after the main expression is parsed.
  skipWhitespace();
  if (i < input.length) {
    throw new Error(
      `Unexpected token at end of input: "${input.substring(i)}"`,
    );
  }

  return result;
}

export function stringifySExpr(expr: Expression): string {
  if (typeof expr === "string") {
    return JSON.stringify(expr); // Properly escape the string
  }
  if (typeof expr === "number") {
    return expr.toString();
  }
  if (Array.isArray(expr)) {
    return (
      "(" +
      expr.map((elem) => stringifySExpr(elem)).join(" ") +
      ")"
    );
  }
  throw new Error("Invalid expression type.");
}
