# F-008 — A guest-chosen pre-v5.1.0 game version makes the reused id 123031 unresolvable: the Eremite Scorching Loremaster kit throws `GiTcgDataError: Unknown entity definition id 123031` at both clients and destroys the room

- **Upstream status: NOT NOVEL — already fixed upstream in PR #964 ("fix: fuzz test and bugs", commit range around `ca842841`/`ab84b1a9`), which carries all three parts of the fix: `since "v4.3.0"` on the reused id `123031` (`packages/data/src/characters/pyro/eremite_scorching_loremaster.gts`), `since "v4.3.0"` on the two `reserved` statuses `123033`/`123034` (`packages/data/src/old_versions/v5.0.0.gts`), and propagating `this.versionInfo` onto the returned passive entry (`packages/core/src/gts/vm_impl/skill.ts`).** This document is kept only as an independent, deployment-reachable confirmation through the live HTTP/SSE API; it is not reported as a new defect.
- **Status:** open — **REPRODUCED LIVE**, 3/3 rooms at `v4.7.0`, plus 1/1 at `v4.3.0` and at `v5.0.0`; 0/1 at `v5.1.0` and `v7.0.0` (controls). Local server built from this repository's HEAD, served on `http://127.0.0.1:3000`.
- **Severity:** high — reachable by an unauthenticated guest with two ordinary HTTP requests plus legal rpc answers, deterministic (no race, no flooding), and it destroys the room of *both* players.
- **Class:** CWE-1288 (improper validation of consistency within input) + CWE-248 (uncaught exception).
- **Affected:** `packages/server` (room-creation DTO forwards a client-chosen version), `packages/data` (id reuse with conflicting version markers), `packages/core` (a nested model loses its version info).
- **Accepted as an "internal error"** because the deployment's acceptance criteria include *"an unhandled exception (TypeError/Error) thrown by in-repo server-side code from attacker-controlled request data, delivered to the connected clients and destroying the affected room or game, while the HTTP process itself keeps serving"*. The exception here is `GiTcgDataError`, it is delivered to **both** players' SSE streams, and `GET /api/hello` keeps answering throughout.

---

## Summary

Two independent defects compose into one crash.

**(a) The client picks the game version, and old data reuses an id.** `CreateRoomDto` (which every guest room creation is validated against) carries a plain numeric `gameVersion`, documented as an index into `VERSIONS`:

```ts
// packages/server/src/rooms/rooms.controller.ts
export class CreateRoomDto {
  @IsInt()
  @Min(0)
  @Max(VERSIONS.length - 1)
  @IsOptional()
  gameVersion?: number;                       // <- index into VERSIONS, straight from the request body
```

`packages/core/src/base/version.ts` maps index 14 to `"v4.7.0"`, and `rooms.service.ts` stores it verbatim (`gameVersion: typeof params.gameVersion === "number" ? VERSIONS[params.gameVersion]! : ...`). The engine then loads `getData("v4.7.0")` for the whole game.

**(b) The id `123031` is defined twice with disjoint version windows, and the old definition is unreachable.** `packages/data/src/old_versions/v5.0.0.gts` defines it as a **summon**:

```ts
// packages/data/src/old_versions/v5.0.0.gts
define summon {
  id 123031 as private SpiritOfOmenPyroScorpion;
  until "v5.0.0";                               // last version this definition is valid for
  ...
};
```

and the *current* data defines the same id as a **technique card**, starting one version later:

```ts
// packages/data/src/characters/pyro/eremite_scorching_loremaster.gts
define card {
  id 123031 as SpiritOfOmenPyroScorpion;
  since "v5.1.0";                              // first version this definition is valid for
  undiscoverable;
  technique { ... }
};
```

The old burst of character `2303` still summons that id:

```ts
// packages/data/src/old_versions/v5.0.0.gts
define skill {
  id 23033 as private SpiritOfOmensAwakeningPyroScorpion;
  until "v5.0.0";
  skillType burst;
  ...
  :summon(SpiritOfOmenPyroScorpion);            // -> id 123031
};
```

Because the id's version windows do not overlap (`until "v5.0.0"` vs `since "v5.1.0"`) and the version-marker lookup picks the definition *whose `since` is the id's first appearance*, the versioned data set for `v4.7.0` contains **no** definition for `123031`. Upstream fixed this by moving the marker to the character's release version (`since "v4.3.0"`), see **Fix** below.

