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

import { createSignal } from "solid-js";
import { GITHUB_AUTH_REDIRECT_URL } from "../config";
import { useAuth } from "../auth";
import { useI18n } from "../i18n";

export function Login() {
  const CLIENT_ID = "Iv23liMGX6EkkrfUax8B";
  const REDIRECT_URL = encodeURIComponent(GITHUB_AUTH_REDIRECT_URL);
  const { loginGuest } = useAuth();
  const { t } = useI18n();

  const showGuestHint = () => {
    window.alert(t("guestModeHint"));
  };

  const [guestNameValid, setGuestNameValid] = createSignal(false);

  const githubLogin = () => {
    const popup = window.open(
      `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URL}`,
      'githubOAuth',
      'popup,width=600,height=700'
    );
    if (!popup) {
      window.alert(t("allowPopup"));
      return;
    }
    window.githubOAuthPopup = popup;
  };

  const guestLogin = async (e: SubmitEvent) => {
    e.preventDefault();
    const form = new FormData(e.target as HTMLFormElement);
    const name = form.get("guestName") as string;
    loginGuest(name);
  };

  return (
    <div class="w-80 flex flex-col items-stretch text-xl my-8 gap-10">
      <button
        class="flex flex-row gap-2 btn btn-solid-black h-2.8em"
        onClick={githubLogin}
      >
        <i class="block i-mdi-github" />
        <span>{t("recommendGithubLogin")}</span>
      </button>
      <hr />
      <div class="flex flex-col gap-1">
        <p class="text-gray-500 text-sm">
          {t("continueAsGuest")}{" "}
          <span class="text-blue-400 cursor-pointer" onClick={showGuestHint}>
            {t("guestIdentity")}
          </span>{" "}
          {t("continueSuffix")}
        </p>
        <form class="flex flex-row items-stretch" onSubmit={guestLogin}>
          <input
            type="text"
            class="input input-solid rounded-r-0 b-r-0 h-9 text-4"
            name="guestName"
            maxLength={64}
            placeholder={t("guestNamePlaceholder")}
            pattern=".*[^\s].*"
            onInput={(e) => setGuestNameValid(e.target.checkValidity())}
            autofocus
            required
          />
          <button
            type="submit"
            class="flex-shrink-0 btn btn-solid rounded-l-0 h-9 text-4"
            disabled={!guestNameValid()}
          >
            <span>{t("confirm")}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
