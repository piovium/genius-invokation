import { For, createSignal } from "solid-js";

import type {
  GameState,
  EntityDefinition,
  EntityState,
  CharacterState,
  EntityTag,
} from "@gi-tcg/core";

import { ActionButton, Surface } from "./Fields";
import { ListItem, type ListItemButton } from "./ListItem";
import { AddCardModal } from "./AddCardModal";
import {
  allocateId,
  createEntityState,
  getDefinitionName,
  getImageUrl,
  getPlayer,
  moveInArray,
  shuffleList,
  type EditorCatalog,
  type EditorModal,
  type UpdateGameState,
} from "../state";
import { ConfirmModal } from "./ConfirmModal";
import type { Draft } from "immer";
import { useStateEditorContext } from "./GameStateEditor";
import { EntityModal } from "./EntityModal";

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
  return (
    character.definition.tags.find((tag) =>
      ["sword", "claymore", "pole", "catalyst", "bow"].includes(tag),
    ) || null
  );
}

// 检查装备是否可以装备到角色
function canEquipToCharacter(
  equipment: EntityState,
  character: CharacterState,
  allCharacters: CharacterState[],
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
      if (!equipment.definition.tags.includes(characterWeapon as EntityTag)) {
        return { canEquip: false, reason: `需要${characterWeapon}类型武器` };
      }
      return { canEquip: true };
    }

    case "talent": {
      // 天赋只能装备给对应的角色
      // 注意：这里假设装备卡的ID与角色ID有关联
      // 实际游戏中天赋卡的relatedCharacterId应该与角色definition.id匹配
      const relatedCharId = Number(
        equipment.definition.id.toString().slice(1, -1),
      );
      if (character.definition.id !== relatedCharId) {
        // 检查这个角色是否在当前存活角色列表中
        const targetExists = allCharacters.some(
          (c) => c.definition.id === relatedCharId && isCharacterAlive(c),
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
  equipmentType: EquipmentType,
): EntityState | null {
  return (
    character.entities.find((entity) => {
      if (entity.definition.type !== "equipment") return false;
      return getEquipmentType(entity.definition) === equipmentType;
    }) || null
  );
}

interface CollectionContentProps {
  state: GameState;
  who: 0 | 1;
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

export function PileEditor(props: CollectionContentProps) {
  const { updateState, openModal } = useStateEditorContext();

  const player = () => getPlayer(props.state, props.who);
  const [insertPosition, setInsertPosition] = createSignal<"start" | "end">(
    "end",
  );

  const openAddCardModal = (position: "start" | "end") => {
    setInsertPosition(position);
    openModal(() => (
      <AddCardModal
        onSelect={handleAddCard}
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
    ));
  };

  const handleAddCard = (definition: EntityDefinition) => {
    const who = props.who;
    const insertPos = insertPosition();
    updateState((draft) => {
      const target = draft.players[who];
      if (target.pile.length >= draft.config.maxPileCount) {
        return;
      }
      const newCard = createEntityState(
        definition,
        allocateId(draft),
      ) as Draft<EntityState>;
      if (insertPos === "start") {
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
              const who = props.who;
              updateState((draft) => {
                draft.players[who].pile = shuffleList(draft.players[who].pile);
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
                    const who = props.who;
                    const i = index();
                    updateState((draft) => {
                      draft.players[who].pile = moveInArray(
                        draft.players[who].pile,
                        i,
                        -1,
                      );
                    });
                  },
                },
                {
                  content: "加入手牌",
                  col: 0,
                  onClick: () => {
                    const who = props.who;
                    const i = index();
                    updateState((draft) => {
                      const target = draft.players[who];
                      if (target.hands.length >= draft.config.maxHandsCount) {
                        return;
                      }
                      const [item] = target.pile.splice(i, 1);
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
                    const who = props.who;
                    const i = index();
                    updateState((draft) => {
                      draft.players[who].pile = moveInArray(
                        draft.players[who].pile,
                        i,
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
                  onClick: () => {
                    openModal(() => (
                      <EntityModal
                        who={props.who}
                        area="pile"
                        entityId={card.id}
                      />
                    ));
                  },
                },
                {
                  content: "移除",
                  col: 1,
                  variant: "danger",
                  onClick: () => {
                    const who = props.who;
                    const i = index();
                    updateState((draft) => {
                      draft.players[who].pile.splice(i, 1);
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
                  definition={card.definition}
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
      </div>
    </Surface>
  );
}

export function HandsEditor(props: CollectionContentProps) {
  const { updateState, openModal } = useStateEditorContext();

  const player = () => getPlayer(props.state, props.who);

  const openAddCardModal = () => {
    openModal(() => (
      <AddCardModal
        onSelect={handleAddCard}
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
    ));
  };

  const handleAddCard = (definition: EntityDefinition) => {
    const who = props.who;
    updateState((draft) => {
      const target = draft.players[who];
      if (target.hands.length >= draft.config.maxHandsCount) {
        return;
      }
      target.hands.push(
        createEntityState(definition, allocateId(draft)) as Draft<EntityState>,
      );
    });
  };

  // 处理装备操作
  const handleEquip = (
    cardIndex: number,
    characterId: number,
    equipment: EntityState,
    character: CharacterState,
  ) => {
    const eqType = getEquipmentType(equipment.definition);
    const existingEquipment = getExistingEquipmentOfType(character, eqType);
    const who = props.who;

    if (existingEquipment) {
      // 已有同类型装备，显示确认对话框
      openModal(() => (
        <ConfirmModal
          title="覆盖装备"
          message={`角色已装备${getDefinitionName(existingEquipment.definition as EntityDefinition)}，是否覆盖？`}
          confirmText="确认覆盖"
          cancelText="取消"
          onConfirm={() => {
            // 执行装备操作
            updateState((draft) => {
              const target = draft.players[who];
              const [item] = target.hands.splice(cardIndex, 1);
              if (!item) return;

              const destination = target.characters.find(
                (c) => c.id === characterId,
              );
              if (!destination) return;

              // 移除已有的同类型装备
              const existingIndex = destination.entities.findIndex(
                (e) =>
                  e.definition.type === "equipment" &&
                  getEquipmentType(e.definition) === eqType,
              );
              if (existingIndex !== -1) {
                destination.entities.splice(existingIndex, 1);
              }

              // 添加新装备
              destination.entities.push(item);
            });
          }}
        />
      ));
    } else {
      // 直接装备
      updateState((draft) => {
        const target = draft.players[who];
        const [item] = target.hands.splice(cardIndex, 1);
        if (!item) return;

        const destination = target.characters.find((c) => c.id === characterId);
        destination?.entities.push(item);
      });
    }
  };

  return (
    <Surface title={`玩家 ${props.who} 手牌编辑`}>
      <p class="mt-1 text-xs text-slate-300/80">※ 排列顺序为加入手牌顺序</p>
      <p class="mt-1 text-xs text-slate-300/80">
        ※ 移动、装备等操作仅为移动实体位置，无法触发任何入场效果
      </p>
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
                    const who = props.who;
                    const i = index();
                    updateState((draft) => {
                      draft.players[who].hands = moveInArray(
                        draft.players[who].hands,
                        i,
                        -1,
                      );
                    });
                  },
                },
                {
                  content: "放回牌库",
                  col: 1,
                  onClick: () => {
                    const who = props.who;
                    const i = index();
                    updateState((draft) => {
                      const target = draft.players[who];
                      if (target.pile.length >= draft.config.maxPileCount) {
                        return;
                      }
                      const [item] = target.hands.splice(i, 1);
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
                    const who = props.who;
                    const i = index();
                    updateState((draft) => {
                      draft.players[who].hands = moveInArray(
                        draft.players[who].hands,
                        i,
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
                  onClick: () => {
                    openModal(() => (
                      <EntityModal
                        who={props.who}
                        area="hands"
                        entityId={card.id}
                      />
                    ));
                  },
                },
                {
                  content: "移除",
                  col: 2,
                  variant: "danger",
                  onClick: () => {
                    const who = props.who;
                    const i = index();
                    updateState((draft) => {
                      draft.players[who].hands.splice(i, 1);
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
                    const who = props.who;
                    const i = index();
                    updateState((draft) => {
                      const target = draft.players[who];
                      if (
                        target.supports.length >= draft.config.maxSupportsCount
                      ) {
                        return;
                      }
                      const [item] = target.hands.splice(i, 1);
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
                    allChars,
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
                  definition={card.definition}
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
          onClick={() => openAddCardModal()}
          disabled={player().hands.length >= props.state.config.maxHandsCount}
          class="w-full flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-white/20 bg-transparent px-3 py-3 text-sm text-slate-400 hover:border-white/40 hover:text-slate-300 hover:bg-white/5 transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <span class="text-lg">+</span>
          <span>追加手牌</span>
        </button>
      </div>
    </Surface>
  );
}