**(c) The nested passive model loses the outer skill's version.** The same kit's passive skill is versioned too (`until "v5.0.0"` in old data, a different body since `v5.1.0`), but `CharacterSkillModel.getEntry()` returns the nested passive entry as-is:

```ts
// packages/core/src/gts/vm_impl/skill.ts
getEntry(): Reserved | CharacterInitiativeSkillEntry | CharacterPassiveSkillEntry {
  if (this.reserved) {
    return RESERVED;
  } else if (this.passiveSkillEntry) {
    return this.passiveSkillEntry;               // <- no `version` propagated from this skill
  } else {
    return {
      type: "initiativeSkill",
      __definition: "initiativeSkills",
      id: this.id,
      version: this.versionInfo ?? DEFAULT_VERSION_INFO,   // the initiative branch *does* carry it
      skill: this.buildSkillDefinition(),
    };
  }
}
```

so a v4.7.0 game registers the *current* passive (`厄灵之能`, which grants energy **once per round** and, on using the burst, creates the technique card) instead of the old one.

**What the player observes.** As soon as the action phase begins and the engine builds the first action list, it previews the candidate skills:

```ts
// packages/core/src/game.ts
const previewer = new ActionPreviewer(this.state, who, skipError);
return await Promise.all(result.map((a) => previewer.modifyAndPreview(a) ...));
```
```ts
// packages/core/src/preview.ts
case "useSkill": {
  const skillInfo = newActionInfo.skill;
  ...
  await ctx.previewSkill(skillInfo, skillArg);   // runs the real skill body against a throw-away state
```
```ts
// packages/core/src/runtime/skill_context.ts
createEntity<Ty extends EntityType>(type: Ty, id: HandleT<Ty>, area?, opt = {}) {
  const id2 = id as number;
  const def = this.state.data.entities.get(id2);
  if (typeof def === "undefined") {
    throw new GiTcgDataError(`Unknown entity definition id ${id2}`);   // <- id 123031 at v4.7.0
  }
```

`previewSkill` rethrows anything that is not a `GiTcgPreviewAbortedError` when `skipError` is false (the default for a normal room), so the `GiTcgDataError` aborts `availableActions()`; the server pushes it to every connected client of the room as an SSE `error` frame and stops the room.

No HTTP 5xx is involved and the process stays up — this is the "destroying the affected room while the server keeps serving" class.

## Reproduction

Preconditions: the local server runs on `http://127.0.0.1:3000` (`GET /api/hello` -> `Hello World!`) and the repository's pinned Node exists at `.\.tools\node-v26.8.2-win-x64\node.exe`. Paste the whole block into PowerShell from the repository root.

The deck is legal everywhere it is used: 3 characters and 15 distinct action cards x2 (all `since "v3.3.0"`), so `verifyDeck()` accepts it at `v4.7.0`. Only `@Public()` room routes and each player's own notification stream are used; the rpc answers are the legal "keep hand / pick the first candidate / reroll nothing" answers the deployment's own timeout handler would send.

