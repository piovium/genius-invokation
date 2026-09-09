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

import { eq } from "drizzle-orm";
import type { DatabaseService } from "../db/database.service";
import { users } from "../db/schema";
import { GET_USER_API_URL } from "../auth/auth.service";
import { NotFoundException } from "../errors";
import type { UpdateUserInfoDto } from "./users.controller";

export interface UserInfo {
  id: number;
  login: string;
  name?: string;
  avatarUrl: string;
  chessboardColor?: string | null;
}
export class UsersService {
  constructor(private readonly database: DatabaseService) {}
  async findById(id: number): Promise<UserInfo | null> {
    const [user] = await this.database.db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    if (!user?.ghToken) return null;
    const response = await fetch(GET_USER_API_URL, {
      headers: {
        authorization: "Bearer " + user.ghToken,
        accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) {
      await response.body?.cancel();
      return null;
    }
    const identity = (await response.json()) as {
      id?: number;
      login?: string;
      name?: string;
      avatar_url?: string;
    };
    if (
      identity.id !== user.id ||
      typeof identity.login !== "string" ||
      typeof identity.avatar_url !== "string"
    )
      return null;
    return {
      id: user.id,
      login: identity.login,
      name: user.name || identity.name,
      avatarUrl: identity.avatar_url,
      chessboardColor: user.chessboardColor,
    };
  }
  async create(id: number, ghToken: string) {
    const [user] = await this.database.db
      .insert(users)
      .values({ id, ghToken })
      .onConflictDoUpdate({ target: users.id, set: { ghToken } })
      .returning();
    return user!;
  }
  async updateUserInfo(id: number, info: UpdateUserInfoDto) {
    const patch = {
      ...(info.name === undefined ? {} : { name: info.name }),
      ...(info.chessboardColor === undefined
        ? {}
        : { chessboardColor: info.chessboardColor }),
    };
    const [user] = Object.keys(patch).length
      ? await this.database.db
          .update(users)
          .set(patch)
          .where(eq(users.id, id))
          .returning({
            id: users.id,
            name: users.name,
            chessboardColor: users.chessboardColor,
            createdAt: users.createdAt,
          })
      : await this.database.db
          .select({
            id: users.id,
            name: users.name,
            chessboardColor: users.chessboardColor,
            createdAt: users.createdAt,
          })
          .from(users)
          .where(eq(users.id, id));
    if (!user) throw new NotFoundException();
    return user;
  }
}
