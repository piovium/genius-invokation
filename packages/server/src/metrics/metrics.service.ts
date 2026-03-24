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

import { Injectable } from "@nestjs/common";
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

type RoomMetricsProvider =
  | (() => RoomMetricsSnapshot)
  | (() => Promise<RoomMetricsSnapshot>);

const emptyRoomMetricsSnapshot = (): RoomMetricsSnapshot => ({
  activeRooms: 0,
  roomPlayers: 0,
  roomsByStatus: {
    waiting: 0,
    playing: 0,
    finished: 0,
  },
});

@Injectable()
export class MetricsService {
  private readonly registry = new Registry();
  private roomMetricsProvider: RoomMetricsProvider = emptyRoomMetricsSnapshot;
  private roomMetricsSnapshotPromise: Promise<RoomMetricsSnapshot> | null = null;
  private readonly createdRoomsCounter: Counter<string>;
  private readonly startedRoomsCounter: Counter<string>;
  private readonly finishedRoomsCounter: Counter<string>;
  private readonly storedGamesCounter: Counter<string>;

  constructor() {
    const service = this;

    collectDefaultMetrics({
      prefix: "gi_node_",
      register: this.registry,
    });

    new Gauge({
      name: "gi_rooms_active",
      help: "Number of non-finished rooms in the current server process",
      registers: [this.registry],
      collect: async function () {
        const snapshot = await service.collectRoomMetricsSnapshot();
        this.set(snapshot.activeRooms);
      },
    });

    new Gauge({
      name: "gi_players_in_active_rooms",
      help: "Number of players currently in non-finished rooms",
      registers: [this.registry],
      collect: async function () {
        const snapshot = await service.collectRoomMetricsSnapshot();
        this.set(snapshot.roomPlayers);
      },
    });

    new Gauge({
      name: "gi_rooms",
      help: "Number of rooms in memory grouped by status",
      labelNames: ["status"],
      registers: [this.registry],
      collect: async function () {
        const snapshot = await service.collectRoomMetricsSnapshot();
        this.set({ status: "waiting" }, snapshot.roomsByStatus.waiting);
        this.set({ status: "playing" }, snapshot.roomsByStatus.playing);
        this.set({ status: "finished" }, snapshot.roomsByStatus.finished);
      },
    });

    this.createdRoomsCounter = new Counter({
      name: "gi_rooms_created_total",
      help: "Number of rooms created by this server process",
      registers: [this.registry],
    });

    this.startedRoomsCounter = new Counter({
      name: "gi_rooms_started_total",
      help: "Number of rooms started by this server process",
      registers: [this.registry],
    });

    this.finishedRoomsCounter = new Counter({
      name: "gi_rooms_finished_total",
      help: "Number of started rooms finished by this server process",
      registers: [this.registry],
    });

    this.storedGamesCounter = new Counter({
      name: "gi_games_stored_total",
      help: "Number of games stored in the database by this server process",
      registers: [this.registry],
    });
  }

  private collectRoomMetricsSnapshot() {
    this.roomMetricsSnapshotPromise ??= Promise.resolve(this.roomMetricsProvider());
    return this.roomMetricsSnapshotPromise;
  }

  setRoomMetricsProvider(provider: RoomMetricsProvider) {
    this.roomMetricsProvider = provider;
  }

  incrementCreatedRooms(count = 1) {
    this.createdRoomsCounter.inc(count);
  }

  incrementStartedRooms(count = 1) {
    this.startedRoomsCounter.inc(count);
  }

  incrementFinishedRooms(count = 1) {
    this.finishedRoomsCounter.inc(count);
  }

  incrementStoredGames(count = 1) {
    this.storedGamesCounter.inc(count);
  }

  async getMetrics() {
    this.roomMetricsSnapshotPromise = null;
    try {
      return await this.registry.metrics();
    } finally {
      this.roomMetricsSnapshotPromise = null;
    }
  }

  get contentType() {
    return this.registry.contentType;
  }
}
