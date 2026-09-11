# F-004 — deck validation and the game engine use two different card databases → the opponent's join answers HTTP 500

- **Status:** REPRODUCED LIVE (3/3). Server built from this repository (`454ea43c`), local `http://127.0.0.1:3000`.
- **Severity:** high — unauthenticated (guest room creation + guest join), remote, deterministic, two requests.
- **Class:** CWE-1288 (improper validation of consistency within input) + CWE-248 (uncaught exception).
- **Affected:** `packages/server`, `packages/assets-manager` (data), `packages/data`.
- **Route:** `POST /api/rooms` then `POST /api/rooms/:roomId/players`.

## Summary

`verifyDeck()` decides whether a deck is legal by looking every id up in the **assets manager**, which
serves the published card data (bundled snapshot + the public assets API), and compares the
`sinceVersion` it returns with the room's game version:

```ts
const character = await getData<CharacterRawData>(chId);
...
versions.add(character.sinceVersion);      // version comes from the assets data
...
const card = await getData<ActionCardRawData>(cardId);
...
versions.add(card.sinceVersion);
...
return maxVersion(versions);
```

The game itself is built from the **in-repo engine data** (`packages/data`), which carries its own,
independent `since` metadata. Nothing compares the two. For card **333017** they disagree:

```ts
// packages/data/src/cards/event/food.gts — the engine registers it later
define card { id 333017 as GlitteringGemstones; since "v5.3.0"; ... }
```
```jsonc
// packages/assets-manager/src/data/EN/action_cards.json (and .../CHS/...):  "id": 333017
"sinceVersion": "v5.2.0", "obtainable": true, "shareId": 443,
```

So for `gameVersion = 18` (= `VERSIONS[18]` = `"v5.2.0"`):

1. `POST /api/rooms` with a deck containing 333017 → **201**: the validator is happy
   (`maxVersion` = `v5.2.0`, `semver.compare("v5.2.0", "v5.2.0") > 0` is false).
2. The opponent joins: `Room.start()` → `InternalGame.createInitialState()` → `initPlayerState()`
   asks the **engine** for card 333017 at v5.2.0 → not registered at that version →
   `GiTcgDataError("Unknown card id 333017")`, which `Room.start()` catches and rethrows as
   `InternalServerErrorException` → the **joining** player gets **HTTP 500**.
3. The room is destroyed by that failure: `GET /api/rooms/:roomId` afterwards → **404**.

The direction matters: the validator is *more permissive* than the engine for this id, so a
user-facing validation route (`POST /api/decks/version` → **201**, `requiredVersion: 18`) actively
approves the deck that the engine cannot build. Card 333017 is a constructive witness — it is an
ordinary obtainable card, and the disagreement is in the shipped data itself, so this needs no
network or race.

`initPlayerState()` — where the engine rejects what the validator accepted
(`packages/core/src/game.ts:133-148`):

```ts
let initialPile: EntityDefinition[] = deck.cards.map((id) => {
  const def = data.entities.get(id);
  if (typeof def === "undefined") {
    throw new GiTcgDataError(`Unknown card id ${id}`);
  }
  return def;
});
const characterDefs: readonly CharacterDefinition[] = deck.characters.map((id) => {
  const def = data.characters.get(id);
  if (typeof def === "undefined") {
    throw new GiTcgDataError(`Unknown character id ${id}`);
  }
  return def;
});
```

## Reproduction

Assumes the local server is running on `http://127.0.0.1:3000` (`GET /api/hello` -> `Hello World!`).
The host creates a room at version index 18 (`v5.2.0`) with 333017 in the deck; a second player joins
with a perfectly clean deck. Paste this into PowerShell:

```powershell
$base = "http://127.0.0.1:3000"
$hot  = @(333017,311101,311102,311103,311104,311105,311106,311107,311108,311109,311110,311201,311202,311203,311204) * 2
$cool = @(311101,311102,311103,311104,311105,311106,311107,311108,311109,311110,311201,311202,311203,311204,311205) * 2

# 1. host: gameVersion 18 = v5.2.0, deck carries 333017  -> 201
$create = Invoke-WebRequest -Method POST -Uri "$base/api/rooms" -ContentType application/json `
  -Body (@{ name = "s4-hot"; gameVersion = 18; deck = @{ characters = @(1101,1102,1103); cards = $hot } } | ConvertTo-Json -Compress -Depth 6) `
  -SkipHttpErrorCheck -UseBasicParsing
"create: $($create.StatusCode)"
$roomId = ($create.Content | ConvertFrom-Json).room.id

# 2. opponent: any legal deck  -> 500
Invoke-WebRequest -Method POST -Uri "$base/api/rooms/$roomId/players" -ContentType application/json `
  -Body (@{ name = "s4-cool"; deck = @{ characters = @(1101,1102,1103); cards = $cool } } | ConvertTo-Json -Compress -Depth 6) `
  -SkipHttpErrorCheck -UseBasicParsing | Select-Object StatusCode, Content

# 3. the room is destroyed by the failure  -> 404
"after: $((Invoke-WebRequest -Uri "$base/api/rooms/$roomId" -SkipHttpErrorCheck -UseBasicParsing).StatusCode)"

# 4. OPTIONAL and independent of the repro: the deck validator approves exactly this deck.
#    Steps 1-3 above use only POST /api/rooms*; if a hardened deployment hides the deck routes
#    (403/404, e.g. behind a gateway), skip this step - the 500 in step 2 is unaffected.
#    -> 201, requiredVersion 18
$ver = Invoke-WebRequest -Method POST -Uri "$base/api/decks/version" -ContentType application/json `
  -Body (@{ name = "s4v"; characters = @(1101,1102,1103); cards = $hot } | ConvertTo-Json -Compress -Depth 6) -SkipHttpErrorCheck -UseBasicParsing
