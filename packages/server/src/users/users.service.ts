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

import {
  Injectable,
  NotFoundException,
  Logger,
  type OnModuleInit,
} from "@nestjs/common";
import { DbService } from "../db/db.service";
import { eq } from "drizzle-orm";
import { users } from "../db/schema";
import axios from "axios";
import { GET_USER_API_URL } from "../auth/auth.service";
import type { UpdateUserInfoDto } from "./users.controller";

export interface UserInfo {
  id: number;
  login: string;
  name?: string;
  avatarUrl: string;
  chessboardColor?: string | null;
}

@Injectable()
export class UsersService implements OnModuleInit {
  constructor(private database: DbService) {}

  private logger = new Logger(UsersService.name);

  async onModuleInit() {}

  async findById(id: number): Promise<UserInfo | null> {
    const [user] = await this.database.db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    if (!user) {
      return null;
    }
    const userResponse = await axios.get(GET_USER_API_URL, {
      headers: {
        Authorization: `Bearer ${user.ghToken}`,
        Accept: `application/vnd.github+json`,
        "X-GitHub-Api-Version": "2022-11-28",
      },
      validateStatus: () => true, // don't throw
    });
    if (userResponse.status !== 200) {
      this.logger.error("Get User detail failure");
      this.logger.error(userResponse.data);
      this.logger.error(`Bearer ${user.ghToken}`);
      return null;
    }
    return {
      id: user.id,
      login: userResponse.data.login,
      name: user.name || userResponse.data.name,
      avatarUrl: userResponse.data.avatar_url,
      chessboardColor: user.chessboardColor ?? null,
    };
  }

  async create(id: number, ghToken: string) {
    await this.database.db
      .insert(users)
      .values({ id, ghToken })
      .onConflictDoUpdate({ target: users.id, set: { ghToken } });
  }

  async updateUserInfo(id: number, dto: UpdateUserInfoDto) {
    if (dto.name === undefined && dto.chessboardColor === undefined) {
      const [user] = await this.database.db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.id, id));
      if (!user) {
        throw new NotFoundException("User not found");
      }
      return;
    }
    const [user] = await this.database.db
      .update(users)
      .set(dto)
      .where(eq(users.id, id))
      .returning({ id: users.id });
    if (!user) {
      throw new NotFoundException("User not found");
    }
  }
}
