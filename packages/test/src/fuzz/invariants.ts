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
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

import type {
  AnyState,
  AttachmentState,
  CharacterState,
  EntityState,
  GameData,
  GameState,
} from "@gi-tcg/core";

/**
 * 对局状态不变量。每次 `onPause` 时对整个 `GameState` 检查一遍；
 * 硬规则违规使对局以 `invariant-violation` 失败，软规则只写入报告。
 */

export interface Violation {
  readonly rule: string;
  readonly path: string;
  readonly message: string;
  readonly soft: boolean;
}

const DECK_CARD_TYPES = ["eventCard", "equipment", "support"];
const AREA_TYPES: Record<string, readonly string[]> = {
  combatStatuses: ["combatStatus"],
  summons: ["summon"],
  supports: ["support"],
  hands: DECK_CARD_TYPES,
  pile: DECK_CARD_TYPES,
};

export function checkInvariants(
  state: GameState,
  data: GameData,
): Violation[] {
  const out: Violation[] = [];
  const add = (rule: string, path: string, message: string, soft = false) =>
    out.push({ rule, path, message, soft });
  const seenIds = new Map<number, string>();

  const checkVariables = (
    st: CharacterState | EntityState | AttachmentState,
    path: string,
  ) => {
    const configs = st.definition.varConfigs as Record<
      string,
      { lowerBound: number; upperBound: number }
    >;
    const variables = st.variables as Record<string, number>;
    for (const [name, cfg] of Object.entries(configs)) {
      const value = variables[name];
      if (typeof value !== "number") {
        add("var-missing", `${path}.variables.${name}`, `missing variable`);
        continue;
      }
      if (!Number.isInteger(value)) {
        add("var-bounds", `${path}.variables.${name}`, `not an integer: ${value}`);
      } else if (value < cfg.lowerBound || value > cfg.upperBound) {
        add(
          "var-bounds",
          `${path}.variables.${name}`,
          `${value} out of [${cfg.lowerBound}, ${cfg.upperBound}] (def ${st.definition.id})`,
        );
      }
    }
    for (const name of Object.keys(variables)) {
      if (!(name in configs)) {
        add("var-unknown", `${path}.variables.${name}`, `not in varConfigs`, true);
      }
    }
  };

  const checkId = (st: AnyState, path: string) => {
    if (!Number.isInteger(st.id) || st.id >= 0) {
      add("id-range", `${path}.id`, `entity id must be a negative integer: ${st.id}`);
    } else if (st.id <= state.iterators.id) {
      add(
        "id-range",
        `${path}.id`,
        `id ${st.id} not above iterators.id ${state.iterators.id}`,
      );
    }
    const prev = seenIds.get(st.id);
    if (prev !== undefined) {
      add("id-unique", `${path}.id`, `id ${st.id} also used at ${prev}`);
    } else {
      seenIds.set(st.id, path);
    }
  };

  const checkDefinition = (
    st: CharacterState | EntityState | AttachmentState,
    path: string,
  ) => {
    const def = st.definition;
    const map =
      def.__definition === "characters"
        ? data.characters
        : def.__definition === "entities"
          ? data.entities
          : data.attachments;
    if ((map as ReadonlyMap<number, unknown>).get(def.id) !== def) {
      add(
        "data-identity",
        `${path}.definition`,
        `definition ${def.id} (${def.__definition}) is not the registered object`,
      );
    }
  };

  const checkEntity = (st: EntityState, path: string, allowedTypes?: readonly string[]) => {
    checkId(st, path);
    checkDefinition(st, path);
    checkVariables(st, path);
    if (allowedTypes && !allowedTypes.includes(st.definition.type)) {
      add(
        "area-type",
        `${path}.definition.type`,
        `${st.definition.type} (def ${st.definition.id}) not allowed here`,
      );
    }
    st.attachments.forEach((att, i) => {
      const p = `${path}.attachments[${i}]`;
      checkId(att, p);
      checkDefinition(att, p);
      checkVariables(att, p);
    });
  };

  if (state.data !== data) {
    add("data-identity", "data", "state.data is not the campaign GameData");
  }
  const { iterators, config } = state;
  if (
    !Number.isInteger(iterators.random) ||
    iterators.random < 0 ||
    iterators.random >= 2147483647
  ) {
    add("iterators", "iterators.random", `bad random state ${iterators.random}`);
  }
  if (!Number.isInteger(iterators.id) || iterators.id >= 0) {
    add("iterators", "iterators.id", `bad id iterator ${iterators.id}`);
  }
  if (state.winner !== null && state.phase !== "gameEnd") {
    add("winner-phase", "winner", `winner ${state.winner} set while phase is ${state.phase}`);
  }
  if (state.roundNumber < 0 || state.roundNumber > config.maxRoundsCount + 1) {
    add("round", "roundNumber", `roundNumber ${state.roundNumber} out of range`);
  }

  state.players.forEach((player, who) => {
    const P = `players[${who}]`;
    if (player.who !== who) {
      add("player-who", `${P}.who`, `who is ${player.who}`);
    }
    const alive = new Set<number>();
    player.characters.forEach((ch, i) => {
      const p = `${P}.characters[${i}]`;
      checkId(ch, p);
      checkDefinition(ch, p);
      checkVariables(ch, p);
      const { health, alive: isAlive } = ch.variables;
      if (isAlive === 0 && health !== 0) {
        add("alive-health", `${p}.variables`, `defeated character has health ${health}`);
      }
      if (isAlive === 1 && health === 0) {
        add("alive-health", `${p}.variables`, `alive character has health 0`, true);
      }
      if (isAlive === 1) {
        alive.add(ch.id);
      }
      ch.entities.forEach((e, j) =>
        checkEntity(e, `${p}.entities[${j}]`, ["status", "equipment"]),
      );
    });
    const activeId = player.activeCharacterId;
    const inInit = state.phase === "initHands" || state.phase === "initActives";
    // 选出战角色之前 activeCharacterId 为 0；对局若在此之前结束（如 IoError）也保持 0
    if (activeId !== 0 || !(inInit || state.phase === "gameEnd")) {
      const active = player.characters.find((c) => c.id === activeId);
      if (!active) {
        add("active-valid", `${P}.activeCharacterId`, `active ${activeId} is not one of own characters`);
      } else if (
        !inInit &&
        state.phase !== "gameEnd" &&
        !player.defeatedSwitching &&
        alive.size > 0 &&
        !alive.has(activeId)
      ) {
        add("active-valid", `${P}.activeCharacterId`, `active character ${activeId} is defeated`, true);
      }
    }
    for (const [area, allowed] of Object.entries(AREA_TYPES)) {
      const list = player[area as keyof typeof AREA_TYPES & keyof typeof player] as readonly EntityState[];
      list.forEach((e, i) => checkEntity(e, `${P}.${area}[${i}]`, allowed));
    }
    const limits: [string, number, number][] = [
      ["hands", player.hands.length, config.maxHandsCount],
      ["pile", player.pile.length, config.maxPileCount],
      ["summons", player.summons.length, config.maxSummonsCount],
      ["supports", player.supports.length, config.maxSupportsCount],
      ["dice", player.dice.length, config.maxDiceCount],
    ];
    for (const [area, count, max] of limits) {
      if (count > max) {
        add("limits", `${P}.${area}`, `${count} exceeds ${max}`);
      }
    }
    player.dice.forEach((d, i) => {
      if (!Number.isInteger(d) || d < 1 || d > 8) {
        add("limits", `${P}.dice[${i}]`, `invalid dice value ${d}`);
      }
    });
  });
  return out;
}
