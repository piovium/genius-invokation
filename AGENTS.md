# Task coordination and acceptance

Read HARNESS.md and harness/contract.json before work. While contract.phase is harness-only, product migration is paused. The user has authorized the coordinator to begin migration after the core harness passes its self-tests and independent review. Do not resume the earlier interrupted implementation assignments; generate fresh tasks.

The canonical acceptance controls are in this workspace's harness/ directory. Run `node harness/cli.mjs verify` before using them. The seal covers the contract, assertions, tests, instructions and CI. Changing a control file invalidates prior receipts; independent review and a new seal are required. Do not edit the seal to conceal a failed check.

Only the coordinator owns HARNESS.md, this file, package.json, harness/contract.json, harness/seal.json and the runner. A delegated harness subtask must name its allowed files. Product agents cannot weaken test assertions, gate lists or baselines to complete their task.

Future product tasks must be issued with `node harness/cli.mjs task ROLE`. It fails while contract.phase is harness-only or the current sealed self-tests have not passed. After core validation and independent review, the coordinator reviews the phase change, reseals controls, runs the harness self-tests, and then generates tasks. Dispatch the generated text verbatim with the concrete implementation objective appended. Do not use the earlier interrupted task prompts.

When reviewed harness changes supersede active tasks, use `node harness/cli.mjs revise OLD_TASK_FILE` after the new self-tests pass. It creates a new task record linked to the old one, preserving ownership and original baseline while retaining existing scoped changes. It cannot clear out-of-scope changes or bless old acceptance receipts. Communicate the new generated task to the worker; never edit an old task record to hide changes.

Use only the isolated worktrees named in the contract. Never modify the original genius-invokation/scripts/server-harness/memory.mjs or memory.test.mjs: another user process owns them. Do not copy mutable node_modules or dist between workers.

A worker handoff must include its task file, git changes, exact commands and runner receipts. Workers do not declare migration complete. The coordinator runs final acceptance on the integrated tree and uses `node harness/cli.mjs finish RUN_DIRECTORY`; any missing, blocked, stale, subset-only or changed-during-run evidence prevents completion. Manually authored PASS JSON is not an acceptance result.

These local controls detect inconsistencies and common bypasses; they are not an OS sandbox against a process with equal write permissions. Review control-file diffs and use the included CI check. Remote branch protection has not been configured.
