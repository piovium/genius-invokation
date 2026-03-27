import { For, Match, Show, Switch, createMemo, createSignal } from "solid-js";

import type { EntityState, GameState } from "@gi-tcg/core";

import {
  ActionButton,
  BooleanField,
  SearchableSelect,
  SelectField,
  SectionTitle,
  Surface,
} from "./Fields";
import { PreviewTile } from "./Previews";
import {
  allocateId,
  buildImportedCharacterStates,
  buildImportedPileStates,
  createEntityState,
  decodeDeckShareCode,
  DICE_LABELS,
  DICE_OPTIONS,
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
  return [`变量 ${Object.keys(entity.variables).length}`, `附着 ${entity.attachments.length}`];
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
        <SectionTitle title="骰子" description={`最多 ${props.state.config.maxDiceCount} 个。`} />
        <div class="flex flex-wrap gap-2">
          <For each={DICE_OPTIONS}>
            {(dice) => (
              <ActionButton
                label={`+${DICE_LABELS[dice]}`}
                disabled={player().dice.length >= props.state.config.maxDiceCount}
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

  // Player flags section
  const PlayerFlagsSection = () => (
    <Surface title={`玩家 ${who()} 标记`}>
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
    </Surface>
  );

  // Entity area section (supports, summons, combatStatuses)
  const EntityAreaSection = (props2: { 
    title: string; 
    description: string; 
    area: "supports" | "summons" | "combatStatuses";
    mode: "card" | "icon";
    limit?: number;
  }) => {
    const items = () => player()[props2.area];
    const options = () => {
      switch (props2.area) {
        case "supports": return props.catalog.entitiesByType.support;
        case "summons": return props.catalog.entitiesByType.summon;
        case "combatStatuses": return props.catalog.entitiesByType.combatStatus;
        default: return [];
      }
    };

    return (
      <Surface title={props2.title}>
        <div class="space-y-4">
          <SectionTitle title={props2.title} description={props2.description} />
          <SearchableSelect
            label={`追加${props2.title}`}
            options={options()}
            buttonText={`加入${props2.title}`}
            disabled={typeof props2.limit === "number" && items().length >= props2.limit}
            onSelect={(option) => {
              props.updateState((draft) => {
                const target = draft.players[who()][props2.area];
                if (typeof props2.limit === "number" && target.length >= props2.limit) {
                  return;
                }
                target.push(
                  createEntityState(option.definition, allocateId(draft)) as unknown as typeof target[number],
                );
              });
            }}
          />
          <div class="gi-editor-preview-grid">
            <For each={items()}>
              {(entity, index) => (
                <PreviewTile
                  definition={entity.definition}
                  mode={props2.mode}
                  subtitle={`状态 ID #${entity.id}`}
                  badges={entityBadges(entity)}
                  onClick={() =>
                    props.openModal({
                      kind: "entity",
                      who: who(),
                      area: props2.area,
                      entityId: entity.id,
                    })
                  }
                  actions={
                    <>
                      <ActionButton
                        label="详情"
                        onClick={() =>
                          props.openModal({
                            kind: "entity",
                            who: who(),
                            area: props2.area,
                            entityId: entity.id,
                          })
                        }
                      />
                      <ActionButton
                        label="上移"
                        disabled={index() === 0}
                        onClick={() => {
                          props.updateState((draft) => {
                            draft.players[who()][props2.area] = moveInArray(
                              draft.players[who()][props2.area],
                              index(),
                              -1,
                            );
                          });
                        }}
                      />
                      <ActionButton
                        label="下移"
                        disabled={index() === items().length - 1}
                        onClick={() => {
                          props.updateState((draft) => {
                            draft.players[who()][props2.area] = moveInArray(
                              draft.players[who()][props2.area],
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
                            draft.players[who()][props2.area].splice(index(), 1);
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
      </Surface>
    );
  };

  // Round skill log section
  const RoundSkillLogSection = () => {
    const roundSkillRows = createMemo(() => Array.from(player().roundSkillLog.entries()));

    const setRoundSkillRows = (rows: readonly (readonly [number, number[]])[]) => {
      props.updateState((draft) => {
        const nextLog = new Map(rows.map(([key, value]) => [key, [...value]]));
        draft.players[who()].roundSkillLog = nextLog as unknown as typeof draft.players[0]["roundSkillLog"];
      });
    };

    const addRoundSkillRow = () => {
      const used = new Set(roundSkillRows().map(([key]) => key));
      const nextCharacter = props.catalog.roundSkillCharacters.find((character) => !used.has(character.id));
      if (!nextCharacter) {
        return;
      }
      setRoundSkillRows([...roundSkillRows(), [nextCharacter.id, []]]);
    };

    return (
      <Surface title={`玩家 ${who()} 回合技能记录`}>
        <div class="space-y-4">
          <SectionTitle title="回合技能记录" description="键为角色定义 ID，值为本回合用过的主动技能。" />
          <ActionButton label="新增记录" onClick={addRoundSkillRow} />
          <div class="space-y-3">
            <For each={roundSkillRows()}>
              {([definitionId, skillIds], index) => {
                const used = new Set(roundSkillRows().map(([key]) => key));
                used.delete(definitionId);
                const characterOptions = props.catalog.roundSkillCharacters.filter(
                  (character) => !used.has(character.id),
                );
                const prioritizedSkills = (() => {
                  const priority = props.catalog.initiativeSkillsByCharacterId.get(definitionId) ?? [];
                  const rest = props.catalog.allInitiativeSkills.filter(
                    (skill) => !priority.some((current) => current.id === skill.id),
                  );
                  return [...priority, ...rest];
                })();
                const toggleSkill = (skill: InitiativeSkillOption) => {
                  const nextRows = [...roundSkillRows()];
                  const current = nextRows[index()]!;
                  const nextValue = current[1].includes(skill.id)
                    ? current[1].filter((item) => item !== skill.id)
                    : [...current[1], skill.id];
                  nextRows[index()] = [current[0], nextValue];
                  setRoundSkillRows(nextRows);
                };
                return (
                  <div class="space-y-3 rounded-2xl border border-white/10 bg-slate-950/20 p-3">
                    <div class="flex items-end gap-3">
                      <div class="flex-1">
                        <SelectField
                          label="角色定义"
                          value={definitionId}
                          options={characterOptions.map((character) => ({
                            value: character.id,
                            label: `${character.name} #${character.id}`,
                          }))}
                          onChange={(value) => {
                            const nextRows = [...roundSkillRows()];
                            nextRows[index()] = [Number(value), skillIds];
                            setRoundSkillRows(nextRows);
                          }}
                        />
                      </div>
                      <ActionButton
                        label="移除记录"
                        tone="danger"
                        onClick={() =>
                          setRoundSkillRows(
                            roundSkillRows().filter((_, rowIndex) => rowIndex !== index()),
                          )
                        }
                      />
                    </div>
                    <div class="flex flex-wrap gap-2">
                      <For each={prioritizedSkills}>
                        {(skill) => (
                          <button
                            type="button"
                            class={`gi-editor-button rounded-full border px-3 py-1.5 text-xs ${
                              skillIds.includes(skill.id)
                                ? "border-cyan-200/35 bg-cyan-300/12 text-cyan-50"
                                : "border-white/10 bg-white/5 text-slate-100"
                            }`}
                            onClick={() => toggleSkill(skill)}
                          >
                            {skill.name} #{skill.id}
                          </button>
                        )}
                      </For>
                    </div>
                  </div>
                );
              }}
            </For>
          </div>
        </div>
      </Surface>
    );
  };

  // Deck import section
  const DeckImportSection = () => {
    const [shareCode, setShareCode] = createSignal("");
    const [importCharacters, setImportCharacters] = createSignal(true);
    const [importInitialPile, setImportInitialPile] = createSignal(true);
    const [importPile, setImportPile] = createSignal(true);
    const [importError, setImportError] = createSignal<string | null>(null);

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
              .sort((left, right) => Number(!left.tags.includes("legend")) - Number(!right.tags.includes("legend")))
          : null;
        props.updateState((draft) => {
          const target = draft.players[who()];
          if (importCharacters()) {
            target.characters = buildImportedCharacterStates(draft, deck.characters) as unknown as typeof target.characters;
            target.activeCharacterId = target.characters[0]?.id ?? 0;
          }
          if (importedInitialPile) {
            target.initialPile = importedInitialPile as unknown as typeof target.initialPile;
          }
          if (importPile()) {
            target.pile = buildImportedPileStates(draft, deck.cards) as unknown as typeof target.pile;
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
          <SectionTitle title="牌组分享码导入" description="可分别覆盖角色、初始牌堆、当前牌堆。" />
          <textarea
            class="min-h-28 w-full rounded-3xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-amber-200/50"
            value={shareCode()}
            placeholder="输入牌组分享码"
            onInput={(event) => setShareCode(event.currentTarget.value)}
          />
          <div class="grid gap-3 sm:grid-cols-3">
            <BooleanField label="覆盖角色" value={importCharacters()} onChange={setImportCharacters} />
            <BooleanField label="覆盖初始牌堆" value={importInitialPile()} onChange={setImportInitialPile} />
            <BooleanField label="覆盖当前牌堆" value={importPile()} onChange={setImportPile} />
          </div>
          <div class="flex flex-wrap gap-2">
            <ActionButton label="导入分享码" tone="accent" onClick={handleImport} />
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
          description="展示支援牌，可排序、移除、追加。"
          area="supports"
          mode="card"
          limit={props.state.config.maxSupportsCount}
        />
      </Match>
      <Match when={section().kind === "summons"}>
        <EntityAreaSection
          title="召唤区"
          description="展示召唤物，可排序、移除、追加。"
          area="summons"
          mode="card"
          limit={props.state.config.maxSummonsCount}
        />
      </Match>
      <Match when={section().kind === "combatStatuses"}>
        <EntityAreaSection
          title="出战状态"
          description="以图标列表展示，可排序、移除、追加。"
          area="combatStatuses"
          mode="icon"
        />
      </Match>
      <Match when={section().kind === "dice"}>
        <DiceSection />
      </Match>
      <Match when={section().kind === "playerFlags"}>
        <PlayerFlagsSection />
      </Match>
      <Match when={section().kind === "roundSkillLog"}>
        <RoundSkillLogSection />
      </Match>
      <Match when={section().kind === "deckImport"}>
        <DeckImportSection />
      </Match>
    </Switch>
  );
}
