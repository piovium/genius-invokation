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

import console from "node:console";
import { usersService } from "../services";
import { HTTPException } from "hono/http-exception";
import { sign } from "hono/jwt";
import axios from "axios";

export const CODE_EXCHANGE_URL =
  process.env.GH_CODE_EXCHANGE_URL ||
  `https://github.com/login/oauth/access_token`;
export const GET_USER_API_URL =
  process.env.GH_GET_USER_API_URL || `https://api.github.com/user`;

export class AuthService {
  private logger = console;

  private sign(payload: { user: number; sub: number | string }) {
    const iat = Math.floor(Date.now() / 1000);
    return sign(
      { ...payload, iat, exp: iat + 42 * 24 * 60 * 60 },
      process.env.JWT_SECRET!,
      "HS256",
    );
  }

  private async getGitHubId(code: string) {
    const response = await axios.post(
      CODE_EXCHANGE_URL,
      {
        client_id: process.env.GH_CLIENT_ID,
        client_secret: process.env.GH_CLIENT_SECRET,
        code,
      },
      {
        headers: {
          Accept: "application/json",
        },
        validateStatus: () => true, // don't throw
      },
    );
    if (response.status >= 400 || !response.data?.access_token) {
      this.logger.error("Code exchange failure");
      this.logger.error(code);
      this.logger.error(response.data);
      throw new HTTPException(401, {
        message: `code exchange failure: ${response.data?.error_description}`,
      });
    }
    const accessToken = response.data.access_token;
    const userResponse = await axios.get(GET_USER_API_URL, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: `application/vnd.github+json`,
        "X-GitHub-Api-Version": "2022-11-28",
      },
      validateStatus: () => true, // don't throw
    });
    if (userResponse.status >= 400) {
      this.logger.error("Get User detail failure");
      this.logger.error(userResponse.data);
      throw new HTTPException(401, {
        message: `get user detail failure: ${userResponse.data?.message}`,
      });
    }
    return {
      id: userResponse.data.id,
      ghToken: accessToken,
    };
  }

  async login(code: string) {
    const { id, ghToken } = await this.getGitHubId(code);
    await usersService.create(id, ghToken);
    const payload = { user: 1, sub: id };
    return {
      accessToken: await this.sign(payload),
    };
  }

  async signGuest(playerId: string) {
    const payload = { user: 0, sub: playerId };
    return await this.sign(payload);
  }
}
