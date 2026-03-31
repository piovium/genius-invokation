import { SectionTitle } from "./Fields";
import { Modal } from "./Modal";
import { PreviewTile } from "./Previews";
import { VariableGrid } from "./VariableGrid";
import { useStateEditorContext } from "./GameStateEditor";
import { getDefinitionName, getEntityVisibleVarBadges } from "../state/catalog";
import { getAttachment } from "../state/common";
import type { AttachmentState } from "@gi-tcg/core";

interface AttachmentContentProps {
  who: 0 | 1;
  area: "hands" | "pile";
  entityId: number;
  attachment: AttachmentState;
}

function AttachmentModalContent(props: AttachmentContentProps) {
  const { updateState } = useStateEditorContext();

  return (
    <div class="space-y-2">
      <div class="flex gap-4">
        <div class="shrink-0 w-1/5">
          <PreviewTile
            definition={props.attachment.definition}
            mode="icon"
            subtitle={`状态 ID #${props.attachment.id}`}
            badges={getEntityVisibleVarBadges(props.attachment)}
          />
        </div>
        <div class="flex-1 space-y-4 min-w-0">
          <SectionTitle title="变量编辑" />
          <VariableGrid
            entries={Object.entries(props.attachment.variables)}
            onChange={(key, value) => {
              const attId = props.attachment.id;
              updateState((draft) => {
                const targetAttachment = getAttachment(draft, attId);
                if (!targetAttachment) {
                  return;
                }
                targetAttachment.variables[key] = value;
              });
            }}
          />
        </div>
      </div>
    </div>
  );
}

export function AttachmentModal(props: AttachmentContentProps) {
  return (
    <Modal
      title={`附着编辑 - ${getDefinitionName(props.attachment.definition)}`}
    >
      <AttachmentModalContent
        who={props.who}
        area={props.area}
        entityId={props.entityId}
        attachment={props.attachment}
      />
    </Modal>
  );
}
