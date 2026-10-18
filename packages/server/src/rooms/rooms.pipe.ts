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

import { type } from "arktype";
import { isGuestId } from "../utils";

export const ParsePlayerIdPipe = type("string").pipe((value, ctx) => {
  if (value.trim() === "") {
    return ctx.error("a non-empty playerId");
  }
  const number = Number(value);
  if (Number.isInteger(number)) {
    return number;
  } else if (isGuestId(value)) {
    return value;
  } else {
    return ctx.error({ expected: "a valid playerId", actual: value });
  }
});
