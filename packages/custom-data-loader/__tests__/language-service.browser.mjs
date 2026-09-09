import { afterAll, beforeAll, expect, test } from "vitest";
import { createServer } from "vite";
import puppeteer from "puppeteer-core";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawn } from "node:child_process";
import devConfig from "../vite.config.ts";

const packageRoot = fileURLToPath(new URL("../", import.meta.url));
const artifactDirectory = process.env.GTS_BROWSER_ARTIFACTS;
let vite, browser, page, backend, profile, defaultSource, languageProxy;
const dialogs = [];
const events = [];
const record = (kind, detail) =>
  events.push({ time: new Date().toISOString(), kind, detail });

async function startBackend(port = 0) {
  // Run the product entry outside Vitest's development-condition module hooks.
  const script = `import { startLanguageServer } from ${JSON.stringify(new URL("../scripts/language-server.mjs", import.meta.url).href)};
const service = await startLanguageServer({ port: ${port}, tsdk: process.env.GTS_TSDK });
console.log(JSON.stringify({ port: service.port, engine: service.engine }));
for (const signal of ["SIGTERM", "SIGINT"]) process.once(signal, () => service.close().catch(error => { console.error(error); process.exitCode = 1; }));`;
  const child = spawn(
    process.execPath,
    [
      "--input-type=module",
      "--eval",
      script +
        '\nprocess.on("message", () => service.close().then(() => process.disconnect()));',
    ],
    {
      cwd: packageRoot,
      stdio: ["ignore", "pipe", "pipe", "ipc"],
      windowsHide: true,
    },
  );
  const closed = new Promise((resolve) => child.once("close", resolve));
  child.stderr.on("data", (chunk) => {
    record("backend:stderr", chunk.toString());
    process.stderr.write(chunk);
  });
  const info = await new Promise((resolve, reject) => {
    let output = "";
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error("Backend startup timed out"));
    }, 30_000);
    child.once("error", reject);
    child.once("exit", (code) => {
      clearTimeout(timer);
      reject(new Error(`Backend exited during startup: ${code}`));
    });
    child.stdout.on("data", (chunk) => {
      output += chunk;
      if (output.includes("\n")) {
        clearTimeout(timer);
        resolve(JSON.parse(output.slice(0, output.indexOf("\n"))));
      }
    });
  });
  if (languageProxy)
    languageProxy.options.target = `ws://127.0.0.1:${info.port}`;
  return {
    ...info,
    async close() {
      if (child.connected) child.send("stop");
      await closed;
    },
  };
}

beforeAll(async () => {
  if (!process.env.GTS_TSDK)
    throw new Error(
      "Set GTS_TSDK to the pinned TNB lib directory for the real backend test.",
    );
  profile = await mkdtemp(path.join(tmpdir(), "gts-browser-test-"));
  vite = await createServer({
    ...devConfig,
    configFile: false,
    root: packageRoot,
    cacheDir: path.join(profile, "vite-cache"),
    server: {
      ...devConfig.server,
      host: "127.0.0.1",
      port: 0,
      proxy: {
        ...devConfig.server.proxy,
        "/gts": {
          ...devConfig.server.proxy["/gts"],
          configure(proxy) {
            languageProxy = proxy;
          },
        },
      },
    },
  });
  await vite.listen();
  browser = await puppeteer.launch({
    executablePath:
      process.env.GTS_CHROME_PATH ??
      "C:/Program Files/Google/Chrome/Application/chrome.exe",
    headless: true,
    userDataDir: profile,
    args: ["--no-first-run"],
  });
  page = await browser.newPage();
  const protocol = await page.createCDPSession();
  await protocol.send("Network.enable");
  protocol.on("Network.webSocketFrameSent", (event) =>
    record("lsp:sent", event.response.payloadData),
  );
  protocol.on("Network.webSocketFrameReceived", (event) =>
    record("lsp:received", event.response.payloadData),
  );
  page.on("console", (message) =>
    record(`console:${message.type()}`, message.text()),
  );
  page.on("pageerror", (error) =>
    record("pageerror", error.stack ?? error.message),
  );
  page.on("dialog", async (dialog) => {
    dialogs.push(dialog.message());
    record("dialog", dialog.message());
    await dialog.dismiss();
  });
  page.on("requestfailed", (request) =>
    record("requestfailed", {
      url: request.url(),
      error: request.failure()?.errorText,
    }),
  );
  page.on("request", (request) => {
    if (request.url().includes("typescript@"))
      record("sdk-download", request.url());
  });
  await page.setViewport({ width: 1440, height: 1000 });
  await page.goto(`http://127.0.0.1:${vite.httpServer.address().port}`, {
    waitUntil: "domcontentloaded",
  });
});

