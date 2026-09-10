# Native (tsgo) GTS consumption

The workspace consumes GTS through
`typescript-native-bridge@6.0.3-bridge.16.tsgo.7.0.2`, pinned as the workspace
`typescript` in both the `overrides` and `catalog` sections of
`pnpm-workspace.yaml`. Every package check therefore runs on tsgo: the ten
workspace check scripts (`gtsc --noEmit` for `@gi-tcg/data`, `tsc --noEmit`
for the other nine) and the recursive test suites all resolve `typescript` to
the bridge.

This repository keeps only the integration surface required to consume GTS.
The TNB-backed language service belongs to the GTS repository; the
migration-time route that added a second copy of it to the custom data loader,
together with its container packaging and its Node language-server entry point,
has been removed. The custom data loader keeps its original browser worker
editor, which is unrelated to the native consumption path.

## Install and check

Use the pinned toolchain: Node 26.1.0 and pnpm 12.0.0, as recorded in
`mise.toml` and matched by `engines.node` (`^26.1.0`) and `packageManager`
(`pnpm@12.0.0`). The first two commands are the ones CI runs
(`.github/workflows/main.yml`); `prisma:generate` is required by the server
check, because the generated client is not committed.

```sh
pnpm install --frozen-lockfile
pnpm build "cbinding...,standalone..."
pnpm --filter @gi-tcg/server prisma:generate
pnpm check
pnpm -r test
```

`pnpm check` runs the package check scripts with workspace concurrency set to
one, which bounds the number of concurrent native checkers; it covers the whole
data package, including the historical GTS sources.

## Patches

The branch adds two entries to the pnpm `patchedDependencies` map, which
already carried `puppeteer-screen-recorder@3.0.6`.
[Patch provenance](./tsgo-patches.json) records the release archive integrity,
patch hashes and unpublished source revisions.

- `typescript-native-bridge@6.0.3-bridge.16.tsgo.7.0.2` — the in-process tsgo
  host patch, and the reason the pinned package can stand in for `typescript`.
- `@volar/typescript@2.4.28` — kept for memory rather than for correctness,
  since the ten checks also pass without it. The patch drops the 4 MiB cap that
  made module resolution treat files of 4 MiB or more as missing, and it adds
  the `tnbGetSourceText` compiler-host hook. The GTS language plugin feeds the
  translated GTS text through that hook, so the native checker never has to
  build a second JavaScript syntax tree; TNB falls back to `host.getSourceFile`
  when the hook is absent, which is functionally equivalent but allocates the
  full JavaScript AST. Measured on `gtsc --noEmit` over `packages/data` (peak
  working set of the single Node process, three runs each): ~5.8 GiB without
  the hook, ~4.3 GiB with it.

Other candidate patches were measured and are deliberately absent. See the
`removedCandidates` section of the provenance file for the evidence.

Patch files are stored with LF endings, enforced by `.gitattributes`
(`*.patch text eol=lf`). pnpm matches patch context exactly, so a checkout that
converted them to CRLF on Windows would stop them from applying.

## Memory measurements

The historical 4 GiB failure describes a V8 heap limit, not a limit on total
memory. Compare elapsed time, the main JavaScript heap, and the complete
checker process tree including Go. Moving allocations from JavaScript into Go
does not by itself demonstrate a memory improvement.
