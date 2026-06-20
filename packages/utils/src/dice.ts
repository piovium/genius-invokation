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

import type { DiceType, ReadonlyDiceRequirement } from "@gi-tcg/typings";
import { toSortedBy } from "./index";

const VOID = 0;
const OMNI: typeof DiceType.Omni = 8;
const ALIGNED: typeof DiceType.Aligned = 8;
const ENERGY = 9;

/**
 * "智能"选骰算法（不检查能量）
 * @param required 卡牌或技能需要的骰子类型
 * @param dice 当前持有的骰子
 * @param usefulDice 有效骰，在无效骰数量不足时才会被选择
 * @param targetDice 出战角色或将要出战的角色的元素骰，在其他有效骰数量不足时才会被选择
 * @param disallowDice 不匹配的元素骰类型（e.g. 元素调和时的出战元素骰和万能元素骰）
 * @returns 被选中的骰子
 */
export function chooseDiceValue(
  required: ReadonlyDiceRequirement,
  dice: readonly DiceType[],
  usefulDice: Set<DiceType>,
  targetDice: Set<DiceType>,
  disallowDice: Set<DiceType>,
): DiceType[] {
  const result: DiceType[] = [];
  // 单独计算万能骰的数量
  let omniDiceConut = disallowDice.has(OMNI) ? 0 : dice.filter((d) => d === OMNI).length;

  // 将持有的骰子按类型分组计算数量，移除disallowDice，移除万能骰
  const diceCountMap = dice.reduce((map, d) => {
    map.set(d, (map.get(d) ?? 0) + 1);
    return map;
  }, new Map<DiceType, number>());
  const remainingDice = [...diceCountMap.entries()].map(([type, count]) => ({ type, count })).filter((d) => !(disallowDice.has(d.type) || d.type === OMNI));

  // 需要指定类型的骰子
  const requiredBaseDice = required.entries().filter(([k]) => k > VOID && k < ALIGNED);
  for (const [requiredType, requiredCount] of requiredBaseDice) {
    const target = remainingDice.find((d) => d.type === requiredType);
    if (target && target.count + omniDiceConut >= requiredCount) {
      // 指定类型的骰子和万能骰组合后数量足够
      const targetCount = Math.min(target.count, requiredCount);
      const omniCount = requiredCount - targetCount;
      result.push(...Array(targetCount).fill(target.type));
      result.push(...Array(omniCount).fill(OMNI));
      remainingDice.find((d) => d.type === target.type)!.count -= targetCount;
      omniDiceConut -= omniCount;
    } else if (omniDiceConut >= requiredCount) {
      // 没有指定类型的骰子，万能骰数量足够，直接用万能骰支付需求
      result.push(...Array(requiredCount).fill(OMNI));
      omniDiceConut -= requiredCount;
    } else {
      // 无法支付需求
      return [];
    }
  }

  // 需要同色骰子
  if (required.has(ALIGNED)) {
    const requiredCount = required.get(ALIGNED)!;
    // 1. 无效骰优先
    // 2. 数量>=需求的元素骰优先
    // 3. 后台角色的元素骰优先
    // 4. 与需求数量差值的绝对值小的优先
    // 5. 骰子类型编号
    const sortedDice = toSortedBy(remainingDice, (dice) => [
      +usefulDice.has(dice.type),
      dice.count >= requiredCount ? -1 : 0,
      +targetDice.has(dice.type),
      Math.abs(dice.count - requiredCount),
      dice.type,
    ]);
    // 最少同色数量
    const minSameCount = Math.max(0, requiredCount - omniDiceConut);
    const target = sortedDice.find((d) => d.count >= minSameCount);
    if (target) {
      // 依照排序取第一个数量足够的，和万能骰组合，支付需求
      const targetCount = Math.min(target.count, requiredCount);
      const omniCount = requiredCount - targetCount;
      result.push(...Array(targetCount).fill(target.type));
      result.push(...Array(omniCount).fill(OMNI));
      remainingDice.find((d) => d.type === target.type)!.count -= targetCount;
      omniDiceConut -= omniCount;
    } else if (omniDiceConut >= requiredCount) {
      // 没有任何元素骰数量足够，万能骰数量足够，直接用万能骰支付需求
      result.push(...Array(requiredCount).fill(OMNI));
      omniDiceConut -= requiredCount;
    } else {
      // 无法支付需求
      return [];
    }
  }

  // 需要杂色骰子
  if (required.has(VOID)) {
    const requiredCount = required.get(VOID)!;
    // 1. 无效骰优先
    // 2. 后台角色的元素骰优先
    // 3. 数量少的骰子优先
    // 4. 骰子类型编号
    const sortedDice = toSortedBy(remainingDice, (dice) => [
      +usefulDice.has(dice.type),
      +targetDice.has(dice.type),
      dice.count,
      dice.type,
    ]);
    const flatRemainingDice: DiceType[] = [
      ...sortedDice.flatMap((d) => Array(d.count).fill(d.type)),
      ...Array(omniDiceConut).fill(OMNI),
    ];
    if (flatRemainingDice.length >= requiredCount) {
      result.push(...flatRemainingDice.slice(0, requiredCount));
      // 最后一个分支，不需要再计算剩余骰子数量
    } else {
      return [];
    }
  }
  return result;
}

/**
 * 检查骰子是否符合要求（不检查能量）
 * @param required 卡牌或技能需要的骰子类型
 * @param chosen 已选择的骰子
 * @returns 是否符合要求
 */
export function checkDice(
  required: ReadonlyDiceRequirement,
  chosen: readonly DiceType[],
): boolean {
  // 如果需要同色骰子
  if (required.has(ALIGNED)) {
    const requiredCount = required.get(ALIGNED)!;
    // 检查个数
    if (requiredCount !== chosen.length) return false;
    const chosenMap = new Set<DiceType>(chosen);
    // 完全同色，或者只有杂色+万能两种骰子
    return (
      (chosenMap.size === 0 && requiredCount === 0) ||
      chosenMap.size === 1 ||
      (chosenMap.size === 2 && chosenMap.has(OMNI))
    );
  }
  const requiredArray = required
    .entries()
    .flatMap(([k, v]) => Array.from({ length: v }, () => k))
    .toArray();
  // 否则逐个检查杂色/无色
  const chosen2 = [...chosen];
  let voidCount = 0;
  for (const r of requiredArray) {
    if (r === ENERGY) continue;
    // 记录无色的个数，最后检查剩余个数是否一致
    if (r === VOID) {
      voidCount++;
      continue;
    }
    // 杂色：找到一个删一个
    const index = chosen2.indexOf(r);
    if (index === -1) {
      const omniIndex = chosen2.indexOf(OMNI);
      if (omniIndex === -1) return false;
      chosen2.splice(omniIndex, 1);
      continue;
    }
    chosen2.splice(index, 1);
  }
  return chosen2.length === voidCount;
}