afterAll(async () => {
  if (artifactDirectory) {
    record(
      "diagnosticEvents",
      await page
        ?.evaluate(() => globalThis.browserTestDiagnosticEvents)
        .catch(() => undefined),
    );
    await mkdir(artifactDirectory, { recursive: true });
    await writeFile(
      path.join(artifactDirectory, "browser-events.json"),
      JSON.stringify(events, null, 2),
    );
    await page
      ?.screenshot({
        path: path.join(artifactDirectory, "browser.png"),
        fullPage: true,
      })
      .catch(() => {});
  }
  await browser?.close();
  await backend?.close();
  await vite?.close();
  if (profile) await rm(profile, { recursive: true, force: true });
});

async function ready(route) {
  await page.waitForFunction(
    () =>
      document
        .querySelector("[data-language-status]")
        ?.getAttribute("data-language-status") !== "connecting",
    { timeout: 150_000 },
  );
  const status = await page.$eval("[data-language-status]", (element) => ({
    phase: element.dataset.languageStatus,
    text: element.textContent,
  }));
  record("ready", { route, status });
  expect(status.phase, status.text).toBe("ready");
}

const validSource = `export function twice(value: number): number { return value * 2; }
export const answer: number = twice(1);
define status {
  name "中文测试状态" as HarnessStatus;
  usage 2;
}
`;
const invalidSource = validSource.replace("twice(1)", 'twice("wrong")');

async function editorApi() {
  await page.evaluate(async () => {
    const source = await (await fetch("/src/dev-editor.ts")).text();
    const url = source.match(/import \* as vscode from ["']([^"']+)["']/)?.[1];
    if (!url)
      throw new Error("Cannot locate the running editor's VS Code API module");
    globalThis.browserTestVscode = await new Function(
      "url",
      "return import(url)",
    )(url);
    globalThis.browserTestDiagnosticEvents = [];
    globalThis.browserTestDiagnosticSubscription?.dispose();
    globalThis.browserTestDiagnosticSubscription =
      globalThis.browserTestVscode.languages.onDidChangeDiagnostics(() => {
        const api = globalThis.browserTestVscode;
        const document = api.workspace.textDocuments.find(
          (item) => item.uri.path === "/workspace/example.gts",
        );
        globalThis.browserTestDiagnosticEvents.push({
          version: document?.version,
          diagnostics: api.languages
            .getDiagnostics(document.uri)
            .map((item) => ({
              code: item.code,
              severity: item.severity,
              message: item.message,
              start: {
                line: item.range.start.line,
                character: item.range.start.character,
              },
              end: {
                line: item.range.end.line,
                character: item.range.end.character,
              },
            })),
        });
      });
  });
}

async function content() {
  return page.evaluate(() =>
    globalThis.browserTestVscode.workspace.textDocuments
      .find((document) => document.uri.path === "/workspace/example.gts")
      .getText(),
  );
}

async function edit(source) {
  return page.evaluate(async (source) => {
    const api = globalThis.browserTestVscode;
    const document = api.workspace.textDocuments.find(
      (item) => item.uri.path === "/workspace/example.gts",
    );
    const change = new api.WorkspaceEdit();
    change.replace(
      document.uri,
      new api.Range(
        document.positionAt(0),
        document.positionAt(document.getText().length),
      ),
      source,
    );
    if (!(await api.workspace.applyEdit(change)))
      throw new Error("The real editor rejected the source edit");
    return document.version;
  }, source);
}

async function diagnostics(version, code) {
  await page.waitForFunction(
    (version, code) =>
      globalThis.browserTestDiagnosticEvents.some(
        (event) =>
          event.version === version &&
          (code === null
            ? event.diagnostics.every((item) => item.severity !== 0)
            : event.diagnostics.some((item) => Number(item.code) === code)),
      ),
    { timeout: 60_000 },
    version,
    code,
  );
  const observed = await page.evaluate(
    (version) =>
      globalThis.browserTestDiagnosticEvents
        .filter((event) => event.version === version)
        .at(-1),
    version,
  );
  record("diagnostics", observed);
  return observed.diagnostics;
}