"decks/version (optional): $($ver.StatusCode) requiredVersion $((($ver.Content | ConvertFrom-Json).requiredVersion))"
```

Recorded output (3/3 repetitions identical):

```
create: 201
StatusCode Content
---------- -------
       500 {"message":"Failed to create initial game state: Error: Unknown card id 333017\n; propably due to invalid decks","error":"Internal Server Error","statusCode":500}
after: 404
decks/version (optional): 201 requiredVersion 18
```

Server log for the join:

```
[Nest] LOG [RoomsService] Room 401 game phase: undefined
[Nest] LOG [RoomsService] Room 401 removed
```

(`Room.start()` called `stop()` from its catch block before rethrowing the 500; "game phase:
undefined" is the stopped room without a game.)

Variants worth knowing:

- The trigger is *not* the deck size or the character ids: `[1101,1102,1103]` and the 29 filler
  cards are legal at v5.2.0 and present in the engine's data.
- Putting 333017 on the **joining** side fails identically: `createInitialState` receives both decks.
- Choosing `gameVersion` = the current version makes the same deck work — the mismatch is purely the
  version metadata, so v5.2.0 is the only trigger.
- The filler ids matter: `311111` needs v6.1.0 and `311112` needs v6.3.0, so a deck containing them
  is rejected (400) before reaching the engine.

## Buggy code

`packages/server/src/utils.ts:111-131` — the validator's card loop takes the version from the assets
datum and never consults the engine's own registry:

```ts
const card = await getData<ActionCardRawData>(cardId);
if (!card) {
  throw new DeckVerificationError(DEC.NotFoundError, `card id ${cardId} not found`);
}
const cardMaxCount = SINGLETON_REQUIRED_TAGS.some((tag) => card?.tags.includes(tag)) ? 1 : 2;
...
cardCounts.set(cardId, 1);
versions.add(card.sinceVersion);              // <- version comes from the assets data
```

`packages/server/src/rooms/rooms.service.ts:811-824` (and the same block in `joinRoom`, `:941-954`) —
the only version rule applied before the engine is handed the deck:

```ts
const version = await verifyDeck(playerInfo.deck);
if (semver.compare(version, roomConfig.gameVersion) > 0) {
  throw new BadRequestException(
    `Deck version required ${version}, it's higher game version ${roomConfig.gameVersion}`,
  );
}
```

`packages/core/src/game.ts:133-148` — the engine resolves its *own* data for that version and throws
a `GiTcgDataError` (not a `DeckVerificationError`):

```ts
const def = data.entities.get(id);
if (typeof def === "undefined") {
  throw new GiTcgDataError(`Unknown card id ${id}`);
}
```

`packages/server/src/rooms/rooms.service.ts:549-565` — the `catch` converts any error into a 500 and
reports it to whoever triggered `start()` (the joiner):

```ts
} catch (e) {
  this.stop();
  throw new InternalServerErrorException(
    `Failed to create initial game state: ${e}; propably due to invalid decks`,
  );
}
```

## Fix

Validate against the data the engine will actually use:

```ts
// packages/server/src/rooms/rooms.service.ts — the deck check
import getData from "@gi-tcg/data";
import { VERSIONS } from "@gi-tcg/core";

const engineData = getData(VERSIONS[params.gameVersion ?? VERSIONS.length - 1]);
for (const id of playerInfo.deck.cards) {
  if (!engineData.entities.has(id)) {
    throw new BadRequestException(`card id ${id} is not implemented in this game version`);
  }
}
for (const id of playerInfo.deck.characters) {
  if (!engineData.characters.has(id)) {
    throw new BadRequestException(`character id ${id} is not implemented in this game version`);
  }
}
```

So a data drift can never surface as a 500 again, and the failure lands on the party that supplied
the bad deck:

```ts
// packages/server/src/rooms/rooms.service.ts — Room.start()
} catch (e) {
  this.stop();
  throw new BadRequestException(`Failed to create initial game state: ${e}; probably due to invalid decks`);
}
```

Add a consistency gate in CI that diffs the assets snapshot against the engine registry for every
version (the scan used here is ~40 lines), so shipping a card whose metadata disagrees is a build
failure rather than a runtime 500.

## Principle

- **Validate against the thing you will use.** `verifyDeck` validates with database *A* and the
  engine consumes database *B*; any disagreement is a hole by construction, and no amount of input
  validation on either side alone can close it.
- **A published data source is not a proof of local capability.** `sinceVersion` from the assets data
  is metadata about the *game*, not about *this build*; the build must answer "can I run this card at
  this version?" from its own registry.
- **Version metadata is data, and data drifts.** Two curated tables of "since which version" will
  disagree eventually; the disagreement must be detected (assert/test/diff) instead of trusted.
- **A `catch` that turns "the input cannot be played" into `InternalServerErrorException` hides the
  cause and blames the wrong client.** Errors that mean "the request was invalid" must stay 4xx.

## Server not running yet?

```powershell
pnpm install --frozen-lockfile
pnpm build "server..."
pnpm --filter @gi-tcg/server dev     # repo dev entrypoint: starts @prisma/dev (PGlite) + the server
# sanity check:  curl http://127.0.0.1:3000/api/hello   ->   Hello World!
```

## Harness bookkeeping (not needed to reproduce)

- Probe `S4` (`security-harness/probes/S4-asset-engine-version-skew.probe.mjs`, `expect: internal-error`).
- Recorded probe run: `security-harness/evidence/<runId>/S4-asset-engine-version-skew.json`.
- First raw capture: `security-harness/evidence/2026-09-11T18-28-45-286Z/card-333017/`
  (`00-deck.json`, `repN-*.json`, `analysis-*.json`).