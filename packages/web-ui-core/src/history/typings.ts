// Copyright (C) 2025 Guyutongxue
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

import { Aura, DamageType, DiceType, Reaction } from "@gi-tcg/typings";
import type { EntityType } from "./parser";

export type HistoryDetailBlock =
  | PocketHistoryBlock
  | SwitchOrChooseActiveHistoryBlock
  | UseSkillHistoryBlock
  | TriggeredHistoryBlock
  | PlayCardHistoryBlock
  | ElementalTuningHistoryBlock
  | SelectCardHistoryBlock;

export type HistoryHintBlock = ChangePhaseHistoryBlock | ActionHistoryBlock;

export type HistoryBlock = HistoryDetailBlock | HistoryHintBlock;

export type HistoryChildren =
  | SwitchActiveHistoryChild
  | WillTriggeredHistoryChild
  | DrawCardHistoryChild
  | StealHandHistoryChild
  | CreateEntityHistoryChild
  | GenerateDiceHistoryChild
  | AbsorbDiceHistoryChild
  | ConvertDiceHistoryChild
  | CreateCardHistoryChild
  | RemoveCardHistoryChild
  | UndrawCardHistoryChild
  | SwitchHandsHistoryChild
  | RerollHistoryChild
  | DamageHistoryChild
  | HealHistoryChild
  | ApplyHistoryChild
  | IncreaseMaxHealthHistoryChild
  | EnergyHistoryChild
  | VariableChangeHistoryChild
  | RemoveEntityHistoryChild
  | PlayCardNoEffectHistoryChild
  | TransformDefinitionHistoryChild
  | SwapCharacterPositionHistoryChild
  | OverflowCardHistoryChild;

export type CharacterHistoryChildren =
  | SwitchActiveHistoryChild
  | Extract<CreateEntityHistoryChild, { entityType: "state" | "combatState" }>
  | DamageHistoryChild
  | HealHistoryChild
  | ApplyHistoryChild;

export type CardHistoryChildren =
  | Extract<CreateEntityHistoryChild, { entityType: "summon" }>
  | RemoveCardHistoryChild
  | CreateCardHistoryChild
  | Extract<RemoveEntityHistoryChild, { entityType: "summon" | "support" }>;

/////////////// block部分 ////////////////

// 游戏阶段和回合标记
// style采用灰底白字 居中
// text: "替换起始手牌" | "选择初始出战角色" | "回合N 开始" | "结束阶段"
export interface ChangePhaseHistoryBlock {
  type: "changePhase";
  roundNumber: number;
  newPhase: "initHands" | "initActives" | "action" | "end";
}

// 行动标记
// style采用实色填充 居中
// text: who + ("行动" | "宣布回合结束")
export interface ActionHistoryBlock {
  type: "action";
  who: 0 | 1;
  actionType: "action" | "declareEnd";
}

// 继续结算
// title: 继续结算···
// image: [###预览###]
// click_description: undifined
export interface PocketHistoryBlock {
  type: "pocket";
  indent: number;
  children: HistoryChildren[];
}

// 切换出战角色
// title: who + ("初始出战角色" | "切换角色" | "选择出战角色")
// image: characterCardface ^ SwitchActiveIcon + icon[->] + [###预览###]
// click_description: characterCardface <-> characterName \n "角色出战"
export interface SwitchOrChooseActiveHistoryBlock {
  type: "switchOrChooseActive";
  indent: number;
  who: 0 | 1;
  characterDefinitionId: number;
  how: "init" | "switch" | "choose";
  children: HistoryChildren[];
}

// 使用技能|特技
// title: who + ("使用技能" || "使用特技")
// image: callerCardface ^ energyChange? + icon[->] + [###预览###]
// click_description: callerCardface <-> callerName \n "使用技能" \n skillIcon + skillName
export interface UseSkillHistoryBlock {
  type: "useSkill";
  indent: number;
  who: 0 | 1;
  skillDefinitionId: number;
  callerDefinitionId: number;
  skillType: "normal" | "elemental" | "burst" | "technique";
  children: HistoryChildren[];
}

// 触发效果
// 貌似是一个listener的响应，被动技能、状态、特技、支援...都可以是触发效果
// 只有激愈水球在对方手中触发效果时显示为cardback???
// title: "触发效果"
// image: callerCardface ^ TriggerIcon + icon[->] + [###预览###]
// click_description: callerCardface <-> callerName \n {
// if effect has icon:
//    return ("触发效果" \n effectIcon + effectName);
// else:
//    return (callerDescription);
// }
export interface TriggeredHistoryBlock {
  type: "triggered";
  indent: number;
  who: 0 | 1;
  masterOrCallerDefinitionId: number;
  callerOrSkillDefinitionId: number;
  entityType: EntityType;
  children: HistoryChildren[];
}

// 打出手牌
// title: who + "打出手牌"
// image: Cardface + icon[->] + [###预览###]
// click_description: Cardface <-> cardName \n cardDescription
export interface PlayCardHistoryBlock {
  type: "playCard";
  indent: number;
  who: 0 | 1;
  cardDefinitionId: number;
  children: HistoryChildren[];
}

