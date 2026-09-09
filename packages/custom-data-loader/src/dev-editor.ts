import "@codingame/monaco-vscode-theme-defaults-default-extension";
import getKeybindingsServiceOverride from "@codingame/monaco-vscode-keybindings-service-override";
import {
  RegisteredFileSystemProvider,
  RegisteredMemoryFile,
  registerFileSystemOverlay,
} from "@codingame/monaco-vscode-files-service-override";
import {
  EditorApp,
  type EditorAppConfig,
} from "monaco-languageclient/editorApp";
import { MonacoLanguageClient } from "monaco-languageclient";
import {
  MonacoVscodeApiWrapper,
  type MonacoVscodeApiConfig,
} from "monaco-languageclient/vscodeApiWrapper";
import { useWorkerFactory } from "monaco-languageclient/workerFactory";
import editorWorkerUrl from "@codingame/monaco-vscode-editor-api/esm/vs/editor/editor.worker.js?worker&url";
import extensionHostWorkerUrl from "@codingame/monaco-vscode-api/workers/extensionHost.worker?worker&url";
import textMateWorkerUrl from "@codingame/monaco-vscode-textmate-service-override/worker?worker&url";
import * as vscode from "vscode";
import {
  BrowserMessageReader,
  BrowserMessageWriter,
  CloseAction,
  ErrorAction,
} from "vscode-languageclient/browser.js";
import {
  toSocket,
  WebSocketMessageReader,
  WebSocketMessageWriter,
} from "vscode-ws-jsonrpc";
import GTS_LANGUAGE_CONFIG from "./gts-language-configuration.json?raw";
import GTS_SYNTAXES from "./gts.tmLanguage.json?raw";
import type { GtsLanguageServerBrowserInitializationOptions } from "@gi-tcg/gts-language-server/browser";
import type { RegisterLocalProcessExtensionResult } from "@codingame/monaco-vscode-api/extensions";
import { registerDecorations } from "@gi-tcg/gts-language-client-code/decoration";
import type { editor } from "@codingame/monaco-vscode-editor-api";
import {
  BROWSER_TSDK_URL,
  createLanguageWorkspace,
  LANGUAGE_GTS_CONFIG,
} from "./dev-language-workspace";

export type LanguageRoute = "browser-local" | "backend-tnb";
export interface LanguageServiceSettings {
  route: LanguageRoute;
  serverUrl: string;
}
export interface LanguageServiceStatus {
  route: LanguageRoute;
  phase: "connecting" | "ready" | "error";
  message: string;
}

/** Optional local observation for diagnostics tools; no messages are retained. */
export interface LanguageServiceEvent {
  sessionId: string;
  route: LanguageRoute;
  atMs: number;
  kind: string;
  detail?: unknown;
}
const languageServiceListeners = new Set<
  (event: LanguageServiceEvent) => void
>();
export function observeLanguageService(
  listener: (event: LanguageServiceEvent) => void,
) {
  languageServiceListeners.add(listener);
  return { dispose: () => languageServiceListeners.delete(listener) };
}

const GTS_LANGUAGE_ID = "gaming-ts";
const WORKSPACE_URI = vscode.Uri.file("/workspace");
const EXAMPLE_FILE_URI = vscode.Uri.file("/workspace/example.gts");
const PROVIDER_DTS_FILES = import.meta.glob<string>("../dist/gts/**/*.d.ts", {
  eager: true,
  query: "?raw",
  import: "default",
});

const PROVIDER_DECLARATIONS = Object.fromEntries(
  Object.entries(PROVIDER_DTS_FILES).map(([path, content]) => {
    const relativePath = path.split("/dist/gts/")[1];
    return [relativePath, content];
  }),
);

// The stock readers do not signal close when a Worker is terminated. Exposing
// that lifecycle event lets LanguageClient release pending requests/features.
class WorkerReader extends BrowserMessageReader {
  close() {
    this.fireClose();
  }
}
class SocketReader extends WebSocketMessageReader {
  close() {
    this.fireClose();
  }
}

