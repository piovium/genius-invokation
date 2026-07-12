import { DiceType, card } from "@gi-tcg/core/builder";

/**
 * @id 312018
 * @name 饰金之梦
 * @description
 * 入场时：生成1个所附属角色类型的元素骰。如果我方队伍中存在3种不同元素类型的角色，则额外生成1个万能元素。
 * 所附属角色为出战角色期间，敌方受到元素反应伤害时：抓1张牌。（每回合至多2次）
 * （角色最多装备1件「圣遗物」）
 */
define card {
  id 312018 as private GildedDreams;
  until "v4.4.0";
  cost DiceType.Void, 3;
  artifact {
    on enter {
      :generateDice(:self.master.element(), 1);
      const elementKinds = new Set(:$$("my characters include defeated").map((ch) => ch.element()));
      if (elementKinds.size >= 3) {
        :generateDice(DiceType.Omni, 1);
      }
    }
    on damaged {
      when :( !:e.target.isMine() && :self.master.isActive() && :e.getReaction() );
      listenTo all;
      usage perRound, 2;
      :drawCards(1);
    }
  }
}

/**
 * @id 321003
 * @name 群玉阁
 * @description
 * 投掷阶段：2个元素骰初始总是投出我方出战角色类型的元素。
 */
define card {
  id 321003 as JadeChamber;
  until "v4.4.0";
  support place {
    on roll {
      :e.fixDice(:$("my active")!.element(), 2);
    }
  }
}

/**
 * @id 321002
 * @name 骑士团图书馆
 * @description
 * 入场时：选择任意元素骰重投。
 * 投掷阶段：获得额外一次重投机会。
 */
define card {
  id 321002 as private KnightsOfFavoniusLibrary;
  until "v4.4.0";
  cost DiceType.Aligned, 1;
  support place {
    on enter {
      :rerollDice(1);
    }
    on roll {
      :e.addRerollCount(1);
    }
  }
}
