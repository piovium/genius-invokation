# Custom data loader (with example page)

A example package including:

- GTS provider for loading custom data
- Example of defining custom data using GTS
- A web page including GTS editor, constructing AssetsManager with custom data and pass it through DeckBuilder and Core Game.

## Module evaluator

`loadMod` is asynchronous. In Node.js it uses the `node-vm` evaluator by
default (Node must be started with `--experimental-vm-modules`); in browsers
it uses `esbuild-wasm` by default. Both evaluators expose only the GTS runtime,
custom provider VM, and the builder module to the custom module. Import builder
values explicitly instead of relying on globals. 

```ts
import { DamageType, DiceType } from "@gi-tcg/core/builder";
```

```ts
const loader = new CustomDataLoader({
  backend: "esbuild-wasm",
});
await loader.loadMod(source);
```

## Note

File `gts-language-configuration.json` and `gts.tmLanguage.json` are manually copied from [gts repository](https://github.com/piovium/gts/tree/main/packages/vscode). We can introduce an auto update script later.
