import { Match, Switch } from "solid-js";
import type { GameState, EntityTag } from "@gi-tcg/core";
import type { EditorSection } from "../types";
import { getPlayer } from "../state/common";
import { PlayerContext } from "./PlayerInfoSection";
import { DiceSection } from "./DiceSection";
import { EntityAreaSection } from "./EntityAreaSection";
import { PlayerInfoSection } from "./PlayerInfoSection";
import { DeckImportSection } from "./DeckImportSection";

interface PlayerSectionEditorProps {
  state: GameState;
  who: 0 | 1;
  kind: Extract<EditorSection, { who: 0 | 1 }>["kind"];
}

export function PlayerSectionEditor(props: PlayerSectionEditorProps) {
  const player = () => getPlayer(props.state, props.who);

  return (
    <PlayerContext.Provider
      value={{
        who: () => props.who,
        player,
      }}
    >
      <Switch>
        <Match when={props.kind === "supports"}>
          <EntityAreaSection
            title="支援区"
            area="supports"
            mode="card"
            limit={props.state.config.maxSupportsCount}
            availableTags={[
              "ally",
              "place",
              "item",
              "blessing",
              "adventureSpot",
            ] as EntityTag[]}
          />
        </Match>
        <Match when={props.kind === "summons"}>
          <EntityAreaSection
            title="召唤区"
            area="summons"
            mode="card"
            limit={props.state.config.maxSummonsCount}
            availableTags={["barrier"] satisfies EntityTag[]}
          />
        </Match>
        <Match when={props.kind === "combatStatuses"}>
          <EntityAreaSection
            title="出战状态"
            area="combatStatuses"
            mode="icon"
            availableTags={["shield", "barrier"] as EntityTag[]}
          />
        </Match>
        <Match when={props.kind === "dice"}>
          <DiceSection />
        </Match>
        <Match when={props.kind === "playerInfo"}>
          <PlayerInfoSection />
        </Match>
        <Match when={props.kind === "deckImport"}>
          <DeckImportSection />
        </Match>
      </Switch>
    </PlayerContext.Provider>
  );
}
