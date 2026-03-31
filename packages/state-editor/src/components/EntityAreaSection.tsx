import { For, Show, createMemo, createSignal, type Accessor } from "solid-js";
import type { Draft } from "immer";
import type { GameState, EntityState, EntityDefinition, EntityType, EntityTag } from "@gi-tcg/core";
import { Surface } from "./Fields";
import { DiceIcon } from "./DiceIcon";
import { ListItem, type ListItemButton } from "./ListItem";
import { AddCardModal } from "./AddCardModal";
import { ConfirmModal } from "./ConfirmModal";
import { useStateEditorContext } from "./GameStateEditor";
import { EntityModal } from "./EntityModal";
import { usePlayer } from "./PlayerInfoSection";
import { DICE_LABELS, DICE_OPTIONS } from "../constants";
import { allocateId, createEntityState } from "../state/factory";
import { getDefinitionName, getEntityVisibleVarBadges } from "../state/catalog";
import { moveInArray } from "../utils";
import { getImageUrl } from "../state/assets";

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

interface EntityAreaSectionProps {
  title: string;
  description?: string;
  area: "supports" | "summons" | "combatStatuses";
  mode: "card" | "icon";
  limit?: number;
  availableTags?: EntityTag[];
}

export function EntityAreaSection(props: EntityAreaSectionProps) {
  const { openModal, updateState } = useStateEditorContext();
  const { who, player } = usePlayer();
  const items = () => player()[props.area];

  const [pendingDefinition, setPendingDefinition] = createSignal<
    EntityDefinition | undefined
  >(void 0);
  const [existingEntityIndex, setExistingEntityIndex] =
    createSignal<number>(-1);

  const entityType = (): EntityType => {
    switch (props.area) {
      case "supports":
        return "support";
      case "summons":
        return "summon";
      case "combatStatuses":
        return "combatStatus";
    }
  };

  const checkDuplicate = (definition: EntityDefinition) => {
    return items().findIndex(
      (item) => item.definition.id === definition.id,
    );
  };

  const handleAddCheck = (definition: EntityDefinition, done: () => void) => {
    if (props.area === "supports") {
      doAdd(definition);
      done();
      return;
    }

    const duplicateIndex = checkDuplicate(definition);
    if (duplicateIndex !== -1) {
      setPendingDefinition(definition);
      setExistingEntityIndex(duplicateIndex);
      confirmOverride(done);
      return;
    }
    doAdd(definition);
    done();
  };

  const doAdd = (definition: EntityDefinition) => {
    const whoV = who();
    const area = props.area;
    const limit = props.limit;
    updateState((draft) => {
      const target = draft.players[whoV][area];
      if (typeof limit === "number" && target.length >= limit) {
        return;
      }
      target.push(createEntityState(definition, allocateId(draft)));
    });
  };

  const doReplace = (definition: EntityDefinition, index: number) => {
    const whoV = who();
    const area = props.area;
    updateState((draft) => {
      const target = draft.players[whoV][area];
      target[index] = createEntityState(definition, allocateId(draft));
    });
  };

  const appendEntity = () => {
    openModal(() => {
      // eslint-disable-next-line no-unassigned-vars
      let ref!: HTMLDialogElement;
      return (
        <AddCardModal
          ref={ref}
          onSelect={(def) => {
            handleAddCheck(def, () => ref.close());
          }}
          type={entityType()}
          showTypeFilter={false}
          availableTags={props.availableTags}
          showTagFilter={!!props.availableTags}
          maxResults={200}
        />
      );
    });
  };

  const confirmOverride = (done: () => void) => {
    openModal(() => (
      <ConfirmModal
        title="检测到重复实体"
        message={
          pendingDefinition()
            ? `区域中已存在相同类型的实体「${getDefinitionName(pendingDefinition())}」，是否覆盖？`
            : ""
        }
        confirmText="确认覆盖"
        cancelText="取消"
        onConfirm={() => {
          done();
          handleConfirmReplace();
        }}
        onCancel={handleCancelReplace}
      />
    ));
  };

  const handleConfirmReplace = () => {
    const definition = pendingDefinition();
    const index = existingEntityIndex();
    if (definition && index !== -1) {
      doReplace(definition, index);
    }
    setPendingDefinition(void 0);
    setExistingEntityIndex(-1);
  };

  const handleCancelReplace = () => {
    setPendingDefinition(void 0);
    setExistingEntityIndex(-1);
  };

  return (
    <Surface title={props.title}>
      <Show when={props.description}>
        <p class="mt-1 text-xs text-slate-300/80">{`※ ${props.description}`}</p>
      </Show>
      <div class="space-y-4">
        <div class="space-y-2">
          <For each={items()}>
            {(entity, index) => (
              <EntityAreaListItem
                area={props.area}
                mode={props.mode}
                entity={entity}
                index={index}
              />
            )}
          </For>
        </div>
        <button
          type="button"
          onClick={() => appendEntity()}
          disabled={
            typeof props.limit === "number" && items().length >= props.limit
          }
          class="w-full flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-white/20 bg-transparent px-3 py-3 text-sm text-slate-400 hover:border-white/40 hover:text-slate-300 hover:bg-white/5 transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <span class="text-lg">+</span>
          <span>追加{props.title}</span>
        </button>
      </div>
    </Surface>
  );
}

interface EntityAreaListItemProps {
  area: "supports" | "summons" | "combatStatuses";
  mode: "card" | "icon";
  entity: EntityState;
  index: Accessor<number>;
}

function EntityAreaListItem(props: EntityAreaListItemProps) {
  const { updateState, openModal } = useStateEditorContext();
  const { who } = usePlayer();

  const moveUp = (draft: Draft<GameState>) => {
    draft.players[who()][props.area] = moveInArray(
      draft.players[who()][props.area],
      props.index(),
      -1,
    );
  };

  const moveDown = (draft: Draft<GameState>) => {
    draft.players[who()][props.area] = moveInArray(
      draft.players[who()][props.area],
      props.index(),
      1,
    );
  };

  const remove = (draft: Draft<GameState>) => {
    draft.players[who()][props.area].splice(props.index(), 1);
  };

  const returnToHands = (draft: Draft<GameState>) => {
    const target = draft.players[who()];
    if (target.hands.length >= draft.config.maxHandsCount) {
      return;
    }
    const [item] = target.supports.splice(props.index(), 1);
    if (item) {
      target.hands.push(item);
    }
  };

  const buttons = createMemo<ListItemButton[]>(() => {
    const next: ListItemButton[] = [
      { content: "上移", col: 0, onClick: () => updateState(moveUp) },
      { content: "下移", col: 0, onClick: () => updateState(moveDown) },
      {
        content: "详情",
        col: 1,
        variant: "primary",
        onClick: () => {
          openModal(() => (
            <EntityModal
              who={who()}
              area={props.area}
              entity={props.entity}
            />
          ));
        },
      },
      {
        content: "移除",
        col: 1,
        variant: "danger",
        onClick: () => updateState(remove),
      },
    ];

    if (props.area === "supports") {
      next.splice(1, 0, {
        content: "放回手牌",
        col: 0,
        onClick: () => updateState(returnToHands),
      });
    }

    return next;
  });

  return (
    <ListItem
      imageSrc={getImageUrl(
        props.entity.definition,
        props.mode === "card" ? "card" : "icon",
      )}
      imageMode={props.mode}
      title={getDefinitionName(props.entity.definition)}
      description={`ID: ${props.entity.id}`}
      definition={props.entity.definition}
      tags={getEntityVisibleVarBadges(props.entity)}
      buttonColumns={2}
      buttons={buttons()}
    />
  );
}
