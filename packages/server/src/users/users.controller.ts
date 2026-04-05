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
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Body,
} from "@nestjs/common";
import { UsersService, type UserInfo } from "./users.service";
import { User } from "../auth/user.decorator";
import { Public } from "../auth/auth.guard";
import { IsOptional, Length, Matches } from "class-validator";

export class UpdateUserInfoDto {
  @Matches(/^#[0-9a-fA-F]{6}$/)
  @IsOptional()
  chessboardColor?: string | null;

  @Length(1, 64)
  @IsOptional()
  name?: string;
}

@Controller("users")
export class UsersController {
  constructor(private users: UsersService) {}

  @Get("me")
  @Public()
  async me(@User() userId: number | null): Promise<UserInfo | null> {
    if (userId === null) {
      return null;
    }
    const user = await this.users.findById(userId);
    if (!user) {
      throw new NotFoundException();
    }
    return user;
  }

  @Patch("me")
  async updateMe(
    @User() userId: number | null,
    @Body() userInfo: UpdateUserInfoDto,
  ) {
    if (userId === null) {
      throw new NotFoundException();
    }
    return await this.users.updateUserInfo(userId, userInfo);
  }

  @Get(":id")
  async getUser(@Param("id", ParseIntPipe) id: number): Promise<UserInfo> {
    const user = await this.users.findById(id);
    if (!user) {
      throw new NotFoundException();
    }
    return user;
  }
}
