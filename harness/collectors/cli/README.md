# Native CLI observations

The data adapter runs the existing data check in three independent processes.
The checks adapter runs the exact ten baseline package checks serially. Both
retain noEmit and add only plain diagnostics and listFiles output for evidence.
The 4096 MiB V8 setting reproduces the historical limit; it is not a total-memory
acceptance threshold and this collector does not claim to measure Go memory.

The passive preload records each real process lifetime, compiled SDK entry and
native addon load. Artifact hashes use the original disk reader because Volar
temporarily virtualizes readFileSync for tsc. The compiled text hash is recorded
separately. The validator binds the configured Node, package-resolved SDK,
platform addon, complete process evidence directory, actual semantic RPCs and
raw output. It checks the exact 195-file set for data. Missing, failed or stale
observations cannot pass, and fresh execution at these sealed paths is required.

Independent review found and corrected omitted-child and unbound-addon evidence
risks. Development validation used three actual f535c22 checks and twelve
positive/adversarial evidence tests; it is not a final runner receipt. Formal
observations are generated only by `node harness/cli.mjs run data` / `run checks`
and remain subject to full input/evidence fingerprinting and final `run all`.