async function languageFeatures(route) {
  const features = await page.evaluate(async () => {
    const api = globalThis.browserTestVscode;
    const document = api.workspace.textDocuments.find(
      (item) => item.uri.path === "/workspace/example.gts",
    );
    const call = document.getText().indexOf("twice(1)");
    const position = document.positionAt(call + 3);
    const hover = await api.commands.executeCommand(
      "vscode.executeHoverProvider",
      document.uri,
      position,
    );
    const definition = await api.commands.executeCommand(
      "vscode.executeDefinitionProvider",
      document.uri,
      position,
    );
    const completion = await api.commands.executeCommand(
      "vscode.executeCompletionItemProvider",
      document.uri,
      position,
    );
    const signature = await api.commands.executeCommand(
      "vscode.executeSignatureHelpProvider",
      document.uri,
      document.positionAt(call + 6),
    );
    return {
      hover: hover?.flatMap((item) =>
        item.contents.map((content) =>
          typeof content === "string" ? content : content.value,
        ),
      ),
      definitions: definition?.map((item) => {
        const range = item.range ?? item.targetSelectionRange;
        return {
          uri: (item.uri ?? item.targetUri).toString(),
          range: {
            start: { line: range.start.line, character: range.start.character },
            end: { line: range.end.line, character: range.end.character },
          },
        };
      }),
      completions: completion?.items.map((item) =>
        typeof item.label === "string" ? item.label : item.label.label,
      ),
      signatures: signature?.signatures.map((item) => item.label),
    };
  });
  record("features", { route, ...features });
  expect(features.hover?.join(" ")).toContain("twice");
  expect(features.hover?.join(" ")).toContain("number");
  expect(features.hover?.join(" ")).not.toContain("__gts_");
  expect(features.definitions).toContainEqual(
    expect.objectContaining({
      uri: "file:///workspace/example.gts",
      range: expect.objectContaining({
        start: expect.objectContaining({ line: 0, character: 16 }),
      }),
    }),
  );
  expect(features.completions).toContain("twice");
  expect(features.signatures?.join(" ")).toContain("value: number");
}

async function checkSource(route) {
  const bad = await diagnostics(await edit(invalidSource), 2345);
  expect(bad.filter((item) => Number(item.code) === 2345)).toEqual([
    expect.objectContaining({
      start: { line: 1, character: 36 },
      end: { line: 1, character: 43 },
    }),
  ]);
  await diagnostics(await edit(validSource), null);
  await edit(
    validSource +
      '\nimport vm from "@gi-tcg/editor-provider/vm";\nvm["~namedDefinition"].status("bad");\n',
  );
  const providerHover = await page.evaluate(async () => {
    const api = globalThis.browserTestVscode;
    const document = api.workspace.textDocuments.find(
      (item) => item.uri.path === "/workspace/example.gts",
    );
    return (
      await api.commands.executeCommand(
        "vscode.executeHoverProvider",
        document.uri,
        document.positionAt(document.getText().indexOf("vm from") + 1),
      )
    )?.flatMap((hover) => hover.contents.map((item) => item.value ?? item));
  });
  record("provider-hover", { route, providerHover });
  expect(providerHover?.join(" ")).toContain("IViewModel");
  const attributeError = await diagnostics(
    await edit(validSource.replace("usage 2;", 'usage "wrong";')),
    2345,
  );
  expect(attributeError.filter((item) => Number(item.code) === 2345)).toEqual([
    expect.objectContaining({
      start: { line: 4, character: 8 },
      end: { line: 4, character: 15 },
    }),
  ]);
  await diagnostics(await edit(validSource), null);
  await languageFeatures(route);
}

async function sessions(count) {
  await expect
    .poll(
      async () =>
        (await (await fetch(`http://127.0.0.1:${backend.port}/health`)).json())
          .sessions,
      { timeout: 10_000 },
    )
    .toBe(count);
}

async function languageWorkers(count) {
  await expect
    .poll(
      () =>
        page
          .workers()
          .filter((worker) =>
            worker.url().includes("gts-language-server.worker"),
          ).length,
      { timeout: 10_000 },
    )
    .toBe(count);
}

async function loadCard(route, source) {
  await edit(source);
  await page.click(".tab-content.active .button-container button");
  await page.waitForFunction(
    () =>
      document
        .querySelector(".tab.active")
        ?.textContent.includes("构建你的卡组"),
    { timeout: 60_000 },
  );
  expect(dialogs, "Card evaluation should not display an error").toEqual([]);
  record("card-loaded", { route });
  await page.click(".tabs .tab:first-child");
}

test("browser local checks GTS and loads cards without a backend", async () => {
  await ready("browser-local");
  await editorApi();
  const original = (defaultSource = await content());
  await checkSource("browser-local");
  await languageWorkers(1);
  await loadCard("browser-local", original);
});

