# F-001 — a negative card id crashes deck verification → HTTP 500

- **Status:** REPRODUCED LIVE (3/3). Server built from this repository (`454ea43c`), local `http://127.0.0.1:3000`.
- **Severity:** high — unauthenticated, remote, deterministic, one request.
- **Class:** CWE-704 (type confusion) + CWE-248 (uncaught exception).
- **Affected:** `packages/server`, `packages/assets-manager`.
- **Route:** `POST /api/rooms` (guest room; no login).

## Summary

`getData()` in `packages/assets-manager/src/manager.ts` picks the data domain from the **sign** of the id:

```ts
async getData(id: number, options: GetDataOptions = {}): Promise<AnyData> {
  if (id < 0) {
    return this.getKeyword(-id, options);   // returns KeywordRawData: { id, rawName, name, ... }
  }
  if (this.dataCacheSync.has(id)) {
    return this.dataCacheSync.get(id)!;
  }
  // ... otherwise fetch /datum/<version>/<lang>/<id>
}
```

A `KeywordRawData` has **no `tags` field**. `verifyDeck()` in `packages/server/src/utils.ts` casts the
lookup to `ActionCardRawData` and reads `.tags`:

```ts
const card = await getData<ActionCardRawData>(cardId);   // unchecked cast
if (!card) {
  throw new DeckVerificationError(DEC.NotFoundError, `card id ${cardId} not found`);
}
const cardMaxCount = SINGLETON_REQUIRED_TAGS.some(
  (tag) => card?.tags.includes(tag),        // card?.tags is undefined for a keyword datum
)
  ? 1
  : 2;
```

The optional chain guards `card`, not `card.tags`, so the request throws
`TypeError: Cannot read properties of undefined (reading 'includes')`. `verifyDeck()` is only allowed
to raise `DeckVerificationError`; the caller converts exactly that class to 400 and **rethrows
everything else**, so the TypeError escapes as **HTTP 500**:

```ts
} catch (e) {
  if (e instanceof DeckVerificationError) {
    throw new BadRequestException(`Deck verification failed: ${e.message}`);
  } else {
    throw e;                                 // <- TypeError becomes HTTP 500
  }
}
```

The id only has to be a negative integer: `@IsInt({ each: true })` and `@ArraySize` accept it.

## Reproduction

Assumes the local server is running on `http://127.0.0.1:3000` (`GET /api/hello` -> `Hello World!`).
Paste this into PowerShell:

```powershell
$cards = @(311101,311102,311103,311104,311105,311106,311107,311108,311109,311110,311201,311202,311203,311204,311205) * 2
$cards[0] = -1                       # <- the entire payload: one negative card id
$body = @{ name = "f001"; deck = @{ characters = @(1101,1102,1103); cards = $cards } } | ConvertTo-Json -Compress -Depth 6
Invoke-WebRequest -Method POST -Uri http://127.0.0.1:3000/api/rooms -ContentType application/json -Body $body -SkipHttpErrorCheck -UseBasicParsing |
  Select-Object StatusCode, Content
```

Recorded output (3/3 repetitions identical):

```
StatusCode Content
---------- -------
       500 {"statusCode":500,"message":"Internal server error"}
```

Server log for that request:

```
[Nest] 15152 - 2026/09/12 02:59:24   ERROR [ExceptionsHandler] TypeError: Cannot read properties of undefined (reading 'includes')
    at PO (file:///.../packages/server/dist/main.js:481:46663)          # verifyDeck
    at async ... createRoom
```

Control: run the same block with `$cards[0]` left as `311101` -> `201` and a room object is returned,
so the negative id is the only variable. Expected (fixed) result: `400 Deck verification failed:
card id -1 not found`.

## Buggy code

`packages/assets-manager/src/manager.ts:409-412` — the sign silently switches the data domain:

```ts
async getData(id: number, options: GetDataOptions = {}): Promise<AnyData> {
  if (id < 0) {
    return this.getKeyword(-id, options);
  }
```

`packages/server/src/utils.ts:110-123` — the card loop trusts that lookup:

```ts
const card = await getData<ActionCardRawData>(cardId);
if (!card) {
  throw new DeckVerificationError(DEC.NotFoundError, `card id ${cardId} not found`);
}
const cardMaxCount = SINGLETON_REQUIRED_TAGS.some(
  (tag) => card?.tags.includes(tag),
)
  ? 1
  : 2;
```

`packages/server/src/rooms/rooms.service.ts:811-824` — only one error class is tolerated in
`createRoom()` (the identical block is in `joinRoom()`, `:941-954`):

```ts
try {
  const version = await verifyDeck(playerInfo.deck);
  if (semver.compare(version, roomConfig.gameVersion) > 0) {
    throw new BadRequestException(
      `Deck version required ${version}, it's higher game version ${roomConfig.gameVersion}`,
    );
  }
} catch (e) {
  if (e instanceof DeckVerificationError) {
    throw new BadRequestException(`Deck verification failed: ${e.message}`);
  } else {
    throw e;
  }
}
```

## Fix

Validate the shape at the trust boundary instead of relying on the cast:

```ts
// packages/server/src/utils.ts
const card = await getData<ActionCardRawData>(cardId);
if (!card || !Array.isArray(card.tags)) {
  throw new DeckVerificationError(DEC.NotFoundError, `card id ${cardId} not found`);
}

const character = await getData<CharacterRawData>(chId);
if (!character || !Array.isArray(character.tags)) {
  throw new DeckVerificationError(DEC.NotFoundError, `character id ${chId} not found`);
}
```

Make deck failures 4xx whatever went wrong inside:

```ts
// packages/server/src/rooms/rooms.service.ts — createRoom() and joinRoom()
} catch (e) {
  if (e instanceof DeckVerificationError) {
    throw new BadRequestException(`Deck verification failed: ${e.message}`);
  }
  throw new BadRequestException(`Deck verification failed`);   // never a 500 for a bad deck
}
```

Optionally make the domain explicit (`getActionCardData` / `getKeywordData` instead of one
sign-dispatched `getData`) so an out-of-range id can no longer resolve to a different type.

## Principle

- **A type assertion is not a check.** `getData<ActionCardRawData>()` only silences the compiler;
  untrusted ids must be checked against the *shape* they are used as.
- **Don't let a value's sign pick the data domain implicitly.** `id < 0 -> keyword` turns an
  out-of-range card id into a different object type instead of a clear "not found".
- **Error handling must not launder bugs into 500s.** A `catch` that whitelists one error class and
  rethrows the rest converts internal defects into "server error" and hides them from the caller.
- **Optional chaining is not validation.** `card?.tags.includes(...)` protects only the first
  property access; the crash simply moves to `tags`.

## Server not running yet?

```powershell
pnpm install --frozen-lockfile
pnpm build "server..."
pnpm --filter @gi-tcg/server dev     # repo dev entrypoint: starts @prisma/dev (PGlite) + the server
# sanity check:  curl http://127.0.0.1:3000/api/hello   ->   Hello World!
```

(The audit ran the built `packages/server/dist/main.js` instead of `dev` because the pinned Node
26.8.2 breaks the dev loader; the HTTP behaviour is identical.)

## Harness bookkeeping (not needed to reproduce)

- Probe `S1` (`security-harness/probes/S1-negative-keyword-card.probe.mjs`, `expect: internal-error`).
- Recorded probe run: `security-harness/evidence/<runId>/S1-negative-keyword-card.json`.