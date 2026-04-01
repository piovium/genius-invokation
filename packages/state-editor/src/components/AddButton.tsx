interface AddButtonProps {
  label: string;
  disabled?: boolean;
  onClick: () => void;
}

export function AddButton(props: AddButtonProps) {
  return (
    <button
      type="button"
      onClick={() => props.onClick()}
      disabled={props.disabled}
      class="w-full flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-white/20 bg-transparent px-3 py-3 text-sm text-slate-400 hover:border-white/40 hover:text-slate-300 hover:bg-white/5 transition disabled:opacity-40 disabled:cursor-not-allowed"
    >
      <span class="text-lg">+</span>
      <span>{props.label}</span>
    </button>
  );
}
