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

import getData from "@gi-tcg/data";
import { builderWeakRefs } from "@gi-tcg/core/builder/internal";
import { test, expect } from "vitest";

test("builders should not be called, we'd migrate all data to GTS", () => {
  const data = getData();
  globalThis.gc?.();
  expect(builderWeakRefs.size).toBe(0);
  expect(data).toBeDefined();
})