// 挑选结果
// title: who + "执行挑选"
// image: Cardface + icon[->] + [###预览###]
// click_description: {
// if my:
//   return (Cardface <-> cardName \n who + "触发挑选效果");
// else:
//   return (Cardback <-> "???" \n who + "触发挑选效果");
// }
export interface SelectCardHistoryBlock {
  type: "selectCard";
  indent: number;
  who: 0 | 1;
  cardDefinitionId: number; // 被选择的牌
  children: HistoryChildren[];
}

// 元素调和
// title: who + "进行「元素调和」"
// image: (Cardface || Cardback) ^ TuningIcon + icon[->] + [###预览###]
// click_description: {
// if my:
//   return (Cardface <-> cardName \n cardDescription);
// else:
//   return (Cardback <-> "???" \n "???");
// }
export interface ElementalTuningHistoryBlock {
  type: "elementalTuning";
  indent: number;
  who: 0 | 1;
  cardDefinitionId: number;
  children: HistoryChildren[];
}

/////////////// child部分 ////////////////

// 切换出战角色
// content: characterCardface <-> characterName \n "角色出战" + ("卡牌效果" || "超载")
export interface SwitchActiveHistoryChild {
  type: "switchActive";
  who: 0 | 1;
  characterDefinitionId: number;
  isOverloaded: boolean;
}

// 触发效果
// content: {effectCardface || effectIcon} <-> effectName \n "触发效果"
export interface WillTriggeredHistoryChild {
  type: "willTriggered";
  who: 0 | 1;
  callerDefinitionId: number;
}

// 抓牌
// content: {callerCardface || callerIcon} <-> callerName \n who + "抓N张牌"
export interface DrawCardHistoryChild {
  type: "drawCard";
  who: 0 | 1;
  drawCardsCount: number;
}

// 偷牌
// 匿叶龙，以极限之名
// content: Cardface <-> cardrName \n who + "夺取" + !who + "手牌"
export interface StealHandHistoryChild {
  type: "stealHand";
  who: 0 | 1;
  cardDefinitionId: number; // 偷到的牌
}

// 附属状态|装备
// content: characterCardface <-> characterName \n ("附属状态:" || "附属装备:") + inline[propertyIcon] + propertyName
// 生成出战状态|召唤物
// 支援不显示
// content: {entityCardface || entityIcon} <-> entityName \n who + ("生成出战状态" || "生成召唤物")
export interface CreateEntityHistoryChild {
  type: "createEntity";
  who: 0 | 1;
  entityType: EntityType;
  masterDefinitionId?: number;
  entityDefinitionId: number;
}

// 生成骰子
// content: {callerCardface || callerIcon} <-> callerName \n who + "生成${count}个${diceType}"
export interface GenerateDiceHistoryChild {
  type: "generateDice";
  who: 0 | 1;
  diceType: DiceType;
  count: number;
}

// 弃置元素骰
// 桓那兰那等
// content: {callerCardface || callerIcon} <-> callerName \n who + "弃置了${count}个元素骰"
export interface AbsorbDiceHistoryChild {
  type: "absorbDice";
  who: 0 | 1;
  count: number;
}

// 元素调和|某些卡牌转化元素骰的效果
// content: (Cardface || cardIcon || TuningIcon) <-> (cardName || "元素调和") \n who + "将1个元素骰转换为inlineIcon[DiceType]${DiceType}"
export interface ConvertDiceHistoryChild {
  type: "convertDice";
  who: 0 | 1;
  isTuning: boolean;
  diceType: DiceType;
  count: number;
}

// 生成卡牌|复制卡牌
// content: Cardface <-> cardName \n who + ("生成卡牌, 并将其置入牌库"|| "获得手牌")
export interface CreateCardHistoryChild {
  type: "createCard";
  who: 0 | 1;
  cardDefinitionId: number;
  target: "pile" | "hands";
}

// 替换手牌
// 草与智慧
// content: Cardface <-> cardName \n who + ("替换了1次手牌")
export interface SwitchHandsHistoryChild {
  type: "switchCard";
  who: 0 | 1;
  count: number;
}

// 置入牌库
// 菲米尼潜猎模式
// content: Cardface <-> cardName \n who + ("将n张手牌置入牌库")
export interface UndrawCardHistoryChild {
  type: "undrawCard";
  who: 0 | 1;
  count: number;
}

// 重投
// content: {callerCardface || callerIcon} <-> callerName \n who + "进行了N次重投"
export interface RerollHistoryChild {
  type: "rerollDice";
  who: 0 | 1;
  count: number;
}

// 受到伤害
// content: characterCardface <-> characterName + DamageIcon[+/-N] \n "受到${damageValue}点${damageType}${(inlineIcon[oldAura] + inlineIcon[damageType] + reactionName)?}, 生命值${oldHealth}→${newHealth}$" + ("" || ", 被击倒")
export interface DamageHistoryChild {
  type: "damage";
  who: 0 | 1;
  characterDefinitionId: number;
  oldAura: Aura; // 受到伤害前的元素附着
  newAura: Aura; // 受到伤害后的元素附着
  damageType: DamageType;
  damageValue: number;
  oldHealth: number;
  newHealth: number;
  reaction?: Reaction;
  causeDefeated: boolean;
}

