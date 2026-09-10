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

Select **TNB（tsgo）服务**. The default address is `/gts` on the page's own origin;
HTTPS pages use WSS automatically. Vite forwards this path to
`ws://127.0.0.1:3001` during development. Set `GTS_LANGUAGE_SERVER_PROXY_TARGET`
when the development backend uses a different address. `--port` changes the
backend port. The service listens on loopback by default, accepts localhost pages
default, and accepts additional page origins with repeated `--origin` arguments.
Each connection gets its own temporary project and existing GTS Node language
server process, using TNB through the GTS/Volar SDK interface. Closing the
connection terminates that process and removes its temporary files. By default four
connections are accepted. `/health` reports the configured engine and active
session count; successful diagnostic/feature requests are still needed to verify
the checker actually works.

## Deploying the example editor and checker

The existing main game-server image does not contain this optional checker.
Deploy the static editor and this Node service separately, with `/gts` forwarded
by the same reverse proxy that serves the editor. The browser's local route
continues to work while the checker is stopped.

Build with the repository's Node 26 and pinned pnpm 12, including declarations:

```sh
pnpm install --frozen-lockfile
pnpm build "custom-data-loader..."
pnpm --filter @gi-tcg/custom-data-loader build:web
pnpm --filter @gi-tcg/custom-data-loader deploy --legacy --prod --frozen-lockfile /srv/gts-checker
```

Serve `packages/custom-data-loader/dist/web` as static files. The deployed
checker includes `dist/gts`, its entry script, the shared workspace module and
production dependencies, including the exact TNB alias and GTS language server.
It starts directly with Node and needs no Vite or other development dependency:

```sh
cd /srv/gts-checker
GTS_LANGUAGE_SERVER_ORIGINS=https://cards.example.org \
  node scripts/language-server.mjs
```

Configure the process with `GTS_LANGUAGE_SERVER_HOST` (default `127.0.0.1`),
`GTS_LANGUAGE_SERVER_PORT` (`3001`), `GTS_LANGUAGE_SERVER_ORIGINS` (comma-separated
exact page origins), and `GTS_LANGUAGE_SERVER_MAX_SESSIONS` (`4`). CLI equivalents
are `--host`, `--port`, repeated `--origin` and `--max-sessions`. `GTS_TSDK` or
`--tsdk` selects an explicitly installed TNB SDK; normally use the shipped alias.
For a separate checker domain or another proxy path, build the frontend with
`VITE_GTS_LANGUAGE_SERVER_URL=wss://checker.example.org/gts` or `/api/gts`.
The toolbar also lets a user replace and persist this address.

For example, inside the HTTPS server block that already serves the editor:

```nginx
location = /gts {
    proxy_pass http://127.0.0.1:3001/gts;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_read_timeout 300s;
    proxy_send_timeout 300s;
}
```

Set the allowed origin to the public page URL, such as `https://cards.example.org`.
The reverse proxy preserves the browser's Origin header; setting an allowed
origin does not replace any access control already used by the deployment.
`GET http://127.0.0.1:3001/health` reports the configured engine and active sessions.
Check both editor routes, real errors and repairs, disconnect/reconnect and
simultaneous sessions after deployment; health alone does not check semantics.

An optional image uses the same typed build and production deployment:

```sh
docker build -f packages/custom-data-loader/Dockerfile.language-service -t gts-checker .
docker run --rm -p 127.0.0.1:3001:3001 \
  -e GTS_LANGUAGE_SERVER_ORIGINS=https://cards.example.org gts-checker
docker build -f packages/custom-data-loader/Dockerfile.language-service \
  --target web-artifacts --output type=local,dest=./editor-static .
```

The image binds `0.0.0.0` inside the container. The example publishes the port on
the host's loopback for the reverse proxy. It uses the official Node 26.8.1 image
on Debian bookworm/glibc, pinned by its multi-platform digest. Build and runtime
stages inherit CA certificates and OpenSSL from the shared base image for HTTPS
downloads and native dependencies.

Node 26.8.1 in the image and Node 26.8.2 used for host checks both satisfy the
repository's `^26.1.0` requirement. Validate the built image on the architecture
used for deployment.

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

Local diagnostics tools can subscribe to `observeLanguageService` from
`src/dev-editor.ts` for raw protocol messages and session lifecycle events.
The editor retains no observation history and observers cannot replace replies.
An acceptance collector may set `GTS_BROWSER_SESSION_SCENARIO` to its reviewed
ES module exporting `run(helpers)` to append a scenario to the same real browser
test setup. The two normal behavioral tests still run in full.

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
