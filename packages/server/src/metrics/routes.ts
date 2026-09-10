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

import { Elysia } from "elysia";
import type { Metrics } from "./metrics";

/** Scraped by Prometheus, so it is mounted outside the API prefix. */
export function createMetricsRoutes(metrics: Metrics) {
  return new Elysia().get(
    "/metrics",
    // The Node adapter replaces a string response's Content-Type, so the scrape
    // body is returned as a Response carrying prom-client's own type.
    async () =>
      new Response(await metrics.getMetrics(), {
        headers: { "content-type": metrics.contentType },
      }),
  );
}
