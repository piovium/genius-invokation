import {
  children as solidChildren,
  createSignal,
  onCleanup,
  onMount,
  splitProps,
  type ComponentProps,
  untrack,
} from "solid-js";

export interface AutoResizeTextProps extends ComponentProps<"p"> {
  /**
   * Minimum font size in pixels. Can also be set via CSS variable --auto-resize-min-font-size
   * @default 12
   */
  minFontSize?: number;
}

export function AutoResizeText(props: AutoResizeTextProps) {
  const [local, restProps] = splitProps(props, [
    "class",
    "minFontSize",
    "children",
  ]);
  let container!: HTMLParagraphElement;
  let textSpan!: HTMLSpanElement;
  let lastObservedWidth: number | null = null;
  let resizeObserver: ResizeObserver | null = null;
  const [fontSize, setFontSize] = createSignal<number | null>(null);
  const [shouldWrap, setShouldWrap] = createSignal(false);

  const getTextWidth = () => {
    const previousInlineFontSize = textSpan.style.fontSize;
    const previousInlineWhiteSpace = textSpan.style.whiteSpace;
    const previousInlineWordBreak = textSpan.style.wordBreak;
    try {
      // Always measure in single-line mode to avoid wrap/no-wrap oscillation.
      textSpan.style.fontSize = "";
      textSpan.style.whiteSpace = "nowrap";
      textSpan.style.wordBreak = "normal";
      const range = document.createRange();
      range.selectNodeContents(textSpan);
      return Math.ceil(range.getBoundingClientRect().width);
    } finally {
      textSpan.style.fontSize = previousInlineFontSize;
      textSpan.style.whiteSpace = previousInlineWhiteSpace;
      textSpan.style.wordBreak = previousInlineWordBreak;
    }
  };

  const measure = () => {
    // Get the CSS variable or use prop
    const computedStyle = getComputedStyle(container);
    const cssMinFontSize = computedStyle.getPropertyValue(
      "--auto-resize-min-font-size",
    );
    const minSize =
      (cssMinFontSize ? parseFloat(cssMinFontSize) : local.minFontSize) ?? 12;

    const containerWidth = Math.ceil(container.getBoundingClientRect().width);
    const baseFontSize = parseFloat(getComputedStyle(container).fontSize);
    const baseTextWidth = getTextWidth();

    if (baseTextWidth <= containerWidth) {
      setFontSize(null);
      setShouldWrap(false);
      return;
    }

    // Calculate the ratio and target font size from the natural text width.
    const ratio = containerWidth / baseTextWidth;
    let targetFontSize = Math.floor(baseFontSize * ratio);

    // Clamp to minimum and decide whether wrapping is still needed.
    if (targetFontSize < minSize) {
      targetFontSize = minSize;
    }

    const overflowAtTarget =
      baseTextWidth * (targetFontSize / baseFontSize) > containerWidth;

    setFontSize(targetFontSize);
    setShouldWrap(targetFontSize <= minSize && overflowAtTarget);
  };

  onMount(() => {
    // Initial measurement
    measure();
    // Re-measure on resize
    resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) {
        return;
      }
      const observedWidth = Math.round(entry.contentRect.width);
      if (lastObservedWidth === observedWidth) {
        return;
      }
      lastObservedWidth = observedWidth;
      measure();
    });
    resizeObserver.observe(container);
  });

  onCleanup(() => {
    resizeObserver?.disconnect();
  });

  const children = solidChildren(() => props.children);

  return (
    <p
      ref={container}
      class={`block overflow-hidden ${props.class}`}
      {...restProps}
    >
      <span
        ref={textSpan}
        style={{
          display: "inline",
          "font-size": fontSize() !== null ? `${fontSize()}px` : void 0,
          "white-space": shouldWrap() ? "normal" : "nowrap",
          "word-break": shouldWrap() ? "break-word" : void 0,
        }}
      >
        {children()}
      </span>
    </p>
  );
}
