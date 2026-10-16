-- One-time adoption of the complete legacy Prisma schema. No business DDL runs
-- against an existing database. Keep this migration immutable after deployment.
DO $baseline$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('User', 'Game', 'PlayerOnGames', 'Deck')) THEN
    IF to_regclass('public._prisma_migrations') IS NULL THEN
      RAISE EXCEPTION 'Existing tables without Prisma migration history; baseline refused';
    END IF;
    IF (SELECT count(DISTINCT migration_name) FROM public._prisma_migrations
      WHERE migration_name IN ('20251013090510_init', '20251202124237_user_add_color', '20260405072539_user_add_name')
      AND finished_at IS NOT NULL AND rolled_back_at IS NULL) <> 3
      OR EXISTS (SELECT 1 FROM public._prisma_migrations WHERE finished_at IS NULL AND rolled_back_at IS NULL) THEN
      RAISE EXCEPTION 'Incomplete Prisma migrations; finish or resolve legacy migrations before adopting Drizzle';
    END IF;
    IF EXISTS (
      SELECT 1 FROM (VALUES
('User', 'id', 'integer', true),
('User', 'name', 'text', false),
('User', 'chessboardColor', 'text', false),
('User', 'ghToken', 'text', false),
('User', 'createdAt', 'timestamp(3) without time zone', true),
('Game', 'id', 'integer', true),
('Game', 'coreVersion', 'text', true),
('Game', 'gameVersion', 'text', true),
('Game', 'data', 'jsonb', true),
('Game', 'winnerId', 'integer', false),
('Game', 'createdAt', 'timestamp(3) without time zone', true),
('PlayerOnGames', 'playerId', 'integer', true),
('PlayerOnGames', 'gameId', 'integer', true),
('PlayerOnGames', 'who', 'integer', true),
('Deck', 'id', 'integer', true),
('Deck', 'name', 'text', true),
('Deck', 'code', 'text', true),
('Deck', 'requiredVersion', 'integer', true),
('Deck', 'ownerUserId', 'integer', true),
('Deck', 'createdAt', 'timestamp(3) without time zone', true),
('Deck', 'updatedAt', 'timestamp(3) without time zone', true)
      ) AS expected(tbl, col, typ, nn)
      LEFT JOIN pg_namespace n ON n.nspname = 'public'
      LEFT JOIN pg_class c ON c.relnamespace = n.oid AND c.relname = expected.tbl AND c.relkind = 'r'
      LEFT JOIN pg_attribute a ON a.attrelid = c.oid AND a.attname = expected.col AND a.attnum > 0 AND NOT a.attisdropped
      WHERE a.attname IS NULL OR format_type(a.atttypid, a.atttypmod) <> expected.typ OR a.attnotnull <> expected.nn
    ) THEN
      RAISE EXCEPTION 'Legacy schema columns differ from baseline; adoption refused';
    END IF;
    IF (SELECT count(*) FROM pg_constraint WHERE connamespace = 'public'::regnamespace AND (
      (conrelid = 'public."User"'::regclass AND contype = 'p' AND pg_get_constraintdef(oid) = 'PRIMARY KEY (id)') OR
      (conrelid = 'public."Game"'::regclass AND contype = 'p' AND pg_get_constraintdef(oid) = 'PRIMARY KEY (id)') OR
      (conrelid = 'public."Deck"'::regclass AND contype = 'p' AND pg_get_constraintdef(oid) = 'PRIMARY KEY (id)') OR
      (conrelid = 'public."PlayerOnGames"'::regclass AND contype = 'p' AND pg_get_constraintdef(oid) = 'PRIMARY KEY ("playerId", "gameId")') OR
      (conrelid = 'public."Deck"'::regclass AND contype = 'f' AND pg_get_constraintdef(oid) = 'FOREIGN KEY ("ownerUserId") REFERENCES "User"(id) ON UPDATE CASCADE ON DELETE RESTRICT') OR
      (conrelid = 'public."PlayerOnGames"'::regclass AND contype = 'f' AND pg_get_constraintdef(oid) IN (
        'FOREIGN KEY ("playerId") REFERENCES "User"(id) ON UPDATE CASCADE ON DELETE RESTRICT',
        'FOREIGN KEY ("gameId") REFERENCES "Game"(id) ON UPDATE CASCADE ON DELETE RESTRICT'))
    )) <> 7 THEN
      RAISE EXCEPTION 'Legacy keys differ from baseline; adoption refused';
    END IF;
    IF pg_get_serial_sequence('public."Deck"', 'id') IS NULL OR pg_get_serial_sequence('public."Game"', 'id') IS NULL THEN
      RAISE EXCEPTION 'Legacy serial sequences missing; adoption refused';
    END IF;
  ELSE
CREATE TABLE "Deck" (
	"id" serial PRIMARY KEY,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"requiredVersion" integer NOT NULL,
	"ownerUserId" integer NOT NULL,
	"createdAt" timestamp(3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);

CREATE TABLE "Game" (
	"id" serial PRIMARY KEY,
	"coreVersion" text NOT NULL,
	"gameVersion" text NOT NULL,
	"data" jsonb NOT NULL,
	"winnerId" integer,
	"createdAt" timestamp(3) DEFAULT now() NOT NULL
);

CREATE TABLE "PlayerOnGames" (
	"playerId" integer,
	"gameId" integer,
	"who" integer NOT NULL,
	CONSTRAINT "PlayerOnGames_pkey" PRIMARY KEY("playerId","gameId")
);

CREATE TABLE "User" (
	"id" integer PRIMARY KEY,
	"name" text,
	"chessboardColor" text,
	"ghToken" text,
	"createdAt" timestamp(3) DEFAULT now() NOT NULL
);

ALTER TABLE "Deck" ADD CONSTRAINT "Deck_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PlayerOnGames" ADD CONSTRAINT "PlayerOnGames_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PlayerOnGames" ADD CONSTRAINT "PlayerOnGames_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $baseline$;