```powershell
$base = 'http://127.0.0.1:3000'
$node = if (Test-Path '.\.tools\node-v26.8.2-win-x64\node.exe') { (Resolve-Path '.\.tools\node-v26.8.2-win-x64\node.exe').Path } else { 'node' }
$js = @'
// Self-contained reproducer (node builtins only). No harness imports.
// Usage: node repro-scorpion.mjs            -> gameVersion 14 (v4.7.0), deck contains 2303
//        GV=33 node repro-scorpion.mjs       -> control: latest version
//        CHAR=1101 GV=14 node repro-scorpion.mjs -> control: old version, no scorpion kit
const BASE = process.env.BASE ?? "http://127.0.0.1:3000";
const GV = process.env.GV === undefined ? 14 : Number(process.env.GV);
const CHAR = process.env.CHAR === undefined ? 2303 : Number(process.env.CHAR);
const OLD_CARDS = [312101,312201,312301,312401,312501,312601,312701,312102,312202,312302,312402,312502,312602,312702,312001];
const OTHERS = CHAR === 1101 ? [1103, 1102] : [1101, 1102];
const DECK = { characters: [CHAR, ...OTHERS], cards: [...OLD_CARDS, ...OLD_CARDS] };

const varint = (n) => { const o = []; while (n > 127) { o.push((n & 127) | 128); n >>>= 7; } o.push(n); return o; };
const readVarint = (b, i) => { let v = 0, s = 0; for (;;) { const x = b[i++]; v |= (x & 127) << s; if (!(x & 128)) return [v >>> 0, i]; s += 7; } };
const zig = (n) => (n << 1) ^ (n >> 31);
const fld = (num, bytes) => [...varint((num << 3) | 2), ...varint(bytes.length), ...bytes];
const b64 = (arr) => Buffer.from(arr).toString("base64");

function answer(requestB64) {
  const b = Buffer.from(requestB64, "base64");
  switch (b[0]) {
    case 0x0a: return b64(fld(1, []));                   // rerollDice -> reroll nothing
    case 0x12: return b64(fld(2, []));                   // switchHands -> keep all
    case 0x1a: {                                          // chooseActive -> candidateIds[0]
      const sub = b.subarray(2, 2 + b[1]);
      const at = sub[0] === 0x0a ? 2 : 1;                 // packed (default) or unpacked
      const [zzId] = readVarint(sub, at);
      const id = (zzId >>> 1) ^ -(zzId & 1);
      return b64(fld(3, [0x08, ...varint(zig(id))]));
    }
    default: return null;
  }
}

const post = async (p, body, token) => {
  const r = await fetch(BASE + p, { method: "POST", headers: { "content-type": "application/json", ...(token ? { authorization: "Bearer " + token } : {}) }, body: JSON.stringify(body) });
  return { status: r.status, text: await r.text() };
};

const cr = await post("/api/rooms", { name: "sp-A", deck: DECK, gameVersion: GV });
if (cr.status !== 201) { console.log(JSON.stringify({ fatal: "create", status: cr.status, text: cr.text })); process.exit(0); }
const A = JSON.parse(cr.text), roomId = A.room.id, aId = A.playerId;
const jr = await post(`/api/rooms/${roomId}/players`, { name: "sp-B", deck: DECK });
if (jr.status !== 201) { console.log(JSON.stringify({ fatal: "join", status: jr.status, text: jr.text })); process.exit(0); }
const B = JSON.parse(jr.text), bId = B.playerId;
const info = await fetch(`${BASE}/api/rooms/${roomId}`, { headers: { authorization: "Bearer " + A.accessToken } }).then((r) => r.json());

const errors = [];
const ctrl = new AbortController();
const watch = async (id, token) => {
  const res = await fetch(`${BASE}/api/rooms/${roomId}/players/${id}/notification`, { headers: { accept: "text/event-stream", authorization: "Bearer " + token }, signal: ctrl.signal });
  if (res.status !== 200) return;
  const reader = res.body.getReader(), dec = new TextDecoder();
  let buf = "";
  try {
    for (;;) {
      const { value, done } = await reader.read(); if (done) break;
      buf += dec.decode(value, { stream: true });
      let i;
      while ((i = buf.indexOf("\n\n")) >= 0) {
        const chunk = buf.slice(0, i); buf = buf.slice(i + 2);
        const data = chunk.split("\n").filter((l) => l.startsWith("data:")).map((l) => l.slice(5).trim()).join("\n");
        if (!data) continue;
        let p; try { p = JSON.parse(data); } catch { continue; }
        if (p.type === "error") { errors.push(String(p.message).split("\n")[0]); ctrl.abort(); return; }
        if (p.type === "rpc" && p.data && p.data.request !== undefined) {
          const resp = answer(p.data.request);
          if (resp) await post(`/api/rooms/${roomId}/players/${id}/actionResponse`, { id: p.data.id, response: resp }, token);
        }
      }
    }
  } catch {}
};
const t0 = Date.now();
await Promise.race([
  Promise.all([watch(aId, A.accessToken), watch(bId, B.accessToken)]),
  new Promise((r) => setTimeout(r, 20000)),
]);
ctrl.abort();
await new Promise((r) => setTimeout(r, 500));
const after = await fetch(`${BASE}/api/rooms/${roomId}`, { headers: { authorization: "Bearer " + A.accessToken } }).then((r) => r.json());
console.log(JSON.stringify({ gameVersion: GV, char: CHAR, roomId, ms: Date.now() - t0, errors, roomStatus: after.status }, null, 2));
'@
$env:BASE = $base
$tmp = Join-Path $env:TEMP 'gi-scorpion-repro.mjs'
$js | Set-Content -Path $tmp -Encoding utf8
& $node $tmp
```

