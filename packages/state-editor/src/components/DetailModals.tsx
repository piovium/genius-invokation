import { For, Show } from "solid-js";

import type { AttachmentState, CharacterState, EntityState, GameState } from "@gi-tcg/core";

import {
  ActionButton,
  NumberField,
  SearchableSelect,
  SelectField,
  SectionTitle,
} from "./Fields";
import { JsonSchemaEditor } from "./JsonSchemaEditor";
import { Modal } from "./Modal";
import { Badge, PreviewTile, SummaryLine } from "./Previews";
import {
  allocateId,
  AURA_LABELS,
  AURA_OPTIONS,
  createAttachmentState,
  createEntityState,
  getAttachment,
  getCharacter,
  getCharacterEnergyLabel,
  getCharacterMaxEnergyLabel,
  getDefinitionName,
  getEntity,
  getPlayer,
  moveInArray,
  type Mutable,
  type EditorCatalog,
  type EditorEntityArea,
  type EditorModal,
  type UpdateGameState,
} from "../state";

function VariableGrid(props: {
  entries: readonly [string, number][];
  disabled?: boolean;
  readOnlyKeys?: readonly string[];
  onChange: (key: string, value: number) => void;
}) {
  const readOnly = new Set(props.readOnlyKeys ?? []);
  return (
    <div class="grid gap-3 sm:grid-cols-2">
      <For each={props.entries}>
        {([key, value]) => (
          <NumberField
            label={key}
            value={value}
            disabled={props.disabled}
            readOnly={readOnly.has(key)}
            onChange={(nextValue) => props.onChange(key, nextValue)}
          />
        )}
      </For>
    </div>
  );
}

interface CharacterModalProps {
  open: boolean;
  state: GameState;
  who: 0 | 1;
  characterId: number;
  catalog: EditorCatalog;
  updateState: UpdateGameState;
  openModal: (modal: EditorModal) => void;
  onClose: () => void;
}

