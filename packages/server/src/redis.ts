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

import Redis from "ioredis";

const redisUrl = process.env.REDIS_URL;

/** `null` when `REDIS_URL` is unset; every caller already handles that absence. */
export const redis = redisUrl ? new Redis(redisUrl) : null;

/**
 * The deployment protocol spans two modules: the health probe arms these
 * entries and the room lifecycle consults the same ones, so the names and the
 * flag's self-expiry are defined once here rather than retyped at each call.
 */
export const ACTIVE_ROOMS_KEY = "meta:active_rooms";
export const DEPLOYING_FLAG_KEY = "meta:deploying";

/** Redis clears the deploying flag if the deployment that set it never does. */
export const DEPLOYING_FLAG_TTL_SECONDS = 3600;
