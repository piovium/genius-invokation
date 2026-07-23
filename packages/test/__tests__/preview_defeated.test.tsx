// Copyright (C) 2026 Guyutongxue
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

import { setup, Character, State } from "#test";
import {
  SkywardSonnet,
  Venti,
} from "@gi-tcg/data/internal/characters/anemo/venti.gts";
import { expect, test } from "vitest";

test("preview contains alive=0 mutation on fatal damage", async () => {
  const c = setup(
    <State>
      <Character opp active health={1} />
      <Character my active def={Venti} />
    </State>,
  );
  await c.stepToNextAction();
  // @ts-expect-error private access
  const rpc = c.awaitingRpc;
  if (rpc?.request.$case !== "action") throw new Error("not action");
  const action = rpc.request.value.action.find(
    (a) =>
      a.action?.$case === "useSkill" &&
      a.action.value.skillDefinitionId === SkywardSonnet,
  );
  const aliveMutation = action?.preview.find(
    (p) =>
      p.mutation?.$case === "modifyEntityVar" &&
      p.mutation.value.variableName === "alive",
  );
  expect(aliveMutation).toBeDefined();
  expect(
    aliveMutation!.mutation?.$case === "modifyEntityVar" &&
      aliveMutation!.mutation.value.variableValue,
  ).toBe(0);
});
