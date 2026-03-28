import { For, Show, createSignal, createMemo } from "solid-js";

import type { GameState, EntityDefinition, EntityState, CharacterState } from "@gi-tcg/core";

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

// 装备类型定义
type EquipmentType = "artifact" | "technique" | "weapon" | "talent" | "other";

// 获取装备的分类类型
function getEquipmentType(definition: EntityDefinition): EquipmentType {
  if (definition.tags.includes("artifact")) return "artifact";
  if (definition.tags.includes("technique")) return "technique";
  if (definition.tags.includes("weapon")) return "weapon";
  if (definition.tags.includes("talent")) return "talent";
  return "other";
}

// 检查角色是否存活
function isCharacterAlive(character: CharacterState): boolean {
  return character.variables.alive !== 0;
}

// 获取角色的武器类型标签
function getCharacterWeaponTag(character: CharacterState): string | null {
  return character.definition.tags.find(tag => 
    ["sword", "claymore", "pole", "catalyst", "bow"].includes(tag)
  ) || null;
}

// 检查装备是否可以装备到角色
function canEquipToCharacter(
  equipment: EntityState,
  character: CharacterState,
  allCharacters: CharacterState[]
): { canEquip: boolean; reason?: string } {
  const eqType = getEquipmentType(equipment.definition);
  
  // 1. 检查角色是否存活
  if (!isCharacterAlive(character)) {
    return { canEquip: false, reason: "角色已倒下" };
  }

  // 2. 根据装备类型判断
  switch (eqType) {
    case "artifact":
    case "technique":
      // 圣遗物和特技可以装备给所有存活角色
      return { canEquip: true };
      
    case "weapon": {
      // 武器只能装备给对应武器类型的角色
      const characterWeapon = getCharacterWeaponTag(character);
      if (!characterWeapon) {
        return { canEquip: false, reason: "角色没有武器类型" };
      }
      if (!equipment.definition.tags.includes(characterWeapon as any)) {
        return { canEquip: false, reason: `需要${characterWeapon}类型武器` };
      }
      return { canEquip: true };
    }
      
    case "talent": {
      // 天赋只能装备给对应的角色
      // 注意：这里假设装备卡的ID与角色ID有关联
      // 实际游戏中天赋卡的relatedCharacterId应该与角色definition.id匹配
      const relatedCharId = Number(equipment.definition.id.toString().slice(1, -1));
      if (character.definition.id !== relatedCharId) {
        // 检查这个角色是否在当前存活角色列表中
        const targetExists = allCharacters.some(
          c => c.definition.id === relatedCharId && isCharacterAlive(c)
        );
        if (targetExists) {
          return { canEquip: false, reason: "天赋只能装备给指定角色" };
        } else {
          return { canEquip: false, reason: "对应角色不在场上或已倒下" };
        }
      }
      return { canEquip: true };
    }
      
    default:
      return { canEquip: true };
  }
}

