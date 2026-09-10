// Copyright (C) 2024-2025 Guyutongxue
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as
// published by the Free Software Foundation, either version 3 of the
// License, or (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Affero General Public License for more details.
//
// You should have received a copy of the GNU Affero General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

import { and, count, desc, eq, lte } from "drizzle-orm";
import { badRequest, notFound } from "../errors";
import type { Database } from "../db/database";
import { decks, type DeckModel } from "../db/schema";
import type { CreateDeckDto, QueryDeckDto, UpdateDeckDto } from "./routes";
import type { Deck } from "@gi-tcg/typings";
import { ASSETS_MANAGER, verifyDeck, type PaginationResult } from "../utils";
import { VERSIONS } from "@gi-tcg/core";

export interface DeckWithVersion extends Deck {
  code: string;
  requiredVersion: number;
}
export interface DeckWithDeckModel extends DeckWithVersion, DeckModel {}

export interface Decks {
  deckToCode(deck: Deck): Promise<DeckWithVersion>;
  createDeck(userId: number, deck: CreateDeckDto): Promise<DeckModel>;
  getAllDecks(
    userId: number,
    query: QueryDeckDto,
  ): Promise<PaginationResult<DeckWithDeckModel>>;
  getDeck(userId: number, deckId: number): Promise<DeckWithDeckModel | null>;
  updateDeck(
    userId: number,
    deckId: number,
    deck: UpdateDeckDto,
  ): Promise<DeckModel>;
  deleteDeck(userId: number, deckId: number): Promise<void>;
}

/**
 * Encodes a deck and reports the oldest core version that can replay it.
 * Database-free, so fixtures can exercise it without a server.
 */
export async function deckToCode(deck: Deck): Promise<DeckWithVersion> {
  try {
    const requiredVersion = VERSIONS.indexOf(await verifyDeck(deck));
    return {
      ...deck,
      code: ASSETS_MANAGER.encode(deck),
      requiredVersion,
    };
  } catch (error) {
    if (error instanceof Error) throw badRequest(error.message);
    throw error;
  }
}

/** A stored row joined with the deck content its code carries. */
const withDeckContent = (model: DeckModel): DeckWithDeckModel => ({
  ...model,
  ...ASSETS_MANAGER.decode(model.code),
});

export function createDecks(database: Database): Decks {
  return {
    deckToCode,
    async createDeck(userId, deck) {
      const { code, requiredVersion } = await deckToCode(deck);
      const [model] = await database.db
        .insert(decks)
        .values({
          name: deck.name,
          code,
          requiredVersion,
          ownerUserId: userId,
          updatedAt: new Date(),
        })
        .returning();
      return model!;
    },
    async getAllDecks(userId, { skip = 0, take = 100, requiredVersion }) {
      const where = and(
        eq(decks.ownerUserId, userId),
        requiredVersion === undefined
          ? undefined
          : lte(decks.requiredVersion, requiredVersion),
      );
      return database.db.transaction(
        async (tx) => {
          const models = await tx
            .select()
            .from(decks)
            .where(where)
            .orderBy(desc(decks.updatedAt), desc(decks.id))
            .offset(skip)
            .limit(take);
          const [total] = await tx
            .select({ value: count() })
            .from(decks)
            .where(where);
          return {
            count: total!.value,
            data: models.map(withDeckContent),
          };
        },
        { isolationLevel: "repeatable read", accessMode: "read only" },
      );
    },
    async getDeck(userId, deckId) {
      const [model] = await database.db
        .select()
        .from(decks)
        .where(and(eq(decks.id, deckId), eq(decks.ownerUserId, userId)))
        .limit(1);
      return model ? withDeckContent(model) : null;
    },
    async updateDeck(userId, deckId, { name, characters, cards }) {
      if ((characters === undefined) !== (cards === undefined)) {
        const sent = characters === undefined ? "cards" : "characters";
        throw badRequest(
          `characters and cards must be updated together; this request sent only ${sent}`,
        );
      }
      const encoded =
        characters !== undefined && cards !== undefined
          ? await deckToCode({ characters, cards })
          : undefined;
      const [model] = await database.db
        .update(decks)
        .set({
          name,
          code: encoded?.code,
          requiredVersion: encoded?.requiredVersion,
          updatedAt: new Date(),
        })
        .where(and(eq(decks.id, deckId), eq(decks.ownerUserId, userId)))
        .returning();
      if (!model) throw notFound(`deck ${deckId} not found`);
      return model;
    },
    async deleteDeck(userId, deckId) {
      const deleted = await database.db
        .delete(decks)
        .where(and(eq(decks.id, deckId), eq(decks.ownerUserId, userId)))
        .returning({ id: decks.id });
      if (!deleted.length) throw notFound(`deck ${deckId} not found`);
    },
  };
}
