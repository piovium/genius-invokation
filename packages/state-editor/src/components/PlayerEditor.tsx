import { For, Show, createMemo, createSignal } from "solid-js";

import type { EntityState, GameState } from "@gi-tcg/core";

import {
  ActionButton,
  BooleanField,
  SearchableSelect,
  SelectField,
  SectionTitle,
  Surface,
} from "./Fields";
import { Badge, PreviewTile, SummaryLine } from "./Previews";
import {
  allocateId,
  buildImportedCharacterStates,
  buildImportedPileStates,
  createEntityState,
  DICE_LABELS,
  DICE_OPTIONS,
  decodeDeckShareCode,
  getCharacterEnergyLabel,
  getDefinitionName,
  getPlayer,
  moveInArray,
  type EditorCatalog,
  type EditorModal,
  type InitiativeSkillOption,
  type UpdateGameState,
} from "../state";

interface PlayerEditorProps {
  state: GameState;
  who: 0 | 1;
  catalog: EditorCatalog;
  updateState: UpdateGameState;
  openModal: (modal: EditorModal) => void;
}

function ZonePreview(props: {
  title: string;
  description: string;
  count: number;
  items: readonly { id: number; definition: { id: number } }[];
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      class="gi-editor-button flex h-full w-full flex-col items-start gap-3 rounded-3xl border border-white/10 bg-slate-950/20 p-4 text-left"
      onClick={props.onOpen}
    >
      <div class="space-y-1">
        <p class="text-lg font-semibold text-amber-50">{props.title}</p>
        <p class="text-sm text-slate-300/80">{props.description}</p>
      </div>
      <SummaryLine label="数量" value={String(props.count)} />
      <div class="flex flex-wrap gap-1.5">
        <For each={props.items.slice(0, 5)}>
          {(item) => <Badge>{`${getDefinitionName(item.definition)} #${item.id}`}</Badge>}
        </For>
        <Show when={props.items.length > 5}>
          <Badge>{`+${props.items.length - 5}`}</Badge>
        </Show>
      </div>
    </button>
  );
}

function entityBadges(entity: EntityState) {
  return [`变量 ${Object.keys(entity.variables).length}`, `附着 ${entity.attachments.length}`];
}

