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
      .then(({ data }) => {
        if (data.profileHash !== summary.profileHash) {
          throw new Error("Room Profile has changed; reload the room");
        }
        return data;
      })
      .catch((error) => {
        details.delete(summary.profileHash);
        throw error;
      });
    details.set(summary.profileHash, result);
  }
  return result;
}
