# F-002 — omitting `deck` (or `deck.cards`) from `POST /api/rooms` → `verifyDeck()` TypeError → HTTP 500

- **Status:** REPRODUCED LIVE (3/3). Server built from this repository (`454ea43c`), local `http://127.0.0.1:3000`.
- **Severity:** high — unauthenticated, remote, deterministic, one field omitted.
- **Class:** CWE-20 (improper input validation) + CWE-248 (uncaught exception).
- **Affected:** `packages/server`.
- **Route:** `POST /api/rooms` and `POST /api/rooms/:roomId/players`.

## Summary

`GuestCreateRoomDto.deck` is declared with `@ValidateNested()` and nothing else, and neither
`DeckDto.characters` nor `DeckDto.cards` is declared required. A body that simply omits `deck` — or
keeps `deck` but omits `cards` — therefore passes DTO validation, and the service calls
`verifyDeck()` with a value that is `undefined`:

```ts
export async function verifyDeck({ characters, cards }: Deck): Promise<Version> {
  const DEC = DeckVerificationErrorCode;
  const versions = new Set<string | undefined>();
  const characterSet = new Set(characters);          // TypeError when the argument is undefined
  ...
  if (cards.length !== 30) {                          // TypeError when `cards` is undefined
    throw new DeckVerificationError(DEC.SizeError, "deck must contain 30 cards");
  }
```

The `TypeError` is not a `DeckVerificationError`, so the "deck problem" filter in `createRoom()`
rethrows it and NestJS answers **HTTP 500**:

```ts
} catch (e) {
  if (e instanceof DeckVerificationError) {
    throw new BadRequestException(`Deck verification failed: ${e.message}`);
  } else {
    throw e;                                          // TypeError -> HTTP 500
  }
}
```

Why validation misses it: `@ValidateNested()` skips `undefined`, and `@ArrayMinSize()` /
`@ArrayMaxSize()` never run when the property is absent — they only constrain arrays that **exist**.

## Reproduction

Assumes the local server is running on `http://127.0.0.1:3000` (`GET /api/hello` -> `Hello World!`).
Paste this into PowerShell (M1/M2 are the bug, C1..C4 are controls):

