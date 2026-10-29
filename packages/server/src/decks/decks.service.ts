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

import { dbService } from "../services";
import { BadRequestException, NotFoundException } from "../errors";
import type {
  CreateDeckDto,
  QueryDeckDto,
  UpdateDeckDto,
} from "./decks.controller";
import { type Deck } from "@gi-tcg/typings";
import { decks, type Deck as DeckModel } from "../db/schema";
import { and, eq, lte, desc, count } from "drizzle-orm";
import { ASSETS_MANAGER, verifyDeck, type PaginationResult } from "../utils";
import { VERSIONS } from "@gi-tcg/core";

interface DeckWithVersion extends Deck {
  code: string;
  requiredVersion: number;
}

export interface DeckWithDeckModel extends DeckWithVersion, DeckModel {}

export class DecksService {
  async deckToCode(deck: Deck): Promise<DeckWithVersion> {
    try {
      const sinceVersion = await verifyDeck(deck);
      const requiredVersion = VERSIONS.indexOf(sinceVersion);
      return {
        ...deck,
        code: ASSETS_MANAGER.encode(deck),
        requiredVersion,
      };
    } catch (e) {
      if (e instanceof Error) {
        throw new BadRequestException(e.message);
      } else {
        throw e;
      }
    }
  }

  async createDeck(
    userId: number,
    deck: CreateDeckDto,
  ): Promise<DeckWithDeckModel> {
    const { code, requiredVersion } = await this.deckToCode(deck);
    const [model] = await dbService.db
      .insert(decks)
      .values({
        name: deck.name,
        characters: deck.characters,
        cards: deck.cards,
        ownerUserId: userId,
        requiredVersion,
      })
      .returning();
    return { ...model!, code };
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
    const [models, total] = await dbService.db.transaction(async (tx) =>
      Promise.all([
        tx
          .select()
          .from(decks)
          .where(where)
          .offset(skip)
          .limit(take)
          .orderBy(desc(decks.updatedAt)),
        tx.select({ count: count() }).from(decks).where(where),
      ]),
    );
    const data = models.map((model) => ({
      ...model,
      code: ASSETS_MANAGER.encode(model),
    }));
    return { data, count: total[0]!.count };
  }

  async getDeck(
    userId: number,
    deckId: number,
  ): Promise<DeckWithDeckModel | null> {
    const [model] = await dbService.db
      .select()
      .from(decks)
      .where(and(eq(decks.id, deckId), eq(decks.ownerUserId, userId)))
      .limit(1);
    if (!model) {
      return null;
    }
    return {
      ...model,
      code: ASSETS_MANAGER.encode(model),
    };
  }

  async updateDeck(userId: number, deckId: number, deck: UpdateDeckDto) {
    if (!!deck.characters !== !!deck.cards) {
      throw new BadRequestException(
        `characters and cards must be provided together`,
      );
    }
    const { code, requiredVersion } =
      deck.characters && deck.cards
        ? await this.deckToCode({
            characters: deck.characters,
            cards: deck.cards,
          })
        : {};
    const [model] = await dbService.db
      .update(decks)
      .set({
        name: deck.name,
        characters: deck.characters,
        cards: deck.cards,
        requiredVersion,
        updatedAt: new Date(),
      })
      .where(and(eq(decks.id, deckId), eq(decks.ownerUserId, userId)))
      .returning();
    if (!model) {
      throw new NotFoundException("Deck not found");
    }
    return {
      ...model,
      code: code ?? ASSETS_MANAGER.encode(model),
    };
  }

  async deleteDeck(userId: number, deckId: number) {
    const [model] = await dbService.db
      .delete(decks)
      .where(and(eq(decks.id, deckId), eq(decks.ownerUserId, userId)))
      .returning({ id: decks.id });
    if (!model) {
      throw new NotFoundException("Deck not found");
    }
  }
}
