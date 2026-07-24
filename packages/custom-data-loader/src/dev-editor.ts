import "@codingame/monaco-vscode-theme-defaults-default-extension";
import getKeybindingsServiceOverride from "@codingame/monaco-vscode-keybindings-service-override";
import {
  EditorApp,
  type EditorAppConfig,
} from "monaco-languageclient/editorApp";
import {
  LanguageClientWrapper,
  type LanguageClientConfig,
} from "monaco-languageclient/lcwrapper";
import {
  MonacoVscodeApiWrapper,
  type MonacoVscodeApiConfig,
} from "monaco-languageclient/vscodeApiWrapper";
import { configureDefaultWorkerFactory } from "monaco-languageclient/workerFactory";
import * as vscode from "vscode";
import {
  BrowserMessageReader,
  BrowserMessageWriter,
} from "vscode-languageclient/browser.js";
import PROVIDER_VM_DTS from "../dist/gts/vm.d.ts?raw";
import GTS_RUNTIME_DTS from "../dist/gts/runtime.d.ts?raw";
import BUILDER_DTS from "../dist/gts/builder.d.ts?raw";
import GTS_LANGUAGE_CONFIG from "./gts-language-configuration.json?raw";
import GTS_SYNTAXES from "./gts.tmLanguage.json?raw";
import type { GtsLanguageServerBrowserInitializationOptions } from "@gi-tcg/gts-language-server/browser";
import type { RegisterLocalProcessExtensionResult } from "@codingame/monaco-vscode-api/extensions";
import { registerDecorations } from "@gi-tcg/gts-language-client-code/decoration";
import type { editor } from "@codingame/monaco-vscode-editor-api";

const GTS_LANGUAGE_ID = "gaming-ts";
const WORKSPACE_URI = vscode.Uri.file("/workspace");
const EXAMPLE_FILE_URI = vscode.Uri.file("/workspace/example.gts");

const loadGtsLanguageServerWorker = () => {
  const worker = new Worker(
    new URL("./gts-language-server.worker.ts", import.meta.url),
    {
      type: "module",
      name: "GTS Language Server",
    },
  );
  worker.onmessage = (event) => {
    console.log("Received message from worker: " + event.data);
  };
  return worker;
};

const setupVscodeApiConfig = (): MonacoVscodeApiConfig => {
  // const fileSystemProvider = new RegisteredFileSystemProvider(false);
  //   fileSystemProvider.registerFile(new RegisteredMemoryFile(EXAMPLE_FILE_URI, EXAMPLE_CODE));
  //   registerFileSystemOverlay(1, fileSystemProvider);
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
    monacoWorkerFactory: configureDefaultWorkerFactory,
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

const setupLanguageClientConfig = (): LanguageClientConfig => {
  const worker = loadGtsLanguageServerWorker();
  const reader = new BrowserMessageReader(worker);
  const writer = new BrowserMessageWriter(worker);
  console.log({ PROVIDER_VM_DTS });
  return {
    languageId: GTS_LANGUAGE_ID,
    logLevel: vscode.LogLevel.Debug,
    connection: {
      options: {
        $type: "WorkerDirect",
        worker,
      },
      messageTransports: { reader, writer },
    },
    clientOptions: {
      documentSelector: [{ language: GTS_LANGUAGE_ID }],
      workspaceFolder: {
        index: 0,
        name: "workspace",
        uri: WORKSPACE_URI,
      },
      initializationOptions: {
        fs: {
          "/provider/vm.d.ts": PROVIDER_VM_DTS,
          "/provider/runtime.d.ts": GTS_RUNTIME_DTS,
          "/node_modules/@gi-tcg/core/builder.d.ts": BUILDER_DTS,
          "/workspace/test2.gts": "export const A = 1",
          "/tsconfig.json": JSON.stringify({
            compilerOptions: {
              lib: ["esnext"],
              types: [],
              target: "esnext",
              module: "preserve",
              verbatimModuleSyntax: true,
              erasableSyntaxOnly: true,
              moduleDetection: "force",
              noEmit: true,
              strict: true,
              skipLibCheck: true,
            },
            include: ["**/*.gts", "**/*.ts"],
          }),
        },
        inlineGtsConfig: {
          providerImportSource: "/provider",
          runtimeImportSource: "/provider/runtime",
        },
      } satisfies GtsLanguageServerBrowserInitializationOptions,
    },
  };
};

export async function setupEditor(
  container: HTMLElement,
  initialCode: string,
): Promise<editor.IStandaloneCodeEditor> {
  const vscodeApiConfig = setupVscodeApiConfig();
  const apiWrapper = new MonacoVscodeApiWrapper(vscodeApiConfig);
  await apiWrapper.start();

  const regResult = apiWrapper.getExtensionRegisterResult(`gts-monaco`) as
    RegisterLocalProcessExtensionResult | undefined;
  if (!regResult) {
    console.error("Failed to register extension in MonacoVscodeApiWrapper");
  } else {
    const vscode = await regResult.getApi();
    console.log({ vscode });
    registerDecorations(vscode);
  }

  const editorAppConfig: EditorAppConfig = {
    codeResources: {
      modified: {
        text: initialCode,
        uri: EXAMPLE_FILE_URI.path,
      },
    },
    editorOptions: {
      minimap: {
        enabled: false,
      },
    },
  };

  const languageClientConfig = setupLanguageClientConfig();
  const lcWrapper = new LanguageClientWrapper(languageClientConfig);
  await lcWrapper.start();

  const editorApp = new EditorApp(editorAppConfig);
  await editorApp.start(container);

  await vscode.workspace.openTextDocument(EXAMPLE_FILE_URI);
  await vscode.window.showTextDocument(EXAMPLE_FILE_URI);
  return editorApp.getEditor()!;
}
