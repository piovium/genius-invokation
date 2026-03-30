import {
  For,
  Match,
  Show,
  Switch,
  createContext,
  createMemo,
  createSignal,
  useContext,
  type Accessor,
} from "solid-js";

import type {
  EntityState,
  EntityDefinition,
  EntityType,
  GameState,
  EntityTag,
  PlayerState,
} from "@gi-tcg/core";

import { ActionButton, BooleanField, SectionTitle, Surface } from "./Fields";
import { DiceIcon } from "./DiceIcon";
import { RoundSkillModal } from "./RoundSkillModal";
import { ListItem, type ListItemButton } from "./ListItem";
import { AddCardModal } from "./AddCardModal";
import { ConfirmModal } from "./ConfirmModal";
import {
  allocateId,
  buildImportedCharacterStates,
  buildImportedPileStates,
  createEntityState,
  decodeDeckShareCode,
  DICE_LABELS,
  DICE_OPTIONS,
  getDefinitionName,
  getImageUrl,
  getPlayer,
  moveInArray,
  type EditorSection,
} from "../state";
import type { Draft } from "immer";
import { useStateEditorContext } from "./GameStateEditor";
import { EntityModal } from "./EntityModal";

interface PlayerSectionEditorProps {
  state: GameState;
  who: 0 | 1;
  kind: Extract<EditorSection, { who: 0 | 1 }>["kind"];
}

function entityBadges(entity: EntityState) {
  return [
    `变量 ${Object.keys(entity.variables).length}`,
    `附着 ${entity.attachments.length}`,
  ];
}

interface PlayerContextValue {
  who: Accessor<0 | 1>;
  player: Accessor<PlayerState>;
}

const PlayerContext = createContext<PlayerContextValue>();
const usePlayer = () => useContext(PlayerContext)!;

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
            ]}
          />
        </Match>
        <Match when={props.kind === "summons"}>
          <EntityAreaSection
            title="召唤区"
            area="summons"
            mode="card"
            limit={props.state.config.maxSummonsCount}
            availableTags={["barrier"]}
          />
        </Match>
        <Match when={props.kind === "combatStatuses"}>
          <EntityAreaSection
            title="出战状态"
            area="combatStatuses"
            mode="icon"
            availableTags={["shield", "barrier"]}
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

