# Native GTS development

This branch uses `typescript-native-bridge@6.0.3-bridge.16.tsgo.7.0.2`
as the workspace `typescript` package. TNB runs semantic checking in tsgo.
The GTS and Volar patches keep virtual GTS source text available to that checker
without constructing a second complete JavaScript syntax tree.

This candidate is still under validation. On Windows, frozen installation,
the typed CI build, all ten package check commands and 209 recursive tests have
passed. Test typechecking also completed without errors. Three independent
native data checks covered all 195 GTS files on an earlier candidate; those
runs still need repeating on the final candidate.

Final harness acceptance is pending, including the extension's 100-round
sessions and a clean Linux/container build and run. Linux frozen installation
has passed; earlier Linux builds were blocked by external resource downloads.

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

Dependencies use exact registry versions with pnpm `patchedDependencies`.
Keep the lockfile and patch files with the checkout.
[Patch provenance](./tsgo-patches.json) records the release archive integrity,
patch hashes and unpublished source revisions used for this candidate.
The companion source changes are on the
[GTS branch](https://github.com/piovium/gts/tree/codex/tsgo-gts) and the
[TNB fork branch](https://github.com/DrAbx123/typescript-native-bridge/tree/codex/tsgo-bridge).
The committed patches install these changes without requiring unpublished
packages, sibling worktrees or manually modified dependencies.

## VS Code

Install a GamingTS extension build with native SDK support from the GTS branch
linked above. The published extension may not include these changes.
Open this repository and select **TypeScript: Select TypeScript Version → Use
Workspace Version**. The checked-in workspace SDK is
`node_modules/typescript/lib`.

GamingTS resolves the workspace's native SDK for both its GTS service and the
TypeScript extension's TS/TSX service. Check the GamingTS startup log for the
resolved SDK path. Restart the language services after changing the installed
SDK.
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
