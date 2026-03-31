import { For, createMemo, createSignal } from "solid-js";
import { BooleanField, SectionTitle, Surface } from "./Fields";
import { RoundSkillModal } from "./RoundSkillModal";
import { ListItem, type ListItemButton } from "./ListItem";
import { getImageUrl } from "../state/assets";
import { useStateEditorContext } from "./GameStateEditor";
import { createContext, useContext, type Accessor } from "solid-js";
import type { LoosePlayerState } from "../types";

interface PlayerContextValue {
  who: Accessor<0 | 1>;
  player: Accessor<LoosePlayerState>;
}

export const PlayerContext = createContext<PlayerContextValue>();

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
export const usePlayer = () => useContext(PlayerContext)!;

export function PlayerInfoSection() {
  const { updateState } = useStateEditorContext();
  const { who, player } = usePlayer();
  return (
    <Surface title={`玩家 ${who()} 信息`}>
      <div class="space-y-6">
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

        <div class="space-y-4 pt-4 border-t border-white/10">
          <RoundSkillLogSection />
        </div>
      </div>
    </Surface>
  );
}

function RoundSkillLogSection() {
  const { openModal, updateState } = useStateEditorContext();
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

  const usedCharacterIds = createMemo(() =>
    roundSkillRows().map(([charId]) => charId),
  );

  const openAddModal = () => {
    setEditingIndex(null);
    openModal(() => (
      <RoundSkillModal
        who={who()}
        disabledCharacterIds={usedCharacterIds()}
        onSubmit={handleSubmit}
      />
    ));
  };

  const openEditModal = (index: number) => {
    setEditingIndex(index);
    const editingId = editingData()?.characterId;
    const disabledCharacterIds = usedCharacterIds().filter(
      (id) => id !== editingId,
    );
    openModal(() => (
      <RoundSkillModal
        who={who()}
        editingCharacterId={editingData()?.characterId}
        editingSkillIds={editingData()?.skillIds}
        disabledCharacterIds={disabledCharacterIds}
        onSubmit={handleSubmit}
      />
    ));
  };

  const handleSubmit = (characterId: number, skillIds: number[]) => {
    const rows = [...roundSkillRows()];
    const editIdx = editingIndex();

    if (editIdx !== null) {
      rows[editIdx] = [characterId, skillIds];
    } else {
      rows.push([characterId, skillIds]);
    }

    setRoundSkillRows(rows);
  };

  const handleDelete = (index: number) => {
    setRoundSkillRows(roundSkillRows().filter((_, i) => i !== index));
  };

  const editingData = createMemo(() => {
    const idx = editingIndex();
    if (idx === null) {
      return void 0;
    }
    const row = roundSkillRows()[idx];
    if (!row) {
      return void 0;
    }
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

      <div class="space-y-2">
        <For each={roundSkillRows()}>
          {([characterId, skillIds], index) => (
            <RoundSkillLogListItem
              characterId={characterId}
              skillIds={skillIds}
              index={index()}
              onEdit={() => openEditModal(index())}
              onDelete={() => handleDelete(index())}
            />
          )}
        </For>

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
}

interface RoundSkillLogListItemProps {
  characterId: number;
  skillIds: number[];
  index: number;
  onEdit: () => void;
  onDelete: () => void;
}

function RoundSkillLogListItem(props: RoundSkillLogListItemProps) {
  const { catalog } = useStateEditorContext();

  const character = createMemo(() =>
    catalog().characters.find(
      (item) => item.id === props.characterId,
    ),
  );
  const skills = createMemo(() =>
    props.skillIds
      .map((id) =>
        catalog().allInitiativeSkills.find((skill) => skill.id === id),
      )
      .filter((skill) => !!skill),
  );
  const imageSrc = createMemo(() => {
    const item = character();
    return item ? getImageUrl(item, "icon") : void 0;
  });

  const buttons: ListItemButton[] = [
    {
      content: "编辑",
      variant: "primary",
      col: 0,
      onClick: () => props.onEdit(),
    },
    {
      content: "删除",
      variant: "danger",
      col: 1,
      onClick: () => props.onDelete(),
    },
  ];

  return (
    <ListItem
      imageSrc={imageSrc()}
      title={character()?.name ?? `角色 #${props.characterId}`}
      tags={skills().map((skill) => skill.name)}
      buttonColumns={2}
      buttons={buttons}
    />
  );
}