Observed (three consecutive runs; the room is destroyed ~0.5 s after joining):

```text
{
  "gameVersion": 14,
  "char": 2303,
  "roomId": 7905,
  "ms": 557,
  "errors": [
    "$T [Error]: Unknown entity definition id 123031"
  ],
  "roomStatus": "finished"
}
```

The full server-side message (SSE `error` frame, identical on both players) is:

```text
$T [Error]: Unknown entity definition id 123031
    when Handling event onDeclareEnd (player 0): [preview]
    at new $T (.../packages/server/dist/main.js:475:571)
    at e.createEntity (.../packages/server/dist/main.js:479:29941)
    at e.summon (.../packages/server/dist/main.js:479:30564)
    at e.executeSkill (.../packages/server/dist/main.js:481:6978)
    at e.finalizeSkill (.../packages/server/dist/main.js:481:7910)
    at Whe.previewSkill (.../packages/server/dist/main.js)
```

Controls (same script, environment overrides):

```powershell
$env:GV = '33'; & $node $tmp; Remove-Item Env:\GV    # v7.0.0, same deck -> no error, room keeps playing
$env:GV = '17'; & $node $tmp; Remove-Item Env:\GV    # v5.1.0, same deck -> no error, room keeps playing
$env:CHAR = '1101'; & $node $tmp; Remove-Item Env:\CHAR  # v4.7.0 without character 2303 -> no error
```

The measured matrix is exactly the version range the reused id spans:

| `gameVersion` index | version | deck has 2303 | result |
| --- | --- | --- | --- |
| 9 | `v4.3.0` | yes | **error frame `Unknown entity definition id 123031`, room finished** |
| 14 | `v4.7.0` | yes | **error frame, room finished (3/3)** |
| 16 | `v5.0.0` | yes | **error frame, room finished** |
| 17 | `v5.1.0` | yes | no error, room playing |
| 33 | `v7.0.0` | yes | no error, room playing |
| 14 | `v4.7.0` | no  | no error, room playing |

Note that the character does not even have to be the active character: the action list previews the skills of every character the player can switch to, so merely *owning* `2303` at those versions is enough.

## Buggy code

1. Client-chosen version forwarded to the engine — `packages/server/src/rooms/rooms.controller.ts` (`class CreateRoomDto`, `gameVersion`) and `packages/server/src/rooms/rooms.service.ts`:

```ts
      gameVersion:
        typeof params.gameVersion === "number"
          ? VERSIONS[params.gameVersion]!
          : CURRENT_VERSION,
```

2. The two conflicting definitions of id `123031`:

```ts
// packages/data/src/old_versions/v5.0.0.gts:117
define summon {
  id 123031 as private SpiritOfOmenPyroScorpion;
  until "v5.0.0";
```
```ts
// packages/data/src/characters/pyro/eremite_scorching_loremaster.gts:54
define card {
  id 123031 as SpiritOfOmenPyroScorpion;
  since "v5.1.0";
```

3. The outdated consumer of that id — `packages/data/src/old_versions/v5.0.0.gts:226`:

```ts
define skill {
  id 23033 as private SpiritOfOmensAwakeningPyroScorpion;
  until "v5.0.0";
  skillType burst;
  cost DiceType.Pyro, 3;
  cost DiceType.Energy, 2;
  :damage(DamageType.Pyro, 2);
  if (:self.hasEquipment(Scorpocalypse)) {
    :summon(SpiritOfOmenPyroScorpion01);
  } else {
    :summon(SpiritOfOmenPyroScorpion);           // id 123031 - undefined at v4.3.0..v5.0.0
  }
};
```

4. The dropped version info on nested passive skills — `packages/core/src/gts/vm_impl/skill.ts:512`:

```ts
  getEntry(): Reserved | CharacterInitiativeSkillEntry | CharacterPassiveSkillEntry {
    if (this.reserved) {
      return RESERVED;
    } else if (this.passiveSkillEntry) {
      return this.passiveSkillEntry;
    } else {
      return {
        type: "initiativeSkill",
        __definition: "initiativeSkills",
        id: this.id,
        version: this.versionInfo ?? DEFAULT_VERSION_INFO,
        skill: this.buildSkillDefinition(),
      };
    }
  }
```