```powershell
$cards = @(311101,311102,311103,311104,311105,311106,311107,311108,311109,311110,311201,311202,311203,311204,311205) * 2
$cases = [ordered]@{
  "M1 no deck"    = @{ name = "m1" }                                                  # -> 500
  "M2 no cards"   = @{ name = "m2"; deck = @{ characters = @(1101,1102,1103) } }      # -> 500
  "C1 deck {}"    = @{ name = "c1"; deck = @{} }                                      # -> 400
  "C2 deck null"  = @{ name = "c2"; deck = $null }                                    # -> 400
  "C3 cards only" = @{ name = "c3"; deck = @{ cards = $cards } }                      # -> 400
  "C4 valid"      = @{ name = "c4"; deck = @{ characters = @(1101,1102,1103); cards = $cards } }  # -> 201
}
foreach ($k in $cases.Keys) {
  $r = Invoke-WebRequest -Method POST -Uri http://127.0.0.1:3000/api/rooms -ContentType application/json `
    -Body ($cases[$k] | ConvertTo-Json -Compress -Depth 6) -SkipHttpErrorCheck -UseBasicParsing
  "{0,-14} {1}  {2}" -f $k, $r.StatusCode, $r.Content.Substring(0, [Math]::Min(90, $r.Content.Length))
}
```

Recorded output (3/3 repetitions identical):

```
M1 no deck     500  {"statusCode":500,"message":"Internal server error"}
M2 no cards    500  {"statusCode":500,"message":"Internal server error"}
C1 deck {}     400  {"message":"Deck verification failed: deck must contain 3 characters", ...
C2 deck null   400  {"message":["nested property deck must be either object or array"], ...
C3 cards only  400  {"message":"Deck verification failed: deck must contain 3 characters", ...
C4 valid       201  {"accessToken":"...","playerId":"guest-...","room":{...
```

Server log for the two 500s:

```
[Nest] ERROR [ExceptionsHandler] TypeError: Cannot destructure property 'characters' of 'undefined' as it is undefined.
    at PO (packages/server/dist/main.js:481:46663)          # verifyDeck
    at async createRoom (packages/server/dist/main.js:836:102026)

[Nest] ERROR [ExceptionsHandler] TypeError: Cannot read properties of undefined (reading 'length')
    at PO (packages/server/dist/main.js:481:46782)          # verifyDeck, `cards.length`
    at async createRoom (packages/server/dist/main.js:836:102026)
```

The contrast inside one endpoint is the tell: `deck: {}` is a **400** (the properties exist and are
validated), while an **absent** `deck` is a **500** (nothing was validated). The same two shapes are
also 500 on `POST /api/rooms/:roomId/players`.

## Buggy code

`packages/server/src/rooms/rooms.controller.ts:108-118` — no required-field guard on the nested deck
(and no `@Type(() => DeckDto)`, so nested validation does not even recurse):

```ts
export class GuestCreateRoomDto extends CreateRoomDto {
  @Length(1, 64)
  name!: string;

  @ValidateNested()          // <- no @IsDefined(), no @Type(() => DeckDto)
  deck!: DeckDto;

  @IsOptional()
  @Length(1, 256)
  avatarUrl?: string;
}
```

`packages/server/src/decks/decks.controller.ts:47-57` — the array decorators never fire on an absent
property:

```ts
export class DeckDto implements Deck {
  @IsInt({ each: true })
  @ArrayMinSize(3)
  @ArrayMaxSize(3)
  characters!: number[];      // no @IsDefined() / @IsArray()

  @IsInt({ each: true })
  @ArrayMinSize(30)
  @ArrayMaxSize(30)
  cards!: number[];           // no @IsDefined() / @IsArray()
}
```

`packages/server/src/utils.ts:73-91` — `verifyDeck()` trusts the shape it was handed:

```ts
export async function verifyDeck({ characters, cards }: Deck): Promise<Version> {
  const characterSet = new Set(characters);      // TypeError if the argument is undefined
  if (characterSet.size !== 3) {
    throw new DeckVerificationError(DEC.SizeError, "deck must contain 3 characters");
  }
  if (cards.length !== 30) {                     // TypeError if `cards` is undefined
    throw new DeckVerificationError(DEC.SizeError, "deck must contain 30 cards");
  }
```

## Fix

Require the fields so the request never reaches the service in that shape:

```ts
// packages/server/src/decks/decks.controller.ts
import { IsArray, IsDefined } from "class-validator";

export class DeckDto implements Deck {
  @IsDefined() @IsArray() @ArrayMinSize(3) @ArrayMaxSize(3) @IsInt({ each: true })
  characters!: number[];

  @IsDefined() @IsArray() @ArrayMinSize(30) @ArrayMaxSize(30) @IsInt({ each: true })
  cards!: number[];
}

// packages/server/src/rooms/rooms.controller.ts
import { Type } from "class-transformer";

@IsDefined() @ValidateNested() @Type(() => DeckDto)
deck!: DeckDto;
```

Keep the service defensive, so a future DTO change cannot resurface as a 500:

```ts
// packages/server/src/utils.ts — first statements of verifyDeck
const validDeck =
  deck !== null && typeof deck === "object" &&
  Array.isArray(deck.characters) && Array.isArray(deck.cards);
if (!validDeck) {
  throw new DeckVerificationError(DEC.SizeError, "deck must have characters[] and cards[]");
}
```

## Principle

- **Validating the fields that are present does not make absent fields invalid.** `@ValidateNested()`
  skips `undefined`; `@ArrayMinSize()` never runs on a property that does not exist.
- **A required nested object needs an explicit `@IsDefined()` + `@Type()` pair**; otherwise the
  decorators are decorative.
- **Catching a specific error subclass is not input validation.** It classifies only the faults the
  author anticipated; everything else escapes as a 500. Validate the shape where it enters, not by
  exception type where it explodes.

## Server not running yet?

```powershell
pnpm install --frozen-lockfile
pnpm build "server..."
pnpm --filter @gi-tcg/server dev     # repo dev entrypoint: starts @prisma/dev (PGlite) + the server
# sanity check:  curl http://127.0.0.1:3000/api/hello   ->   Hello World!
```

## Harness bookkeeping (not needed to reproduce)

- Probe `S2` (`security-harness/probes/S2-missing-deck-shape.probe.mjs`, `expect: internal-error`).
- Recorded probe run: `security-harness/evidence/<runId>/S2-missing-deck-shape.json`.