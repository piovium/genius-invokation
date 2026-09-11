# tnb-guards: the four original TNB guards, executed and re-checked

This adapter is registered for the `tnb-guards` gate (repository `tnb`,
condition `tnb-changed`, covers `R1`). It runs the TNB repository's four existing
guard scripts as bounded, separately observed children inside the pinned
worktree and ties the result to the exact pinned inputs.

- `tnb-guards-collector.mjs` runs each guard script with the runner's Node
  (`HARNESS_NODE`) and the gate timeout, writes every raw stdout/stderr child log
  under `HARNESS_RUN_DIRECTORY` with a `tnb-guards-` name, hashes it, records the
  checked-out TNB revision, both submodule revisions (pin and checked-out commit)
  and the bridge version, and writes one observation to `HARNESS_OUTPUT`. It
  reports no verdict: it exits zero even when a guard fails, so "could not run in
  this environment" stays a justified BLOCKED, never a PASS. Only a broken
  collector (missing runner environment, unreadable contract) exits non-zero.
- `tnb-guards-collector.mjs` also records the optional machine-local Volar
  checkout the runner resolved from `harness/local.json` (a new `volar` entry,
  resolved before the run and exported as `HARNESS_VOLAR_ROOT`): the resolved
  path, the checkout git revision and working-tree state, and a bounded scan of
  the sources that determine the guard workload. When the directory is present
  the collector passes it to the guard as the guard's own `VOLAR_ROOT` override;
  when it is absent the variable is omitted, the guard's honest `missing volar/vue`
  branch runs, and the gate stays BLOCKED.
- `tnb-guards-validator.mjs` re-derives every claim. `evaluate` is pure: it checks
  the recorded bridge version, the reported submodule revisions and HEAD against
  the checkout resolved from disk, then, for every guard, checks the recorded exit
  code and parses each child's own completion report out of the raw log. A guard
  that exits non-zero, prints failure text while exiting zero, reports a count
  below the frozen minimum (zero matches), or has a short-circuited/hidden child
  is a FAIL; a reviewed external prerequisite that is genuinely unavailable (the
  vue-tsc Volar checkout) is a BLOCKED with that exact reason. `validate` adds the
  layer that confines each log reference to the run directory, requires a
  64-digit hash, requires the `tnb-guards-` prefix and rejects a changed file.
- `tnb-guards-expectations.json` is reviewed data: the pinned bridge version, the
  two submodule revisions, and for each guard the exact scripts, the exact
  completion report each script must print, the counts that may not collapse to
  zero, and the one reviewed environment block. It is data, not logic.

Guards and their scripts:

| guard | scripts |
| --- | --- |
| `check:lib` | `tools/check-lib-sync.mjs`, `tools/check-bundle-shape.mjs`, `tools/check-skeleton-imports.mjs` |
| `check:enums` | `tools/check-enum-remap.mjs` |
| `check:go-as-guards` | `tools/check-go-as-guards.mjs` |
| `check:sourcefile-guard` | `tools/check-sourcefile-guard.mjs` (vitest, vue-tsc workload) |

Run it through the runner: `node harness/cli.mjs run tnb-guards`.

Observed on this machine with the pinned Node: `check:lib`, `check:enums` (6
auto-discovered getters, 13 coverage-registry rows) and `check:go-as-guards`
(6 sites checked) pass; `check:sourcefile-guard` cannot run because its reviewed
`volar/vue` checkout is not present (no `VOLAR_ROOT`, no sibling checkout), so the
gate is BLOCKED, not PASS. The collector reads no paths of its own: it runs the
guard exactly as the repository defines it and passes the inherited environment
through, so a reviewed `volar/vue` sibling or an inherited `VOLAR_ROOT` lets
`check:sourcefile-guard` execute and the gate can then PASS. `check:sourcefile-guard`
writes only to the OS temp directory and inside the Volar checkout, never into this
worktree.

What this gate deliberately does not claim: the TNB witnesses, simulated
navigation and the Volar suite are separate gates, and guard output is not witness
execution. This adapter only runs the four `check:*` guards read-only.