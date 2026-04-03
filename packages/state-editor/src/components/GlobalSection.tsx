import { For } from "solid-js";
import { NumberField, SectionTitle, SelectField, Surface } from "./Fields";
import { useStateEditorContext } from "./GameStateEditor";
import { PHASE_LABELS } from "../constants";
import type { GameState, PhaseType } from "@gi-tcg/core";
import { ExtensionModal } from "./ExtensionModal";
import { ListItem, type ListItemButton } from "./ListItem";

export interface GlobalSectionProps {
  initialState: GameState;
}

export function GlobalSection(props: GlobalSectionProps) {
  const { gameState: state, updateState, openModal } = useStateEditorContext();
  return (
    <Surface title="游戏全局设置">
      <div class="space-y-6">
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <NumberField
            label="随机种子"
            value={state().config.randomSeed}
            onChange={(value) =>
              updateState((draft) => {
                draft.config.randomSeed = value;
                draft.iterators.random = value;
              })
            }
          />
          <SelectField
            label="阶段"
            value={state().phase}
            options={Object.entries(PHASE_LABELS).map(([value, label]) => ({
              value,
              label,
            }))}
            onChange={(value) =>
              updateState((draft) => {
                draft.phase = value as PhaseType;
              })
            }
          />
          <NumberField
            label="回合数"
            value={state().roundNumber}
            min={1}
            max={state().config.maxRoundsCount - 1}
            onChange={(value) =>
              updateState((draft) => {
                draft.roundNumber = value;
              })
            }
          />
          <SelectField
            label="当前行动方"
            value={state().currentTurn}
            options={[
              { value: 0, label: "玩家 0" },
              { value: 1, label: "玩家 1" },
            ]}
            onChange={(value) =>
              updateState((draft) => {
                draft.currentTurn = Number(value) as 0 | 1;
              })
            }
          />
        </div>

        <div class="rounded-3xl border border-white/10 bg-slate-950/20 p-4">
          <SectionTitle title="固定信息" />
          <div class="mt-3 space-y-2 text-sm text-slate-200">
            <p>
              数据版本：
              {state().data === props.initialState.data
                ? "最新官方数据"
                : "传入初始值"}
            </p>
            <p>下一个状态 ID：{state().iterators.id}</p>
          </div>
        </div>

        <div class="rounded-3xl border border-white/10 bg-slate-950/20 p-4">
          <SectionTitle
            title="扩展"
            description="扩展数量固定，只能编辑其内部状态。"
          />
          <div class="mt-3 space-y-2">
            <For each={state().extensions}>
              {(extension, index) => {
                const buttons: ListItemButton[] = [
                  {
                    content: "编辑",
                    variant: "primary",
                    col: 0,
                    onClick: () => {
                      openModal(() => <ExtensionModal index={index()} />);
                    },
                  },
                ];
                return (
                  <ListItem
                    title={
                      extension.definition.description ||
                      `扩展 #${extension.definition.id}`
                    }
                    description={
                      extension.definition.description
                        ? `扩展 #${extension.definition.id}`
                        : "无说明"
                    }
                    buttonColumns={1}
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
}
