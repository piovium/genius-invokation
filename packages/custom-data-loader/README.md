# Custom data loader (with example page)

A example package including:

- GTS provider for loading custom data
- Example of defining custom data using GTS
- A web page including GTS editor, constructing AssetsManager with custom data and pass it through DeckBuilder and Core Game.

## Editor type checking

The editor toolbar offers **浏览器本地** (browser local, the default) and
**TNB（tsgo）服务** (a Node language service). It remembers the selection and
service address. Changing the selection keeps the editor buffer and undo history;
the old language client, diagnostics and Worker/socket are disposed. A failed
service remains selected and displays an error. Use **重新连接** to retry or select
the browser route explicitly.

Prepare the existing workspace dependencies and declarations, then start the page:

```sh
pnpm install --frozen-lockfile
pnpm build "custom-data-loader..."
pnpm --filter @gi-tcg/custom-data-loader dev
```

Browser checking uses the existing GTS Worker and TypeScript **6.0.3** from
jsDelivr. It needs no checking server; initial SDK downloads still need a network
connection. Both routes use the same provider declarations and TypeScript/GTS
project settings.

To use the backend route, start this in another terminal:

```sh
pnpm --filter @gi-tcg/custom-data-loader dev:language-server
```

The service resolves the workspace `typescript` package, which must be the TNB
alias. A stock TypeScript SDK is rejected. For an explicitly prepared TNB SDK:

```sh
pnpm --filter @gi-tcg/custom-data-loader dev:language-server --tsdk /absolute/path/to/typescript-native-bridge/lib
```

Select **TNB（tsgo）服务** with `ws://127.0.0.1:3001/gts`. `--port` changes the port.
The service listens on loopback only, accepts pages served from localhost by
default, and accepts additional page origins with repeated `--origin` arguments.
Each connection gets its own temporary project and existing GTS Node language
server process, using TNB through the GTS/Volar SDK interface. Closing the
connection terminates that process and removes its temporary files. At most four
connections are accepted. `/health` reports the configured engine and active
session count; successful diagnostic/feature requests are still needed to verify
the checker actually works.

The backend handles language analysis. Card compilation and execution keep using
the existing `CustomDataLoader` and browser `esbuild-wasm` evaluator.

The transport/workspace regression tests run through the package's existing test
entry point:

```sh
pnpm --filter @gi-tcg/custom-data-loader test --run __tests__/language-service.test.mjs
```

These tests cover project resolution, transport mapping and rejected stock SDKs.
They do not substitute for real browser tests of both engines, source retention,
diagnostics, card loading and reconnect behavior.

The real browser test uses the workspace's existing Vitest/Puppeteer tools and
an installed Chrome or Chromium. It starts the actual Vite page and backend in
isolated sessions; it does not download a browser. After the declaration build:

```sh
GTS_TSDK=/absolute/path/to/typescript-native-bridge/lib \
GTS_CHROME_PATH=/absolute/path/to/chrome \
GTS_BROWSER_ARTIFACTS=/absolute/path/to/test-output \
pnpm --filter @gi-tcg/custom-data-loader test:browser
```

In PowerShell, set those variables with `$env:GTS_TSDK = '...'` (and similarly
for the other two) before running `pnpm`. `GTS_TSDK` is required; Chrome defaults
to its standard Windows installation path. The optional artifact directory
receives actual browser console/protocol events and a screenshot. Both tests
must pass: a selected test or successful initialization alone does not verify
the complete behavior.

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
