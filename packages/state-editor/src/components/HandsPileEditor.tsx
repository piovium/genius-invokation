import { For, createMemo, createSignal, type Accessor } from "solid-js";

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
        autoClose
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
            {(card, index) => (
              <PileCardListItem who={props.who} card={card} index={index()} />
            )}
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

interface PileCardListItemProps {
  who: 0 | 1;
  card: EntityState;
  index: number;
}

function PileCardListItem(props: PileCardListItemProps) {
  const { updateState, openModal } = useStateEditorContext();

  const moveUp = (draft: Draft<GameState>) => {
    draft.players[props.who].pile = moveInArray(
      draft.players[props.who].pile,
      props.index,
      -1,
    );
  };

  const moveDown = (draft: Draft<GameState>) => {
    draft.players[props.who].pile = moveInArray(
      draft.players[props.who].pile,
      props.index,
      1,
    );
  };

  const moveToHands = (draft: Draft<GameState>) => {
    const target = draft.players[props.who];
    if (target.hands.length >= draft.config.maxHandsCount) {
      return;
    }
    const [item] = target.pile.splice(props.index, 1);
    if (item) {
      target.hands.push(item);
    }
  };

  const remove = (draft: Draft<GameState>) => {
    draft.players[props.who].pile.splice(props.index, 1);
  };

  const buttons: ListItemButton[] = [
    {
      content: "上移",
      col: 0,
      onClick: () => updateState(moveUp),
    },
    {
      content: "加入手牌",
      col: 0,
      onClick: () => updateState(moveToHands),
    },
    {
      content: "下移",
      col: 0,
      onClick: () => updateState(moveDown),
    },
    {
      content: "详情",
      col: 1,
      variant: "primary",
      onClick: () => {
        openModal(() => (
          <EntityModal who={props.who} area="pile" entityId={props.card.id} />
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

  return (
    <ListItem
      imageSrc={getImageUrl(props.card.definition, "card")}
      imageMode="card"
      title={getDefinitionName(props.card.definition)}
      description={`ID: ${props.card.id}`}
      definition={props.card.definition}
      tags={detailBadges(props.card)}
      buttonColumns={2}
      buttons={buttons}
    />
  );
}

export function HandsEditor(props: CollectionContentProps) {
  const { updateState, openModal } = useStateEditorContext();

  const player = () => getPlayer(props.state, props.who);

  const openAddCardModal = () => {
    openModal(() => (
      <AddCardModal
        autoClose
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

  return (
    <Surface title={`玩家 ${props.who} 手牌编辑`}>
      <p class="mt-1 text-xs text-slate-300/80">※ 排列顺序为加入手牌顺序</p>
      <p class="mt-1 text-xs text-slate-300/80">
        ※ 移动、装备等操作仅为移动实体位置，无法触发任何入场效果
      </p>
      <div class="space-y-4">
        <div class="space-y-2">
          <For each={player().hands}>
            {(card, index) => (
              <HandsCardListItem who={props.who} card={card} index={index()} />
            )}
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

interface HandsCardListItemProps {
  who: 0 | 1;
  card: EntityState;
  index: number;
}

function HandsCardListItem(props: HandsCardListItemProps) {
  const { gameState, updateState, openModal } = useStateEditorContext();
  const player = () => getPlayer(gameState(), props.who);

  const equipTargets = createMemo(() => {
    if (props.card.definition.type !== "equipment") {
      return [] as CharacterState[];
    }

    const allChars = [...player().characters];
    return player().characters.filter(
      (character) =>
        canEquipToCharacter(props.card, character, allChars).canEquip,
    );
  });

  const moveUp = (draft: Draft<GameState>) => {
    draft.players[props.who].hands = moveInArray(
      draft.players[props.who].hands,
      props.index,
      -1,
    );
  };

  const moveDown = (draft: Draft<GameState>) => {
    draft.players[props.who].hands = moveInArray(
      draft.players[props.who].hands,
      props.index,
      1,
    );
  };

  const returnToPile = (draft: Draft<GameState>) => {
    const target = draft.players[props.who];
    if (target.pile.length >= draft.config.maxPileCount) {
      return;
    }
    const [item] = target.hands.splice(props.index, 1);
    if (item) {
      target.pile.push(item);
    }
  };

  const moveToSupports = (draft: Draft<GameState>) => {
    const target = draft.players[props.who];
    if (target.supports.length >= draft.config.maxSupportsCount) {
      return;
    }
    const [item] = target.hands.splice(props.index, 1);
    if (item) {
      target.supports.push(item);
    }
  };

  const remove = (draft: Draft<GameState>) => {
    draft.players[props.who].hands.splice(props.index, 1);
  };

  const equipToCharacter = (
    draft: Draft<GameState>,
    who: 0 | 1,
    cardIndex: number,
    characterId: number,
    replaceExisting: boolean,
  ) => {
    const target = draft.players[who];
    const [item] = target.hands.splice(cardIndex, 1);
    if (!item) return;

    const destination = target.characters.find(
      (character) => character.id === characterId,
    );
    if (!destination) return;

    if (replaceExisting) {
      const eqType = getEquipmentType(item.definition);
      const existingIndex = destination.entities.findIndex(
        (entity) =>
          entity.definition.type === "equipment" &&
          getEquipmentType(entity.definition) === eqType,
      );
      if (existingIndex !== -1) {
        destination.entities.splice(existingIndex, 1);
      }
    }

    destination.entities.push(item);
  };

  const handleEquip = (characterId: number) => {
    const targetWho = props.who;
    const cardIndex = props.index;
    const destination = player().characters.find(
      (character) => character.id === characterId,
    );
    if (!destination) {
      return;
    }

    const eqType = getEquipmentType(props.card.definition);
    const existingEquipment = getExistingEquipmentOfType(destination, eqType);

    if (existingEquipment) {
      openModal(() => (
        <ConfirmModal
          title="覆盖装备"
          message={`角色已装备${getDefinitionName(existingEquipment.definition as EntityDefinition)}，是否覆盖？`}
          confirmText="确认覆盖"
          cancelText="取消"
          onConfirm={() => {
            updateState((draft) =>
              equipToCharacter(draft, targetWho, cardIndex, characterId, true),
            );
          }}
        />
      ));
      return;
    }

    updateState((draft) =>
      equipToCharacter(draft, targetWho, cardIndex, characterId, false),
    );
  };

  const buttons = createMemo<ListItemButton[]>(() => {
    const next: ListItemButton[] = [
      {
        content: "上移",
        col: 1,
        onClick: () => updateState(moveUp),
      },
      {
        content: "放回牌库",
        col: 1,
        onClick: () => updateState(returnToPile),
      },
      {
        content: "下移",
        col: 1,
        onClick: () => updateState(moveDown),
      },
      {
        content: "详情",
        col: 2,
        variant: "primary",
        onClick: () => {
          openModal(() => (
            <EntityModal
              who={props.who}
              area="hands"
              entityId={props.card.id}
            />
          ));
        },
      },
      {
        content: "移除",
        col: 2,
        variant: "danger",
        onClick: () => updateState(remove),
      },
    ];

    if (props.card.definition.type === "support") {
      next.push({
        content: "移到支援区",
        col: 0,
        variant: "use",
        onClick: () => updateState(moveToSupports),
      });
    }

    for (const character of equipTargets()) {
      next.push({
        content: `装备给${getDefinitionName({ id: character.definition.id })}`,
        col: 0,
        variant: "use",
        onClick: () => handleEquip(character.id),
      });
    }

    return next;
  });

  return (
    <ListItem
      imageSrc={getImageUrl(props.card.definition, "card")}
      imageMode="card"
      title={getDefinitionName(props.card.definition)}
      description={`ID: ${props.card.id}`}
      definition={props.card.definition}
      tags={detailBadges(props.card)}
      buttonColumns={3}
      buttons={buttons()}
    />
  );
}
