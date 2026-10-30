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

import { DiceType } from "#custom-data-loader";

define card {
  id 311309 as PortablePowerSaw;
  description "<color=#FFFFFFFF>所附属角色受到伤害时：</color>如可能，$[K56]1张$[K3002]最高的手牌，以抵消1点伤害，然后累积1点<color=#FFFFFFFF>「坚忍标记」</color>。（每回合最多触发2次）\\n<color=#FFFFFFFF>角色造成伤害时：</color>如果此牌已有<color=#FFFFFFFF>「坚忍标记」</color>，则消耗所有<color=#FFFFFFFF>「坚忍标记」</color>，使此伤害+1，并且每消耗1点<color=#FFFFFFFF>「坚忍标记」</color>就抓1张牌。\\n（<color=#FFFFFFFF>「{SPRITE_PRESET#3203}双手剑」角色</color>才能装备。角色最多装备1件「{SPRITE_PRESET#3003}武器」）";
  playingDescription "<color=#FFFFFFFF>所附属角色受到伤害时：</color>如可能，$[K56]1张$[K3002]最高的手牌，以抵消1点伤害，然后累积1点<color=#FFFFFFFF>「坚忍标记」</color>。（每回合最多触发2次）\\n<color=#FFFFFFFF>角色造成伤害时：</color>如果此牌已有<color=#FFFFFFFF>「坚忍标记」</color>，则消耗所有<color=#FFFFFFFF>「坚忍标记」</color>，使此伤害+1，并且每消耗1点<color=#FFFFFFFF>「坚忍标记」</color>就抓1张牌。";
  cost DiceType.Aligned, 2;
  weapon claymore {
    tags barrier;
    variable barrierUsage, 0;
    variable stoic, 0;
    on decreaseDamaged {
      when :( :player.hands.length > 0 );
      usage perRound, 2;
      :discardMaxCostHands(1);
      :e.decreaseDamage(1);
      :variables.stoic += 1;
    };
    on increaseSkillDamage {
      when :( :variables.stoic > 0 );
      :e.increaseDamage(1);
      :drawCards(:variables.stoic);
      :variables.stoic = 0;
    };
  };
};

/**
 * @id 311509
 * @name 船坞长剑
 * @description
 * 所附属角色受到伤害时：如可能，舍弃1张当前元素骰费用最高的手牌，以抵消1点伤害，然后累积1点「团结」。（每回合最多触发2次）
 * 角色造成伤害时：如果此牌已有「团结」，则消耗所有「团结」，使此伤害+1，并且每消耗1点「团结」就抓1张牌。
 * （「单手剑」角色才能装备。角色最多装备1件「武器」）
 */
define card {
  id 311509 as TheDockhandsAssistant;
  description "<color=#FFFFFFFF>所附属角色受到伤害时：</color>如可能，$[K56]1张$[K3002]最高的手牌，以抵消1点伤害，然后累积1点<color=#FFFFFFFF>「团结」</color>。（每回合最多触发2次）\\n<color=#FFFFFFFF>角色造成伤害时：</color>如果此牌已有<color=#FFFFFFFF>「团结」</color>，则消耗所有<color=#FFFFFFFF>「团结」</color>，使此伤害+1，并且每消耗1点<color=#FFFFFFFF>「团结」</color>就抓1张牌。\\n（<color=#FFFFFFFF>「{SPRITE_PRESET#3205}单手剑」角色</color>才能装备。角色最多装备1件「{SPRITE_PRESET#3003}武器」）";
  playingDescription "<color=#FFFFFFFF>所附属角色受到伤害时：</color>如可能，$[K56]1张$[K3002]最高的手牌，以抵消1点伤害，然后累积1点<color=#FFFFFFFF>「团结」</color>。（每回合最多触发2次）\\n<color=#FFFFFFFF>角色造成伤害时：</color>如果此牌已有<color=#FFFFFFFF>「团结」</color>，则消耗所有<color=#FFFFFFFF>「团结」</color>，使此伤害+1，并且每消耗1点<color=#FFFFFFFF>「团结」</color>就抓1张牌。";
  cost DiceType.Aligned, 2;
  weapon sword {
    tags barrier;
    variable barrierUsage, 0;
    variable solidarity, 0;
    on decreaseDamaged {
      when :( :player.hands.length > 0 );
      usage perRound, 2;
      :discardMaxCostHands(1);
      :e.decreaseDamage(1);
      :variables.solidarity += 1;
    };
    on increaseSkillDamage {
      when :( :variables.solidarity > 0 );
      :e.increaseDamage(1);
      :drawCards(:variables.solidarity);
      :variables.solidarity = 0;
    };
  };
};