5. The throw that is ultimately reached — `packages/core/src/runtime/skill_context.ts:1133`:

```ts
  createEntity<Ty extends EntityType>(type: Ty, id: HandleT<Ty>, area?, opt: CreateEntityOptions = {}) {
    const id2 = id as number;
    const def = this.state.data.entities.get(id2);
    if (typeof def === "undefined") {
      throw new GiTcgDataError(`Unknown entity definition id ${id2}`);
    }
```

6. Why it is fatal rather than skipped — `packages/core/src/preview.ts:106`:

```ts
    } catch (e) {
      if (e instanceof GiTcgPreviewAbortedError) {
        this.stopped = true;
      } else if (this.skipError) {
        // skip.
      } else {
        throw e;                                  // a normal room has skipError === false
      }
    }
```

The statuses `123033`/`123034` of the same old kit have the same shape (`until "v5.0.0"` while the current data marks them `reserved`), i.e. the old kit has three ids whose version markers disagree with the reused-id rule.

## Fix

Upstream fixed exactly this as `ca842841` ("fix(core,data): make the pre-v5.1.0 scorpion kit resolvable"); the three parts are needed together:

```diff
--- a/packages/core/src/gts/vm_impl/skill.ts
+++ b/packages/core/src/gts/vm_impl/skill.ts
@@ -514,7 +514,10 @@ export class CharacterSkillModel extends InitiativeSkillModel {
     if (this.reserved) {
       return RESERVED;
     } else if (this.passiveSkillEntry) {
-      return this.passiveSkillEntry;
+      return {
+        ...this.passiveSkillEntry,
+        version: this.versionInfo ?? DEFAULT_VERSION_INFO,
+      };
     } else {
```
```diff
--- a/packages/data/src/characters/pyro/eremite_scorching_loremaster.gts
+++ b/packages/data/src/characters/pyro/eremite_scorching_loremaster.gts
@@ -53,7 +53,7 @@
 define card {
   id 123031 as SpiritOfOmenPyroScorpion;
-  since "v5.1.0";
+  since "v4.3.0";
   undiscoverable;
```
```diff
--- a/packages/data/src/old_versions/v5.0.0.gts
+++ b/packages/data/src/old_versions/v5.0.0.gts
@@ -68,7 +68,8 @@
 define status {
   id 123033 as private PyroScorpionGuardianStance;
-  until "v5.0.0";
+  // v5.1.0 之后该状态被删去，手动将其标记为"主"版本
+  since "v4.3.0";
@@ -91,7 +92,8 @@
 define status {
   id 123034 as private PyroScorpionGuardianStance01;
-  until "v5.0.0";
+  since "v4.3.0";
```

(Applying the `since "v4.3.0"` change to the *current* file, but keeping the old_versions definitions, is what makes both the old summon and the new technique reachable; the second and third hunks are the same rule applied to the statuses whose current counterparts are `reserved`.)

A narrower, server-side hardening that would have prevented the crash even with the data as it is: reject a room whose deck contains ids that do not resolve in `getData(VERSIONS[gameVersion])` — `verifyDeck()` today validates against the *remote assets* version info, not against the engine data set the room will use (see also F-004).

## Principle

- **Reusing an id forces the version markers to be a partition, not a pair of half-open ranges that leave a hole.** `until "v5.0.0"` (old) plus `since "v5.1.0"` (new) looks continuous, but the engine keys the definition by *the id's first appearance* (`since`), so the id becomes "born" at v5.1.0 and every earlier version loses its definition entirely. Any data migration that moves a definition must move the id's `since` with it.
- **A versioned wrapper must not hand back a nested object that carries its own (empty) version.** `CharacterSkillModel` mixes two shapes through one method; the branch that does carry `version` shows the intent, and the branch that does not is the bug. This is the same failure mode as F-004: *two different version sources are treated as interchangeable.*
- **Validate the whole reachable data set, not just the ids that were named.** `verifyDeck()` checks the 33 ids the client named; the crash comes from an id the *engine* resolves on its own (a summon inside a skill body). Input validation that stops at the request body cannot see it.