const setupVscodeApiConfig = (): MonacoVscodeApiConfig => {
  const extensionFilesOrContents = new Map<string, string | URL>();
  extensionFilesOrContents.set(
    "/workspace/language-configuration.json",
    GTS_LANGUAGE_CONFIG,
  );
  extensionFilesOrContents.set(
    "/workspace/GamingTS.tmLanguage.json",
    GTS_SYNTAXES,
  );

  return {
    $type: "extended",
    viewsConfig: {
      $type: "EditorService",
    },
    logLevel: vscode.LogLevel.Debug,
    serviceOverrides: {
      ...getKeybindingsServiceOverride(),
    },
    userConfiguration: {
      json: JSON.stringify({
        "workbench.colorTheme": "Default Dark Modern",
        "editor.guides.bracketPairsHorizontal": "active",
        "editor.wordBasedSuggestions": "off",
        "editor.experimental.asyncTokenization": true,
      }),
    },
    monacoWorkerFactory: (logger) =>
      useWorkerFactory({
        logger,
        workerLoaders: {
          editorWorkerService: () => ({
            url: editorWorkerUrl,
            options: { type: "module" },
          }),
          extensionHostWorkerMain: () => ({
            url: extensionHostWorkerUrl,
            options: { type: "module" },
          }),
          TextMateWorker: () => ({
            url: textMateWorkerUrl,
            options: { type: "module" },
          }),
        },
      }),
    extensions: [
      {
        config: {
          name: "gts-monaco",
          publisher: "Guyutongxue",
          version: "0.0.0",
          engines: {
            vscode: "*",
          },
          contributes: {
            languages: [
              {
                id: GTS_LANGUAGE_ID,
                extensions: [".gts"],
                aliases: ["GamingTS", "gaming-ts", "gts"],
                configuration: "/workspace/language-configuration.json",
              },
            ],
            grammars: [
              {
                language: GTS_LANGUAGE_ID,
                scopeName: "source.gts",
                path: "/workspace/GamingTS.tmLanguage.json",
              },
            ],
            semanticTokenModifiers: [
              {
                id: "gtsAttribute",
                description: "Attribute name for GamingTS",
              },
            ],
            semanticTokenScopes: [
              {
                language: GTS_LANGUAGE_ID,
                scopes: {
                  "*.gtsAttribute": ["emphasis"],
                },
              },
            ],
          },
        },
        filesOrContents: extensionFilesOrContents,
      },
    ],
  };
};

