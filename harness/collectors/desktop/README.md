# desktop: real-editor session evidence in the GTS checkout

This adapter is registered for the `desktop` gate (covers L1, L2, L3, L4 and
E1). It opens the GTS checkout in a real VS Code, measures a 100-round
edit -> diagnostics -> query -> recovery session in two workspaces, and then
measures the extension the product itself packed.

## Target

Everything is bound to the GTS checkout the sealed contract names
(`repositories.gts.path`, `worktrees/gts`). The two measured workspaces are the
repository root (`root-workspace`) and `examples/` (`examples-workspace`); the
probe project each execution creates is written inside its own workspace and
removed again by `desktop-target.mjs` in a `finally`, so the checkout is clean
after a run. The adapter refuses to reuse a pre-existing probe directory and
refuses to remove one that holds entries it did not create.

`desktop-validator.mjs` also carries a guard list of the retired acceptance
target's identifiers and fails any observation that names one of them, and it
requires every measured source to resolve inside its own measured workspace.
Rebinding is therefore both what the collector does and what the validator
enforces.

## Files

- `desktop-collector.mjs` is the registered collector. It prepares each
  workspace probe, launches the real editor, records the raw extension-host
  report, the passive native process logs, the launch record, the product pack
  step and the packed launch, derives the session trace, and writes one JSON
  observation. It reports no verdict, never writes a status field, and exits
  non-zero only when a step failed.
- `desktop-launch.mjs` owns the two launch modes and the single argument
  predicate that both the collector and the validator apply:
  `development-path` loads the checkout with `--extensionDevelopmentPath` and
  installs nothing; `packed-vsix-install` installs a real `.vsix` with
  `--install-extension` into an isolated `--extensions-dir` +
  `--user-data-dir` and never sets a development path. It also runs
  `desktop-linux-cleanup.mjs` from a `finally`, so a failed or timed-out launch
  is cleaned up like a successful one.
- `desktop-vsix.mjs` writes the packed extension. `packVsix` runs the product's
  own pack script through the sealed executor
  (`HARNESS_NODE $HARNESS_MANAGER --filter gamingts-vscode run pack <output>`)
  and the `.vsix` lands inside the run directory. Nothing is ever located on
  disk: an artifact a human left behind is not evidence. `inspectVsix` reads
  the VSIX as a ZIP and requires the reviewed member set, the pinned TNB
  package name and version, and the native addon hash the checkout was measured
  with. The container hash changes between runs, so only the hash of the
  artifact this run measured is ever compared.
- `desktop-linux-cleanup.mjs` is the shared Linux process cleanup. The sealed
  executor owns the whole tree on win32 (job object, `KILL_ON_JOB_CLOSE`), but
  on Linux it only signals the direct child's process group and never returns
  the child pid, so a `setsid` descendant can escape a hard timeout. The module
  finds each launch by scanning `/proc/<pid>/cmdline` for that launch's
  isolated profile and extension directories, plans the whole tree across
  process groups, signals it, and re-reads `/proc` to prove it is gone. It
  never signals the harness's own process, its ancestors or its process group,
  and it never mistakes a recycled pid for a survivor.
- `desktop-evidence.mjs` reads raw records that live inside the run directory:
  every reference must carry a 64-hex SHA-256 and must resolve inside the run
  directory with no symlink on the way, and the bytes are re-hashed before they
  are used. It also binds the passive native logs to the two measured language
  services.
- `desktop-protocol.mjs`, `desktop-observations.mjs` and `desktop-scenarios.mjs`
  replay the native protocol, re-derive the sealed session trace and edit
  cycles, and derive the twelve sealed scenarios from the raw records.
- `desktop-identity.mjs` resolves the compiler identity from the checkout
  (never from the observation) and pins it to the contract.
- `desktop-expectations.json` holds the reviewed fixtures, expected diagnostic
  codes and feature responses. It is data, not logic. `desktop-plan.json` holds
  the workspaces, launch modes, runtime paths, pack step and scenario list.
- `desktop-testkit.mjs` builds the synthetic fixture the self-tests use. It is
  not part of a real run and is never acceptance evidence.

## Evidence discipline

The collector only records. The validator re-derives every conclusion from the
raw records, the launch records, the packed VSIX bytes, the on-disk checkout
and the sealed fixtures, and returns its own `PASS`/`FAIL`/`BLOCKED`. A packed
mode that could not run is `BLOCKED`, never a passed scenario. A run that does
not record a process-cleanup outcome for every launch cannot pass: on Linux the
record must prove the launch tree was terminated with no survivors, and on
win32 it must state that the sealed job object owns termination.

Run it through the runner: `node harness/cli.mjs run desktop`. The gate depends
on `gts-engine` and `gts-build`, so it always runs against a freshly built
checkout.

## What this adapter does not claim

The desktop gate has never been executed end to end. The 100-round evidence
that its self-tests accept is a synthetic fixture produced by
`desktop-testkit.mjs`; it proves the checks are coherent, not that the product
works. The packed-VSIX mode is implemented and unit-tested against a real ZIP,
but no `.vsix` has been packed and installed by the sealed runner yet, and no
Linux desktop run is possible on this host because no Linux VS Code runtime is
prepared. Recording real 100-round evidence remains the coordinator's step.