// Dice section
const DiceSection = () => {
  const { gameState, updateState } = useStateEditorContext();
  const { who, player } = usePlayer();

  // 计算每种骰子的数量
  const diceCounts = createMemo(() => {
    const counts: Record<number, number> = {};
    for (const dice of player().dice) {
      counts[dice] = (counts[dice] || 0) + 1;
    }
    return counts;
  });

  // 按ID排序的骰子列表（用于显示图标）
  const sortedDice = createMemo(() => {
    return [...player().dice].sort((a, b) => a - b);
  });

  // 更新特定类型骰子的数量
  const updateDiceCount = (diceType: number, newCount: number) => {
    const whoV = who();
    updateState((draft) => {
      const target = draft.players[whoV];
      const currentCount = target.dice.filter((d) => d === diceType).length;

      if (newCount > currentCount) {
        // 添加骰子
        const toAdd = newCount - currentCount;
        const availableSpace = draft.config.maxDiceCount - target.dice.length;
        const actualAdd = Math.min(toAdd, availableSpace);
        for (let i = 0; i < actualAdd; i++) {
          target.dice.push(diceType);
        }
      } else if (newCount < currentCount) {
        // 移除骰子
        const toRemove = currentCount - newCount;
        let removed = 0;
        target.dice = target.dice.filter((d) => {
          if (d === diceType && removed < toRemove) {
            removed++;
            return false;
          }
          return true;
        });
      }
    });
  };

  // 加满特定类型的骰子
  const fillDice = (diceType: number) => {
    const whoV = who();
    updateState((draft) => {
      const target = draft.players[whoV];
      const currentCount = target.dice.filter((d) => d === diceType).length;
      const availableSpace = draft.config.maxDiceCount - target.dice.length;
      // 计算可以添加多少个（最多补到某种上限，或者填满剩余空间）
      const maxPerType = 16; // 每种骰子最多16个（两行的数量）
      const canAdd = Math.min(maxPerType - currentCount, availableSpace);
      for (
        let i = 0;
        i < canAdd && target.dice.length < draft.config.maxDiceCount;
        i++
      ) {
        target.dice.push(diceType);
      }
    });
  };

  return (
    <Surface title={`玩家 ${who()} 骰子`}>
      <p class="mt-1 text-xs text-slate-300/80">{`※ 最多 ${gameState().config.maxDiceCount} 个，当前 ${player().dice.length} 个`}</p>
      <div class="space-y-6">
        {/* 上方：已有骰子图标，每行8个 */}
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

        {/* 下方：骰子数量编辑器，每行2个 */}
        <div>
          <div class="text-sm text-slate-400 mb-2">数量编辑</div>
          <div class="grid grid-cols-2 gap-3">
            <For each={DICE_OPTIONS}>
              {(diceType) => {
                const count = () => diceCounts()[diceType] || 0;
                const buttons: ListItemButton[] = [
                  {
                    content: "+",
                    col: 0,
                    onClick: () => updateDiceCount(diceType, count() + 1),
                  },
                  {
                    content: "-",
                    col: 0,
                    onClick: () => updateDiceCount(diceType, count() - 1),
                  },
                  {
                    content: "加满",
                    col: 1,
                    variant: "primary",
                    onClick: () => fillDice(diceType),
                  },
                ];

                return (
                  <ListItem
                    title={DICE_LABELS[diceType]}
                    description={`数量: ${count()}`}
                    buttonColumns={2}
                    buttons={buttons}
                  />
                );
              }}
            </For>
          </div>
        </div>
      </div>
    </Surface>
  );
};

// Player info section (合并玩家标记和技能记录)
const PlayerInfoSection = () => {
  const { updateState } = useStateEditorContext();
  const { who, player } = usePlayer();
  return (
    <Surface title={`玩家 ${who()} 信息`}>
      <div class="space-y-6">
        {/* 玩家标记 */}
        <div class="space-y-4">
          <SectionTitle title="玩家标记" />
          <div class="grid gap-3 sm:grid-cols-2">
            <BooleanField
              label="已宣告结束"
              value={player().declaredEnd}
              onChange={(value) => {
                const whoV = who();
                updateState((draft) => {
                  draft.players[whoV].declaredEnd = value;
                });
              }}
            />
            <BooleanField
              label="本回合已击倒对手"
              value={player().hasDefeated}
              onChange={(value) => {
                const whoV = who();
                updateState((draft) => {
                  draft.players[whoV].hasDefeated = value;
                });
              }}
            />
            <BooleanField
              label="可视为重击"
              value={player().canCharged}
              onChange={(value) => {
                const whoV = who();
                updateState((draft) => {
                  draft.players[whoV].canCharged = value;
                });
              }}
            />
            <BooleanField
              label="可视为下落攻击"
              value={player().canPlunging}
              onChange={(value) => {
                const whoV = who();
                updateState((draft) => {
                  draft.players[whoV].canPlunging = value;
                });
              }}
            />
            <BooleanField
              label="已使用秘传"
              value={player().legendUsed}
              onChange={(value) => {
                const whoV = who();
                updateState((draft) => {
                  draft.players[whoV].legendUsed = value;
                });
              }}
            />
            <BooleanField
              label="跳过下个行动轮次"
              value={player().skipNextTurn}
              onChange={(value) => {
                const whoV = who();
                updateState((draft) => {
                  draft.players[whoV].skipNextTurn = value;
                });
              }}
            />
          </div>
        </div>

        {/* 回合技能记录 */}
        <div class="space-y-4 pt-4 border-t border-white/10">
          <RoundSkillLogSection />
        </div>
      </div>
    </Surface>
  );
};

