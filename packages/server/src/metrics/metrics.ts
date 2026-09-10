// Copyright (C) 2024-2025 Guyutongxue
// Copyright (C) 2026 Piovium Labs
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

import { Counter, Gauge, Registry, collectDefaultMetrics } from "prom-client";

export interface RoomMetricsSnapshot {
  activeRooms: number;
  roomPlayers: number;
  roomsByStatus: {
    waiting: number;
    playing: number;
    finished: number;
  };
}

export type RoomMetricsProvider =
  (() => RoomMetricsSnapshot) | (() => Promise<RoomMetricsSnapshot>);

export interface Metrics {
  setRoomMetricsProvider(provider: RoomMetricsProvider): void;
  incrementCreatedRooms(count?: number): void;
  incrementStartedRooms(count?: number): void;
  incrementFinishedRooms(count?: number): void;
  incrementStoredGames(count?: number): void;
  getMetrics(): Promise<string>;
  readonly contentType: string;
}

const emptyRoomMetricsSnapshot = (): RoomMetricsSnapshot => ({
  activeRooms: 0,
  roomPlayers: 0,
  roomsByStatus: {
    waiting: 0,
    playing: 0,
    finished: 0,
  },
});

// Rooms are owned by the transport, so their state is read on scrape rather
// than pushed to the registry.
const roomGauges: ReadonlyArray<{
  name: string;
  help: string;
  labelNames?: string[];
  report(gauge: Gauge<string>, snapshot: RoomMetricsSnapshot): void;
}> = [
  {
    name: "gi_rooms_active",
    help: "Number of non-finished rooms in the current server process",
    report: (gauge, snapshot) => gauge.set(snapshot.activeRooms),
  },
  {
    name: "gi_players_in_active_rooms",
    help: "Number of players currently in non-finished rooms",
    report: (gauge, snapshot) => gauge.set(snapshot.roomPlayers),
  },
  {
    name: "gi_rooms",
    help: "Number of rooms in memory grouped by status",
    labelNames: ["status"],
    report: (gauge, snapshot) => {
      for (const [status, rooms] of Object.entries(snapshot.roomsByStatus))
        gauge.set({ status }, rooms);
    },
  },
];

export function createMetrics(): Metrics {
  const registry = new Registry();
  let roomMetricsProvider: RoomMetricsProvider = emptyRoomMetricsSnapshot;
  let pendingRoomMetrics: Promise<RoomMetricsSnapshot> | null = null;
  // Every gauge of one scrape must report the same room state.
  const collectRoomMetrics = () =>
    (pendingRoomMetrics ??= Promise.resolve(roomMetricsProvider()));

  collectDefaultMetrics({ prefix: "gi_node_", register: registry });
  for (const { name, help, labelNames, report } of roomGauges)
    new Gauge({
      name,
      help,
      labelNames,
      registers: [registry],
      collect: async function () {
        report(this, await collectRoomMetrics());
      },
    });

  const counter = (name: string, help: string) =>
    new Counter({ name, help, registers: [registry] });
  const counters = {
    createdRooms: counter(
      "gi_rooms_created_total",
      "Number of rooms created by this server process",
    ),
    startedRooms: counter(
      "gi_rooms_started_total",
      "Number of rooms started by this server process",
    ),
    finishedRooms: counter(
      "gi_rooms_finished_total",
      "Number of started rooms finished by this server process",
    ),
    storedGames: counter(
      "gi_games_stored_total",
      "Number of games stored in the database by this server process",
    ),
  };

  return {
    setRoomMetricsProvider(provider) {
      roomMetricsProvider = provider;
    },
    incrementCreatedRooms: (count = 1) => counters.createdRooms.inc(count),
    incrementStartedRooms: (count = 1) => counters.startedRooms.inc(count),
    incrementFinishedRooms: (count = 1) => counters.finishedRooms.inc(count),
    incrementStoredGames: (count = 1) => counters.storedGames.inc(count),
    async getMetrics() {
      try {
        return await registry.metrics();
      } finally {
        pendingRoomMetrics = null;
      }
    },
    get contentType() {
      return registry.contentType;
    },
  };
}
