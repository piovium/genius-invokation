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

import { affects, createMemo, refresh, isPending, Accessor } from "solid-js";
import { GuestInfo, useGuestInfo } from "./guest";
import axios from "axios";
import { EMPTY_IMAGE, getGithubAvatarUrl, getRandomAvatar } from "./utils";

export interface UserInfo {
  type: "user";
  id: number;
  login: string;
  name: string;
  chessboardColor: string | null;
}

const NOT_LOGIN = {
  type: "notLogin",
  name: "",
  id: null,
  chessboardColor: null,
} as const;

type NotLogin = typeof NOT_LOGIN;

type AuthStatus = UserInfo | GuestInfo | NotLogin;

export interface UpdateInfoPatch {
  name?: string;
  avatarUrl?: string | null;
  chessboardColor?: string | null;
}

export interface Auth {
  readonly status: Accessor<AuthStatus>;
  readonly loading: Accessor<boolean>;
  readonly error: Accessor<unknown>;
  readonly refresh: () => Promise<void>;
  readonly loginGuest: (name: string) => void;
  readonly setGuestId: (id: string) => void;
  readonly avatarUrl: () => string;
  readonly updateInfo: (patch: UpdateInfoPatch) => Promise<void>;
  readonly logout: () => Promise<void>;
}

const userInfo = createMemo<
  UserInfo | NotLogin | { type: "loading" } | { type: "error"; error: unknown }
>(
  () =>
    axios.get<UserInfo | null>("users/me").then(
      ({ data }) =>
        data
          ? { ...data, type: "user" as const, name: data.name ?? data.login }
          : NOT_LOGIN,
      (error: unknown) => ({ type: "error" as const, error }),
    ),
  { loadingValue: { type: "loading" as const } },
);
const refreshUser = async () => {
  affects(userInfo);
  await refresh(userInfo);
};

const updateUserInfo = async (newInfo: Partial<UserInfo>) => {
  await axios.patch("users/me", newInfo);
};

export const useAuth = (): Auth => {
  const [guestInfo, setGuestInfo] = useGuestInfo();
  const session = () => guestInfo() ?? userInfo();
  const status = (): AuthStatus => {
    const current = session();
    return current.type === "user" || current.type === "guest"
      ? current
      : NOT_LOGIN;
  };
  return {
    status,
    loading: () => session().type === "loading" || isPending(session),
    error: () => {
      const current = session();
      return current.type === "error" ? current.error : void 0;
    },
    refresh: refreshUser,
    loginGuest: async (name: string) => {
      setGuestInfo({
        type: "guest",
        name,
        id: null,
        avatarUrl: null,
        chessboardColor: null,
      });
    },
    avatarUrl: () => {
      const current = status();
      if (current.type === "guest") {
        return current.avatarUrl ?? getRandomAvatar(current.name);
      }
      if (current.type === "user") {
        return getGithubAvatarUrl(current.id);
      }
      return EMPTY_IMAGE;
    },
    setGuestId: (id: string) => {
      setGuestInfo(
        (oldInfo) =>
          oldInfo && {
            ...oldInfo,
            id,
          },
      );
    },
    updateInfo: async (patch) => {
      const guest = guestInfo();
      if (guest) {
        setGuestInfo({ ...guest, ...patch });
      } else {
        await updateUserInfo(patch);
        await refreshUser();
      }
    },
    logout: async () => {
      localStorage.removeItem("accessToken");
      await refreshUser();
      setGuestInfo(null);
    },
  };
};
