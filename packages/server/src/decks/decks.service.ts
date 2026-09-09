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
import { BadRequestException, NotFoundException } from "../errors";
import type { DatabaseService } from "../db/database.service";
import { decks, type DeckModel } from "../db/schema";
import type {
  CreateDeckDto,
  QueryDeckDto,
  UpdateDeckDto,
} from "./decks.controller";
import type { Deck } from "@gi-tcg/typings";
import { ASSETS_MANAGER, verifyDeck, type PaginationResult } from "../utils";
import { VERSIONS } from "@gi-tcg/core";

interface DeckWithVersion extends Deck {
  code: string;
  requiredVersion: number;
}
export interface DeckWithDeckModel extends DeckWithVersion, DeckModel {}
export class DecksService {
  constructor(private readonly database: DatabaseService) {}
  async deckToCode(deck: Deck): Promise<DeckWithVersion> {
    try {
      const requiredVersion = VERSIONS.indexOf(await verifyDeck(deck));
      return {
        ...deck,
        code: ASSETS_MANAGER.encode(deck),
        requiredVersion,
      };
    } catch (error) {
      if (error instanceof Error) throw new BadRequestException(error.message);
      throw error;
    }
  }
  async createDeck(userId: number, deck: CreateDeckDto): Promise<DeckModel> {
    const { code, requiredVersion } = await this.deckToCode(deck);
    const [model] = await this.database.db
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
  }
  async getAllDecks(
    userId: number,
    { skip = 0, take = 100, requiredVersion }: QueryDeckDto,
  ): Promise<PaginationResult<DeckWithDeckModel>> {
    const where = and(
      eq(decks.ownerUserId, userId),
      requiredVersion === undefined
        ? undefined
        : lte(decks.requiredVersion, requiredVersion),
    );
    return this.database.db.transaction(
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
          data: models.map((model) => ({
            ...model,
            ...ASSETS_MANAGER.decode(model.code),
          })),
        };
      },
      { isolationLevel: "repeatable read", accessMode: "read only" },
    );
  }
  async getDeck(
    userId: number,
    deckId: number,
  ): Promise<DeckWithDeckModel | null> {
    const [model] = await this.database.db
      .select()
      .from(decks)
      .where(and(eq(decks.id, deckId), eq(decks.ownerUserId, userId)))
      .limit(1);
    return model ? { ...model, ...ASSETS_MANAGER.decode(model.code) } : null;
  }
  async updateDeck(userId: number, deckId: number, deck: UpdateDeckDto) {
    if ((deck.characters === undefined) !== (deck.cards === undefined))
      throw new BadRequestException(
        "characters and cards must be provided together",
      );
    const encoded =
      deck.characters && deck.cards
        ? await this.deckToCode({
            characters: deck.characters,
            cards: deck.cards,
          })
        : undefined;
    const [model] = await this.database.db
      .update(decks)
      .set({
        name: deck.name,
        code: encoded?.code,
        requiredVersion: encoded?.requiredVersion,
        updatedAt: new Date(),
      })
      .where(and(eq(decks.id, deckId), eq(decks.ownerUserId, userId)))
      .returning();
    if (!model) throw new NotFoundException();
    return model;
  }
  async deleteDeck(userId: number, deckId: number) {
    const deleted = await this.database.db
      .delete(decks)
      .where(and(eq(decks.id, deckId), eq(decks.ownerUserId, userId)))
      .returning({ id: decks.id });
    if (!deleted.length) throw new NotFoundException();
  }
}
