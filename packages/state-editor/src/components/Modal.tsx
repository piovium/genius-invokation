import {
  createContext,
  onCleanup,
  onMount,
  Show,
  useContext,
  type JSX,
} from "solid-js";

export interface ModalProps {
  ref?: HTMLDialogElement | ((el: HTMLDialogElement) => void);
  title: string;
  description?: string;
  footer?: JSX.Element;
  children: JSX.Element;
  onClose?: () => void;
}

export interface ModalContextValue {
  removeSelf: () => void;
}

const ModalContext = createContext<ModalContextValue>({
  removeSelf: () => {},
});
export const ModalContextProvider = ModalContext.Provider;

export function Modal(props: ModalProps) {
  const { removeSelf } = useContext(ModalContext);

  let ref!: HTMLDialogElement;
  const closeHandler = () => {
    props.onClose?.();
    removeSelf();
  };
  const onClickClose = (event: MouseEvent) => {
    if ((event.target as HTMLElement)?.closest("[data-close-dialog]")) {
      ref.close();
    }
  };

  onMount(() => {
    ref.addEventListener("click", onClickClose);
    ref.showModal();
  });

  onCleanup(() => {
    ref.close();
    ref.removeEventListener("click", onClickClose);
  });
  return (
    <dialog
      ref={(el) => (ref = el) && (props.ref as any)?.(el)}
      class="gi-editor-modal-panel gi-editor-scroll"
      onClose={closeHandler}
    >
      <div class="sticky top-0 z-1 border-b border-white/10 bg-slate-950/70 px-5 py-4 backdrop-blur">
        <div class="flex items-start justify-between gap-4">
          <div>
            <h2 class="text-xl font-semibold text-amber-50">{props.title}</h2>
            <Show when={props.description}>
              <p class="mt-1 text-sm text-slate-300/80">{props.description}</p>
            </Show>
          </div>
          <button
            type="button"
            class="gi-editor-button rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-slate-100"
            data-close-dialog
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
    </dialog>
  );
}
