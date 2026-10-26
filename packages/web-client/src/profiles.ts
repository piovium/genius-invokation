// Copyright (C) 2026 Piovium Labs
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
// along with this program.  If not, see <http://www.gnu.org/licenses/>.

import axios from "axios";
import type { AssetsManagerOption } from "@gi-tcg/assets-manager";

export interface ProfileSummary {
  id: string;
  name: string;
  baseVersion: string;
  profileHash: string;
  officialDeckCompatible: boolean;
}
export interface ProfileDetail extends ProfileSummary {
  assets: Pick<
    AssetsManagerOption,
    "version" | "customData" | "overrideData" | "officialDeckCompatible"
  >;
}
export interface ProfileList {
  defaultProfileId: string;
  profiles: ProfileSummary[];
}

const details = new Map<string, Promise<ProfileDetail>>();

export function fetchProfile(summary: ProfileSummary) {
  let result = details.get(summary.profileHash);
  if (!result) {
    result = axios
      .get<ProfileDetail>(`profiles/${encodeURIComponent(summary.id)}`)
      .then(({ data }) => data)
      .catch((error) => {
        details.delete(summary.profileHash);
        throw error;
      });
    details.set(summary.profileHash, result);
  }
  return result;
}
