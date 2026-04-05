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

import { useParams } from "@solidjs/router";
import { createResource, Switch, Match, Show } from "solid-js";
import { Layout } from "../layouts/Layout";
import axios, { AxiosError } from "axios";
import { UserInfo } from "../components/UserInfo";
import { useAuth } from "../auth";
import { useI18n } from "../i18n";

export default function User() {
  const { t } = useI18n();
  const params = useParams();
  const { status: mine, updateInfo } = useAuth();
  const isGuestMode = params.id === "guest";
  const userId = isGuestMode ? null : Number(params.id);
  
  const [userInfo, { refetch: refetchUserInfo }] = createResource(
    () => !isGuestMode,
    () => axios.get(`users/${userId}`).then((res) => res.data),
  );
  
  const guestInfo = () => {
    const s = mine();
    if (s.type === "guest") {
      return {
        id: null,
        name: s.name,
        avatar: s.avatar,
        login: "",
        chessboardColor: s.chessboardColor,
        type: "guest" as const,
      };
    }
    return null;
  };
  
  const handleNameChange = async (newName: string) => {
    const s = mine();
    if (s.type === "guest") {
      await updateInfo({ name: newName });
    } else if (s.type === "user" && userId) {
      await axios.patch("users/me", { name: newName });
      await refetchUserInfo();
    }
  };
  
  const handleAvatarChange = async (newAvatar: string | null) => {
    const s = mine();
    if (s.type === "guest") {
      await updateInfo({ avatar: newAvatar });
    } else if (s.type === "user" && userId) {
      await axios.patch("users/me", { avatar: newAvatar });
      await refetchUserInfo();
    }
  };

  return (
    <Layout>
      <Switch>
        <Match when={isGuestMode}>
          <Show when={guestInfo()} fallback={t("notLoggedIn")}>
            {(info) => (
              <UserInfo
                {...info()}
                editable={true}
                isGuest={true}
                onNameChange={handleNameChange}
                onAvatarChange={handleAvatarChange}
              />
            )}
          </Show>
        </Match>
        <Match when={userInfo.loading}>{t("loading")}</Match>
        <Match when={userInfo.error}>
          {t("loadFailed", {
            message:
              userInfo.error instanceof AxiosError
                ? userInfo.error.response?.data.message
                : userInfo.error,
          })}
        </Match>
        <Match when={userInfo()}>
          <UserInfo
            {...userInfo()}
            editable={userInfo()?.id === mine()?.id}
            onNameChange={handleNameChange}
            onAvatarChange={handleAvatarChange}
          />
        </Match>
      </Switch>
    </Layout>
  );
}
