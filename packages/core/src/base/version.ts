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
// along with this program.  If not, see <http://www.gnu.org/licenses/>.

import { BETA_VERSION, IS_BETA } from "@gi-tcg/config";
import type { VersionResolver } from "../builder";

type BetaVersions = typeof IS_BETA extends true ? [typeof BETA_VERSION] : [];
const BETA_VERSIONS = (IS_BETA ? [BETA_VERSION] : []) as BetaVersions;

export const VERSIONS = [
  "v3.3.0",
  "v3.4.0",
  "v3.5.0",
  "v3.6.0",
  "v3.7.0",
  "v3.8.0",
  "v4.0.0",
  "v4.1.0",
  "v4.2.0",
  "v4.3.0",
  "v4.4.0",
  "v4.5.0",
  "v4.6.0",
  "v4.6.1",
  "v4.7.0",
  "v4.8.0",
  "v5.0.0",
  "v5.1.0",
  "v5.2.0",
  "v5.3.0",
  "v5.4.0",
  "v5.5.0",
  "v5.6.0",
  "v5.7.0",
  "v5.8.0",
  "v6.0.0",
  "v6.1.0",
  "v6.2.0",
  "v6.3.0",
  ...BETA_VERSIONS,
] as const;

export type Version = (typeof VERSIONS)[number];

export const INIT_VERSION = VERSIONS[0];

type LastVersionIndex = typeof VERSIONS extends readonly [infer _, ...infer L]
  ? L["length"]
  : never;
const lastVersionIndex = (VERSIONS.length - 1) as LastVersionIndex;

export const CURRENT_VERSION = VERSIONS[lastVersionIndex];

export const versionLt = (a: Version, b: Version): boolean => {
  return VERSIONS.indexOf(a) < VERSIONS.indexOf(b);
}

export interface OfficialVersionData {
  readonly predicate: "since" | "until";
  readonly version: Version;
}

declare global {
  export namespace GiTcg {
    export interface VersionMetadata {
      official: OfficialVersionData;
    }
  }
}

export type VersionMetadata = GiTcg.VersionMetadata;

export type VersionInfo = {
  [K in keyof VersionMetadata]: {
    readonly from: K;
    readonly value: VersionMetadata[K];
  };
}[keyof VersionMetadata];

export interface WithVersionInfo {
  readonly id: number;
  readonly version: VersionInfo;
}

const versionIdxMap = Object.freeze(
  Object.fromEntries(VERSIONS.map((v, i) => [v, i])),
);

export function versionCompare(a: Version, b: Version) {
  return versionIdxMap[a] - versionIdxMap[b];
}

export function resolveOfficialVersion<T extends WithVersionInfo>(
  candidates: readonly T[],
  requiredVersion: Version = CURRENT_VERSION,
): T | null {
  const since = candidates.find(
    ({ version }) =>
      version.from === "official" && version.value.predicate === "since",
  );
  const until = candidates
    .filter(
      ({ version }) =>
        version.from === "official" &&
        version.value.predicate === "until" &&
        versionCompare(version.value.version, requiredVersion) >= 0,
    )
    .toSorted((a, b) =>
      versionCompare(a.version.value.version, b.version.value.version),
    );
  if (
    !since ||
    versionCompare(since.version.value.version, requiredVersion) > 0
  ) {
    return null;
  }
  if (until.length === 0) {
    return since;
  }
  return until[0] ?? null;
}

export function resolveManuallySelectedOfficialVersion(
  versions: Record<number, Version>,
  baseVersion: Version = CURRENT_VERSION,
): VersionResolver {
  return <T extends WithVersionInfo>(candidates: readonly T[]) => {
    const id = candidates[0].id;
    const version = versions[id] ?? baseVersion;
    return resolveOfficialVersion(candidates, version);
  }
}

export const DEFAULT_VERSION_INFO: VersionInfo = {
  from: "official",
  value: {
    predicate: "since",
    version: INIT_VERSION,
  },
};
