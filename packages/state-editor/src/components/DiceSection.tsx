import { For, createMemo, type Accessor } from "solid-js";
import type { Draft } from "immer";
import type { GameState } from "@gi-tcg/core";
import { Surface } from "./Fields";
import { DiceIcon } from "./DiceIcon";
import { ListItem, type ListItemButton } from "./ListItem";
import { DICE_LABELS, DICE_OPTIONS } from "../constants";
import { useStateEditorContext } from "./GameStateEditor";
import { usePlayer } from "./PlayerInfoSection";

export function DiceSection() {
  const { gameState } = useStateEditorContext();
  const { who, player } = usePlayer();

  const diceCounts = createMemo(() => {
    const counts: Record<number, number> = {};
    for (const dice of player().dice) {
      counts[dice] = (counts[dice] || 0) + 1;
    }
    return counts;
  });

  const sortedDice = createMemo(() => {
    return [...player().dice].sort((a, b) => a - b);
  });

  return (
    <Surface title={`玩家 ${who()} 骰子`}>
      <p class="mt-1 text-xs text-slate-300/80">{`※ 最多 ${gameState().config.maxDiceCount} 个，当前 ${player().dice.length} 个`}</p>
      <div class="space-y-6">
        <div>
          <div class="text-sm text-slate-400 mb-2">已有骰子</div>
          <div class="grid grid-cols-8">
            <For each={sortedDice()}>
              {(dice) => (
                <div class="flex justify-center">
                  <DiceIcon type={dice} />
                </div>
              )}
            </For>
          </div>
          {sortedDice().length === 0 && (
            <div class="text-center text-slate-500 py-4">暂无骰子</div>
          )}
        </div>

        <div>
          <div class="text-sm text-slate-400 mb-2">数量编辑</div>
          <div class="grid grid-cols-2 gap-3">
            <For each={DICE_OPTIONS}>
              {(diceType) => (
                <DiceTypeListItem
                  diceType={diceType}
                  count={() => diceCounts()[diceType] || 0}
                />
              )}
            </For>
          </div>
        </div>
      </div>
    </Surface>
  );
}

interface DiceTypeListItemProps {
  diceType: number;
  count: Accessor<number>;
}

function DiceTypeListItem(props: DiceTypeListItemProps) {
  const { updateState } = useStateEditorContext();
  const { who } = usePlayer();

  const applyDiceCount = (draft: Draft<GameState>, nextCount: number) => {
    const target = draft.players[who()];
    const currentCount = target.dice.filter(
      (dice: number) => dice === props.diceType,
    ).length;

    if (nextCount > currentCount) {
      const toAdd = nextCount - currentCount;
      const availableSpace = draft.config.maxDiceCount - target.dice.length;
      const actualAdd = Math.min(toAdd, availableSpace);
      for (let i = 0; i < actualAdd; i++) {
        target.dice.push(props.diceType);
      }
      return;
    }

    if (nextCount < currentCount) {
      const toRemove = currentCount - nextCount;
      let removed = 0;
      target.dice = target.dice.filter((dice: number) => {
        if (dice === props.diceType && removed < toRemove) {
          removed++;
          return false;
        }
        return true;
      });
    }
  };

  const increment = (draft: Draft<GameState>) => {
    applyDiceCount(draft, props.count() + 1);
  };

  const decrement = (draft: Draft<GameState>) => {
    applyDiceCount(draft, props.count() - 1);
  };

  const fill = (draft: Draft<GameState>) => {
    const target = draft.players[who()];
    const currentCount = target.dice.filter(
      (dice: number) => dice === props.diceType,
    ).length;
    const availableSpace = draft.config.maxDiceCount - target.dice.length;
    const maxPerType = 16;
    const canAdd = Math.min(maxPerType - currentCount, availableSpace);
    for (
      let i = 0;
      i < canAdd && target.dice.length < draft.config.maxDiceCount;
      i++
    ) {
      target.dice.push(props.diceType);
    }
  };

  const buttons: ListItemButton[] = [
    { content: "+", col: 0, onClick: () => updateState(increment) },
    { content: "-", col: 0, onClick: () => updateState(decrement) },
    {
      content: "加满",
      col: 1,
      variant: "primary",
      onClick: () => updateState(fill),
    },
  ];

  return (
    <ListItem
      title={DICE_LABELS[props.diceType]}
      description={`数量: ${props.count()}`}
      buttonColumns={2}
      buttons={buttons}
    />
  );
}
