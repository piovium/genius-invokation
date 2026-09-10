# Native GTS development

This branch consumes GTS through
`typescript-native-bridge@6.0.3-bridge.16.tsgo.7.0.2`, pinned as the workspace
`typescript` in both the `overrides` and `catalog` sections of
`pnpm-workspace.yaml`. Every package check therefore runs on tsgo: the ten
workspace check scripts (`gtsc --noEmit` for `@gi-tcg/data`, `tsc --noEmit`
for the other nine) and the recursive test suites all resolve `typescript` to
the bridge.

Only the integration surface this repository needs in order to consume GTS is
kept here. The migration-time route that added a second, TNB-backed language
service to the custom data loader — together with its container packaging and
its Node language-server entry point — has been removed. The custom data
loader keeps its original browser worker editor, which is unrelated to the
native consumption path.

## Install and check

Use Node 26 (the package requires `^26.1.0`) and the pinned pnpm 12.0.0:

```sh
pnpm install --frozen-lockfile
pnpm build "cbinding...,standalone..."
pnpm --filter @gi-tcg/server prisma:generate
pnpm check
pnpm -r test
```

`pnpm check` runs the existing package check scripts with workspace
concurrency set to one, which keeps the number of concurrent native checkers
low. It covers the complete data package, including the historical GTS
sources.

## Patches

Two patches are applied through pnpm `patchedDependencies`; both are required
for this consumption path. [Patch provenance](./tsgo-patches.json) records the
release archive integrity, patch hashes and unpublished source revisions.

- `typescript-native-bridge@6.0.3-bridge.16.tsgo.7.0.2` — the in-process tsgo
  host patch. It is what makes the pinned package usable as `typescript`.
- `@volar/typescript@2.4.28` — adds the `tnbGetSourceText` compiler-host hook.
  The GTS language plugin feeds translated GTS text through it, so the native
  checker never has to build a second JavaScript syntax tree. TNB falls back to
  `host.getSourceFile` when the hook is absent, which is functionally
  equivalent but allocates the full JS AST. Measured on `gtsc --noEmit` over
  `packages/data` (peak working set of the single Node process, three runs
  each): ~5.8 GiB without the hook, ~4.3 GiB with it.

Other candidate patches were measured and are deliberately absent. See the
`removedCandidates` section of the provenance file for the evidence.

Patch files are kept with the checkout and are pinned to LF by `.gitattributes`
(`*.patch text eol=lf`); a CRLF patch breaks pnpm patch application on Windows.

## Memory measurements

The historical 4 GiB failure describes a V8 heap limit, not a limit on total
memory. Compare elapsed time, the main JavaScript heap, and the complete
checker process tree including Go. Moving allocations from JavaScript into Go
does not by itself demonstrate a memory improvement.
