# F-003 — the validation helper accepts non-object JSON bodies → HTTP 500 on `POST /api/rooms`

- **Status:** REPRODUCED LIVE (3/3 per payload). Server built from this repository (`454ea43c`), local `http://127.0.0.1:3000`.
- **Severity:** high — unauthenticated, remote, deterministic, one request.
- **Class:** CWE-20 (improper input validation) + CWE-248 (uncaught exception).
- **Affected:** `packages/server`.
- **Routes:** `POST /api/rooms` and `POST /api/rooms/:roomId/players`.

## Summary

Every request body is validated by one hand-rolled helper, `validateDto()`
(`packages/server/src/utils.ts`), which turns the raw JSON into a DTO class and then asks
`class-validator` to check it:

```ts
export async function validateDto<T extends object>(
  value: unknown,
  type: ClassConstructor<T>,
): Promise<T> {
  const dto = plainToClass(type, value);       // [] / "hello" / 123 / null -> not a T
  const errors = await validate(dto);          // class-validator sees no decorated props -> []
  if (errors.length > 0) {
    throw new BadRequestException(flattenValidationErrors(errors));
  }
  return dto;                                  // returned as if it were a valid T
}
```

`plainToClass` is permissive: a JSON array, string, number, `null` or `true` becomes an object whose
decorated properties are all `undefined`, so `validate()` returns **no errors** and the helper hands
the value on as if it were a valid DTO. The service then reads `params.deck` (undefined) and passes
it to `verifyDeck()`, whose `TypeError` is not a `DeckVerificationError` → **HTTP 500**.

Unlike F-002 this is not a missing decorator on one field: the *validator itself* never examined the
payload, so the same bypass applies to every endpoint that calls `validateDto()` — verified live on
both `POST /api/rooms` and `POST /api/rooms/:roomId/players`.

## Reproduction

Assumes the local server is running on `http://127.0.0.1:3000` (`GET /api/hello` -> `Hello World!`).
Paste this into PowerShell:

```powershell
# N1..N5: non-object JSON bodies, sent as raw text
foreach ($raw in '[{"name":"s3-array"}]', '"hello"', '123', 'null', 'true') {
  $r = Invoke-WebRequest -Method POST -Uri http://127.0.0.1:3000/api/rooms -ContentType application/json `
    -Body $raw -SkipHttpErrorCheck -UseBasicParsing
  "{0,-12} {1}  {2}" -f $raw, $r.StatusCode, $r.Content
}