// 获取角色已装备的同类型装备
function getExistingEquipmentOfType(
  character: CharacterState,
  equipmentType: EquipmentType
): EntityState | null {
  return character.entities.find(entity => {
    if (entity.definition.type !== "equipment") return false;
    return getEquipmentType(entity.definition) === equipmentType;
  }) || null;
}

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
  
  // 确认对话框状态
  const [confirmDialog, setConfirmDialog] = createSignal<{
    open: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
  }>({
    open: false,
    title: "",
    message: "",
    onConfirm: () => {},
    onCancel: () => {},
  });

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
  
  // 处理装备操作
  const handleEquip = (
    cardIndex: number,
    characterId: number,
    equipment: EntityState,
    character: CharacterState
  ) => {
    const eqType = getEquipmentType(equipment.definition);
    const existingEquipment = getExistingEquipmentOfType(character, eqType);
    
    if (existingEquipment) {
      // 已有同类型装备，显示确认对话框
      setConfirmDialog({
        open: true,
        title: "覆盖装备",
        message: `角色已装备${getDefinitionName(existingEquipment.definition as EntityDefinition)}，是否覆盖？`,
        onConfirm: () => {
          // 执行装备操作
          props.updateState((draft) => {
            const target = draft.players[props.who];
            const [item] = target.hands.splice(cardIndex, 1);
            if (!item) return;
            
            const destination = target.characters.find(
              (c) => c.id === characterId
            );
            if (!destination) return;
            
            // 移除已有的同类型装备
            const existingIndex = destination.entities.findIndex(
              (e) => e.definition.type === "equipment" && 
                     getEquipmentType(e.definition as any) === eqType
            );
            if (existingIndex !== -1) {
              destination.entities.splice(existingIndex, 1);
            }
            
            // 添加新装备
            destination.entities.push(item);
          });
          setConfirmDialog((prev) => ({ ...prev, open: false }));
        },
        onCancel: () => {
          setConfirmDialog((prev) => ({ ...prev, open: false }));
        },
      });
    } else {
      // 直接装备
      props.updateState((draft) => {
        const target = draft.players[props.who];
        const [item] = target.hands.splice(cardIndex, 1);
        if (!item) return;
        
        const destination = target.characters.find(
          (c) => c.id === characterId
        );
        destination?.entities.push(item);
      });
    }
  };

  return (
    <Surface title={`玩家 ${props.who} 手牌编辑`}>
      <p class="mt-1 text-xs text-slate-300/80">※ 排列顺序为加入手牌顺序</p>
      <p class="mt-1 text-xs text-slate-300/80">※ 移动、装备等操作仅为移动实体位置，无法触发任何入场效果</p>
      <div class="space-y-4">
        <div class="space-y-2">
          <For each={player().hands}>
            {(card, index) => {
              const buttons: ListItemButton[] = [
                // 第一列
                {
                  content: "上移",
                  col: 1,
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
                  content: "放回牌库",
                  col: 1,
                  onClick: () => {
                    props.updateState((draft) => {
                      const target = draft.players[props.who];
                      if (target.pile.length >= draft.config.maxPileCount) {
                        return;
                      }
                      const [item] = target.hands.splice(index(), 1);
                      if (item) {
                        target.pile.push(item);
                      }
                    });
                  },
                },
                {
                  content: "下移",
                  col: 1,
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
                  col: 2,
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
                  col: 2,
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
                  variant: "use",
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

              // 装备牌可以装备到角色（带详细规则）
              if (card.definition.type === "equipment") {
                const allChars = [...player().characters];
                player().characters.forEach((character) => {
                  const checkResult = canEquipToCharacter(
                    card,
                    character,
                    allChars
                  );
                  
                  if (checkResult.canEquip) {
                    const buttonLabel = `装备给${getDefinitionName({ id: character.definition.id })}`;
                    buttons.push({
                      content: buttonLabel,
                      col: 0,
                      variant: "use",
                      onClick: () => {
                        handleEquip(index(), character.id, card, character);
                      },
                    });
                  }
                });
              }

              return (
                <ListItem
                  imageSrc={getImageUrl(card.definition, "card")}
                  imageMode="card"
                  title={getDefinitionName(card.definition)}
                  description={`ID: ${card.id}`}
                  tags={detailBadges(card)}
                  buttonColumns={3}
                  buttons={buttons}
                />
              );
            }}
          </For>
        </div>
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
        
        {/* 确认对话框 */}
        <Modal
          open={confirmDialog().open}
          title={confirmDialog().title}
          onClose={confirmDialog().onCancel}
        >
          <div class="space-y-4">
            <p class="text-sm text-slate-300">{confirmDialog().message}</p>
            <div class="flex justify-end gap-3">
              <button
                type="button"
                onClick={confirmDialog().onCancel}
                class="px-4 py-2 rounded-xl border border-white/20 bg-slate-800 text-sm text-slate-300 hover:bg-slate-700 transition"
              >
                取消
              </button>
              <button
                type="button"
                onClick={confirmDialog().onConfirm}
                class="px-4 py-2 rounded-xl border border-rose-500/50 bg-rose-500/20 text-sm text-rose-100 hover:bg-rose-500/30 transition"
              >
                确认覆盖
              </button>
            </div>
          </div>
        </Modal>
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
