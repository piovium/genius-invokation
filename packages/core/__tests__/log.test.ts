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

import { test, expect } from "vitest";
import {
  DetailLogType,
  DetailLogger,
  createGameStateLogSerializer,
  serializeGameStateLog,
  deserializeGameStateLog,
  type GameStateLogEntry,
} from "../src/log";
import { CORE_VERSION } from "../src/index";
import { StateSymbol } from "../src/base/state";
import { logStates } from "./fixtures/log-states";
import legacyLog from "./fixtures/log-legacy.json";

test("incremental logs preserve the pre-migration encoding, definitions and shared references", () => {
  const { entries, data } = logStates();
  const serializer = createGameStateLogSerializer();
  for (const entry of entries) serializer.append(entry);
  const encoded = serializer.serialize();
  expect(encoded.v).toBe(CORE_VERSION);
  // The golden was generated using the unchanged serializer at 86c8582f.
  expect(JSON.parse(JSON.stringify(encoded))).toEqual({
    ...legacyLog,
    v: CORE_VERSION,
  });
  expect(encoded).toEqual(serializeGameStateLog(entries));
  const restored = deserializeGameStateLog(
    data,
    JSON.parse(JSON.stringify(encoded)),
  );
  // Deserialization restores transient symbols on descendants, not the root.
  const comparable = ({
    state: { data: _data, [StateSymbol]: _marker, ...state },
    canResume,
  }: GameStateLogEntry) => ({ ...state, canResume });
  expect(restored.map(comparable)).toEqual(entries.map(comparable));
  expect(restored[0]!.state.players).toBe(restored[1]!.state.players);
  expect(restored[0]!.state.extensions[0]!.definition).toBe(
    data.extensions.get(91000003),
  );
  const payload = restored[0]!.state.extensions[0]!.state as {
    shared: object;
    list: object[];
    singleton: object[];
    map: Map<object, string>;
    set: Set<object>;
  };
  expect(payload.list[0]).toBe(payload.shared);
  expect(payload.list[1]).toBe(payload.shared);
  expect(payload.singleton[0]).toBe(payload.shared);
  expect(payload.map.get(payload.shared)).toBe("value");
  expect(payload.set.has(payload.shared)).toBe(true);
});

test("an earlier serialized snapshot stays readable after subsequent appends", () => {
  const { entries, data } = logStates();
  const serializer = createGameStateLogSerializer();
  serializer.append(entries[0]!);
  const snapshot = serializer.serialize();
  const snapshotBeforeAppend = JSON.stringify(snapshot);
  serializer.append(entries[1]!);
  expect(JSON.stringify(snapshot)).toBe(snapshotBeforeAppend);
  expect(deserializeGameStateLog(data, snapshot)).toHaveLength(1);
  expect(serializer.serialize().log).toHaveLength(2);
});

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
    { type: DetailLogType.Other, env: "normal", value: "top level" },
    {
      type: DetailLogType.Skill,
      env: "normal",
      value: "skill",
      children: [
        {
          type: DetailLogType.Other,
          env: "normal",
          value: "in skill",
        },
      ],
    },
    { type: DetailLogType.Other, env: "normal", value: "top level again" },
  ]);
});