# C0 control: a real object with a valid deck -> 201
$cards = @(311101,311102,311103,311104,311105,311106,311107,311108,311109,311110,311201,311202,311203,311204,311205) * 2
$body = @{ name = "s3-control"; deck = @{ characters = @(1101,1102,1103); cards = $cards } } | ConvertTo-Json -Compress -Depth 6
(Invoke-WebRequest -Method POST -Uri http://127.0.0.1:3000/api/rooms -ContentType application/json -Body $body -SkipHttpErrorCheck -UseBasicParsing).StatusCode
```

Recorded output (3/3 repetitions identical):

```
[{"name":"s3-array"}] 500  {"statusCode":500,"message":"Internal server error"}
"hello"      500  {"statusCode":500,"message":"Internal server error"}
123          500  {"statusCode":500,"message":"Internal server error"}
null         500  {"statusCode":500,"message":"Internal server error"}
true         500  {"statusCode":500,"message":"Internal server error"}
201
```

Server log (one distinct failure per payload, attributed in a single ordered run):

```
N1 array   TypeError: Cannot destructure property 'characters' of 'undefined' as it is undefined.
N2 string  TypeError: Cannot read properties of undefined (reading 'constructor')
N3 number  TypeError: Cannot destructure property 'characters' of 'undefined' as it is undefined.
N4 null    TypeError: Cannot read properties of null (reading 'constructor')
N5 true    TypeError: Cannot destructure property 'characters' of 'undefined' as it is undefined.
             at PO (packages/server/dist/main.js:481:46663)          # verifyDeck
             at async ... createRoom
```

The same bypass on the join endpoint:

```powershell
$cards = @(311101,311102,311103,311104,311105,311106,311107,311108,311109,311110,311201,311202,311203,311204,311205) * 2
$room = Invoke-RestMethod -Method POST -Uri http://127.0.0.1:3000/api/rooms -ContentType application/json `
  -Body (@{ name = "s3-room"; deck = @{ characters = @(1101,1102,1103); cards = $cards } } | ConvertTo-Json -Compress -Depth 6)
foreach ($raw in '[]', '{"name":"j"}', '{"name":"j","deck":{"characters":[1101,1102,1103]}}') {
  $r = Invoke-WebRequest -Method POST -Uri "http://127.0.0.1:3000/api/rooms/$($room.room.id)/players" `
    -ContentType application/json -Body $raw -SkipHttpErrorCheck -UseBasicParsing
  "{0,-52} {1}" -f $raw, $r.StatusCode
}
```

Recorded output:

```
[]                                                   500
{"name":"j"}                                         500
{"name":"j","deck":{"characters":[1101,1102,1103]}}  500
```

Note the contrast inside one endpoint: a body of `{}` is rejected with **400**
(`name must be longer than or equal to 1 characters`) because `name` *is* decorated and the property
is present-but-undefined; a body of `[]` sails through because there is nothing to decorate at all.

## Buggy code

`packages/server/src/utils.ts:277-287` — the helper never checks that it was given an object:

```ts
export async function validateDto<T extends object>(
  value: unknown,
  type: ClassConstructor<T>,
): Promise<T> {
  const dto = plainToClass(type, value);
  const errors = await validate(dto);
  if (errors.length > 0) {
    throw new BadRequestException(flattenValidationErrors(errors));
  }
  return dto;
}
```

Callers that inherit the bypass:

- `packages/server/src/rooms/rooms.controller.ts:161` — `validateDto(params, GuestCreateRoomDto)` in `createRoom`
- `packages/server/src/rooms/rooms.controller.ts:224` — `validateDto(params, GuestJoinRoomDto)` in `joinRoom`

The value then flows into `verifyDeck()` (`packages/server/src/utils.ts:73`) and the
`instanceof DeckVerificationError` filter (`packages/server/src/rooms/rooms.service.ts:818-824`),
exactly as in F-002.

## Fix

Make "must be a plain object" part of the helper's contract:

```ts
// packages/server/src/utils.ts
export async function validateDto<T extends object>(
  value: unknown,
  type: ClassConstructor<T>,
): Promise<T> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new BadRequestException("request body must be a JSON object");
  }
  const dto = plainToClass(type, value);
  const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });
  if (errors.length > 0) {
    throw new BadRequestException(flattenValidationErrors(errors));
  }
  return dto;
}
```

Or delegate to the framework pipe instead of hand-rolling validation:

```ts
// packages/server/src/main.ts
app.useGlobalPipes(new ValidationPipe({
  transform: true,
  whitelist: true,
  forbidNonWhitelisted: true,
  forbidUnknownValues: true,   // rejects non-object payloads before any handler runs
}));
```

`forbidUnknownValues: true` is the important one: with it, a payload that cannot be turned into a
known DTO is a 400 rather than an empty error list.

## Principle

A validation helper has two obligations, and they are not the same: *shape* (is this a value of the
kind I can validate at all?) and *rules* (does it satisfy the constraints?). `plainToClass` +
`validate` only implement the second — they are permissive by design and silently succeed on values
that have no decorated properties. Whenever a helper is the single gate between untrusted JSON and
typed service code, it must fail closed on every input it does not positively recognise; "no rule
violations found" must never be producible by "no rules were applicable".

## Server not running yet?

```powershell
pnpm install --frozen-lockfile
pnpm build "server..."
pnpm --filter @gi-tcg/server dev     # repo dev entrypoint: starts @prisma/dev (PGlite) + the server
# sanity check:  curl http://127.0.0.1:3000/api/hello   ->   Hello World!
```

## Harness bookkeeping (not needed to reproduce)

- Probe `S3` (`security-harness/probes/S3-non-object-body.probe.mjs`, `expect: internal-error`).
- Recorded probe run: `security-harness/evidence/<runId>/S3-non-object-body.json`.