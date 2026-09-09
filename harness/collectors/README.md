# Registering real product evidence

The data/checks CLI adapter is registered. Other adapters remain blocked.
Add only the minimum glue around the
existing pnpm scripts, Vitest, Volar, TNB tsserver harness and actual editor/UI.
This directory, its fixtures and assertions are sealed controls, owned by the
coordinator and independently reviewed. Product workers cannot weaken them.

Each contract.adapters[GATE] names three relative files in this directory:
`collector`, `validator`, `expectations`. The collector is a Node module; the
validator exports `validate(observation, {contract, expectations, nonce, root,
directory, gate})`, returning `{status: "PASS" | "FAIL" | "BLOCKED", reason}` after checking
actual observations against separately reviewed expectations. Do not implement
a validator that simply accepts an observation's status or expected values.

The runner launches the exact collector with the configured Node, in the gate's
isolated repository, with bounded time/output and process-tree cleanup. Read:

- `HARNESS_ROOT`, `HARNESS_RUN_DIRECTORY`, `HARNESS_OUTPUT`
- `HARNESS_NONCE`, `HARNESS_GATE`, `HARNESS_SEAL`, `HARNESS_SOURCE_DIGEST`
- `HARNESS_PLATFORM` (collector must also observe its actual process.platform)
- `HARNESS_NODE`, `HARNESS_MANAGER`, `HARNESS_NPM` (resolved, fingerprinted runtimes;
  recursive manager commands use the runner's per-run PATH shims)

Write one JSON observation to HARNESS_OUTPUT. Its envelope must contain
`runNonce`, `gateId`, `controlDigest`, `sourceDigest`, `platform`. Keep all raw
child output and other evidence under HARNESS_RUN_DIRECTORY; use gate-prefixed
names. The runner hashes the entire evidence directory, including additions
and deletions, and revalidates the observation at finish. An envelope alone
cannot pass. The collector's exit code must be zero and must not hide failing
child processes. Never use discovery output as executed tests.

For desktop/web/memory, supply `trace` using the session probe schema. Its
validation always runs in addition to the adapter-specific assertions, with
the sealed TNB pin and edit count. Desktop also needs actual scenario records
for every contract.policy.desktopScenarios entry; the adapter must validate
their raw editor/host evidence. Schema-only Node LSP traces cannot claim the
Electron extension host was tested.

Coverage supplies actual program `files` and `scenarios` for every sealed
coverage scenario. The runner always compares exact path sets. The adapter
must validate CLI nonzero/error-span/repair evidence from actual checks, not
filesystem discovery or hand-authored lists.

Test gates must provide executedTests > 0, failedTests = 0, skippedTests = 0
from the existing test runner report and validate that report. Data must use
contract.policy.dataRuns separate native checks. All check packages and their
actual engine identities are required. TNB witnesses must execute the current
repository's witness matrix, including the sweep prerequisite; `all`/`matrix`
output alone is not execution. Platform evidence needs real Windows and Linux
execution provenance, not a claimed platform string.

Preparation (install, generation, builds) may change executable inputs. Prepare
first and run acceptance on the resulting stable tree. Any source/dependency/
output content change during a run invalidates its receipt; redo that run once
preparation is complete. Gate-specific temporary fixtures must be restored.

Review, seal, run selftests, then register/use the adapter through the runner.
No auto-registration, pass-through validator, force option or mutable command
override is provided. Local hashes ensure consistency, not protection from a
process that can rewrite all controls and evidence with equal permissions.
