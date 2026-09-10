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
import type { AuthService } from "../auth/auth.service";
import { requireUser } from "../auth/auth.guard";
import { notFound } from "../errors";
import { deckSchema, idSchema, nameSchema, paginationSchema } from "../http";
import type { DecksService } from "./decks.service";
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
export function createDecksRoutes(decks: DecksService, auth: AuthService) {
  return new Elysia({ prefix: "/decks" })
    .post(
      "/",
      async ({ request, body, set }) => {
        const result = await decks.createDeck(requireUser(request, auth), body);
        set.status = 201;
        return { id: result.id, code: result.code };
      },
      { body: t.Object({ ...deckSchema, name: nameSchema }) },
    )
    .post(
      "/version",
      ({ body, set }) => {
        set.status = 201;
        return decks.deckToCode(body);
      },
      { body: t.Object({ ...deckSchema, name: nameSchema }) },
    )
    .get(
      "/",
      ({ request, query }) =>
        decks.getAllDecks(requireUser(request, auth), query),
      {
        query: t.Object({
          ...paginationSchema,
          requiredVersion: t.Optional(
            t.Numeric({
              minimum: 0,
              maximum: VERSIONS.length - 1,
              multipleOf: 1,
            }),
          ),
        }),
      },
    )
    .get(
      "/:deckId",
      async ({ request, params }) => {
        const deck = await decks.getDeck(
          requireUser(request, auth),
          params.deckId,
        );
        if (!deck) throw notFound();
        return deck;
      },
      { params: t.Object({ deckId: idSchema }) },
    )
    .patch(
      "/:deckId",
      ({ request, params, body }) =>
        decks.updateDeck(requireUser(request, auth), params.deckId, body),
      {
        params: t.Object({ deckId: idSchema }),
        body: t.Object({
          name: t.Optional(nameSchema),
          characters: t.Optional(deckSchema.characters),
          cards: t.Optional(deckSchema.cards),
        }),
      },
    )
    .delete(
      "/:deckId",
      async ({ request, params }) => {
        await decks.deleteDeck(requireUser(request, auth), params.deckId);
        return { message: "deck " + params.deckId + " deleted" };
      },
      { params: t.Object({ deckId: idSchema }) },
    );
}
