# Custom data loader (with example page)

A example package including:

- GTS provider for loading custom data
- Example of defining custom data using GTS
- A web page including GTS editor, constructing AssetsManager with custom data and pass it through DeckBuilder and Core Game.

## Module evaluator

`loadMod` is asynchronous. In Node.js it uses the `node-vm` evaluator by
default (Node must be started with `--experimental-vm-modules`); in browsers
it uses `esbuild-wasm` by default. Both evaluators expose only the GTS runtime,
custom provider VM, and the data module to the custom module. Import data
values explicitly instead of relying on globals.

```ts
import { DamageType, DiceType } from "@gi-tcg/core/data";
```

```ts
const loader = new CustomDataLoader({
  backend: "esbuild-wasm",
});
await loader.loadMod(source);
```

## Overriding official data

Specify an official ID to replace its game definition and shallowly override
its presentation data:

```gts
define status {
  id 100 as ResistantFormOverride;
  name "Custom Resistant Form";
  description "Custom status description.";
  playingDescription "Description while the status is on stage.";
  usage 2;
};
```

An explicit `id` does not consume an automatically generated ID. The custom
definition takes precedence over the official game definition with the same
ID. `done()` returns a `AssetsManagerOptions` that can be
passed to `AssetsManager`:

```ts
const [gameData, amOptions] = loader.done();
const assets = new AssetsManager(amOptions);
```


## Note

File `gts-language-configuration.json` and `gts.tmLanguage.json` are manually copied from [gts repository](https://github.com/piovium/gts/tree/main/packages/vscode). We can introduce an auto update script later.