function EntityAreaPanel(props: {
  title: string;
  description: string;
  items: readonly EntityState[];
  options: EditorCatalog["cardEntities"];
  mode: "card" | "icon";
  limit?: number;
  who: 0 | 1;
  area: "combatStatuses" | "supports" | "summons";
  openModal: (modal: EditorModal) => void;
  updateState: UpdateGameState;
}) {
  return (
    <Surface>
      <div class="space-y-4">
        <SectionTitle title={props.title} description={props.description} />
        <SearchableSelect
          label={`追加${props.title}`}
          options={props.options}
          buttonText={`加入${props.title}`}
          disabled={typeof props.limit === "number" && props.items.length >= props.limit}
          onSelect={(option) => {
            props.updateState((draft) => {
              const target = draft.players[props.who][props.area];
              if (typeof props.limit === "number" && target.length >= props.limit) {
                return;
              }
              target.push(
                createEntityState(option.definition, allocateId(draft)) as unknown as typeof target[number],
              );
            });
          }}
        />
        <div class="gi-editor-preview-grid">
          <For each={props.items}>
            {(entity, index) => (
              <PreviewTile
                definition={entity.definition}
                mode={props.mode}
                subtitle={`状态 ID #${entity.id}`}
                badges={entityBadges(entity)}
                onClick={() =>
                  props.openModal({
                    kind: "entity",
                    who: props.who,
                    area: props.area,
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
                          who: props.who,
                          area: props.area,
                          entityId: entity.id,
                        })
                      }
                    />
                    <ActionButton
                      label="上移"
                      disabled={index() === 0}
                      onClick={() => {
                        props.updateState((draft) => {
                          draft.players[props.who][props.area] = moveInArray(
                            draft.players[props.who][props.area],
                            index(),
                            -1,
                          );
                        });
                      }}
                    />
                    <ActionButton
                      label="下移"
                      disabled={index() === props.items.length - 1}
                      onClick={() => {
                        props.updateState((draft) => {
                          draft.players[props.who][props.area] = moveInArray(
                            draft.players[props.who][props.area],
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
                          draft.players[props.who][props.area].splice(index(), 1);
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
}

export function PlayerEditor(props: PlayerEditorProps) {
  const player = () => getPlayer(props.state, props.who);
  const reversed = () => props.who === 1;
  const [shareCode, setShareCode] = createSignal("");
  const [importCharacters, setImportCharacters] = createSignal(true);
  const [importInitialPile, setImportInitialPile] = createSignal(true);
  const [importPile, setImportPile] = createSignal(true);
  const [importError, setImportError] = createSignal<string | null>(null);

  const roundSkillRows = createMemo(() => Array.from(player().roundSkillLog.entries()));

  const setRoundSkillRows = (rows: readonly (readonly [number, number[]])[]) => {
    props.updateState((draft) => {
      const nextLog = new Map(rows.map(([key, value]) => [key, [...value]]));
      draft.players[props.who].roundSkillLog = nextLog as unknown as typeof draft.players[0]["roundSkillLog"];
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
        const target = draft.players[props.who];
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
    <Surface title={`玩家 ${props.who} 状态编辑`}>
      <div class="space-y-5">
        <div class="grid gap-4">
          <Show when={reversed()} fallback={
            <div class="grid gap-4 md:grid-cols-3">
              <EntityAreaPanel
                title="支援区"
                description="展示支援牌，可排序、移除、追加。"
                items={player().supports}
                options={props.catalog.entitiesByType.support}
                mode="card"
                limit={props.state.config.maxSupportsCount}
                who={props.who}
                area="supports"
                openModal={props.openModal}
                updateState={props.updateState}
              />
              <Surface>
                <div class="space-y-4">
                  <SectionTitle title="角色区" description="固定 3 名角色，可切换出战与交换位置。" />
                  <div class="gi-editor-preview-grid">
                    <For each={player().characters}>
                      {(character, index) => (
                        <PreviewTile
                          definition={character.definition}
                          mode="card"
                          active={player().activeCharacterId === character.id}
                          subtitle={`状态 ID #${character.id}`}
                          badges={[
                            `生命 ${character.variables.health}/${character.variables.maxHealth}`,
                            `${getCharacterEnergyLabel(character)} ${character.variables.energy}/${character.variables.maxEnergy}`,
                          ]}
                          onClick={() =>
                            props.openModal({
                              kind: "character",
                              who: props.who,
                              characterId: character.id,
                            })
                          }
                          actions={
                            <>
                              <ActionButton
                                label="编辑"
                                onClick={() =>
                                  props.openModal({
                                    kind: "character",
                                    who: props.who,
                                    characterId: character.id,
                                  })
                                }
                              />
                              <ActionButton
                                label="设为出战"
                                tone="accent"
                                disabled={player().activeCharacterId === character.id}
                                onClick={() => {
                                  props.updateState((draft) => {
                                    draft.players[props.who].activeCharacterId = character.id;
                                  });
                                }}
                              />
                              <ActionButton
                                label="左移"
                                disabled={index() === 0}
                                onClick={() => {
                                  props.updateState((draft) => {
                                    draft.players[props.who].characters = moveInArray(
                                      draft.players[props.who].characters,
                                      index(),
                                      -1,
                                    );
                                  });
                                }}
                              />
                              <ActionButton
                                label="右移"
                                disabled={index() === player().characters.length - 1}
                                onClick={() => {
                                  props.updateState((draft) => {
                                    draft.players[props.who].characters = moveInArray(
                                      draft.players[props.who].characters,
                                      index(),
                                      1,
                                    );
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
              <EntityAreaPanel
                title="召唤区"
                description="展示召唤物，可排序、移除、追加。"
                items={player().summons}
                options={props.catalog.entitiesByType.summon}
                mode="card"
                limit={props.state.config.maxSummonsCount}
                who={props.who}
                area="summons"
                openModal={props.openModal}
                updateState={props.updateState}
              />
            </div>
          }>
            <div class="grid gap-4 md:grid-cols-3">
              <Surface>
                <ZonePreview
                  title="牌库"
                  description="点击打开牌库弹窗，可洗牌、调整顺序、追加与抽牌。"
                  count={player().pile.length}
                  items={player().pile}
                  onOpen={() => props.openModal({ kind: "pile", who: props.who })}
                />
              </Surface>
              <Surface>
                <ZonePreview
                  title="手牌"
                  description="点击打开手牌弹窗，可排序、追加并移动到支援区或角色区。"
                  count={player().hands.length}
                  items={player().hands}
                  onOpen={() => props.openModal({ kind: "hands", who: props.who })}
                />
              </Surface>
              <div class="hidden md:block" />
            </div>
          </Show>

          <div class="grid gap-4 md:grid-cols-3">
            <div class="hidden md:block" />
            <EntityAreaPanel
              title="出战状态"
              description="以图标列表展示，可排序、移除、追加。"
              items={player().combatStatuses}
              options={props.catalog.entitiesByType.combatStatus}
              mode="icon"
              who={props.who}
              area="combatStatuses"
              openModal={props.openModal}
              updateState={props.updateState}
            />
            <div class="hidden md:block" />
          </div>

          <Show when={reversed()} fallback={
            <div class="grid gap-4 md:grid-cols-3">
              <Surface>
                <ZonePreview
                  title="牌库"
                  description="点击打开牌库弹窗，可洗牌、调整顺序、追加与抽牌。"
                  count={player().pile.length}
                  items={player().pile}
                  onOpen={() => props.openModal({ kind: "pile", who: props.who })}
                />
              </Surface>
              <Surface>
                <ZonePreview
                  title="手牌"
                  description="点击打开手牌弹窗，可排序、追加并移动到支援区或角色区。"
                  count={player().hands.length}
                  items={player().hands}
                  onOpen={() => props.openModal({ kind: "hands", who: props.who })}
                />
              </Surface>
              <div class="hidden md:block" />
            </div>
          }>
            <div class="grid gap-4 md:grid-cols-3">
              <EntityAreaPanel
                title="支援区"
                description="展示支援牌，可排序、移除、追加。"
                items={player().supports}
                options={props.catalog.entitiesByType.support}
                mode="card"
                limit={props.state.config.maxSupportsCount}
                who={props.who}
                area="supports"
                openModal={props.openModal}
                updateState={props.updateState}
              />
              <Surface>
                <div class="space-y-4">
                  <SectionTitle title="角色区" description="固定 3 名角色，可切换出战与交换位置。" />
                  <div class="gi-editor-preview-grid">
                    <For each={player().characters}>
                      {(character, index) => (
                        <PreviewTile
                          definition={character.definition}
                          mode="card"
                          active={player().activeCharacterId === character.id}
                          subtitle={`状态 ID #${character.id}`}
                          badges={[
                            `生命 ${character.variables.health}/${character.variables.maxHealth}`,
                            `${getCharacterEnergyLabel(character)} ${character.variables.energy}/${character.variables.maxEnergy}`,
                          ]}
                          onClick={() =>
                            props.openModal({
                              kind: "character",
                              who: props.who,
                              characterId: character.id,
                            })
                          }
                          actions={
                            <>
                              <ActionButton
                                label="编辑"
                                onClick={() =>
                                  props.openModal({
                                    kind: "character",
                                    who: props.who,
                                    characterId: character.id,
                                  })
                                }
                              />
                              <ActionButton
                                label="设为出战"
                                tone="accent"
                                disabled={player().activeCharacterId === character.id}
                                onClick={() => {
                                  props.updateState((draft) => {
                                    draft.players[props.who].activeCharacterId = character.id;
                                  });
                                }}
                              />
                              <ActionButton
                                label="左移"
                                disabled={index() === 0}
                                onClick={() => {
                                  props.updateState((draft) => {
                                    draft.players[props.who].characters = moveInArray(
                                      draft.players[props.who].characters,
                                      index(),
                                      -1,
                                    );
                                  });
                                }}
                              />
                              <ActionButton
                                label="右移"
                                disabled={index() === player().characters.length - 1}
                                onClick={() => {
                                  props.updateState((draft) => {
                                    draft.players[props.who].characters = moveInArray(
                                      draft.players[props.who].characters,
                                      index(),
                                      1,
                                    );
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
              <EntityAreaPanel
                title="召唤区"
                description="展示召唤物，可排序、移除、追加。"
                items={player().summons}
                options={props.catalog.entitiesByType.summon}
                mode="card"
                limit={props.state.config.maxSummonsCount}
                who={props.who}
                area="summons"
                openModal={props.openModal}
                updateState={props.updateState}
              />
            </div>
          </Show>
        </div>

        <div class="grid gap-4 xl:grid-cols-3">
          <Surface>
            <div class="space-y-4">
              <SectionTitle title="玩家标记" />
              <div class="grid gap-3 sm:grid-cols-2">
                <BooleanField
                  label="已宣告结束"
                  value={player().declaredEnd}
                  onChange={(value) => {
                    props.updateState((draft) => {
                      draft.players[props.who].declaredEnd = value;
                    });
                  }}
                />
                <BooleanField
                  label="本回合已击倒对手"
                  value={player().hasDefeated}
                  onChange={(value) => {
                    props.updateState((draft) => {
                      draft.players[props.who].hasDefeated = value;
                    });
                  }}
                />
                <BooleanField
                  label="可视为重击"
                  value={player().canCharged}
                  onChange={(value) => {
                    props.updateState((draft) => {
                      draft.players[props.who].canCharged = value;
                    });
                  }}
                />
                <BooleanField
                  label="可视为下落攻击"
                  value={player().canPlunging}
                  onChange={(value) => {
                    props.updateState((draft) => {
                      draft.players[props.who].canPlunging = value;
                    });
                  }}
                />
                <BooleanField
                  label="已使用秘传"
                  value={player().legendUsed}
                  onChange={(value) => {
                    props.updateState((draft) => {
                      draft.players[props.who].legendUsed = value;
                    });
                  }}
                />
                <BooleanField
                  label="跳过下个行动轮次"
                  value={player().skipNextTurn}
                  onChange={(value) => {
                    props.updateState((draft) => {
                      draft.players[props.who].skipNextTurn = value;
                    });
                  }}
                />
              </div>
            </div>
          </Surface>

          <Surface>
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
                          const target = draft.players[props.who];
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
                              draft.players[props.who].dice = moveInArray(
                                draft.players[props.who].dice,
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
                              draft.players[props.who].dice = moveInArray(
                                draft.players[props.who].dice,
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
                              draft.players[props.who].dice.splice(index(), 1);
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

          <Surface>
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
        </div>

        <Surface>
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
      </div>
    </Surface>
  );
}
