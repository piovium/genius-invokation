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
      "准备1个行动轮后：造成2点岩元素伤害。如果本回合进行过元素调和，此伤害+1。",
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
];
