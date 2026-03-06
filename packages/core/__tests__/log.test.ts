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
// along with this program.  If not, see <http://www.gnu.org/licenses/>.

import { test, expect } from "bun:test";
import { DetailLogType, DetailLogger } from "../src/log";

test("detail logger", () => {
  const logger = new DetailLogger();
  logger.log(DetailLogType.Other, "top level");
  {
    using _ = logger.subLog(DetailLogType.Skill, "skill");
    logger.log(DetailLogType.Other, "in skill");
  }
  logger.log(DetailLogType.Other, "top level again");

  const logs = logger.getLogs();
  expect(logs).toEqual([
    { type: DetailLogType.Other, value: "top level" },
    {
      type: DetailLogType.Skill,
      value: "skill",
      children: [{ type: DetailLogType.Other, value: "in skill" }],
    },
    { type: DetailLogType.Other, value: "top level again" },
  ]);
});
