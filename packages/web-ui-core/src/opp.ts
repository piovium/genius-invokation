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

import type { AssetsManager } from "@gi-tcg/assets-manager";
import {
  type Notification,
  type PlayerIO,
  type RpcDispatcher,
} from "@gi-tcg/core";
import {
  dispatchRpc,
  PbDiceType,
  PbEntityState,
  PbGameState,
  PbPlayerState,
  PbPlayerStatus,
  PbSkillInfo,
} from "@gi-tcg/typings";
import { createActionState, type ActionState } from "./action";
import type { ChessboardViewType } from "./components/Chessboard";
import type { Translator } from "./locales";

export interface OppChessboardControllerOption {
  assetsManager: () => AssetsManager;
  t: Translator;
  who: 0 | 1;
  onUpdate: (info: OppInfo | null) => void;
}

export interface OppInfo {
  initiativeSkills: PbSkillInfo[];
  actionState: ActionState | null;
  viewType: ChessboardViewType;
  selectCardCandidates: number[];
}

export class OppChessboardController implements IOppChessboardController {
  #playerIo: PlayerIO;
  #close: boolean = true;
  #playerStatus: PbPlayerStatus = PbPlayerStatus.UNSPECIFIED;
  #actionState: ActionState | null = null;
  #dice: PbDiceType[] = [];
  #handCards: Map<number, PbEntityState> = new Map();
  #initiativeSkills: PbSkillInfo[] = [];
  #viewType: ChessboardViewType = "normal";
  #selectCardCandidates: number[] = [];

  get closed(): boolean {
    return this.#close;
  }

  get handCards() {
    return this.#handCards;
  }

  get who() {
    return this.opt.who;
  }

  private onUpdate() {
    if (!this.#close) {
      this.opt.onUpdate(this.getOppInfo());
    }
  }

  getOppInfo() {
    return {
      initiativeSkills: this.#initiativeSkills,
      actionState: this.#actionState,
      viewType: this.#viewType,
      selectCardCandidates: this.#selectCardCandidates,
    };
  }

  constructor(private readonly opt: OppChessboardControllerOption) {
    const rpcDispatcher: RpcDispatcher = {
      action: ({ action }) => {
        this.#actionState = createActionState(
          this.opt.assetsManager(),
          action,
          this.opt.t,
        );
        this.onUpdate();
        return Promise.reject("opp chessboard");
      },
      rerollDice: () => {
        this.#viewType = "rerollDice";
        this.onUpdate();
        return Promise.reject("opp chessboard");
      },
      chooseActive: () => {
        return Promise.reject("opp chessboard");
      },
      selectCard: ({ candidateDefinitionIds }) => {
        this.#viewType = "selectCard";
        this.#selectCardCandidates = candidateDefinitionIds;
        this.onUpdate();
        return Promise.reject("opp chessboard");
      },
      switchHands: () => {
        this.#viewType = "switchHands";
        this.onUpdate();
        return Promise.reject("opp chessboard");
      },
    };
    const rawRpc = dispatchRpc(rpcDispatcher);
    this.#playerIo = {
      notify: (notification: Notification) => {
        const state = notification.state!;
        this.#playerStatus = state.player[this.who].status;
        this.#dice = state.player[this.who].dice;
        this.#initiativeSkills = state.player[this.who].initiativeSkill;
        for (const hand of state.player[this.who].handCard) {
          this.#handCards.set(hand.id, hand);
        }
        if (this.#playerStatus === PbPlayerStatus.UNSPECIFIED) {
          this.#actionState = null;
          this.#viewType = "normal";
        }
        this.onUpdate();
      },
      rpc: (req) => {
        if (this.#close) {
          return Promise.reject("opp chessboard not open");
        } else {
          return rawRpc(req);
        }
      },
    };
  }

  mergeState(original: PbGameState): PbGameState {
    if (this.#close) {
      return original;
    }
    original.player[this.who].dice = this.#dice;
    const origHands = original.player[this.who].handCard;
    original.player[this.who].handCard = origHands.map((orig) => {
      const newCard = this.#handCards.get(orig.id);
      return newCard ? { ...orig, ...newCard } : orig;
    });
    return original;
  }

  open(): PlayerIO {
    this.#close = false;
    this.onUpdate();
    return this.#playerIo;
  }
  close(): void {
    this.opt.onUpdate(null);
    this.#close = true;
  }
}

export interface IOppChessboardController {
  readonly closed: boolean;
  open(): PlayerIO;
  close(): void;
}