// Entity area section (supports, summons, combatStatuses)
const EntityAreaSection = (props2: {
  title: string;
  description?: string;
  area: "supports" | "summons" | "combatStatuses";
  mode: "card" | "icon";
  limit?: number;
  availableTags?: EntityTag[]; // 可选的标签列表，用于添加时的筛选
}) => {
  const { openModal, updateState } = useStateEditorContext();
  const { who, player } = usePlayer();
  const items = () => player()[props2.area];

  const [pendingDefinition, setPendingDefinition] = createSignal<
    EntityDefinition | undefined
  >(void 0);
  const [existingEntityIndex, setExistingEntityIndex] =
    createSignal<number>(-1);

  // 获取可用的类型
  const availableTypes = () => {
    switch (props2.area) {
      case "supports":
        return ["support"];
      case "summons":
        return ["summon"];
      case "combatStatuses":
        return ["combatStatus"];
      default:
        return [];
    }
  };

  // 检查是否存在相同 definition.id 的实体
  const checkDuplicate = (definition: EntityDefinition) => {
    const currentItems = items();
    const index = currentItems.findIndex(
      (item) => item.definition.id === definition.id,
    );
    return index;
  };

  // 处理添加前的检查
  const handleAddCheck = (definition: EntityDefinition, done: () => void) => {
    // 支援区不限制同 definition.id
    if (props2.area === "supports") {
      doAdd(definition);
      done();
      return;
    }

    const duplicateIndex = checkDuplicate(definition);

    if (duplicateIndex !== -1) {
      // 存在重复，显示确认弹窗
      setPendingDefinition(definition);
      setExistingEntityIndex(duplicateIndex);
      confirmOverride(done);
      return;
    } 
      // 没有重复，直接添加
      doAdd(definition);
      done();
  };

  // 执行添加
  const doAdd = (definition: EntityDefinition) => {
    const whoV = who();
    const area = props2.area;
    const limit = props2.limit;
    updateState((draft) => {
      const target = draft.players[whoV][area];
      if (typeof limit === "number" && target.length >= limit) {
        return;
      }
      target.push(createEntityState(definition, allocateId(draft)));
    });
  };

  // 执行覆盖（替换）
  const doReplace = (definition: EntityDefinition, index: number) => {
    const whoV = who();
    const area = props2.area;
    updateState((draft) => {
      const target = draft.players[whoV][area];
      // 替换指定位置的实体
      target[index] = createEntityState(definition, allocateId(draft));
    });
  };

  const appendEntity = () => {
    openModal(() => {
      let ref!: HTMLDialogElement;
      return <AddCardModal
        ref={ref}
        onSelect={(def) => {
          handleAddCheck(def, () => ref.close())
        }}
        availableTypes={availableTypes() as EntityType[]}
        showTypeFilter={false}
        availableTags={props2.availableTags}
        showTagFilter={!!props2.availableTags}
        maxResults={200}
      />
  });
  };

  {
    /* Confirm Modal for duplicate entities */
  }
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

  // 确认覆盖
  const handleConfirmReplace = () => {
    const definition = pendingDefinition();
    const index = existingEntityIndex();
    if (definition && index !== -1) {
      doReplace(definition, index);
    }
    setPendingDefinition(void 0);
    setExistingEntityIndex(-1);
  };

  // 取消覆盖，改为添加新的
  const handleCancelReplace = () => {
    setPendingDefinition(void 0);
    setExistingEntityIndex(-1);
  };

  // 判断是否可以放回手牌
  const canReturnToHands = () => {
    return props2.area === "supports";
  };

  return (
    <Surface title={props2.title}>
      <Show when={props2.description}>
        <p class="mt-1 text-xs text-slate-300/80">{`※ ${props2.description}`}</p>
      </Show>
      <div class="space-y-4">
        <div class="space-y-2">
          <For each={items()}>
            {(entity, index) => {
              const buttons: ListItemButton[] = [
                // 第一列
                {
                  content: "上移",
                  col: 0,
                  onClick: () => {
                    const whoV = who();
                    const area = props2.area;
                    const i = index();
                    updateState((draft) => {
                      draft.players[whoV][area] = moveInArray(
                        draft.players[whoV][area],
                        i,
                        -1,
                      );
                    });
                  },
                },
                {
                  content: "下移",
                  col: 0,
                  onClick: () => {
                    const whoV = who();
                    const area = props2.area;
                    const i = index();
                    updateState((draft) => {
                      draft.players[whoV][area] = moveInArray(
                        draft.players[whoV][area],
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
                  onClick: () =>
                    openModal(() => (
                      <EntityModal
                        who={who()}
                        area={props2.area}
                        entityId={entity.id}
                      />
                    )),
                },
                {
                  content: "移除",
                  col: 1,
                  variant: "danger",
                  onClick: () => {
                    const whoV = who();
                    const area = props2.area;
                    const i = index();
                    updateState((draft) => {
                      draft.players[whoV][area].splice(i, 1);
                    });
                  },
                },
              ];

              // 支援牌可以放回手牌
              if (canReturnToHands() && props2.area === "supports") {
                buttons.splice(1, 0, {
                  content: "放回手牌",
                  col: 0,
                  onClick: () => {
                    const whoV = who();
                    const i = index();
                    updateState((draft) => {
                      const target = draft.players[whoV];
                      if (target.hands.length >= draft.config.maxHandsCount) {
                        return;
                      }
                      const [item] = target.supports.splice(i, 1);
                      if (item) {
                        target.hands.push(item);
                      }
                    });
                  },
                });
              }

              return (
                <ListItem
                  imageSrc={getImageUrl(
                    entity.definition,
                    props2.mode === "card" ? "card" : "icon",
                  )}
                  imageMode={props2.mode}
                  title={getDefinitionName(entity.definition)}
                  description={`ID: ${entity.id}`}
                  definition={entity.definition}
                  tags={entityBadges(entity)}
                  buttonColumns={2}
                  buttons={buttons}
                />
              );
            }}
          </For>
        </div>
        {/* 新增按钮 */}
        <button
          type="button"
          onClick={() => appendEntity()}
          disabled={
            typeof props2.limit === "number" && items().length >= props2.limit
          }
          class="w-full flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-white/20 bg-transparent px-3 py-3 text-sm text-slate-400 hover:border-white/40 hover:text-slate-300 hover:bg-white/5 transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <span class="text-lg">+</span>
          <span>追加{props2.title}</span>
        </button>
      </div>
    </Surface>
  );
};

// Round skill log section
const RoundSkillLogSection = () => {
  const { openModal, updateState, catalog } = useStateEditorContext();
  const { who, player } = usePlayer();
  const roundSkillRows = createMemo(() =>
    Array.from(player().roundSkillLog.entries()),
  );

  const setRoundSkillRows = (
    rows: readonly (readonly [number, number[]])[],
  ) => {
    const whoV = who();
    updateState((draft) => {
      const nextLog = new Map(rows.map(([key, value]) => [key, [...value]]));
      draft.players[whoV].roundSkillLog = nextLog;
    });
  };

  const [editingIndex, setEditingIndex] = createSignal<number | null>(null);

  // 获取已使用的角色ID（用于新增时排除）
  const usedCharacterIds = createMemo(() =>
    roundSkillRows().map(([charId]) => charId),
  );

  // 打开新增modal
  const openAddModal = () => {
    setEditingIndex(null);
    openModal(() => (
      <RoundSkillModal
        who={/* @once */ who()}
        disabledCharacterIds={/* @once */ usedCharacterIds()}
        onSubmit={handleSubmit}
      />
    ));
  };

  // 打开编辑modal
  const openEditModal = (index: number) => {
    setEditingIndex(index);
    const editingId = editingData()?.characterId;
    const disabledCharacterIds = usedCharacterIds().filter(
      (id) => id !== editingId,
    );
    openModal(() => (
      <RoundSkillModal
        who={/* @once */ who()}
        editingCharacterId={/* @once */ editingData()?.characterId}
        editingSkillIds={/* @once */ editingData()?.skillIds}
        disabledCharacterIds={disabledCharacterIds}
        onSubmit={handleSubmit}
      />
    ));
  };

  // 提交处理
  const handleSubmit = (characterId: number, skillIds: number[]) => {
    const rows = [...roundSkillRows()];
    const editIdx = editingIndex();

    if (editIdx !== null) {
      // 编辑模式：替换该条目
      rows[editIdx] = [characterId, skillIds];
    } else {
      // 新增模式：追加条目
      rows.push([characterId, skillIds]);
    }

    setRoundSkillRows(rows);
  };

  // 删除条目
  const handleDelete = (index: number) => {
    setRoundSkillRows(roundSkillRows().filter((_, i) => i !== index));
  };

  // 获取当前编辑的数据
  const editingData = createMemo(() => {
    const idx = editingIndex();
    if (idx === null) return undefined;
    const row = roundSkillRows()[idx];
    if (!row) return undefined;
    return {
      characterId: row[0],
      skillIds: row[1],
    };
  });

  return (
    <div class="space-y-4">
      <SectionTitle
        title="回合技能记录"
        description="记录本回合各角色使用过的主动技能"
      />

      {/* 技能记录列表 */}
      <div class="space-y-2">
        <For each={roundSkillRows()}>
          {([characterId, skillIds], index) => {
            const character = catalog().roundSkillCharacters.find(
              (c) => c.id === characterId,
            );
            const skills = skillIds
              .map((id) =>
                catalog().allInitiativeSkills.find((s) => s.id === id),
              )
              .filter((s): s is NonNullable<typeof s> => s !== undefined);

            const buttons: ListItemButton[] = [
              {
                content: "编辑",
                variant: "primary",
                col: 0,
                onClick: () => openEditModal(index()),
              },
              {
                content: "删除",
                variant: "danger",
                col: 1,
                onClick: () => handleDelete(index()),
              },
            ];

            return (
              <ListItem
                imageSrc={
                  character ? getImageUrl(character, "icon") : undefined
                }
                title={character?.name ?? `角色 #${characterId}`}
                tags={skills.map((s) => s.name)}
                buttonColumns={2}
                buttons={buttons}
              />
            );
          }}
        </For>

        {/* 新增按钮 - 虚线框样式 */}
        <button
          type="button"
          onClick={openAddModal}
          class="w-full flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-white/20 bg-transparent px-3 py-3 text-sm text-slate-400 hover:border-white/40 hover:text-slate-300 hover:bg-white/5 transition"
        >
          <span class="text-lg">+</span>
          <span>新增技能记录</span>
        </button>
      </div>
    </div>
  );
};

// Deck import section
const DeckImportSection = () => {
  const { gameState, updateState } = useStateEditorContext();
  const { who, player } = usePlayer();
  const [shareCode, setShareCode] = createSignal("");
  const [importCharacters, setImportCharacters] = createSignal(true);
  const [importInitialPile, setImportInitialPile] = createSignal(true);
  const [importPile, setImportPile] = createSignal(true);
  const [importError, setImportError] = createSignal<string | null>(null);

  // 解析分享码中的卡牌和角色
  const parsedDeck = createMemo(() => {
    try {
      const code = shareCode().trim();
      if (!code) return null;
      const deck = decodeDeckShareCode(code);
      return deck;
    } catch {
      return null;
    }
  });

  // 获取角色定义
  const characterDefinitions = createMemo(() => {
    const deck = parsedDeck();
    if (!deck) return [];
    return deck.characters
      .map((id) => gameState().data.characters.get(id))
      .filter((def): def is NonNullable<typeof def> => def !== undefined);
  });

  // 获取卡牌定义
  const cardDefinitions = createMemo(() => {
    const deck = parsedDeck();
    if (!deck) return [];
    return deck.cards
      .map((id) => gameState().data.entities.get(id))
      .filter((def): def is NonNullable<typeof def> => def !== undefined);
  });

  const handleImport = () => {
    try {
      const deck = decodeDeckShareCode(shareCode());
      if (deck.characters.length !== 3) {
        throw new Error("分享码中的角色数量不是 3。");
      }
      const importedInitialPile = importInitialPile()
        ? [...deck.cards]
            .map((id) => {
              const definition = gameState().data.entities.get(id);
              if (!definition) {
                throw new Error(`卡牌 ${id} 不存在。`);
              }
              return definition;
            })
            .sort(
              (left, right) =>
                Number(!left.tags.includes("legend")) -
                Number(!right.tags.includes("legend")),
            )
        : null;
      const whoV = who();
      const importingChs = importCharacters();
      const importingPile = importPile();
      updateState((draft) => {
        const target = draft.players[whoV];
        if (importingChs) {
          target.characters = buildImportedCharacterStates(
            draft,
            deck.characters,
          );
          target.activeCharacterId = target.characters[0]?.id ?? 0;
        }
        if (importedInitialPile) {
          target.initialPile = importedInitialPile as Draft<EntityDefinition>[];
        }
        if (importingPile) {
          target.pile = buildImportedPileStates(draft, deck.cards);
        }
      });
      setImportError(null);
    } catch (error) {
      setImportError(error instanceof Error ? error.message : String(error));
    }
  };

  return (
    <Surface title={`玩家 ${who()} 牌组导入`}>
      <div class="space-y-4">
        <SectionTitle
          title="牌组分享码导入"
          description="可分别覆盖角色、初始牌堆、当前牌堆。"
        />
        <textarea
          class="min-h-18 h-18 w-full min-w-full max-w-full box-border rounded-3xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-amber-200/50"
          value={shareCode()}
          placeholder="输入牌组分享码"
          onInput={(event) => setShareCode(event.currentTarget.value)}
        />

        {/* 卡牌图片预览 */}
        <Show when={parsedDeck()}>
          <h4 class="text-4 text-amber-50 my-0">预览</h4>
          <div class="space-y-4">
            {/* 角色预览 */}
            <Show when={characterDefinitions().length > 0}>
              <div class="flex gap-2 justify-center">
                <For each={characterDefinitions()}>
                  {(character) => (
                    <div class="w-16 h-16 rounded-full overflow-hidden border border-white/20 bg-slate-800">
                      <img
                        src={getImageUrl(character, "icon")}
                        alt={`Character ${character.id}`}
                        class="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  )}
                </For>
              </div>
            </Show>

            {/* 卡牌预览 */}
            <Show when={cardDefinitions().length > 0}>
              <div class="grid grid-cols-15 gap-1">
                <For each={cardDefinitions()}>
                  {(card) => (
                    <div class="w-full h-auto rounded-sm overflow-hidden bg-slate-800">
                      <img
                        src={getImageUrl(card, "card")}
                        alt={`Card ${card.id}`}
                        class="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  )}
                </For>
              </div>
            </Show>
          </div>
        </Show>

        <div class="grid gap-3 sm:grid-cols-3 pt-4">
          <BooleanField
            label="覆盖角色"
            value={importCharacters()}
            onChange={setImportCharacters}
          />
          <BooleanField
            label="覆盖初始牌堆"
            value={importInitialPile()}
            onChange={setImportInitialPile}
          />
          <BooleanField
            label="覆盖当前牌堆"
            value={importPile()}
            onChange={setImportPile}
          />
        </div>
        <div class="flex flex-wrap gap-2">
          <ActionButton
            label="导入分享码"
            tone="accent"
            onClick={handleImport}
            class="w-full"
          />
        </div>
        <Show when={importError()}>
          <p class="text-sm text-rose-200">{importError()}</p>
        </Show>
      </div>
    </Surface>
  );
};
