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

import { ref, setup, Character, State, Status, $ } from "#test";
import { test } from "bun:test";

test("query: active includes defeated", async () => {
  const c = setup(
    <State>
      <Character my active alive={0} />
    </State>,
  );
  c.expect($.my.active).toBeCount(0);
  c.expect($.my.active.includesDefeated).toBeExist();
});