export async function setupEditor(
  container: HTMLElement,
  initialCode: string,
  onStatus: (status: LanguageServiceStatus) => void,
): Promise<{
  editor: editor.IStandaloneCodeEditor;
  connect(settings: LanguageServiceSettings): Promise<void>;
  dispose(): Promise<void>;
}> {
  const vscodeApiConfig = setupVscodeApiConfig();
  const workspaceFiles = createLanguageWorkspace(PROVIDER_DECLARATIONS);
  const fileSystem = new RegisteredFileSystemProvider(false);
  for (const [path, text] of Object.entries(workspaceFiles)) {
    fileSystem.registerFile(
      new RegisteredMemoryFile(vscode.Uri.file(path), text),
    );
  }
  const fileSystemRegistration = registerFileSystemOverlay(1, fileSystem);
  const apiWrapper = new MonacoVscodeApiWrapper(vscodeApiConfig);
  await apiWrapper.start();

  const regResult = apiWrapper.getExtensionRegisterResult(`gts-monaco`) as
    RegisterLocalProcessExtensionResult | undefined;
  let decorations: vscode.Disposable[] = [];
  if (!regResult) {
    console.error("Failed to register extension in MonacoVscodeApiWrapper");
  } else {
    const vscode = await regResult.getApi();
    decorations = registerDecorations(vscode);
  }

  const editorAppConfig: EditorAppConfig = {
    codeResources: {
      modified: {
        text: initialCode,
        uri: EXAMPLE_FILE_URI.toString(),
        enforceLanguageId: GTS_LANGUAGE_ID,
      },
    },
    editorOptions: {
      minimap: {
        enabled: false,
      },
    },
  };

  const editorApp = new EditorApp(editorAppConfig);
  await editorApp.start(container);

  await vscode.workspace.openTextDocument(EXAMPLE_FILE_URI);
  await vscode.window.showTextDocument(EXAMPLE_FILE_URI);
  const editor = editorApp.getEditor()!;
  let generation = 0;
  let disposed = false;
  let pending: AbortController | undefined;
  let queue = Promise.resolve();
  let stopping = Promise.resolve();
  let active:
    | {
        client: MonacoLanguageClient;
        closeTransport(): void;
        emit(kind: string, detail?: unknown): void;
      }
    | undefined;

  function stop() {
    const previous = active;
    active = undefined;
    stopping = stopping.catch(console.error).then(async () => {
      if (!previous) return;
      previous.client.diagnostics?.clear();
      if (!previous.client.isRunning()) previous.closeTransport();
      try {
        await previous.client.dispose(1000);
      } catch (error) {
        console.debug(
          "Language client disposal after transport closure:",
          error,
        );
      } finally {
        previous.closeTransport();
        previous.emit("client-stopped");
      }
    });
    return stopping;
  }

  function connect(settings: LanguageServiceSettings) {
    const current = ++generation;
    const emit = (kind: string, detail?: unknown) => {
      for (const listener of languageServiceListeners) {
        try {
          listener({
            sessionId: `gts-editor-${current}`,
            route: settings.route,
            atMs: performance.timeOrigin + performance.now(),
            kind,
            detail,
          });
        } catch (error) {
          console.error("Language service observer failed:", error);
        }
      }
    };
    emit("connect-requested");
    pending?.abort();
    const abort = new AbortController();
    pending = abort;
    onStatus({
      route: settings.route,
      phase: "connecting",
      message: "正在启动类型检查…",
    });
    queue = queue.catch(console.error).then(async () => {
      if (disposed || current !== generation) return;
      await stop();
      if (disposed || current !== generation) return;
      const failureMessage =
        settings.route === "backend-tnb"
          ? "后台检查服务不可用或连接已断开。请确认服务地址并重新连接。"
          : "浏览器类型检查失败。请检查网络连接并重试。";
      const fail = (message = failureMessage) => {
        if (current !== generation || disposed || abort.signal.aborted) return;
        onStatus({ route: settings.route, phase: "error", message });
        abort.abort(new Error(message));
        void stop();
      };
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        const worker =
          settings.route === "browser-local"
            ? new Worker(
                new URL("./gts-language-server.worker.ts", import.meta.url),
                { type: "module", name: "GTS Language Server" },
              )
            : undefined;
        let socket: WebSocket | undefined;
        if (!worker) {
          const url = new URL(settings.serverUrl);
          if (!["ws:", "wss:"].includes(url.protocol))
            throw new Error("服务地址必须以 ws:// 或 wss:// 开头。");
          socket = new WebSocket(url);
        }
        const rpcSocket = socket ? toSocket(socket) : undefined;
        const reader = worker
          ? new WorkerReader(worker)
          : new SocketReader(rpcSocket!);
        const writer = worker
          ? new BrowserMessageWriter(worker)
          : new WebSocketMessageWriter(rpcSocket!);
        const listen = reader.listen.bind(reader);
        reader.listen = (callback) =>
          listen((message) => {
            emit("protocol-receive", message);
            callback(message);
          });
        const write = writer.write.bind(writer);
        writer.write = (message) => {
          emit("protocol-send", message);
          return write(message);
        };
        emit("transport-created", { kind: worker ? "worker" : "socket" });
        let transportClosed = false;
        const closeTransport = () => {
          if (transportClosed) return;
          transportClosed = true;
          reader.close();
          worker?.terminate();
          if (worker) emit("worker-terminated");
          socket?.close();
          reader.dispose();
          writer.dispose();
        };
        const client = new MonacoLanguageClient({
          id: `gts-editor-${current}`,
          name: "GamingTS",
          messageTransports: { reader, writer },
          clientOptions: {
            documentSelector: [{ language: GTS_LANGUAGE_ID }],
            diagnosticCollectionName: `gts-editor-${current}`,
            workspaceFolder: {
              index: 0,
              name: "workspace",
              uri: WORKSPACE_URI,
            },
            initializationOptions: worker
              ? ({
                  tsdkUrl: BROWSER_TSDK_URL,
                  fs: workspaceFiles,
                  inlineGtsConfig: LANGUAGE_GTS_CONFIG,
                } satisfies GtsLanguageServerBrowserInitializationOptions)
              : {},
            errorHandler: {
              error: () => {
                fail();
                return { action: ErrorAction.Shutdown, handled: true };
              },
              closed: () => {
                if (active?.client === client) fail();
                return { action: CloseAction.DoNotRestart, handled: true };
              },
            },
            // v9 otherwise calls stop() without awaiting it while still
            // Starting. Our connection controller owns failed-start cleanup.
            initializationFailedHandler: (error) => {
              throw error;
            },
            middleware: {
              handleDiagnostics: (uri, diagnostics, next) => {
                if (current === generation && active?.client === client) {
                  next(uri, diagnostics);
                  emit("diagnostics-displayed", {
                    uri: uri.toString(),
                    diagnostics,
                  });
                }
              },
            },
          },
        });
        active = { client, closeTransport, emit };
        worker?.addEventListener("error", () => fail());
        socket?.addEventListener("error", () => fail());
        socket?.addEventListener("close", () => {
          emit("socket-closed");
          if (!transportClosed) fail();
        });
        const cancelled = new Promise<never>((_, reject) => {
          abort.signal.addEventListener(
            "abort",
            () => reject(abort.signal.reason),
            { once: true },
          );
        });
        timer = setTimeout(
          () => fail("类型检查启动超时，请重试或检查服务连接。"),
          120_000,
        );
        const start = async () => {
          if (socket && socket.readyState !== WebSocket.OPEN)
            await Promise.race([
              new Promise<void>((resolve) =>
                socket!.addEventListener("open", () => resolve(), {
                  once: true,
                }),
              ),
              cancelled,
            ]);
          if (abort.signal.aborted) throw abort.signal.reason;
          // start() is idempotent. Retain its shared initialization promise as
          // well: v9 clears it on close before the first call can adopt it.
          const started = client.start();
          await Promise.all([started, client.start()]);
        };
        await Promise.race([start(), cancelled]);
        if (current === generation && !abort.signal.aborted && !disposed) {
          emit("client-ready");
          onStatus({
            route: settings.route,
            phase: "ready",
            message:
              settings.route === "browser-local"
                ? "浏览器本地检查已就绪"
                : "TNB（tsgo）检查服务已连接",
          });
        }
      } catch (error) {
        if (current === generation && !disposed && !abort.signal.aborted) {
          onStatus({
            route: settings.route,
            phase: "error",
            message: error instanceof Error ? error.message : failureMessage,
          });
        }
        await stop();
      } finally {
        clearTimeout(timer);
      }
    });
    return queue;
  }

  return {
    editor,
    connect,
    async dispose() {
      disposed = true;
      generation++;
      pending?.abort();
      await queue;
      await stop();
      await editorApp.dispose();
      for (const decoration of decorations) decoration.dispose();
      fileSystemRegistration.dispose();
      fileSystem.dispose();
      apiWrapper.dispose();
    },
  };
}
