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

import { Elysia, t } from "elysia";
import type { Deck } from "@gi-tcg/typings";
import { VERSIONS } from "@gi-tcg/core";
import type { PaginationDto } from "../utils";
import { identity } from "../auth/identity";
import type { Auth } from "../auth/session";
import { notFound } from "../errors";
import { deckSchema, idSchema, nameSchema, paginationSchema } from "../http";
import type { Decks } from "./decks";

export interface DeckDto extends Deck {}
export interface CreateDeckDto extends DeckDto {
  name: string;
}
export interface UpdateDeckDto {
  name?: string;
  characters?: number[];
  cards?: number[];
}
export interface QueryDeckDto extends PaginationDto {
  requiredVersion?: number;
}

const deckBodySchema = t.Object({ ...deckSchema, name: nameSchema });
const deckIdParamsSchema = t.Object({ deckId: idSchema });
const deckQuerySchema = t.Object({
  ...paginationSchema,
  requiredVersion: t.Optional(
    t.Numeric({ minimum: 0, maximum: VERSIONS.length - 1, multipleOf: 1 }),
  ),
});

export function createDecksRoutes(decks: Decks, auth: Auth) {
  return new Elysia({ prefix: "/decks" })
    .use(identity(auth))
    .post(
      "/",
      async ({ user, body, set }) => {
        const result = await decks.createDeck(user.sub, body);
        set.status = 201;
        return { id: result.id, code: result.code };
      },
      { user: true, body: deckBodySchema },
    )
    .post(
      "/version",
      ({ body, set }) => {
        set.status = 201;
        return decks.deckToCode(body);
      },
      { body: deckBodySchema },
    )
    .get("/", ({ user, query }) => decks.getAllDecks(user.sub, query), {
      user: true,
      query: deckQuerySchema,
    })
    .get(
      "/:deckId",
      async ({ user, params }) => {
        const deck = await decks.getDeck(user.sub, params.deckId);
        if (!deck) throw notFound(`deck ${params.deckId} not found`);
        return deck;
      },
      { user: true, params: deckIdParamsSchema },
    )
    .patch(
      "/:deckId",
      ({ user, params, body }) =>
        decks.updateDeck(user.sub, params.deckId, body),
      {
        user: true,
        params: deckIdParamsSchema,
        body: t.Object({
          name: t.Optional(nameSchema),
          characters: t.Optional(deckSchema.characters),
          cards: t.Optional(deckSchema.cards),
        }),
      },
    )
    .delete(
      "/:deckId",
      async ({ user, params }) => {
        await decks.deleteDeck(user.sub, params.deckId);
        return { message: `deck ${params.deckId} deleted` };
      },
      { user: true, params: deckIdParamsSchema },
    );
}
