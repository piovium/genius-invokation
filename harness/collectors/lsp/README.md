# gts-lsp: stdio language-server evidence

This adapter is registered for the `gts-lsp` gate (covers L1 and E1). It runs
`@gi-tcg/gts-language-server` as a child process over stdio, in the GTS
checkout, with no editor in the loop, and proves both the language semantics
and the compiler identity behind them.

- `gts-lsp-collector.mjs` writes the reviewed fixtures and a throwaway
  workspace under `HARNESS_RUN_DIRECTORY`, drives the reviewed step script and
  records the raw protocol transcript, the live RPC trace, the server log and
  the identity it resolves from the checkout. It reports no verdict and exits
  non-zero only when the server failed, timed out or answered an error.
- `gts-lsp-validator.mjs` re-derives every claim from those raw records and
  from the files on disk: diagnostic codes with exact spans and recovery,
  hover, definition (which must resolve to a document the client opened),
  completion, signature help, incremental document versions, document texts
  equal to the sealed fixtures, resolved TNB package name and exact version,
  native addon path and hash, tsgo build info version, balanced
  `ENTER`/`EXIT` counts including the required native calls, one
  `BRIDGE_LOAD` record naming that addon, a command line that is exactly
  `gts-language-server.js --stdio` from inside the run directory started with
  a Node executable, and the absence of leaked `__gts_*` identifiers or fatal
  output. Capabilities, the
  set of opened documents and the tsdk are read from the recorded exchange and
  the resolved checkout, never from the collector's own summary, and any
  disagreement is a failure. `evaluate` is pure and unit-tested; `validate`
  adds the layer that requires a 64-digit hash on every evidence reference,
  constrains those paths to the run directory and re-derives the compiler
  identity from disk.
- `gts-lsp-expectations.json` holds the fixtures, the step script and the
  expected semantics. It is data, not logic, so a reviewer can read exactly
  what the gate claims.

Run it through the runner: `node harness/cli.mjs run gts-lsp`. The gate depends
on `gts-engine` and `gts-build`, so it always runs against a freshly built
checkout. Expectations must be reviewed against the near-final product state;
loosening them to make a run pass is a control change, not a fix.

What this gate deliberately does not claim: VSIX packaging, the real editor or
Electron extension host, and the desktop 100-round session remain `desktop`
acceptance, and are neither proven nor implied here.
