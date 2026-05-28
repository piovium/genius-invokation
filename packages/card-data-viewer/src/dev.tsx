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

import { onMount } from "solid-js";
import { createCardDataViewer } from ".";
import { render } from "solid-js/web";
import { AssetsManager } from "@gi-tcg/assets-manager";

function App() {
  const enAssetsManager = new AssetsManager({ language: "CHS" });
  const { CardDataViewer, showCharacter, showState, showCard, showSkill } =
    createCardDataViewer({
      assetsManager: () => enAssetsManager,
      locale: () => "zh-CN"
    });
  onMount(() => {
    showState(
      "character",
      {
        id: -500001,
        definitionId: 1212,
        aura: 0,
        defeated: false,
        health: 5,
        maxHealth: 100,
        energy: 2,
        maxEnergy: 2,
        tags: 0,
        entity: [
          {
            id: -500002,
            definitionId: 312015,
            hasUsagePerRound: false,
            variableName: "usage",
            variableValue: 3,
            equipment: 1,
            definitionCost: [],
            tags: 0,
            type: 2,
            descriptionDictionary: {
              "[GCG_TOKEN_SHIELD]": "1",
            },
            attachment: [],
          },
        ],
      },
      [
        {
          id: -500003,
          definitionId: 111,
          variableName: "shield",
          variableValue: 1,
          hasUsagePerRound: true,
          descriptionDictionary: {},
          definitionCost: [],
          tags: 0,
          type: 0,
          attachment: [],
        },
      ],
    );
    // showState("card", {
    //   id: -5000001,
    //   definitionId: 330005,
    //   definitionCost: [],
    //   descriptionDictionary: {
    //     "[T]": "2",
    //   },
    //   tags: 0,
    //   hasUsagePerRound: false,
    //   type: 3,
    //   attachment: [
    //     {
    //       id: -5000002,
    //       definitionId: 204,
    //       descriptionDictionary: {},
    //       variableName: "usage",
    //       variableValue: 1,
    //     },
    //   ],
    // });
    showState("entity", {
      id: -5000001,
      definitionId: 113041,
      definitionCost: [],
      tags: 0,
      descriptionDictionary: {},
      hasUsagePerRound: false,
      variableName: "usage",
      variableValue: 2,
      type: 4,
      attachment: []
    });
    // showCard(212111);
    // showCharacter(1610);
    // showSkill(12111);
  });
  return <CardDataViewer />;
}

render(() => <App />, document.querySelector("#root")!);
