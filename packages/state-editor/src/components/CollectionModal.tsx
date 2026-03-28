import { For, Show, createSignal } from "solid-js";

import type { GameState, EntityDefinition } from "@gi-tcg/core";

import { ActionButton, Surface, SectionTitle } from "./Fields";
import { Modal } from "./Modal";
import { ListItem, type ListItemButton } from "./ListItem";
import { AddCardModal } from "./AddCardModal";
import {
  allocateId,
  createEntityState,
  getCharacter,
  getDefinitionName,
  getImageUrl,
  getPlayer,
  moveInArray,
  shuffleList,
  type EditorCatalog,
  type EditorModal,
  type UpdateGameState,
} from "../state";

interface CollectionModalProps {
  open: boolean;
  state: GameState;
  who: 0 | 1;
  catalog: EditorCatalog;
  updateState: UpdateGameState;
  openModal: (modal: EditorModal) => void;
  onClose: () => void;
}

interface CollectionContentProps {
  state: GameState;
  who: 0 | 1;
  catalog: EditorCatalog;
  updateState: UpdateGameState;
  openModal: (modal: EditorModal) => void;
}

function detailBadges(card: {
  attachments: readonly unknown[];
  variables: Record<string, number>;
}) {
  return [
    `变量 ${Object.keys(card.variables).length}`,
    `附着 ${card.attachments.length}`,
  ];
}

// Content component for Pile (non-modal version)
export function PileModalContent(props: CollectionContentProps) {
  const player = () => getPlayer(props.state, props.who);
  const [addCardModalOpen, setAddCardModalOpen] = createSignal(false);
  const [insertPosition, setInsertPosition] = createSignal<"start" | "end">(
    "end",
  );

  const openAddCardModal = (position: "start" | "end") => {
    setInsertPosition(position);
    setAddCardModalOpen(true);
  };

  const handleAddCard = (definition: EntityDefinition) => {
    props.updateState((draft) => {
      const target = draft.players[props.who];
      if (target.pile.length >= draft.config.maxPileCount) {
        return;
      }
      const newCard = createEntityState(
        definition,
        allocateId(draft),
      ) as unknown as (typeof target.pile)[number];
      if (insertPosition() === "start") {
        target.pile.unshift(newCard);
      } else {
        target.pile.push(newCard);
      }
    });
  };

  return (
    <Surface title={`玩家 ${props.who} 牌库编辑`}>
      <div class="space-y-4">
        <div class="flex flex-wrap gap-2">
          <ActionButton
            label="随机洗牌"
            tone="accent"
            disabled={player().pile.length < 2}
            onClick={() => {
              props.updateState((draft) => {
                draft.players[props.who].pile = shuffleList(
                  draft.players[props.who].pile,
                );
              });
            }}
          />
        </div>
        {/* 列表开头的新增按钮 */}
        <button
          type="button"
          onClick={() => openAddCardModal("start")}
          disabled={player().pile.length >= props.state.config.maxPileCount}
          class="w-full flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-white/20 bg-transparent px-3 py-3 text-sm text-slate-400 hover:border-white/40 hover:text-slate-300 hover:bg-white/5 transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <span class="text-lg">+</span>
          <span>在牌堆顶部追加卡牌</span>
        </button>

        <div class="space-y-2">
          <For each={player().pile}>
            {(card, index) => {
              const buttons: ListItemButton[] = [
                // 第一列
                {
                  content: "上移",
                  col: 0,
                  onClick: () => {
                    props.updateState((draft) => {
                      draft.players[props.who].pile = moveInArray(
                        draft.players[props.who].pile,
                        index(),
                        -1,
                      );
                    });
                  },
                },
                {
                  content: "加入手牌",
                  col: 0,
                  onClick: () => {
                    props.updateState((draft) => {
                      const target = draft.players[props.who];
                      if (target.hands.length >= draft.config.maxHandsCount) {
                        return;
                      }
                      const [item] = target.pile.splice(index(), 1);
                      if (item) {
                        target.hands.push(item);
                      }
                    });
                  },
                },
                {
                  content: "下移",
                  col: 0,
                  onClick: () => {
                    props.updateState((draft) => {
                      draft.players[props.who].pile = moveInArray(
                        draft.players[props.who].pile,
                        index(),
                        1,
                      );
                    });
                  },
                },
                // 第二列
                {
                  content: "详情",
                  col: 1,
                  variant: "primary",
                  onClick: () =>
                    props.openModal({
                      kind: "entity",
                      who: props.who,
                      area: "pile",
                      entityId: card.id,
                    }),
                },
                {
                  content: "移除",
                  col: 1,
                  variant: "danger",
                  onClick: () => {
                    props.updateState((draft) => {
                      draft.players[props.who].pile.splice(index(), 1);
                    });
                  },
                },
              ];

              return (
                <ListItem
                  imageSrc={getImageUrl(card.definition, "card")}
                  imageMode="card"
                  title={getDefinitionName(card.definition)}
                  description={`ID: ${card.id}`}
                  tags={detailBadges(card)}
                  buttonColumns={2}
                  buttons={buttons}
                />
              );
            }}
          </For>
        </div>

        {/* 列表末尾的新增按钮 */}
        <button
          type="button"
          onClick={() => openAddCardModal("end")}
          disabled={player().pile.length >= props.state.config.maxPileCount}
          class="w-full flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-white/20 bg-transparent px-3 py-3 text-sm text-slate-400 hover:border-white/40 hover:text-slate-300 hover:bg-white/5 transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <span class="text-lg">+</span>
          <span>在牌堆底部追加卡牌</span>
        </button>

        {/* AddCardModal */}
        <AddCardModal
          open={addCardModalOpen()}
          state={props.state}
          catalog={props.catalog}
          onSelect={handleAddCard}
          onClose={() => setAddCardModalOpen(false)}
          availableTypes={["eventCard", "equipment", "support"]} // 牌库只能添加这些类型的实体
          availableTags={[
            "legend",
            "action",
            "food",
            "resonance",
            "talent",
            "artifact",
            "technique",
            "weapon",
            "sword",
            "claymore",
            "pole",
            "catalyst",
            "bow",
            "ally",
            "place",
            "item",
            "blessing",
          ]}
        />
      </div>
    </Surface>
  );
}

