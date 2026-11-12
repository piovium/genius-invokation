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

import {
  DiceType,
  type CombatStatusHandle,
  type SummonHandle,
} from "#custom-data-loader";

/**
 * @id 312015
 * @name 海祇之冠
 * @cost 1*Aligned
 * @description
 * 我方角色每受到1点实际治疗，此牌就累积1个「海染泡沫」。（最多累积6个）
 * 角色造成伤害时：消耗所有「海染泡沫」，每消耗3个都使造成的伤害+1。
 * （角色最多装备1件「圣遗物」）
 */
define card {
  id 312015;
  description "我方角色每受到1点实际治疗，累积1个海染泡沫（最多6个）。角色造成伤害时消耗全部泡沫，每3个使伤害+1。";
  cost DiceType.Aligned, 1;
  artifact {
    variable bubble, 0 { range 6; };
    on healed {
      listenTo samePlayer;
      :variables.bubble += :e.value;
    };
    on increaseSkillDamage {
      :e.increaseDamage(Math.floor(:variables.bubble / 3));
      :variables.bubble = 0;
    };
  };
};

/**
 * @id 312016
 * @name 海染砗磲
 * @cost 3*Void
 * @description
 * 入场时：治疗所附属角色3点。
 * 我方角色每受到1点实际治疗，此牌就累积1个「海染泡沫」。（最多累积6个）
 * 角色造成伤害时：消耗所有「海染泡沫」，每消耗3个都使造成的伤害+1。
 * （角色最多装备1件「圣遗物」）
 */
define card {
  id 312016;
  description "入场时治疗所附属角色3点。我方角色每受到1点实际治疗，累积1个海染泡沫（最多6个）。角色造成伤害时消耗全部泡沫，每3个使伤害+1。";
  cost DiceType.Void, 3;
  artifact {
    variable bubble, 0 { range 6; };
    on staged {
      :heal(3, :e.targets[0]);
    };
    on healed {
      listenTo samePlayer;
      :variables.bubble += :e.value;
    };
    on increaseSkillDamage {
      :e.increaseDamage(Math.floor(:variables.bubble / 3));
      :variables.bubble = 0;
    };
  };
};

const elements = ["冰", "水", "火", "雷"];
const pairs = elements.flatMap((a, i) =>
  elements.slice(i + 1).map((b, offset) => ({
    key: `${i},${i + offset + 1}`,
    text: `${a}、${b}`,
  })),
);

/**
 * @name 元素声明
 * @description
 * 我方声明冰、水、火、雷中的两种不同元素，再由对方选择其中一种。
 */
define combatStatus {
  name "元素声明" as ElementDeclaration;
  variable fatui, 0;
  variable stage, 0;
  on selfEnter {
    :selectOption("声明两种元素由对方选择其一：", pairs);
  };
  on selectOption {
    listenTo myself;
    if (:variables.stage === 0) {
      :variables.stage = 1;
      const chosen = :e.selectedKey.split(",").map(Number);
      :selectOption(
        `对方已声明${chosen.map((i) => elements[i]).join("、")}，请选择一种`,
        chosen.map((i) => ({ key: String(i), text: elements[i] })),
        "opp",
      );
    } else {
      const element = Number(:e.selectedKey);
      if (:variables.fatui) {
        :combatStatus((303216 + element) as CombatStatusHandle, "opp");
      } else {
        :summon((303211 + element) as SummonHandle);
      }
      :dispose();
    }
  };
};

/**
 * @id 332015
 * @name 深渊的呼唤
 * @cost 2*Aligned
 * @description
 * 从冰、水、火、雷中声明两种不同元素，由对方选择其中一种，召唤对应的「丘丘人」召唤物。
 * 召唤物在结束阶段造成1点对应元素伤害，可用次数：2。
 * （牌组包含至少2个「魔物」角色，才能加入牌组）
 */
define card {
  id 332015;
  description "声明冰、水、火、雷中的两种元素，由对方选择其中一种，召唤对应的丘丘人（2次可用次数）。牌组包含至少2个魔物角色才能加入。";
  cost DiceType.Aligned, 2;
  :combatStatus(ElementDeclaration);
};

/**
 * @id 332016
 * @name 愚人众的阴谋
 * @cost 2*Aligned
 * @description
 * 从冰、水、火、雷中声明两种不同元素，由对方选择其中一种，在对方场上生成对应的「愚人众伏兵」。
 * 所在阵营的角色使用技能后：对所在阵营的出战角色造成1点对应元素伤害。（每回合1次）
 * 可用次数：2
 * （牌组包含至少2个「愚人众」角色，才能加入牌组）
 */
define card {
  id 332016;
  description "声明冰、水、火、雷中的两种元素，由对方选择其中一种，在对方场上生成对应的愚人众伏兵（2次可用次数，每回合1次）。牌组包含至少2个愚人众角色才能加入。";
  cost DiceType.Aligned, 2;
  :combatStatus(ElementDeclaration, "my", {
    overrideVariables: { fatui: 1 },
  });
};
