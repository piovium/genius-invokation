import type { GameState } from "@gi-tcg/core";
import type { UpdateGameState } from "../state";
import { SummaryLine } from "./Previews";
import { JsonSchemaEditor } from "./JsonSchemaEditor";
import type { ExpressiveJSONSchema } from "ya-json-schema-types";
import { Show } from "solid-js";
import { Modal } from "./Modal";

interface ExtensionContentProps {
  state: GameState;
  index: number;
  updateState: UpdateGameState;
}

function ExtensionModalContent(props: ExtensionContentProps) {
  const extension = () => props.state.extensions[props.index];
  return (
    <Show when={extension()}>
      {(resolvedExtension) => {
        const currentExtension = () => resolvedExtension();
        return (
          <div class="space-y-4">
            <div class="grid gap-3 sm:grid-cols-2">
              <SummaryLine
                label="扩展编号"
                value={String(currentExtension().definition.id)}
              />
              <SummaryLine
                label="说明"
                value={currentExtension().definition.description || "无"}
              />
            </div>
            <JsonSchemaEditor
              schema={
                currentExtension().definition.schema as ExpressiveJSONSchema
              }
              value={currentExtension().state}
              onChange={(value) => {
                const idx = props.index;
                props.updateState((draft) => {
                  draft.extensions[idx].state = value;
                });
              }}
            />
          </div>
        );
      }}
    </Show>
  );
}

// Modal version (keeping for backwards compatibility)
interface ExtensionModalProps extends ExtensionContentProps {
  open: boolean;
  onClose: () => void;
}

export function ExtensionModal(props: ExtensionModalProps) {
  return (
    <Modal open={props.open} title={`扩展编辑`} onClose={props.onClose}>
      <ExtensionModalContent
        state={props.state}
        index={props.index}
        updateState={props.updateState}
      />
    </Modal>
  );
}