test("backend checks GTS, loads cards, switches, retains undo and recovers", async () => {
  await ready("browser-local");
  await editorApi();
  const original = defaultSource ?? (await content());
  backend = await startBackend();
  record("backend", { port: backend.port, engine: backend.engine });
  const unchanged = await content();
  await page.select('[aria-label="类型检查方式"]', "backend-tnb");
  expect(
    await page.$eval(
      '[aria-label="类型检查服务地址"]',
      (element) => element.value,
    ),
  ).toBe(page.url().replace(/^http/, "ws").replace(/\/$/, "") + "/gts");
  await ready("backend-tnb-same-origin");
  await checkSource("backend-tnb-same-origin");
  await edit(unchanged);
  await page.$eval(
    '[aria-label="类型检查服务地址"]',
    (element, url) => {
      element.value = url;
      element.dispatchEvent(new Event("input", { bubbles: true }));
    },
    `ws://127.0.0.1:${backend.port}/gts`,
  );
  await page.click(".language-service-toolbar button");
  await ready("backend-tnb");
  expect(await content()).toBe(unchanged);
  await languageWorkers(0);
  await sessions(1);
  await checkSource("backend-tnb");
  await loadCard("backend-tnb", original);
  await edit(validSource);
  await edit(validSource + "// undo survives route changes\n");
  const beforeSwitch = await content();
  await page.select('[aria-label="类型检查方式"]', "browser-local");
  await ready("browser-local");
  expect(await content()).toBe(beforeSwitch);
  await sessions(0);
  await languageWorkers(1);
  await page.evaluate(async () => {
    const api = globalThis.browserTestVscode;
    await api.window.showTextDocument(api.Uri.file("/workspace/example.gts"));
    await api.commands.executeCommand("undo");
  });
  expect(await content()).toBe(validSource);
  await page.select('[aria-label="类型检查方式"]', "backend-tnb");
  await page.select('[aria-label="类型检查方式"]', "browser-local");
  await page.select('[aria-label="类型检查方式"]', "backend-tnb");
  await ready("backend-tnb");
  await languageWorkers(0);
  await sessions(1);
  expect(await content()).toBe(validSource);
  const port = backend.port;
  await backend.close();
  backend = undefined;
  await page.waitForSelector('[data-language-status="error"]');
  expect(
    await page.$eval('[aria-label="类型检查方式"]', (element) => element.value),
  ).toBe("backend-tnb");
  expect(await content()).toBe(validSource);
  await languageWorkers(0);
  await expect
    .poll(
      () =>
        page.evaluate(() => {
          const api = globalThis.browserTestVscode;
          return api.languages.getDiagnostics(
            api.Uri.file("/workspace/example.gts"),
          ).length;
        }),
      { timeout: 10_000 },
    )
    .toBe(0);
  backend = await startBackend(port);
  await page.click(".language-service-toolbar button");
  await ready("backend-tnb");
  await checkSource("backend-tnb-reconnected");
  const reloadedEvents = events.length;
  await page.reload({ waitUntil: "domcontentloaded" });
  await ready("backend-tnb-reloaded");
  await editorApi();
  expect(
    await page.$eval('[aria-label="类型检查方式"]', (element) => element.value),
  ).toBe("backend-tnb");
  expect(
    await page.$eval(
      '[aria-label="类型检查服务地址"]',
      (element) => element.value,
    ),
  ).toBe(`ws://127.0.0.1:${port}/gts`);
  await languageWorkers(0);
  await sessions(1);
  expect(
    events
      .slice(reloadedEvents)
      .filter((event) => event.kind === "sdk-download"),
    "The backend route does not download the browser TypeScript SDK",
  ).toEqual([]);
  expect(
    events.filter((event) => event.kind === "pageerror"),
    "No unhandled browser failures",
  ).toEqual([]);
});

// An independently reviewed acceptance collector can add its session evidence
// scenario while retaining both behavioral tests and this real browser setup.
if (process.env.GTS_BROWSER_SESSION_SCENARIO) {
  test("both routes provide fresh version-bound session evidence", async () => {
    const { run } = await import(
      pathToFileURL(process.env.GTS_BROWSER_SESSION_SCENARIO).href
    );
    await run({
      page,
      browser,
      expect,
      record,
      ready,
      editorApi,
      content,
      edit,
      languageFeatures,
      languageWorkers,
      sessions,
      getBackend: () => backend,
      async stopBackend() {
        await backend?.close();
        backend = undefined;
      },
      async startBackend(port) {
        backend = await startBackend(port);
        return backend;
      },
    });
  });
}
