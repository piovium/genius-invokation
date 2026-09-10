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
import type { Database } from "../db/database";
import { users, type UserModel } from "../db/schema";
import { GET_USER_API_URL } from "../auth/session";
import { notFound } from "../errors";
import type { UpdateUserInfoDto } from "./routes";

export interface UserInfo {
  id: number;
  login: string;
  name?: string;
  avatarUrl: string;
  chessboardColor?: string | null;
}

/** The account columns an update reports back. */
export interface UpdatedUserInfo {
  id: number;
  name: string | null;
  chessboardColor: string | null;
  createdAt: Date;
}

export interface Users {
  findById(id: number): Promise<UserInfo | null>;
  create(id: number, ghToken: string): Promise<UserModel>;
  updateUserInfo(id: number, info: UpdateUserInfoDto): Promise<UpdatedUserInfo>;
}

const updatedUserInfoColumns = {
  id: users.id,
  name: users.name,
  chessboardColor: users.chessboardColor,
  createdAt: users.createdAt,
};

/** The subset of GitHub's `/user` response that this service reads. */
interface GitHubAccount {
  id?: number;
  login?: string;
  name?: string;
  avatar_url?: string;
}

/**
 * The fields the caller actually sent. Drizzle cannot `set` an empty object, so
 * the emptiness of the patch decides between updating and reading the row back.
 */
const definedFields = <T extends object>(source: T): Partial<T> =>
  Object.fromEntries(
    Object.entries(source).filter(([, value]) => value !== undefined),
  ) as Partial<T>;

export function createUsers(database: Database): Users {
  return {
    async findById(id) {
      const [user] = await database.db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);
      if (!user?.ghToken) return null;
      const response = await fetch(GET_USER_API_URL, {
        headers: {
          authorization: `Bearer ${user.ghToken}`,
          accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
        signal: AbortSignal.timeout(15_000),
      });
      if (!response.ok) {
        await response.body?.cancel();
        return null;
      }
      const account = (await response.json()) as GitHubAccount;
      if (
        account.id !== user.id ||
        typeof account.login !== "string" ||
        typeof account.avatar_url !== "string"
      )
        return null;
      return {
        id: user.id,
        login: account.login,
        name: user.name || account.name,
        avatarUrl: account.avatar_url,
        chessboardColor: user.chessboardColor,
      };
    },
    async create(id, ghToken) {
      const [user] = await database.db
        .insert(users)
        .values({ id, ghToken })
        .onConflictDoUpdate({ target: users.id, set: { ghToken } })
        .returning();
      return user!;
    },
    async updateUserInfo(id, { name, chessboardColor }) {
      const patch = definedFields({ name, chessboardColor });
      const hasChanges = Object.keys(patch).length > 0;
      const [user] = hasChanges
        ? await database.db
            .update(users)
            .set(patch)
            .where(eq(users.id, id))
            .returning(updatedUserInfoColumns)
        : await database.db
            .select(updatedUserInfoColumns)
            .from(users)
            .where(eq(users.id, id));
      if (!user) throw notFound();
      return user;
    },
  };
}
