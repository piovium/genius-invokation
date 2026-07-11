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

import { character, skill, status, card, DamageType } from "@gi-tcg/core/builder";

/**
 * @id 114041
 * @name 启途誓使
 * @description
 * 结束阶段：累积1级「凭依」。如果「凭依」级数至少为8，则「凭依」级数-6。
 * 根据「凭依」级数，提供效果：
 * 大于等于2级：物理伤害转化为雷元素伤害；
 * 大于等于4级：造成的伤害+2。
 */
export const PactswornPathclearer = status(114041)
  .variable("reliance", 0)
  .on("endPhase")
  .do((c) => {
    const newVal = c.getVariable("reliance") + 1;
    if (newVal >= 8) {
      c.setVariable("reliance", newVal - 6);
    } else {
      c.setVariable("reliance", newVal);
    }
  })
  .on("modifySkillDamageType", (c, e) => c.getVariable("reliance") >= 2 && e.type === DamageType.Physical)
  .changeDamageType(DamageType.Electro)
  .on("increaseSkillDamage", (c, e) => c.getVariable("reliance") >= 4)
  .increaseDamage(2)
  .done();

/**
 * @id 14041
 * @name 七圣枪术
 * @description
 * 造成2点物理伤害。
 */
export const InvokersSpear = skill(14041)
  .type("normal")
  .costElectro(1)
  .costVoid(2)
  .damage(DamageType.Physical, 2)
  .done();

/**
 * @id 14042
 * @name 秘仪·律渊渡魂
 * @description
 * 造成3点雷元素伤害，
 * 启途誓使的「凭依」级数+1。
 */
export const SecretRiteChasmicSoulfarer = skill(14042)
  .type("elemental")
  .costElectro(3)
  .damage(DamageType.Electro, 3)
  .do((c) => {
    const status = c.self.hasStatus(PactswornPathclearer)!;
    status.addVariable("reliance", 1);
  })
  .done();

/**
 * @id 14043
 * @name 圣仪·煟煌随狼行
 * @description
 * 造成4点雷元素伤害，
 * 启途誓使的「凭依」级数+2。
 */
export const SacredRiteWolfsSwiftness = skill(14043)
  .type("burst")
  .costElectro(4)
  .costEnergy(2)
  .damage(DamageType.Electro, 4)
  .do((c) => {
    const status = c.self.hasStatus(PactswornPathclearer)!;
    status.addVariable("reliance", 2);
  })
  .done();

/**
 * @id 14044
 * @name 行度誓惩
 * @description
 * 【被动】战斗开始时，初始附属启途誓使。
 */
export const LawfulEnforcer = skill(14044)
  .type("passive")
  .on("battleBegin")
  .characterStatus(PactswornPathclearer)
  .on("revive")
  .characterStatus(PactswornPathclearer)
  .done();

/**
 * @id 1404
 * @name 赛诺
 * @description
 * 卡牌中蕴藏的，是大风纪官如沙漠烈日般炙热的喜爱之情。
 */
export const Cyno = character(1404)
  .since("v3.3.0")
  .tags("electro", "pole", "sumeru")
  .health(10)
  .energy(2)
  .skills(InvokersSpear, SecretRiteChasmicSoulfarer, SacredRiteWolfsSwiftness, LawfulEnforcer)
  .done();

/**
 * @id 214041
 * @name 落羽的裁择
 * @description
 * 战斗行动：我方出战角色为赛诺时，装备此牌。
 * 赛诺装备此牌后，立刻使用一次秘仪·律渊渡魂。
 * 装备有此牌的赛诺在启途誓使的「凭依」级数至少为2时，使用秘仪·律渊渡魂造成的伤害+1。（每回合至多2次）
 * （牌组中包含赛诺，才能加入牌组）
 */
export const FeatherfallJudgment = card(214041)
  .since("v3.3.0")
  .costElectro(3)
  .talent(Cyno)
  .on("enter")
  .useSkill(SecretRiteChasmicSoulfarer)
  .on("increaseSkillDamage", (c, e) => {
    const status = c.self.master.hasStatus(PactswornPathclearer)!;
    return c.getVariable("reliance", status) >=2 && e.via.definition.id === SecretRiteChasmicSoulfarer;
  })
  .usagePerRound(2)
  .increaseDamage(1)
  .done();
