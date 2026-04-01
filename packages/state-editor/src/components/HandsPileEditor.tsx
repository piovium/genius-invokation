import { For, createMemo, createSignal } from "solid-js";

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
import { ConfirmModal } from "./ConfirmModal";
import { AddButton } from "./AddButton";
import type { Draft } from "immer";
import { useStateEditorContext } from "./GameStateEditor";
import { EntityModal } from "./EntityModal";
import { getEquipmentInvalidity, getEquipmentType, moveInArray, shuffleList, type EquipmentType } from "../utils";
import {
  getDefinitionName,
  getEntityItemDescription,
  getEntityVisibleVarBadges,
} from "../state/catalog";
import { allocateId, createEntityState } from "../state/factory";
import { getImageUrl } from "../state/assets";
import { getPlayer, getCharacter } from "../state/common";

// 检查角色是否存活
function isCharacterAlive(character: CharacterState): boolean {
  return character.variables.alive !== 0;
}

// 检查装备是否可以装备到角色
function canEquipToCharacter(
  equipment: EntityState,
  character: CharacterState,
): { canEquip: boolean; reason?: string } {
  const invalidity = getEquipmentInvalidity(
    equipment.definition,
    character.definition,
  );
  if (!isCharacterAlive(character)) {
    return { canEquip: false, reason: "角色已倒下" };
  }
  return {
    canEquip: !invalidity,
    reason:
      invalidity === "talent" ? "天赋只能装备给指定角色" : "武器类型不匹配",
  };
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

function detailBadges(card: EntityState) {
  const badges = getEntityVisibleVarBadges(card);
  badges.push(`附着 ${card.attachments.length}`);
  return badges;
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
        type="cardEntities"
        availableTags={
          [
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
          ] satisfies EntityTag<"equipment" | "support" | "eventCard">[]
        }
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
        <AddButton
          label="在牌堆顶部追加卡牌"
          disabled={player().pile.length >= props.state.config.maxPileCount}
          onClick={() => openAddCardModal("start")}
        />

        <div class="space-y-2">
          <For each={player().pile}>
            {(card, index) => (
              <PileCardListItem who={props.who} card={card} index={index()} />
            )}
          </For>
        </div>

        {/* 列表末尾的新增按钮 */}
        <AddButton
          label="在牌堆底部追加卡牌"
          disabled={player().pile.length >= props.state.config.maxPileCount}
          onClick={() => openAddCardModal("end")}
        />
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
          <EntityModal who={props.who} area="pile" entity={props.card} />
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
      description={getEntityItemDescription(props.card)}
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
        type="cardEntities" // 牌库只能添加这些类型的实体
        availableTags={
          [
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
          ] satisfies EntityTag<"equipment" | "support" | "eventCard">[]
        }
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
        <AddButton
          label="追加手牌"
          disabled={player().hands.length >= props.state.config.maxHandsCount}
          onClick={() => openAddCardModal()}
        />
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

    const allChars = player().characters.filter((character) => !!character);
    return allChars.filter(
      (character) =>
        character && canEquipToCharacter(props.card, character).canEquip,
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

    const destination = getCharacter(draft, characterId);
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
    const destination = getCharacter(gameState(), characterId);
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
            <EntityModal who={props.who} area="hands" entity={props.card} />
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
      if (character) {
        next.push({
          content: `装备给${getDefinitionName(character.definition)}`,
          col: 0,
          variant: "use",
          onClick: () => handleEquip(character.id),
        });
      }
    }

    return next;
  });

  return (
    <ListItem
      imageSrc={getImageUrl(props.card.definition, "card")}
      imageMode="card"
      title={getDefinitionName(props.card.definition)}
      description={getEntityItemDescription(props.card)}
      definition={props.card.definition}
      tags={detailBadges(props.card)}
      buttonColumns={3}
      buttons={buttons()}
    />
  );
}
