import staticDataOverrides from "../static_data";
import { readFile } from "node:fs/promises";
import {
  cardVersions,
  dependencyVersions,
} from "../version_maps/physical_version";

/** A fresh preset on each load; the obtainable version map is also the card pool. */
export default async function physicalVersion() {
  return {
    $schema_version: 1 as const,
    id: "shining-soul/physical_version",
    name: "实体牌",
    version: "v7.2.0" as const,
    deck: { whitelist: Object.keys(cardVersions).map(Number) },
    version_behavior: {
      base: "v7.2.0" as const,
      defaultRecreateBehavior: "takeMax" as const,
      foodOmitInjuredOnly: true,
      discardMaxCostHandsAbortPreview: true,
      diceCostApplyAttachments: true,
    },
    config: {
      initialHandsCount: 5,
      maxHandsCount: 10,
      maxPileCount: 200,
      maxRoundsCount: 15,
      maxSupportsCount: 4,
      maxSummonsCount: 4,
      adventureSpotCandidatesCount: 5,
      initialDiceCount: 8,
      maxDiceCount: 16,
      unexpectedInsufficientDice: "skipConsume" as const,
    },
    plugins: [
      {
        name: "shining-soul",
        version_maps: [{ ...cardVersions, ...dependencyVersions }],
        mods: [
          {
            fileUri:
              "inmem+profile://shining-soul/physical_version/physical.gts",
            content: await readFile(
              new URL("../../mods/physical.gts", import.meta.url),
              "utf8",
            ),
          },
        ],
        static_data_overrides: staticDataOverrides,
      },
    ],
  };
}
