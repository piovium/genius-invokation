import { Show } from "solid-js";
import { SectionTitle } from "./Fields";
import { Modal } from "./Modal";
import { PreviewTile } from "./Previews";
import {
  getAttachment,
  getDefinitionName,
  getPlayer,
} from "../state";
import { VariableGrid } from "./VariableGrid";
import { useStateEditorContext } from "./GameStateEditor";

interface AttachmentContentProps {
  who: 0 | 1;
  area: "hands" | "pile";
  entityId: number;
  attachmentId: number;
}

function AttachmentModalContent(props: AttachmentContentProps) {
  const { gameState, updateState } = useStateEditorContext();

  const player = () => getPlayer(gameState(), props.who);
  const attachment = () =>
    getAttachment(player(), props.area, props.entityId, props.attachmentId);
  return (
    <Show when={attachment()}>
      {(resolvedAttachment) => {
        const currentAttachment = () => resolvedAttachment();
        return (
          <div class="space-y-2">
            <div class="flex gap-4">
              <div class="shrink-0 w-1/5">
                <PreviewTile
                  definition={currentAttachment().definition}
                  mode="icon"
                  subtitle={`状态 ID #${currentAttachment().id}`}
                  badges={[
                    `变量 ${Object.keys(currentAttachment().variables).length}`,
                  ]}
                />
              </div>
              <div class="flex-1 space-y-4 min-w-0">
                <SectionTitle title="变量编辑" />
                <VariableGrid
                  entries={Object.entries(currentAttachment().variables)}
                  onChange={(key, value) => {
                    const who = props.who;
                    const area = props.area;
                    const etId = props.entityId;
                    const attId = props.attachmentId;
                    updateState((draft) => {
                      const targetPlayer = draft.players[who];
                      const targetEntity = targetPlayer[area].find(
                        (item) => item.id === etId,
                      );
                      const targetAttachment = targetEntity?.attachments.find(
                        (item) => item.id === attId,
                      );
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
      }}
    </Show>
  );
}

interface AttachmentModalProps extends AttachmentContentProps {}

export function AttachmentModal(props: AttachmentModalProps) {
  const { gameState } = useStateEditorContext();
  const player = () => getPlayer(gameState(), props.who);
  const attachment = () =>
    getAttachment(player(), props.area, props.entityId, props.attachmentId);
  const title = () =>
    attachment()
      ? `附着编辑 - ${getDefinitionName(attachment()?.definition)}`
      : "附着编辑";
  return (
    <Modal title={title()}>
      <AttachmentModalContent
        who={props.who}
        area={props.area}
        entityId={props.entityId}
        attachmentId={props.attachmentId}
      />
    </Modal>
  );
}
