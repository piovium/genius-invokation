CREATE TABLE "User" (
  "id" integer PRIMARY KEY NOT NULL,
  "ghToken" text,
  "createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Game" (
  "id" serial PRIMARY KEY NOT NULL,
  "coreVersion" text NOT NULL,
  "gameVersion" text NOT NULL,
  "data" jsonb NOT NULL,
  "winnerId" integer,
  "createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "PlayerOnGames" (
  "playerId" integer NOT NULL,
  "gameId" integer NOT NULL,
  "who" integer NOT NULL,
  CONSTRAINT "PlayerOnGames_pkey" PRIMARY KEY("playerId","gameId")
);
--> statement-breakpoint
CREATE TABLE "Deck" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "code" text NOT NULL,
  "requiredVersion" integer NOT NULL,
  "ownerUserId" integer NOT NULL,
  "createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "PlayerOnGames" ADD CONSTRAINT "PlayerOnGames_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
--> statement-breakpoint
ALTER TABLE "PlayerOnGames" ADD CONSTRAINT "PlayerOnGames_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
--> statement-breakpoint
ALTER TABLE "Deck" ADD CONSTRAINT "Deck_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
