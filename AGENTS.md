## Commits and PR Titles

Use conventional commit-style messages and PR titles: `type(scope): summary`.

Valid types are `feat`, `fix`, `docs`, `chore`, `refactor`, `style`, and `test`. Scopes are optional; use the affected package or area when helpful, e.g. `core`, `data`, `web-ui-core`, or `server`. Multiple scopes can be specified using comma, e.g. `core, data`.

Examples: `fix(web-ui-core): simplify declare end button styling`, `docs: update contributing guide`, `chore(typings): regenerate types`.

## Style Guide

### General Principles

- Keep things in one function unless composable or reusable
- Validate unknown values once at the boundary that owns them. Pass typed values inward instead of repeating `typeof value === "object"` and property-existence checks. Do not defensively revalidate values already guaranteed by a schema, constructor, or internal type.
- Do not extract single-use helpers preemptively. Inline the logic at the call site unless the helper is reused, hides a genuinely complex boundary, or has a clear independent name that improves the caller.
- Before adding complexity for a speculative or vanishingly unlikely race or security edge case, explain the concrete failure mode, likelihood, and complexity cost to the user and get their buy-in. Do not silently expand scope for theoretical robustness.
- Avoid `try`/`catch` where possible
- Avoid unnecessary `any`; only write `as any` if the typing is correct but failed due to TypeScript's limitations.
- Prefer native APIs in new or modified code when possible, e.g. use `glob` from `node:fs` instead of 3rd-party `glob`. Existing third-party usage does not require unrelated migration.
- Rely on type inference when possible; avoid explicit type annotations or interfaces unless necessary for exports or clarity
- Prefer functional array methods (flatMap, filter, map) over for loops; use type guards on filter to maintain type inference downstream
- Prefer scoped constant rather than global identifier, e.g. `typeof foo === "undefined"` instead of `foo === undefined`, `Number.POSITIVE_INFINITY` instead of `Infinity`.
- Always use block statement inside `if`'s branch and loop's body, even though it only contains single statement.

Reduce total variable count by inlining when a value is only used once.

```ts
// Good
const journal = await readFile(path.join(dir, "journal.json"));

// Bad
const journalPath = path.join(dir, "journal.json");
const journal = await readFile(journalPath);
```

### Imports

- Never use type-position `import("...")` references such as `Required<import("@gi-tcg/core").GameData>`.
- Never use indexed type such as `Foo["bar"][number]` unless that type does not have an accessible name from the use point.

### Variables

Prefer `const` over `let`. Use ternaries or early returns instead of reassignment for simple condition.

```ts
// Good
const foo = condition ? 1 : 2;

// Bad
let foo
if (condition) {
  foo = 1;
} else {
  foo = 2;
}
```

### Complex Logic

When a function has several validation branches or supporting details, make the main function read as the happy path and move supporting details into small helpers below it.

```ts
// Good
export function loadThing(input: unknown) {
  const config = requireConfig(input);
  const metadata = readMetadata(input);
  return createThing({ config, metadata });
}

function requireConfig(input: unknown) {
  ...
}
```

- Keep helpers close to the code they support, below the main export when that improves readability.
- Do not over-abstract simple expressions into many single-use helpers; extract only when it names a real concept like `requireConfig` or `readMetadata`.
- Add comments for non-obvious constraints and surprising behavior, not for obvious assignments or control flow.

## Testing

- Avoid mocks as much as possible, you shouldn't be using globalThis.\* at all unless it's the only option.
- Test actual implementation, do not duplicate logic into tests.
- Run `pnpm test` from the repository root to run tests across packages, or from a package directory such as `packages/core` for focused tests.
- Tests of card's implementation should be written under `packages/test/__tests__`, and should be implemented in asserting exact, observable behavior (game state), instead of internal logs.
- Do not introduce tests for a package with zero test coverage without the user's explicit allowance.

## Checks

- During focused iteration, run `pnpm check` from the affected package directory if it defines a `check` script (for example, `packages/core`). Never run `tsc` directly.
- Run `pnpm -r check` from the repository root to run a repository-wide check. A full `pnpm build` might be required: missing or stale package builds can cause mismatched types. Packages without a `check` script are skipped, so this is not full lint and type-check coverage.

## Documentations

- Do not add documentations for new features except that user ask you to do so.
