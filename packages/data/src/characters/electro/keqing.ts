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
 * @id 114034
 * @name 雷元素附魔
 * @description
 * 所附属角色造成的物理伤害变为雷元素伤害，且角色造成的雷元素伤害+1。
 * 持续回合：3
 */
export const ElectroElementalInfusion01 = status(114034)
  .conflictWith(114032)
  .duration(3)
  .on("modifySkillDamageType", (c, e) => e.type === DamageType.Physical)
  .changeDamageType(DamageType.Electro)
  .on("increaseSkillDamage", (c, e) => e.type === DamageType.Electro)
  .increaseDamage(1)
  .done();

/**
 * @id 114032
 * @name 雷元素附魔
 * @description
 * 所附属角色造成的物理伤害变为雷元素伤害。
 * 持续回合：2
 */
export const ElectroElementalInfusion = status(114032)
  .conflictWith(114034)
  .duration(2)
  .on("modifySkillDamageType", (c, e) => e.type === DamageType.Physical)
  .changeDamageType(DamageType.Electro)
  .done();

/**
 * @id 14031
 * @name 云来剑法
 * @description
 * 造成2点物理伤害。
 */
export const YunlaiSwordsmanship = skill(14031)
  .type("normal")
  .costElectro(1)
  .costVoid(2)
  .damage(DamageType.Physical, 2)
  .done();

/**
 * @id 14032
 * @name 星斗归位
 * @description
 * 造成3点雷元素伤害，生成手牌雷楔。
 */
export const StellarRestoration = skill(14032)
  .type("elemental")
  .costElectro(3)
  .do((c) => {
    c.damage(DamageType.Electro, 3);
    const requestByCard = c.skillInfo.requestBy?.caller?.definition.id === LightningStiletto;
    const lightningStilettoCard = c.player.hands.find((card) => card.definition.id === LightningStiletto);
    if (requestByCard || lightningStilettoCard) {
      if (c.self.hasEquipment(ThunderingPenance)) {
        c.characterStatus(ElectroElementalInfusion01);
      } else {
        c.characterStatus(ElectroElementalInfusion);
      }
      if (lightningStilettoCard) {
        c.disposeCard(lightningStilettoCard);
      }
    } else {
      c.createHandCard(LightningStiletto);
    }
  })
  .done();

/**
 * @id 14033
 * @name 天街巡游
 * @description
 * 造成4点雷元素伤害，对所有敌方后台角色造成3点穿透伤害。
 */
export const StarwardSword = skill(14033)
  .type("burst")
  .costElectro(4)
  .costEnergy(3)
  .damage(DamageType.Piercing, 3, "opp standby")
  .damage(DamageType.Electro, 4)
  .done();

/**
 * @id 1403
 * @name 刻晴
 * @description
 * 她能构筑出许多从未设想过的牌组，拿下许多难以想象的胜利。
 */
export const Keqing = character(1403)
  .since("v3.3.0")
  .tags("electro", "sword", "liyue")
  .health(10)
  .energy(3)
  .skills(YunlaiSwordsmanship, StellarRestoration, StarwardSword)
  .done();

/**
 * @id 114031
 * @name 雷楔
 * @description
 * 战斗行动：将刻晴切换到场上，立刻使用星斗归位。本次星斗归位会为刻晴附属雷元素附魔，但是不会再生成雷楔。
 * （刻晴使用星斗归位时，如果此牌在手中：不会再生成雷楔，而是改为舍弃此牌，并为刻晴附属雷元素附魔）
 */
export const LightningStiletto = card(114031)
  .since("v3.3.0")
  .undiscoverable()
  .costElectro(3)
  .tags("action", "talent")
  .addTarget(`my character with definition id ${Keqing} and not has status with tag (disableSkill)`)
  .switchActive(`@targets.0`)
  .useSkill(StellarRestoration)
  .done();

/**
 * @id 214031
 * @name 抵天雷罚
 * @description
 * 战斗行动：我方出战角色为刻晴时，装备此牌。
 * 刻晴装备此牌后，立刻使用一次星斗归位。
 * 装备有此牌的刻晴生成的雷元素附魔获得以下效果：
 * 初始持续回合+1，并且会使所附属角色造成的雷元素伤害+1。
 * （牌组中包含刻晴，才能加入牌组）
 */
export const ThunderingPenance = card(214031)
  .since("v3.3.0")
  .costElectro(3)
  .talent(Keqing)
  .on("enter")
  .useSkill(StellarRestoration)
  .done();