// 受到治疗
// content: characterCardface <-> characterName + HealIcon[+/-N] \n ("" || "复苏, 并" || "角色免于被击倒并") + "受到${healValue}点治疗, 生命值${oldHealth}→${newHealth}"
export interface HealHistoryChild {
  type: "heal";
  who: 0 | 1;
  characterDefinitionId: number;
  healValue: number;
  oldHealth: number;
  newHealth: number;
  healType: "normal" | "revive" | "immuneDefeated";
}

// 附着元素
// content: characterCardface <-> characterName \n "附着${damageType}${(inlineIcon[oldAura] + inlineIcon[elementType] + reactionName)?}"
export interface ApplyHistoryChild {
  type: "apply";
  who: 0 | 1;
  characterDefinitionId: number;
  oldAura: Aura; // 之前的元素附着
  newAura: Aura; // 之后的元素附着
  elementType: DamageType;
  reaction?: Reaction;
}

// 获得最大生命值
// content: characterCardface <-> characterName \n "获得${healValue}点最大生命值, 最大生命值${oldHealth}→${newHealth}"
export interface IncreaseMaxHealthHistoryChild {
  type: "increaseMaxHealth";
  who: 0 | 1;
  characterDefinitionId: number;
  oldMaxHealth: number;
  newMaxHealth: number;
}

// 获得充能|消耗充能
// 被动减少也显示消耗
// content: characterCardface <-> characterName \n "(获得 || 消耗)${energyValue}点充能, 充能值${oldEnergy}→${newEnergy}"
export interface EnergyHistoryChild {
  type: "energy";
  who: 0 | 1;
  characterDefinitionId: number;
  oldEnergy: number;
  newEnergy: number;
}

// 舍弃
// content: Cardface <-> cardName \n who + "舍弃手牌"
export interface RemoveCardHistoryChild {
  type: "removeCard";
  who: 0 | 1;
  cardDefinitionId: number;
}

// 变量改变
// 如卡牌、状态等的可用次数、计数器等
// content: {Cardface || Icon} <-> cardName \n "${variableName}: ${oldValue}→${newValue}"
export interface VariableChangeHistoryChild {
  type: "variableChange";
  who: 0 | 1;
  cardDefinitionId: number;
  variableName: string;
  oldValue: number;
  newValue: number;
}

// 弃置状态|装备
// content: characterCardface <-> characterName \n ("失去状态:" || "失去装备:") + inline[entityIcon] + entityName
// 弃置出战状态、召唤物、支援
// content: {entityCardface || entityIcon} <-> entityName \n ("出战状态消失" || "卡牌弃置")
export interface RemoveEntityHistoryChild {
  type: "removeEntity";
  who: 0 | 1;
  entityType: EntityType;
  masterDefinitionId?: number; // 状态、装备：所属角色区
  entityDefinitionId: number;
}

// 裁定之时, 梅洛彼得堡
// content: Cardface <-> cardName \n "遭到反制，未能生效"
export interface PlayCardNoEffectHistoryChild {
  type: "playCardNoEffect";
  who: 0 | 1;
  cardDefinitionId: number;
}

// 转换形态
// 角色、召唤物
// content: Cardface <-> cardName \n ("转换形态···" || "转换形态完成")
export interface TransformDefinitionHistoryChild {
  type: "transformDefinition";
  who: 0 | 1;
  cardDefinitionId: number; // 对应新旧形态
  stage: "old" | "new";
}

/////////////// 非官方 ////////////////

// 交换角色位置
export interface SwapCharacterPositionHistoryChild {
  type: "swapCharacterPosition";
  who: 0 | 1;
  character0DefinitionId: number;
  character1DefinitionId: number;
}

// 爆牌
export interface OverflowCardHistoryChild {
  type: "overflowCard";
  who: 0 | 1;
  cardDefinitionId: number;
}

/////////////// 用于生成赛后统计的全局记录量，我也不知道怎么实现 ////////////////

// 对两名玩家分别记录
// 如果发生了DamageHistoryChild，就对damageList.append(damageValue)
// 如果DamageHistoryChild含有reaction，就对reactionTimes +1
// 如果发生了ElementHistoryChild且含有reaction，就对reactionTimes +1
// 如果发生了HealHistoryChild，就对healList.append(healValue)
// 每回合重投后（我看现有的mutation可以记录这个）计算有效骰并validDiceCount.append()
// 如果发生了TuningHistoryBlock，就对tuningTimes +1
// 如果发生了DrawCardHistoryChild，就对drawCardsCount + drawCardsCount
export interface GlobalRecord {
  who: 0 | 1;
  damageList: number[];
  healList: number[];
  reactionTimes: number;
  validDiceCount: number[];
  tuningTimes: number;
  round: number;
  drawCardsCount: number;
}
