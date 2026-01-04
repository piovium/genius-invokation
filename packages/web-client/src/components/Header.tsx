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

import { A, useNavigate } from "@solidjs/router";
import { Show } from "solid-js";
import { IS_BETA } from "@gi-tcg/config";
import { getAvatarUrl } from "../utils";
import Logo from "./Logo.svg";
import Title from "./Title.svg";
import { useAuth } from "../auth";

const USE_LOGO = true;

export function Header() {
  const navigate = useNavigate();
  const { status, logout } = useAuth();
  return (
    <header class="fixed top-0 left-0 w-100dvw flex flex-row h-[calc(3rem+var(--root-padding-top))] md:h-[calc(4rem+var(--root-padding-top))] pt-[var(--root-padding-top)] bg-white z-200 px-4 shadow-md items-center gap-2">
      <img src={Logo} class="h-10 md:h-12" />
      <div class="flex-grow flex flex-col md:flex-row items-start md:items-end gap-1 md:gap-2">
        <h1 class="text-xl line-height-none font-bold">
          <A href="/">
            <Show when={USE_LOGO} fallback="七圣召唤模拟对战平台">
              <img src={Title} class="h-5 md:h-6" alt="雨酱牌！" />
            </Show>
          </A>
        </h1>
        <div class="flex flex-row gap-2">
          <Show when={IS_BETA}>
            <span class="text-8px md:text-10px badge badge-soft-error">
              Incl. unreleased data
            </span>
          </Show>
        </div>
      </div>
      <Show when={status().type !== "notLogin"}>
        <Show when={status().type === "user"}>
          <A href={`/user/${status().id}`}>
            <div class="rounded-full w-10 h-10 md:w-12 md:h-12 b-solid b-1 b-gray-200 flex items-center justify-center">
              <img
                src={getAvatarUrl(status().id as number)}
                class="w-85% h-85% [clip-path:circle()]"
              />
            </div>
          </A>
        </Show>
        <button
          class="btn btn-outline-red"
          onClick={() => {
            logout();
            navigate("/");
          }}
        >
          <i class="i-mdi-logout" />
          <span class="hidden sm:inline">退出登录</span>
        </button>
      </Show>
    </header>
  );
}