// Content component for Hands (non-modal version)
export function HandsModalContent(props: CollectionContentProps) {
  const player = () => getPlayer(props.state, props.who);
  const [addCardModalOpen, setAddCardModalOpen] = createSignal(false);

  const handleAddCard = (definition: EntityDefinition) => {
    props.updateState((draft) => {
      const target = draft.players[props.who];
      if (target.hands.length >= draft.config.maxHandsCount) {
        return;
      }
      target.hands.push(
        createEntityState(
          definition,
          allocateId(draft),
        ) as unknown as (typeof target.hands)[number],
      );
    });
  };

  return (
    <Surface title={`玩家 ${props.who} 手牌编辑`}>
      <div class="space-y-4">
        {/* 新增按钮 */}
        <button
          type="button"
          onClick={() => setAddCardModalOpen(true)}
          disabled={player().hands.length >= props.state.config.maxHandsCount}
          class="w-full flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-white/20 bg-transparent px-3 py-3 text-sm text-slate-400 hover:border-white/40 hover:text-slate-300 hover:bg-white/5 transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <span class="text-lg">+</span>
          <span>追加手牌</span>
        </button>

        <div class="space-y-2">
          <For each={player().hands}>
            {(card, index) => {
              const buttons: ListItemButton[] = [
                // 第一列
                {
                  content: "上移",
                  col: 0,
                  onClick: () => {
                    props.updateState((draft) => {
                      draft.players[props.who].hands = moveInArray(
                        draft.players[props.who].hands,
                        index(),
                        -1,
                      );
                    });
                  },
                },
                {
                  content: "下移",
                  col: 0,
                  onClick: () => {
                    props.updateState((draft) => {
                      draft.players[props.who].hands = moveInArray(
                        draft.players[props.who].hands,
                        index(),
                        1,
                      );
                    });
                  },
                },
                // 第二列
                {
                  content: "详情",
                  col: 1,
                  variant: "primary",
                  onClick: () =>
                    props.openModal({
                      kind: "entity",
                      who: props.who,
                      area: "hands",
                      entityId: card.id,
                    }),
                },
                {
                  content: "移除",
                  col: 1,
                  variant: "danger",
                  onClick: () => {
                    props.updateState((draft) => {
                      draft.players[props.who].hands.splice(index(), 1);
                    });
                  },
                },
              ];

              // 支援牌可以移到支援区
              if (card.definition.type === "support") {
                buttons.push({
                  content: "移到支援区",
                  col: 0,
                  onClick: () => {
                    props.updateState((draft) => {
                      const target = draft.players[props.who];
                      if (
                        target.supports.length >= draft.config.maxSupportsCount
                      ) {
                        return;
                      }
                      const [item] = target.hands.splice(index(), 1);
                      if (item) {
                        target.supports.push(item);
                      }
                    });
                  },
                });
              }

              // 装备牌可以装备到角色
              if (card.definition.type === "equipment") {
                player().characters.forEach((character) => {
                  buttons.push({
                    content: `装备到 ${getCharacter(player(), character.id)?.definition.id ?? character.id}`,
                    col: 0,
                    onClick: () => {
                      props.updateState((draft) => {
                        const target = draft.players[props.who];
                        const [item] = target.hands.splice(index(), 1);
                        if (!item) {
                          return;
                        }
                        const destination = target.characters.find(
                          (current) => current.id === character.id,
                        );
                        destination?.entities.push(item);
                      });
                    },
                  });
                });
              }

              return (
                <ListItem
                  imageSrc={getImageUrl(card.definition, "card")}
                  imageMode="card"
                  title={getDefinitionName(card.definition)}
                  description={`ID: ${card.id}`}
                  tags={detailBadges(card)}
                  buttonColumns={2}
                  buttons={buttons}
                />
              );
            }}
          </For>
        </div>

        {/* AddCardModal */}
        <AddCardModal
          open={addCardModalOpen()}
          state={props.state}
          catalog={props.catalog}
          onSelect={handleAddCard}
          onClose={() => setAddCardModalOpen(false)}
        />
      </div>
    </Surface>
  );
}

// Modal versions (keeping for backwards compatibility if needed)
export function PileModal(props: CollectionModalProps) {
  return (
    <Modal
      open={props.open}
      title={`玩家 ${props.who} 牌库编辑`}
      onClose={props.onClose}
    >
      <PileModalContent
        state={props.state}
        who={props.who}
        catalog={props.catalog}
        updateState={props.updateState}
        openModal={props.openModal}
      />
    </Modal>
  );
}

export function HandsModal(props: CollectionModalProps) {
  return (
    <Modal
      open={props.open}
      title={`玩家 ${props.who} 手牌编辑`}
      onClose={props.onClose}
    >
      <HandsModalContent
        state={props.state}
        who={props.who}
        catalog={props.catalog}
        updateState={props.updateState}
        openModal={props.openModal}
      />
    </Modal>
  );
}
