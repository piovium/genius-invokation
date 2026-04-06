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
import { createResource, Switch, Match } from "solid-js";
import { Layout } from "../layouts/Layout";
import axios, { AxiosError } from "axios";
import { useAuth, UserInfo as UserInfoT } from "../auth";
import { useI18n } from "../i18n";
import { UserInfo } from "../components/UserInfo";
import { getGithubAvatarUrl } from "../utils";

export default function User() {
  const { t } = useI18n();
  const params = useParams();
  const { status: mine, avatarUrl: myAvatarUrl } = useAuth();

  const [userInfo, { refetch }] = createResource(
    () => params.id,
    async (id) => {
      if (id.trim() === "" || !Number.isFinite(+id)) {
        throw new Error(`User ID is incorrect: ${id}`);
      } else {
        return await axios
          .get(`users/${params.id}`)
          .then((res) => res.data as UserInfoT);
      }
    },
  );

  const guestMode = () => params.id === "guest";

  return (
    <Layout>
      <Switch>
        <Match when={guestMode()}>
          <UserInfo
            type="guest"
            idText={t("guestIdentity")}
            name={mine()?.name || ""}
            avatarUrl={myAvatarUrl()}
            editable={true}
          />
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
          {(user) => (
            <UserInfo
              type="user"
              idText={`ID: ${user().id}`}
              name={user().name}
              avatarUrl={getGithubAvatarUrl(user().id)}
              editable={user().id === mine()?.id}
              onSubmit={refetch}
            />
          )}
        </Match>
      </Switch>
    </Layout>
  );
}
