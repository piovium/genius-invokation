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

import "@gi-tcg/utils/reset.css";
import "virtual:uno.css";
import "./style.css";

import type { JSX } from "solid-js/jsx-runtime";
import {
  CardDataViewerContainer,
  type ViewerInput,
  type StateType,
} from "./CardDataViewer";
import { createMemo, createSignal, type Accessor } from "solid-js";
import type {
  PbAttachmentState,
  PbCharacterState,
  PbEntityState,
} from "@gi-tcg/typings";
import { AssetsContext, translations, type Locale } from "./context";
import {
  type AssetsManager,
  DEFAULT_ASSETS_MANAGER,
} from "@gi-tcg/assets-manager";
import { translator } from "@solid-primitives/i18n";

export interface RegisterResult {
  readonly CardDataViewer: () => JSX.Element;
  readonly showCharacter: (id: number) => void;
  readonly showSkill: (id: number) => void;
  readonly showCard: (id: number) => void;
  readonly showState: {
    (
      type: "character",
      character: PbCharacterState,
      combatStatuses: PbEntityState[],
    ): void;
    (type: "summon" | "support", entity: PbEntityState): void;
    (type: "card", card: PbEntityState): void;
  };
  readonly hide: () => void;
}

export interface CreateCardDataViewerOption {
  assetsManager?: Accessor<AssetsManager>;
  includesImage?: boolean;
  locale?: Accessor<Locale>;
}

export function createCardDataViewer(
  option: CreateCardDataViewerOption = {},
): RegisterResult {
  const localeGetter = createMemo(() => option.locale?.() ?? "zh-CN");
  const assetsManagerGetter = createMemo(() => option.assetsManager?.() ?? DEFAULT_ASSETS_MANAGER);
  const dict = createMemo(() => translations[localeGetter()]);

  const [shown, setShown] = createSignal(false);
  const [inputs, setInputs] = createSignal<ViewerInput[]>([]);

  const showDef = (definitionId: number, type: StateType) => {
    setInputs([
      {
        from: "definitionId",
        definitionId,
        type,
      },
    ]);
    setShown(true);
  };

  const mapStateToInput = (
    st: PbCharacterState | PbEntityState | PbAttachmentState,
    type: StateType,
  ): ViewerInput => ({
    from: "state",
    id: st.id,
    type,
    definitionId: st.definitionId,
    descriptionDictionary:
      "descriptionDictionary" in st ? st.descriptionDictionary : {},
    variableValue: "variableValue" in st ? st.variableValue : void 0,
  });

  return {
    CardDataViewer: () => (
      <AssetsContext.Provider
        value={{
          assetsManager: assetsManagerGetter,
          locale: localeGetter,
          t: translator(dict),
        }}
      >
        <CardDataViewerContainer
          shown={shown()}
          inputs={inputs()}
          includesImage={option.includesImage ?? false}
        />
      </AssetsContext.Provider>
    ),
    showCard: (id) => {
      showDef(id, "card");
    },
    showCharacter: (id) => {
      showDef(id, "character");
    },
    showSkill: (id) => {
      showDef(id, "skill");
    },
    showState: (
      type: StateType,
      state: PbCharacterState | PbEntityState,
      combatStatuses?: PbEntityState[],
    ) => {
      setInputs([
        // main item
        mapStateToInput(state, type),
        // character zone entities
        ...("entity" in state
          ? state.entity.map((st) =>
              mapStateToInput(st, st.equipment ? "equipment" : "status"),
            )
          : []),
        ...("attachment" in state
          ? state.attachment.map((st) => mapStateToInput(st, "attachment"))
          : []),
        // combat statuses (2nd argument)
        ...(combatStatuses ?? []).map((st) =>
          mapStateToInput(st, "combatStatus"),
        ),
      ]);
      setShown(true);
    },
    hide: () => {
      setShown(false);
    },
  };
}
