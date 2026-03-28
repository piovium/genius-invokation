import { For, Match, Show, Switch, createMemo, createSignal } from "solid-js";

import type {
  EntityState,
  EntityDefinition,
  EntityType,
  GameState,
  EntityTag,
} from "@gi-tcg/core";

import {
  ActionButton,
  BooleanField,
  SearchableSelect,
  SelectField,
  SectionTitle,
  Surface,
} from "./Fields";
import { PreviewTile } from "./Previews";
import { RoundSkillModal } from "./RoundSkillModal";
import { ListItem, type ListItemButton } from "./ListItem";
import { AddCardModal } from "./AddCardModal";
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
  type EditorCatalog,
  type EditorModal,
  type EditorSection,
  type InitiativeSkillOption,
  type UpdateGameState,
} from "../state";

interface PlayerSectionContentProps {
  state: GameState;
  section: EditorSection;
  catalog: EditorCatalog;
  updateState: UpdateGameState;
  openModal: (modal: EditorModal) => void;
}

function entityBadges(entity: EntityState) {
  return [
    `变量 ${Object.keys(entity.variables).length}`,
    `附着 ${entity.attachments.length}`,
  ];
}

export function PlayerSectionContent(props: PlayerSectionContentProps) {
  const section = () => props.section;
  const who = () => {
    const s = section();
    if ("who" in s) return s.who;
    return 0 as 0 | 1;
  };
  const player = () => getPlayer(props.state, who());

  // Dice section
  const DiceSection = () => (
    <Surface title={`玩家 ${who()} 骰子`}>
      <div class="space-y-4">
        <SectionTitle
          title="骰子"
          description={`最多 ${props.state.config.maxDiceCount} 个。`}
        />
        <div class="flex flex-wrap gap-2">
          <For each={DICE_OPTIONS}>
            {(dice) => (
              <ActionButton
                label={`+${DICE_LABELS[dice]}`}
                disabled={
                  player().dice.length >= props.state.config.maxDiceCount
                }
                onClick={() => {
                  props.updateState((draft) => {
                    const target = draft.players[who()];
                    if (target.dice.length >= draft.config.maxDiceCount) {
                      return;
                    }
                    target.dice.push(dice);
                  });
                }}
              />
            )}
          </For>
        </div>
        <div class="space-y-2">
          <For each={player().dice}>
            {(dice, index) => (
              <div class="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-950/20 px-3 py-2">
                <span class="text-sm text-slate-50">{DICE_LABELS[dice]}</span>
                <div class="flex gap-2">
                  <ActionButton
                    label="左移"
                    disabled={index() === 0}
                    onClick={() => {
                      props.updateState((draft) => {
                        draft.players[who()].dice = moveInArray(
                          draft.players[who()].dice,
                          index(),
                          -1,
                        );
                      });
                    }}
                  />
                  <ActionButton
                    label="右移"
                    disabled={index() === player().dice.length - 1}
                    onClick={() => {
                      props.updateState((draft) => {
                        draft.players[who()].dice = moveInArray(
                          draft.players[who()].dice,
                          index(),
                          1,
                        );
                      });
                    }}
                  />
                  <ActionButton
                    label="移除"
                    tone="danger"
                    onClick={() => {
                      props.updateState((draft) => {
                        draft.players[who()].dice.splice(index(), 1);
                      });
                    }}
                  />
                </div>
              </div>
            )}
          </For>
        </div>
      </div>
    </Surface>
  );

  // Player info section (合并玩家标记和技能记录)
  const PlayerInfoSection = () => (
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
                props.updateState((draft) => {
                  draft.players[who()].declaredEnd = value;
                });
              }}
            />
            <BooleanField
              label="本回合已击倒对手"
              value={player().hasDefeated}
              onChange={(value) => {
                props.updateState((draft) => {
                  draft.players[who()].hasDefeated = value;
                });
              }}
            />
            <BooleanField
              label="可视为重击"
              value={player().canCharged}
              onChange={(value) => {
                props.updateState((draft) => {
                  draft.players[who()].canCharged = value;
                });
              }}
            />
            <BooleanField
              label="可视为下落攻击"
              value={player().canPlunging}
              onChange={(value) => {
                props.updateState((draft) => {
                  draft.players[who()].canPlunging = value;
                });
              }}
            />
            <BooleanField
              label="已使用秘传"
              value={player().legendUsed}
              onChange={(value) => {
                props.updateState((draft) => {
                  draft.players[who()].legendUsed = value;
                });
              }}
            />
            <BooleanField
              label="跳过下个行动轮次"
              value={player().skipNextTurn}
              onChange={(value) => {
                props.updateState((draft) => {
                  draft.players[who()].skipNextTurn = value;
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

  // Entity area section (supports, summons, combatStatuses)
  const EntityAreaSection = (props2: {
    title: string;
    description?: string;
    area: "supports" | "summons" | "combatStatuses";
    mode: "card" | "icon";
    limit?: number;
    availableTags?: EntityTag[]; // 可选的标签列表，用于添加时的筛选
  }) => {
    const items = () => player()[props2.area];
    const [addModalOpen, setAddModalOpen] = createSignal(false);

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

    // 处理添加
    const handleAdd = (definition: EntityDefinition) => {
      props.updateState((draft) => {
        const target = draft.players[who()][props2.area];
        if (typeof props2.limit === "number" && target.length >= props2.limit) {
          return;
        }
        target.push(
          createEntityState(
            definition,
            allocateId(draft),
          ) as unknown as (typeof target)[number],
        );
      });
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
                      props.updateState((draft) => {
                        draft.players[who()][props2.area] = moveInArray(
                          draft.players[who()][props2.area],
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
                        draft.players[who()][props2.area] = moveInArray(
                          draft.players[who()][props2.area],
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
                        who: who(),
                        area: props2.area,
                        entityId: entity.id,
                      }),
                  },
                  {
                    content: "移除",
                    col: 1,
                    variant: "danger",
                    onClick: () => {
                      props.updateState((draft) => {
                        draft.players[who()][props2.area].splice(index(), 1);
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
                      props.updateState((draft) => {
                        const target = draft.players[who()];
                        if (target.hands.length >= draft.config.maxHandsCount) {
                          return;
                        }
                        const [item] = target.supports.splice(index(), 1);
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
            onClick={() => setAddModalOpen(true)}
            disabled={
              typeof props2.limit === "number" && items().length >= props2.limit
            }
            class="w-full flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-white/20 bg-transparent px-3 py-3 text-sm text-slate-400 hover:border-white/40 hover:text-slate-300 hover:bg-white/5 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span class="text-lg">+</span>
            <span>追加{props2.title}</span>
          </button>

          {/* AddCardModal */}
          <AddCardModal
            open={addModalOpen()}
            state={props.state}
            catalog={props.catalog}
            onSelect={handleAdd}
            onClose={() => setAddModalOpen(false)}
            availableTypes={availableTypes() as EntityType[]}
            showTypeFilter={false}
            availableTags={props2.availableTags}
            showTagFilter={!!props2.availableTags}
            maxResults={200}
          />
        </div>
      </Surface>
    );
  };

  // Round skill log section
  const RoundSkillLogSection = () => {
    const roundSkillRows = createMemo(() =>
      Array.from(player().roundSkillLog.entries()),
    );

    const setRoundSkillRows = (
      rows: readonly (readonly [number, number[]])[],
    ) => {
      props.updateState((draft) => {
        const nextLog = new Map(rows.map(([key, value]) => [key, [...value]]));
        draft.players[who()].roundSkillLog =
          nextLog as unknown as (typeof draft.players)[0]["roundSkillLog"];
      });
    };

    // Modal状态
    const [modalOpen, setModalOpen] = createSignal(false);
    const [editingIndex, setEditingIndex] = createSignal<number | null>(null);

    // 获取已使用的角色ID（用于新增时排除）
    const usedCharacterIds = createMemo(() =>
      roundSkillRows().map(([charId]) => charId),
    );

    // 打开新增modal
    const openAddModal = () => {
      setEditingIndex(null);
      setModalOpen(true);
    };

    // 打开编辑modal
    const openEditModal = (index: number) => {
      setEditingIndex(index);
      setModalOpen(true);
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
              const character = props.catalog.roundSkillCharacters.find(
                (c) => c.id === characterId,
              );
              const skills = skillIds
                .map((id) =>
                  props.catalog.allInitiativeSkills.find((s) => s.id === id),
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

        {/* Modal */}
        <RoundSkillModal
          open={modalOpen()}
          state={props.state}
          catalog={props.catalog}
          who={who()}
          editingCharacterId={editingData()?.characterId}
          editingSkillIds={editingData()?.skillIds}
          usedCharacterIds={
            editingIndex() !== null
              ? usedCharacterIds().filter(
                  (id) => id !== editingData()?.characterId,
                )
              : usedCharacterIds()
          }
          onSubmit={handleSubmit}
          onClose={() => setModalOpen(false)}
        />
      </div>
    );
  };

  // Deck import section
  const DeckImportSection = () => {
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
        .map((id) => props.state.data.characters.get(id))
        .filter((def): def is NonNullable<typeof def> => def !== undefined);
    });

    // 获取卡牌定义
    const cardDefinitions = createMemo(() => {
      const deck = parsedDeck();
      if (!deck) return [];
      return deck.cards
        .map((id) => props.state.data.entities.get(id))
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
                const definition = props.state.data.entities.get(id);
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
        props.updateState((draft) => {
          const target = draft.players[who()];
          if (importCharacters()) {
            target.characters = buildImportedCharacterStates(
              draft,
              deck.characters,
            ) as unknown as typeof target.characters;
            target.activeCharacterId = target.characters[0]?.id ?? 0;
          }
          if (importedInitialPile) {
            target.initialPile =
              importedInitialPile as unknown as typeof target.initialPile;
          }
          if (importPile()) {
            target.pile = buildImportedPileStates(
              draft,
              deck.cards,
            ) as unknown as typeof target.pile;
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

  return (
    <Switch>
      <Match when={section().kind === "supports"}>
        <EntityAreaSection
          title="支援区"
          area="supports"
          mode="card"
          limit={props.state.config.maxSupportsCount}
          availableTags={["ally", "place", "item", "blessing", "adventureSpot"]}
        />
      </Match>
      <Match when={section().kind === "summons"}>
        <EntityAreaSection
          title="召唤区"
          area="summons"
          mode="card"
          limit={props.state.config.maxSummonsCount}
          availableTags={["barrier"]}
        />
      </Match>
      <Match when={section().kind === "combatStatuses"}>
        <EntityAreaSection
          title="出战状态"
          area="combatStatuses"
          mode="icon"
          availableTags={["shield", "barrier"]}
        />
      </Match>
      <Match when={section().kind === "dice"}>
        <DiceSection />
      </Match>
      <Match when={section().kind === "playerInfo"}>
        <PlayerInfoSection />
      </Match>
      <Match when={section().kind === "deckImport"}>
        <DeckImportSection />
      </Match>
    </Switch>
  );
}
