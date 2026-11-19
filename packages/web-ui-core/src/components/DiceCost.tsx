// Copyright (C) 2024-2025 Guyutongxue
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

import { DiceType, type PbDiceRequirement } from "@gi-tcg/typings";
import { createMemo, Show, omit, For } from "solid-js";
import type { ComponentProps } from "@solidjs/web";
import { useUiContext } from "../hooks/context";
import { Cost, type CostTextColor } from "./Dice";
import { isDeepEqual } from "remeda";
import type { AnyData } from "@gi-tcg/assets-manager";

interface DiceCostProps extends ComponentProps<"div"> {
  diceClass: string;
  cost: readonly PbDiceRequirement[];
  realCost?: readonly PbDiceRequirement[];
}

export function DiceCost(props: DiceCostProps) {
  const restProps = omit(props, "cost", "diceClass", "realCost");
  const diceMap = createMemo(
    () => {
      const costMap = new Map(
        props.cost.map(({ type, count }) => [type as DiceType, count]),
      );
      const realCostMap = new Map(
        props.realCost?.map(({ type, count }) => [type as DiceType, count]),
      );
      type DiceTuple = readonly [
        type: DiceType,
        count: number,
        color: CostTextColor,
      ];
      let result: DiceTuple[] = [];
      if (props.realCost) {
        for (const [type, originalCount] of costMap) {
          const realCount = realCostMap.get(type) ?? 0;
          const color =
            realCount > originalCount
              ? "increased"
              : realCount < originalCount
                ? "decreased"
                : "normal";
          result.push([type, realCount, color]);
          realCostMap.delete(type);
        }
        result.push(
          ...realCostMap
            .entries()
            .filter(([, count]) => count > 0)
            .map(([type, count]) => [type, count, "increased"] as const),
        );
      } else {
        result = costMap
          .entries()
          .map(([type, count]) => [type, count, "normal"] as const)
          .toArray();
      }
      return result;
    },
    { equals: isDeepEqual },
  );
  return (
    <div {...restProps}>
      <For each={diceMap()} keyed={([type]) => type}>
        {(item) => (
          <Cost
            type={item()[0]}
            count={item()[1]}
            class={props.diceClass}
            color={item()[2]}
          />
        )}
      </For>
    </div>
  );
}

export interface DiceCostAsyncProps extends ComponentProps<"div"> {
  cardDefinitionId: number;
  diceClass: string;
}

export const DiceCostAsync = (props: DiceCostAsyncProps) => {
  const restProps = omit(props, "cardDefinitionId");
  const { assetsManager } = useUiContext();
  const data = createMemo(
    () =>
      assetsManager()
        .getData(props.cardDefinitionId)
        .catch(() => undefined),
    { loadingValue: undefined },
  );
  const COST_MAP: Record<string, number> = {
    GCG_COST_DICE_VOID: DiceType.Void,
    GCG_COST_DICE_CRYO: DiceType.Cryo,
    GCG_COST_DICE_HYDRO: DiceType.Hydro,
    GCG_COST_DICE_PYRO: DiceType.Pyro,
    GCG_COST_DICE_ELECTRO: DiceType.Electro,
    GCG_COST_DICE_ANEMO: DiceType.Anemo,
    GCG_COST_DICE_GEO: DiceType.Geo,
    GCG_COST_DICE_DENDRO: DiceType.Dendro,
    GCG_COST_DICE_SAME: DiceType.Aligned,
    GCG_COST_ENERGY: DiceType.Energy,
    GCG_COST_LEGEND: DiceType.Legend,
  };
  const renderCost = (data: AnyData) => {
    if ("playCost" in data && data.playCost.length > 0) {
      const staticCost = data.playCost.map((cost) => ({
        type: COST_MAP[cost.type],
        count: cost.count,
      }));
      if (
        data.playCost.length === 1 &&
        data.playCost[0].type === "GCG_COST_LEGEND"
      ) {
        return [{ type: 8, count: 0 }, ...staticCost];
      }
      return staticCost;
    } else {
      return [{ type: 8, count: 0 }];
    }
  };
  return (
    <Show when={data()}>
      {(data) => <DiceCost cost={renderCost(data())} {...restProps} />}
    </Show>
  );
};
