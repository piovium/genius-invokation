# `@gi-tcg/card-data-viewer` GI-TCG Card Info Viewer Component for Solid App

## Usage

```ts
import { createCardDataViewer } from "@gi-tcg/card-data-viewer";

const App = () => {
  const { CardDataViewer, showCharacter, showState, showCard, showSkill } =
    createCardDataViewer({
        // assetsManager?: Accessor<AssetsManager>;
        // locale?: Accessor<Locale>;
    });
  onMount(() => {
    showState(
      "character",
      /* character state data */,
      [
        /* combat status state data */
      ],
      { includesImage: false },
    );
    showState("summon", { /* state data */ });
    showState("card", { /* state data */ });
    showCard(212111, { includesImage: true });
    showCharacter(1610);
    showSkill(12111);
  });
  // [...]
}
```
