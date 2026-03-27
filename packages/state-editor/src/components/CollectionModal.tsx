import { For, Show } from "solid-js";

import type { GameState } from "@gi-tcg/core";

import { ActionButton, SearchableSelect } from "./Fields";
import { Modal } from "./Modal";
import { PreviewTile } from "./Previews";
import {
  allocateId,
  createEntityState,
  getCharacter,
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

function detailBadges(card: { attachments: readonly unknown[]; variables: Record<string, number> }) {
  return [
    `变量 ${Object.keys(card.variables).length}`,
    `附着 ${card.attachments.length}`,
  ];
}

export function PileModal(props: CollectionModalProps) {
  const player = () => getPlayer(props.state, props.who);

  return (
    <Modal open={props.open} title={`玩家 ${props.who} 牌库编辑`} onClose={props.onClose}>
      <div class="space-y-4">
        <div class="flex flex-wrap gap-2">
          <ActionButton
            label="随机洗牌"
            tone="accent"
            disabled={player().pile.length < 2}
            onClick={() => {
              props.updateState((draft) => {
                draft.players[props.who].pile = shuffleList(draft.players[props.who].pile);
              });
            }}
          />
        </div>
        <SearchableSelect
          label="追加卡牌"
          options={props.catalog.cardEntities}
          buttonText="加入牌库"
          disabled={player().pile.length >= props.state.config.maxPileCount}
          onSelect={(option) => {
            props.updateState((draft) => {
              const target = draft.players[props.who];
              if (target.pile.length >= draft.config.maxPileCount) {
                return;
              }
              target.pile.push(
                createEntityState(option.definition, allocateId(draft)) as unknown as typeof target.pile[number],
              );
            });
          }}
        />
        <div class="gi-editor-preview-grid">
          <For each={player().pile}>
            {(card, index) => (
              <PreviewTile
                definition={card.definition}
                mode="card"
                badges={detailBadges(card)}
                subtitle={`状态 ID #${card.id}`}
                onClick={() =>
                  props.openModal({
                    kind: "entity",
                    who: props.who,
                    area: "pile",
                    entityId: card.id,
                  })
                }
                actions={
                  <>
                    <ActionButton
                      label="详情"
                      onClick={() =>
                        props.openModal({
                          kind: "entity",
                          who: props.who,
                          area: "pile",
                          entityId: card.id,
                        })
                      }
                    />
                    <ActionButton
                      label="上移"
                      disabled={index() === 0}
                      onClick={() => {
                        props.updateState((draft) => {
                          draft.players[props.who].pile = moveInArray(
                            draft.players[props.who].pile,
                            index(),
                            -1,
                          );
                        });
                      }}
                    />
                    <ActionButton
                      label="下移"
                      disabled={index() === player().pile.length - 1}
                      onClick={() => {
                        props.updateState((draft) => {
                          draft.players[props.who].pile = moveInArray(
                            draft.players[props.who].pile,
                            index(),
                            1,
                          );
                        });
                      }}
                    />
                    <ActionButton
                      label="抽到手牌"
                      disabled={player().hands.length >= props.state.config.maxHandsCount}
                      onClick={() => {
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
                      }}
                    />
                    <ActionButton
                      label="移除"
                      tone="danger"
                      onClick={() => {
                        props.updateState((draft) => {
                          draft.players[props.who].pile.splice(index(), 1);
                        });
                      }}
                    />
                  </>
                }
              />
            )}
          </For>
        </div>
      </div>
    </Modal>
  );
}

export function HandsModal(props: CollectionModalProps) {
  const player = () => getPlayer(props.state, props.who);

  return (
    <Modal open={props.open} title={`玩家 ${props.who} 手牌编辑`} onClose={props.onClose}>
      <div class="space-y-4">
        <SearchableSelect
          label="追加卡牌"
          options={props.catalog.cardEntities}
          buttonText="加入手牌"
          disabled={player().hands.length >= props.state.config.maxHandsCount}
          onSelect={(option) => {
            props.updateState((draft) => {
              const target = draft.players[props.who];
              if (target.hands.length >= draft.config.maxHandsCount) {
                return;
              }
              target.hands.push(
                createEntityState(option.definition, allocateId(draft)) as unknown as typeof target.hands[number],
              );
            });
          }}
        />
        <div class="gi-editor-preview-grid">
          <For each={player().hands}>
            {(card, index) => (
              <PreviewTile
                definition={card.definition}
                mode="card"
                badges={detailBadges(card)}
                subtitle={`状态 ID #${card.id}`}
                onClick={() =>
                  props.openModal({
                    kind: "entity",
                    who: props.who,
                    area: "hands",
                    entityId: card.id,
                  })
                }
                actions={
                  <>
                    <ActionButton
                      label="详情"
                      onClick={() =>
                        props.openModal({
                          kind: "entity",
                          who: props.who,
                          area: "hands",
                          entityId: card.id,
                        })
                      }
                    />
                    <ActionButton
                      label="上移"
                      disabled={index() === 0}
                      onClick={() => {
                        props.updateState((draft) => {
                          draft.players[props.who].hands = moveInArray(
                            draft.players[props.who].hands,
                            index(),
                            -1,
                          );
                        });
                      }}
                    />
                    <ActionButton
                      label="下移"
                      disabled={index() === player().hands.length - 1}
                      onClick={() => {
                        props.updateState((draft) => {
                          draft.players[props.who].hands = moveInArray(
                            draft.players[props.who].hands,
                            index(),
                            1,
                          );
                        });
                      }}
                    />
                    <Show when={card.definition.type === "support"}>
                      <ActionButton
                        label="移到支援区"
                        disabled={player().supports.length >= props.state.config.maxSupportsCount}
                        onClick={() => {
                          props.updateState((draft) => {
                            const target = draft.players[props.who];
                            if (target.supports.length >= draft.config.maxSupportsCount) {
                              return;
                            }
                            const [item] = target.hands.splice(index(), 1);
                            if (item) {
                              target.supports.push(item);
                            }
                          });
                        }}
                      />
                    </Show>
                    <Show when={card.definition.type === "equipment"}>
                      <For each={player().characters}>
                        {(character) => (
                          <ActionButton
                            label={`装备到 ${getCharacter(player(), character.id)?.definition.id ?? character.id}`}
                            onClick={() => {
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
                            }}
                          />
                        )}
                      </For>
                    </Show>
                    <ActionButton
                      label="移除"
                      tone="danger"
                      onClick={() => {
                        props.updateState((draft) => {
                          draft.players[props.who].hands.splice(index(), 1);
                        });
                      }}
                    />
                  </>
                }
              />
            )}
          </For>
        </div>
      </div>
    </Modal>
  );
}
