import { Modal } from "./Modal";

interface ConfirmModalProps {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}

export function ConfirmModal(props: ConfirmModalProps) {
  return (
    <Modal title={props.title} onClose={() => props.onCancel?.()}>
      <div class="space-y-4">
        <p class="text-sm text-slate-300">{props.message}</p>
        <div class="flex justify-end gap-3">
          <button
            type="button"
            data-close-dialog
            onClick={() => props.onCancel?.()}
            class="px-4 py-2 rounded-xl border border-white/20 bg-slate-800 text-sm text-slate-300 hover:bg-slate-700 transition"
          >
            {props.cancelText ?? "取消"}
          </button>
          <button
            type="button"
            data-close-dialog
            onClick={() => props.onConfirm?.()}
            class="px-4 py-2 rounded-xl border border-rose-500/50 bg-rose-500/20 text-sm text-rose-100 hover:bg-rose-500/30 transition"
          >
            {props.confirmText ?? "确认"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
