import { SummaryLine } from "./Previews";
import { JsonSchemaEditor } from "./JsonSchemaEditor";
import type { ExpressiveJSONSchema } from "ya-json-schema-types";
import { Show } from "solid-js";
import { Modal } from "./Modal";
import { useStateEditorContext } from "./GameStateEditor";

interface ExtensionContentProps {
  index: number;
}

function ExtensionModalContent(props: ExtensionContentProps) {
  const { gameState, updateState } = useStateEditorContext();
  const extension = () => gameState().extensions[props.index];
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
                updateState((draft) => {
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

export function ExtensionModal(props: ExtensionContentProps) {
  return (
    <Modal title="扩展编辑">
      <ExtensionModalContent index={props.index} />
    </Modal>
  );
}
