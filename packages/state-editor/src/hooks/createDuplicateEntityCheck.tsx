import { batch, createSignal } from "solid-js";
import type { Accessor } from "solid-js";
import { ConfirmModal } from "../components/ConfirmModal";
import type { AttachmentState, EntityState } from "@gi-tcg/core";
import { getDefinitionName } from "../state/catalog";
import { useStateEditorContext } from "../components/GameStateEditor";

interface DuplicateCheckOptions<T extends EntityState | AttachmentState> {
  items: Accessor<readonly T[]>;
  onReplace: (item: T["definition"], index: number) => void;
  subject?: string;
}

interface DuplicateCheckResult<T extends EntityState | AttachmentState> {
  checkDuplicate: (item: T["definition"]) => number;
  confirmOverride: (done?: () => void) => void;
  handleConfirmReplace: () => void;
  handleCancelReplace: () => void;
}

export function createDuplicateEntityCheck<
  T extends EntityState | AttachmentState,
>(options: DuplicateCheckOptions<T>): DuplicateCheckResult<T> {
  const { openModal } = useStateEditorContext();
  const [pendingDefinition, setPendingDefinition] = createSignal<
    T["definition"] | null
  >(null);
  const [existingIndex, setExistingIndex] = createSignal(-1);

  const checkDuplicate = (item: T["definition"]): number => {
    const index = options.items().findIndex((i) => i.definition.id === item.id);
    batch(() => {
      if (index !== -1) {
        setPendingDefinition(() => item);
      }
    });
    setExistingIndex(index);
    return index;
  };

  const confirmOverride = (done?: () => void) => {
    const pending = pendingDefinition();
    if (!pending) return;
    openModal(() => (
      <ConfirmModal
        title={`检测到重复${options.subject || "实体"}`}
        message={
          pendingDefinition()
            ? `区域中已存在相同类型的${options.subject || "实体"}「${getDefinitionName(pending)}」，是否覆盖？`
            : ""
        }
        confirmText="确认覆盖"
        cancelText="取消"
        onConfirm={() => {
          handleConfirmReplace();
          done?.();
        }}
        onCancel={handleCancelReplace}
      />
    ));
  };

  const handleConfirmReplace = () => {
    const item = pendingDefinition();
    const index = existingIndex();
    if (item && index !== -1) {
      options.onReplace(item, index);
    }
    setPendingDefinition(null);
    setExistingIndex(-1);
  };

  const handleCancelReplace = () => {
    setPendingDefinition(null);
    setExistingIndex(-1);
  };

  return {
    checkDuplicate,
    confirmOverride,
    handleConfirmReplace,
    handleCancelReplace,
  };
}
