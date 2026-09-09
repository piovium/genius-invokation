import { t } from "elysia";
import { BadRequestException } from "./errors";
export const paginationSchema = {
  skip: t.Optional(t.Numeric({ minimum: 1, multipleOf: 1 })),
  take: t.Optional(t.Numeric({ minimum: 1, maximum: 30, multipleOf: 1 })),
};
export const idSchema = t.Numeric({
  minimum: 1,
  maximum: 2147483647,
  multipleOf: 1,
});
export const deckSchema = {
  characters: t.Array(t.Integer(), { minItems: 3, maxItems: 3 }),
  cards: t.Array(t.Integer(), { minItems: 30, maxItems: 30 }),
};
// The previous validator counted Unicode code points. TypeBox's maxLength
// counts UTF-16 units, so allow a surrogate pair for each of the 64 characters.
export const nameSchema = t
  .Transform(t.String({ minLength: 1, maxLength: 128 }))
  .Decode((name) => {
    if ([...name].length > 64)
      throw new BadRequestException("Name must contain at most 64 characters");
    return name;
  })
  .Encode((name) => name);
