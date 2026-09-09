# Native GTS development

This branch uses `typescript-native-bridge@6.0.3-bridge.16.tsgo.7.0.2`
as the workspace `typescript` package. TNB runs semantic checking in tsgo.
The GTS and Volar patches keep virtual GTS source text available to that checker
without constructing a second complete JavaScript syntax tree.

The migration is still being validated. A successful install or an individual
test is not the completed migration acceptance result.

This is a work-in-progress checkpoint, not a release. Windows frozen installation
and the full CI build have run successfully. Native data checks covered all 195
GTS files in three independent successful runs. The complete package checks and
recursive tests are still failing on bridge compatibility issues: declaration
output paths, a type-only import sharing its name with a local value, and Vitest
matcher interface merging. Fixes and full acceptance are still in progress.
The real extension's 100-round sessions and clean Linux/container build and run
are not yet accepted. Linux frozen installation succeeded; earlier Linux builds
were blocked by external resource downloads. Do not treat this checkpoint as a
verified server deployment.

## Install and check

Use Node 26 (the package requires `^26.1.0`) and the pinned pnpm 12.0.0:

```sh
pnpm install --frozen-lockfile
pnpm build "cbinding...,standalone..."
pnpm --filter @gi-tcg/server prisma:generate
pnpm check
pnpm -r test
```

`pnpm check` runs the existing package check scripts with workspace concurrency
set to one. It includes the complete data package and historical GTS sources.
Keep declaration generation enabled when preparing dependencies.

Dependencies use exact registry versions and the repository's
`patchedDependencies` mechanism. The lockfile and patch files must travel with
the checkout; no sibling worktree, absolute local package link, or manually
modified installation is required. [Patch provenance](./tsgo-patches.json)
records the released archive integrity, patch hashes and unpublished source
revisions used for this candidate. These local source commits have not been
pushed or published; the committed patches make installation self-contained.

## VS Code

Install the GamingTS extension build containing the native SDK integration.
The existing published extension has not been assumed to contain these changes.
Open this repository and select **TypeScript: Select TypeScript Version → Use
Workspace Version**. The checked-in workspace SDK is
`node_modules/typescript/lib`.

GamingTS resolves the workspace's native SDK for both its GTS service and the
TypeScript extension's TS/TSX service. Check the GamingTS startup log for the
resolved SDK path. Restart the language services after changing the installed SDK.
The extension also resolves dependencies from a `packages/data` workspace;
testing that workspace is part of final acceptance.

## Web editor

The custom data editor offers **Browser** and **Backend** checking. Browser
checking uses the pinned JavaScript TypeScript SDK in a Worker. Backend
checking uses a local or remote TNB/tsgo process; it does not need the browser
TypeScript SDK download. Both modes retain the same editor contents and undo
history when switching. Backend connection failures remain visible until
reconnection or an explicit mode change.

See [the editor instructions](../packages/custom-data-loader/README.md) for the
actual start commands, connection URL and mode selection. Card transpilation
and execution still run in the browser in either checking mode.

## Memory measurements

The historical 4 GiB failure describes a V8 heap limit, not a limit on total
memory. Compare elapsed time, the main JavaScript heap, and the complete
checker process tree including Go. Moving allocations from JavaScript into Go
does not by itself demonstrate a memory improvement.
