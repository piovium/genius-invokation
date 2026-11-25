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

export default [
  {
    id: 16074,
    rawDescription:
      "<color=#FFFFFFFF>准备1个行动轮后：</color>造成2点$[K106]。如果本回合进行过元素调和，此伤害+1。",
  },
  { id: 2205, hp: 10 },
  { id: 2404, maxEnergy: 3 },
  {
    id: 24043,
    playCost: [
      { type: "GCG_COST_DICE_ELECTRO", count: 3 },
      { type: "GCG_COST_ENERGY", count: 3 },
    ],
  },
  {
    id: 330006,
    playCost: [{ type: "GCG_COST_LEGEND", count: 1 }],
  },
  {
    id: 333018,
    rawDescription:
      "<color=#FFFFFFFF>我方打出支援牌时，</color>目标我方角色治疗自身1点。\n<color=#FFFFFFFF>$[K3]：3</color>\n（每回合每个角色最多食用1次「{SPRITE_PRESET#3101}料理」）",
  },
  // 嵌套特技技能不支持 description 声明，单独覆盖实卡文案。
  {
    id: 3130021,
    playCost: [{ type: "GCG_COST_DICE_SAME", count: 2 }],
    rawDescription:
      "造成1点$[K100]，随机$[K56]一张对方手牌，然后对手抓1张牌。如果我方手牌数不多于2，此特技少花费1个元素骰。",
  },
  {
    id: 3130041,
    playCost: [{ type: "GCG_COST_DICE_VOID", count: 2 }],
    rawDescription: "抓2张牌，治疗附属角色1点。",
  },
  {
    id: 3130051,
    playCost: [{ type: "GCG_COST_DICE_SAME", count: 1 }],
    rawDescription:
      "从我方牌库底展示卡牌，直到出现1张支援牌为止，将这张支援牌加入手牌，然后将你的牌库洗牌。治疗所附属角色1点。",
  },
  {
    id: 3130063,
    playCost: [],
    rawDescription: "切换到下一个角色。",
  },
];
