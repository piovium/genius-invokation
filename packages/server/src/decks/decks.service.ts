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

import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "../db/prisma.service";
import type {
  CreateDeckDto,
  QueryDeckDto,
  UpdateDeckDto,
} from "./decks.controller";
import { type Deck } from "@gi-tcg/typings";
import { type Deck as DeckModel } from "#prisma/client";
import {
  ASSETS_MANAGER,
  verifyDeck,
  type PaginationResult,
} from "../utils";
import { VERSIONS } from "@gi-tcg/core";

interface DeckWithVersion extends Deck {
  code: string;
  requiredVersion: number;
}

export interface DeckWithDeckModel extends DeckWithVersion, DeckModel {}

@Injectable()
export class DecksService {
  constructor(private prisma: PrismaService) {}

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

  private codeToDeck(code: string): Deck {
    const deck = ASSETS_MANAGER.decode(code);
    return {
      // code,
      ...deck,
    };
  }

  async createDeck(userId: number, deck: CreateDeckDto): Promise<DeckModel> {
    const { code, requiredVersion } = await this.deckToCode(deck);
    return await this.prisma.deck.create({
      data: {
        name: deck.name,
        code,
        ownerUserId: userId,
        requiredVersion,
      },
    });
  }

  async getAllDecks(
    userId: number,
    { skip = 0, take = 100, requiredVersion }: QueryDeckDto,
  ): Promise<PaginationResult<DeckWithDeckModel>> {
    const [models, count] = await this.prisma.deck.findManyAndCount({
      skip,
      take,
      where: {
        ownerUserId: userId,
        requiredVersion: {
          lte: requiredVersion,
        }
      },
      orderBy: {
        updatedAt: "desc",
      },
    });
    const data = models.map((model) => {
      const { characters, cards } = this.codeToDeck(model.code);
      return {
        ...model,
        characters,
        cards,
      };
    });
    return { data, count };
  }

  async getDeck(
    userId: number,
    deckId: number,
  ): Promise<DeckWithDeckModel | null> {
    const model = await this.prisma.deck.findFirst({
      where: {
        id: deckId,
        ownerUserId: userId,
      },
    });
    if (model === null) {
      return null;
    }
    const { characters, cards } = this.codeToDeck(model.code);
    return {
      ...model,
      characters,
      cards,
    };
  }

  async updateDeck(
    userId: number,
    deckId: number,
    deck: UpdateDeckDto,
  ) {
    let code: string | undefined;
    let requiredVersion: number | undefined;
    if (!deck.characters || !deck.cards) {
      if (!deck.characters && !deck.cards) {
        code = void 0;
      } else {
        throw new BadRequestException(
          `characters and cards must be provided together`,
        );
      }
    } else {
      ({ code, requiredVersion } = await this.deckToCode({
        characters: deck.characters,
        cards: deck.cards,
      }));
    }
    const model = await this.prisma.deck.update({
      where: {
        id: deckId,
        ownerUserId: userId,
      },
      data: {
        name: deck.name,
        code,
        requiredVersion,
      },
    });
    return model;
  }

  async deleteDeck(userId: number, deckId: number) {
    await this.prisma.deck.delete({
      where: {
        id: deckId,
        ownerUserId: userId,
      },
    });
  }
}
