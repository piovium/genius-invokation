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
import { createMemo, refresh, Loading, Errored, Show, affects } from "solid-js";
import { Layout } from "../layouts/Layout";
import axios from "axios";
import { useAuth, UserInfo as UserInfoT } from "../auth";
import { useI18n } from "../i18n";
import { UserInfo } from "../components/UserInfo";
import { getErrorMessage, getGithubAvatarUrl } from "../utils";

export default function User() {
  const { t } = useI18n();
  const params = useParams<{ id: string }>();
  const { status: mine, avatarUrl: myAvatarUrl } = useAuth();

  const userInfo = createMemo(async () => {
    const id = params.id;
    if (id.trim() === "" || !Number.isFinite(+id)) {
      throw new Error(`User ID is incorrect: ${id}`);
    }
    return (await axios.get<UserInfoT>(`users/${id}`)).data;
  });
  const guestMode = () => params.id === "guest";

  return (
    <Layout>
      <Show
        when={!guestMode()}
        fallback={
          <UserInfo
            type="guest"
            idText={t("guestIdentity")}
            name={mine()?.name || ""}
            avatarUrl={myAvatarUrl()}
            editable={true}
          />
        }
      >
        <Errored
          fallback={(error) =>
            t("loadFailed", { message: getErrorMessage(error()) })
          }
        >
          <Loading on={params.id} fallback={t("loading")}>
            <UserInfo
              type="user"
              idText={`ID: ${userInfo().id}`}
              name={userInfo().name}
              avatarUrl={getGithubAvatarUrl(userInfo().id)}
              editable={userInfo().id === mine()?.id}
              onSubmit={() => {
                affects(userInfo);
                void refresh(userInfo);
              }}
            />
          </Loading>
        </Errored>
      </Show>
    </Layout>
  );
}