export function CharacterModal(props: CharacterModalProps) {
  const player = () => getPlayer(props.state, props.who);
  const character = () => getCharacter(player(), props.characterId);
  const defeated = () => (character()?.variables.alive ?? 1) === 0;

  const updateCharacter = (updater: (target: Mutable<CharacterState>) => void) => {
    props.updateState((draft) => {
      const target = draft.players[props.who].characters.find(
        (item) => item.id === props.characterId,
      );
      if (target) {
        updater(target as unknown as Mutable<CharacterState>);
      }
    });
  };

  const current = () => character();

  return (
    <Show when={current()}>
      {(resolvedCharacter) => {
        const currentCharacter = () => resolvedCharacter();
        const specialEnergyLabel = () => getCharacterEnergyLabel(currentCharacter());
        const otherVariables = () =>
          Object.entries(currentCharacter().variables).filter(
            ([key]) =>
              !["health", "energy", "maxHealth", "maxEnergy", "aura", "alive"].includes(key),
          );

        return (
          <Modal
            open={props.open}
            title={`角色编辑 - ${getDefinitionName(currentCharacter().definition)}`}
            onClose={props.onClose}
          >
            <div class="space-y-5">
              <div class="grid gap-4 lg:grid-cols-[280px,1fr]">
                <PreviewTile
                  definition={currentCharacter().definition}
                  mode="card"
                  active={player().activeCharacterId === currentCharacter().id}
                  subtitle={`状态 ID #${currentCharacter().id}`}
                  badges={[
                    player().activeCharacterId === currentCharacter().id ? "当前出战" : "后台角色",
                    defeated() ? "已击倒" : "存活中",
                  ]}
                  actions={
                    <ActionButton
                      label="设为出战"
                      disabled={player().activeCharacterId === currentCharacter().id}
                      tone="accent"
                      onClick={() => {
                        props.updateState((draft) => {
                          draft.players[props.who].activeCharacterId = props.characterId;
                        });
                      }}
                    />
                  }
                />
                <div class="space-y-4">
                  <SectionTitle title="基础状态" />
                  <div class="grid gap-3 sm:grid-cols-2">
                    <NumberField
                      label="生命值"
                      value={currentCharacter().variables.health}
                      disabled={defeated()}
                      onChange={(value) =>
                        updateCharacter((target) => {
                          target.variables.health = value;
                        })
                      }
                    />
                    <NumberField
                      label={specialEnergyLabel()}
                      value={currentCharacter().variables.energy}
                      disabled={defeated()}
                      onChange={(value) =>
                        updateCharacter((target) => {
                          target.variables.energy = value;
                        })
                      }
                    />
                    <NumberField
                      label="最大生命值"
                      value={currentCharacter().variables.maxHealth}
                      disabled={defeated()}
                      onChange={(value) =>
                        updateCharacter((target) => {
                          target.variables.maxHealth = value;
                        })
                      }
                    />
                    <NumberField
                      label={getCharacterMaxEnergyLabel(currentCharacter())}
                      value={currentCharacter().variables.maxEnergy}
                      readOnly
                      onChange={() => undefined}
                    />
                    <SelectField
                      label="元素附着"
                      value={currentCharacter().variables.aura}
                      disabled={defeated()}
                      options={AURA_OPTIONS.map((value) => ({
                        value,
                        label: AURA_LABELS[value],
                      }))}
                      onChange={(value) =>
                        updateCharacter((target) => {
                          target.variables.aura = Number(value) as CharacterState["variables"]["aura"];
                        })
                      }
                    />
                  </div>
                  <div class="flex flex-wrap gap-2">
                    <ActionButton
                      label="标记为击倒"
                      tone="danger"
                      disabled={defeated()}
                      onClick={() => {
                        if (!window.confirm("确定要将该角色设为已击倒吗？")) {
                          return;
                        }
                        props.updateState((draft) => {
                          const target = draft.players[props.who].characters.find(
                            (item) => item.id === props.characterId,
                          );
                          if (!target) {
                            return;
                          }
                          target.variables.health = 0;
                          target.variables.energy = 0;
                          target.variables.aura = 0 as CharacterState["variables"]["aura"];
                          target.variables.alive = 0;
                          target.entities = [];
                        });
                      }}
                    />
                    <ActionButton
                      label="恢复存活"
                      disabled={!defeated()}
                      onClick={() => {
                        props.updateState((draft) => {
                          const target = draft.players[props.who].characters.find(
                            (item) => item.id === props.characterId,
                          );
                          if (!target) {
                            return;
                          }
                          target.variables.health = 1;
                          target.variables.alive = 1;
                        });
                      }}
                    />
                  </div>
                </div>
              </div>

              <Show when={otherVariables().length > 0}>
                <div class="space-y-3">
                  <SectionTitle title="额外变量" />
                  <VariableGrid
                    entries={otherVariables()}
                    disabled={defeated()}
                    onChange={(key, value) =>
                      updateCharacter((target) => {
                        target.variables[key] = value;
                      })
                    }
                  />
                </div>
              </Show>

              <div class="space-y-3">
                <SectionTitle title="角色区域实体" description="可追加状态与装备，并调整顺序。" />
                <SearchableSelect
                  label="追加实体"
                  options={props.catalog.characterEntities}
                  buttonText="加入角色区"
                  disabled={defeated()}
                  onSelect={(option) => {
                    props.updateState((draft) => {
                      const target = draft.players[props.who].characters.find(
                        (item) => item.id === props.characterId,
                      );
                      if (!target) {
                        return;
                      }
                      target.entities.push(
                        createEntityState(option.definition, allocateId(draft)) as unknown as typeof target.entities[number],
                      );
                    });
                  }}
                />
                <div class="gi-editor-preview-grid">
                  <For each={currentCharacter().entities}>
                    {(entity, index) => (
                      <PreviewTile
                        definition={entity.definition}
                        mode="icon"
                        subtitle={`状态 ID #${entity.id}`}
                        badges={[`变量 ${Object.keys(entity.variables).length}`]}
                        onClick={() =>
                          props.openModal({
                            kind: "entity",
                            who: props.who,
                            area: "characterEntities",
                            entityId: entity.id,
                            characterId: props.characterId,
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
                                  area: "characterEntities",
                                  entityId: entity.id,
                                  characterId: props.characterId,
                                })
                              }
                            />
                            <ActionButton
                              label="上移"
                              disabled={index() === 0}
                              onClick={() => {
                                props.updateState((draft) => {
                                  const target = draft.players[props.who].characters.find(
                                    (item) => item.id === props.characterId,
                                  );
                                  if (!target) {
                                    return;
                                  }
                                  target.entities = moveInArray(target.entities, index(), -1);
                                });
                              }}
                            />
                            <ActionButton
                              label="下移"
                              disabled={index() === currentCharacter().entities.length - 1}
                              onClick={() => {
                                props.updateState((draft) => {
                                  const target = draft.players[props.who].characters.find(
                                    (item) => item.id === props.characterId,
                                  );
                                  if (!target) {
                                    return;
                                  }
                                  target.entities = moveInArray(target.entities, index(), 1);
                                });
                              }}
                            />
                            <ActionButton
                              label="移除"
                              tone="danger"
                              onClick={() => {
                                props.updateState((draft) => {
                                  const target = draft.players[props.who].characters.find(
                                    (item) => item.id === props.characterId,
                                  );
                                  if (!target) {
                                    return;
                                  }
                                  target.entities.splice(index(), 1);
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
            </div>
          </Modal>
        );
      }}
    </Show>
  );
}

interface EntityModalProps {
  open: boolean;
  state: GameState;
  who: 0 | 1;
  area: EditorEntityArea;
  entityId: number;
  characterId?: number;
  catalog: EditorCatalog;
  updateState: UpdateGameState;
  openModal: (modal: EditorModal) => void;
  onClose: () => void;
}

function updateEntityByArea(
  props: EntityModalProps,
  updater: (entity: Mutable<EntityState>) => void,
) {
  props.updateState((draft) => {
    const player = draft.players[props.who];
    if (props.area === "characterEntities") {
      const character = player.characters.find((item) => item.id === props.characterId);
      const entity = character?.entities.find((item) => item.id === props.entityId);
      if (entity) {
        updater(entity as unknown as Mutable<EntityState>);
      }
      return;
    }
    const entity = player[props.area].find((item) => item.id === props.entityId);
    if (entity) {
      updater(entity as unknown as Mutable<EntityState>);
    }
  });
}

export function EntityModal(props: EntityModalProps) {
  const player = () => getPlayer(props.state, props.who);
  const entity = () => getEntity(player(), props.area, props.entityId, props.characterId);
  const allowAttachments = () => props.area === "hands" || props.area === "pile";

  return (
    <Show when={entity()}>
      {(resolvedEntity) => {
        const currentEntity = () => resolvedEntity();
        return (
          <Modal
            open={props.open}
            title={`实体编辑 - ${getDefinitionName(currentEntity().definition)}`}
            onClose={props.onClose}
          >
            <div class="space-y-5">
              <div class="grid gap-4 lg:grid-cols-[260px,1fr]">
                <PreviewTile
                  definition={currentEntity().definition}
                  mode={allowAttachments() ? "card" : "icon"}
                  subtitle={`状态 ID #${currentEntity().id}`}
                  badges={[`变量 ${Object.keys(currentEntity().variables).length}`]}
                />
                <div class="space-y-4">
                  <SectionTitle title="变量" />
                  <VariableGrid
                    entries={Object.entries(currentEntity().variables)}
                    onChange={(key, value) =>
                      updateEntityByArea(props, (target) => {
                        target.variables[key] = value;
                      })
                    }
                  />
                </div>
              </div>

              <Show when={allowAttachments()}>
                <div class="space-y-3">
                  <SectionTitle title="附着" description="仅手牌与牌库中的卡牌支持附着编辑。" />
                  <SearchableSelect
                    label="追加附着"
                    options={props.catalog.attachments}
                    buttonText="加入附着"
                    onSelect={(option) => {
                      props.updateState((draft) => {
                        const targetPlayer = draft.players[props.who];
                        const targetEntity = targetPlayer[props.area as "hands" | "pile"].find(
                          (item) => item.id === props.entityId,
                        );
                        if (!targetEntity) {
                          return;
                        }
                        targetEntity.attachments.push(
                          createAttachmentState(option.definition, allocateId(draft)) as unknown as typeof targetEntity.attachments[number],
                        );
                      });
                    }}
                  />
                  <div class="gi-editor-preview-grid">
                    <For each={currentEntity().attachments}>
                      {(attachment, index) => (
                        <PreviewTile
                          definition={attachment.definition}
                          mode="icon"
                          subtitle={`状态 ID #${attachment.id}`}
                          badges={[`变量 ${Object.keys(attachment.variables).length}`]}
                          onClick={() =>
                            props.openModal({
                              kind: "attachment",
                              who: props.who,
                              area: props.area as "hands" | "pile",
                              entityId: props.entityId,
                              attachmentId: attachment.id,
                            })
                          }
                          actions={
                            <>
                              <ActionButton
                                label="详情"
                                onClick={() =>
                                  props.openModal({
                                    kind: "attachment",
                                    who: props.who,
                                    area: props.area as "hands" | "pile",
                                    entityId: props.entityId,
                                    attachmentId: attachment.id,
                                  })
                                }
                              />
                              <ActionButton
                                label="上移"
                                disabled={index() === 0}
                                onClick={() => {
                                  props.updateState((draft) => {
                                    const targetPlayer = draft.players[props.who];
                                    const targetEntity = targetPlayer[
                                      props.area as "hands" | "pile"
                                    ].find((item) => item.id === props.entityId);
                                    if (!targetEntity) {
                                      return;
                                    }
                                    targetEntity.attachments = moveInArray(
                                      targetEntity.attachments,
                                      index(),
                                      -1,
                                    );
                                  });
                                }}
                              />
                              <ActionButton
                                label="下移"
                                disabled={index() === currentEntity().attachments.length - 1}
                                onClick={() => {
                                  props.updateState((draft) => {
                                    const targetPlayer = draft.players[props.who];
                                    const targetEntity = targetPlayer[
                                      props.area as "hands" | "pile"
                                    ].find((item) => item.id === props.entityId);
                                    if (!targetEntity) {
                                      return;
                                    }
                                    targetEntity.attachments = moveInArray(
                                      targetEntity.attachments,
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
                                    const targetPlayer = draft.players[props.who];
                                    const targetEntity = targetPlayer[
                                      props.area as "hands" | "pile"
                                    ].find((item) => item.id === props.entityId);
                                    if (!targetEntity) {
                                      return;
                                    }
                                    targetEntity.attachments.splice(index(), 1);
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
              </Show>
            </div>
          </Modal>
        );
      }}
    </Show>
  );
}

interface AttachmentModalProps {
  open: boolean;
  state: GameState;
  who: 0 | 1;
  area: "hands" | "pile";
  entityId: number;
  attachmentId: number;
  updateState: UpdateGameState;
  onClose: () => void;
}

export function AttachmentModal(props: AttachmentModalProps) {
  const player = () => getPlayer(props.state, props.who);
  const attachment = () => getAttachment(player(), props.area, props.entityId, props.attachmentId);
  return (
    <Show when={attachment()}>
      {(resolvedAttachment) => {
        const currentAttachment = () => resolvedAttachment();
        return (
          <Modal
            open={props.open}
            title={`附着编辑 - ${getDefinitionName(currentAttachment().definition)}`}
            onClose={props.onClose}
          >
            <div class="space-y-4">
              <PreviewTile
                definition={currentAttachment().definition}
                mode="icon"
                subtitle={`状态 ID #${currentAttachment().id}`}
                badges={[`变量 ${Object.keys(currentAttachment().variables).length}`]}
              />
              <VariableGrid
                entries={Object.entries(currentAttachment().variables)}
                onChange={(key, value) => {
                  props.updateState((draft) => {
                    const targetPlayer = draft.players[props.who];
                    const targetEntity = targetPlayer[props.area].find(
                      (item) => item.id === props.entityId,
                    );
                    const targetAttachment = targetEntity?.attachments.find(
                      (item) => item.id === props.attachmentId,
                    );
                    if (!targetAttachment) {
                      return;
                    }
                    (targetAttachment as unknown as Mutable<AttachmentState>).variables[key] = value;
                  });
                }}
              />
            </div>
          </Modal>
        );
      }}
    </Show>
  );
}

interface ExtensionModalProps {
  open: boolean;
  state: GameState;
  index: number;
  updateState: UpdateGameState;
  onClose: () => void;
}

export function ExtensionModal(props: ExtensionModalProps) {
  const extension = () => props.state.extensions[props.index];
  return (
    <Show when={extension()}>
      {(resolvedExtension) => {
        const currentExtension = () => resolvedExtension();
        return (
          <Modal
            open={props.open}
            title={`扩展编辑 - #${currentExtension().definition.id}`}
            description={currentExtension().definition.description}
            onClose={props.onClose}
          >
            <div class="space-y-4">
              <div class="grid gap-3 sm:grid-cols-2">
                <SummaryLine label="扩展编号" value={String(currentExtension().definition.id)} />
                <SummaryLine label="说明" value={currentExtension().definition.description || "无"} />
              </div>
              <JsonSchemaEditor
                schema={currentExtension().definition.schema}
                value={currentExtension().state}
                onChange={(value) => {
                  props.updateState((draft) => {
                    draft.extensions[props.index].state = value;
                  });
                }}
              />
            </div>
          </Modal>
        );
      }}
    </Show>
  );
}
