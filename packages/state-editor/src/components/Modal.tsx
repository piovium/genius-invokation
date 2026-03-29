import { Show, type JSX } from "solid-js";

export interface ModalProps {
  open: boolean;
  title: string;
  description?: string;
  footer?: JSX.Element;
  onClose: () => void;
  children: JSX.Element;
}

export function Modal(props: ModalProps) {
  return (
    <Show when={props.open}>
      <div class="gi-editor-modal-backdrop" onClick={() => props.onClose()}>
        <div
          class="gi-editor-modal-panel gi-editor-scroll"
          onClick={(event) => event.stopPropagation()}
        >
          <div class="sticky top-0 z-1 border-b border-white/10 bg-slate-950/70 px-5 py-4 backdrop-blur">
            <div class="flex items-start justify-between gap-4">
              <div>
                <h2 class="text-xl font-semibold text-amber-50">
                  {props.title}
                </h2>
                <Show when={props.description}>
                  <p class="mt-1 text-sm text-slate-300/80">
                    {props.description}
                  </p>
                </Show>
              </div>
              <button
                type="button"
                class="gi-editor-button rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-slate-100"
                onClick={() => props.onClose()}
              >
                关闭
              </button>
            </div>
          </div>
          <div class="p-5">{props.children}</div>
          <Show when={props.footer}>
            <div class="sticky bottom-0 border-t border-white/10 bg-slate-950/70 px-5 py-4 backdrop-blur">
              {props.footer}
            </div>
          </Show>
        </div>
      </div>
    </Show>
  );
}
