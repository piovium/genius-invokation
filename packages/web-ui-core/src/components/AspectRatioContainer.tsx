import { children, splitProps, type ComponentProps } from "solid-js";

export function AspectRatioContainer(props: ComponentProps<"div">) {
  const [local, restProps] = splitProps(props, [
    "class",
    "children",
  ]);
  const child = children(() => local.children);
  return (
    <div
      class={`grid-area-[1/1] aspect-ratio-[16/9] h-full max-w-full relative pointer-events-none children-pointer-events-auto ${
        local.class ?? ""
      }`}
      {...restProps}
    >
      {child()}
    </div>
  );
}
