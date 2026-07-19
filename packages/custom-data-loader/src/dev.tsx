// Copyright (C) 2025 Guyutongxue
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as
// published by the Free Software Foundation, either version 3 of the
// License, or (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Affero General Public License for more details.
//
// You should have received a copy of the GNU Affero General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>.

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
import type { GtsLanguageServerBrowserInitializationOptions } from "@gi-tcg/gts-language-server/browser";
import type { RegisterLocalProcessExtensionResult } from "@codingame/monaco-vscode-api/extensions";
import { registerDecorations } from "@gi-tcg/gts-language-client-code/decoration";
import providerDts from "../dist/gts/vm.d.ts?raw";
import runtimeDts from "../dist/gts/runtime.d.ts?raw";
import gtsLanguageConfiguration from "./gts-language-configuration.json?raw";
import gtsSyntaxes from "./gts-syntaxes.json?raw";

import {
  Show,
  createEffect,
  createSignal,
  on,
  onCleanup,
  onMount,
  createMemo,
  type JSX,
  type Component,
} from "solid-js";
import { CustomDataLoader } from "..";
import { render, Dynamic } from "solid-js/web";

import { AssetsManager } from "@gi-tcg/assets-manager";
import { DeckBuilder } from "@gi-tcg/deck-builder";
import { Game } from "@gi-tcg/core";
import { type Deck } from "@gi-tcg/typings";
import { createClient } from "@gi-tcg/web-ui-core";

import "@gi-tcg/deck-builder/style.css";
import "@gi-tcg/web-ui-core/style.css";

const root = document.querySelector("#root")!;

const GTS_LANGUAGE_ID = "gaming-ts";
const WORKSPACE_URI = vscode.Uri.file("/workspace");
const CUSTOM_DATA_FILE_URI = vscode.Uri.file("/workspace/custom-data.gts");

function createLanguageServerWorker() {
  return new Worker(
    new URL("./gts-language-server.worker.ts", import.meta.url),
    {
      type: "module",
      name: "GTS Language Server",
    },
  );
}

function createVscodeApiConfig(): MonacoVscodeApiConfig {
  const extensionFilesOrContents = new Map<string, string | URL>([
    ["/workspace/language-configuration.json", gtsLanguageConfiguration],
    ["/workspace/GamingTS.tmLanguage.json", gtsSyntaxes],
  ]);
  return {
    $type: "extended",
    viewsConfig: {
      $type: "EditorService",
    },
    logLevel: vscode.LogLevel.Warning,
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
          name: "custom-data-gts",
          publisher: "gi-tcg",
          version: "0.0.0",
          engines: { vscode: "*" },
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
                scopes: { "*.gtsAttribute": ["emphasis"] },
              },
            ],
          },
        },
        filesOrContents: extensionFilesOrContents,
      },
    ],
  };
}

function createLanguageClientConfig(
  initialCode: string,
  worker: Worker,
): LanguageClientConfig {
  return {
    languageId: GTS_LANGUAGE_ID,
    logLevel: vscode.LogLevel.Warning,
    connection: {
      options: { $type: "WorkerDirect", worker },
      messageTransports: {
        reader: new BrowserMessageReader(worker),
        writer: new BrowserMessageWriter(worker),
      },
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
          "/provider/vm.d.ts": providerDts,
          "/provider/runtime.d.ts": runtimeDts,
          [CUSTOM_DATA_FILE_URI.path]: initialCode,
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
}

interface MonacoEditorProps {
  code?: string;
  onCodeChange?: (code: string) => void;
}

const MonacoEditor = (props: MonacoEditorProps) => {
  let container!: HTMLDivElement;
  onMount(() => {
    let disposed = false;
    let apiWrapper: MonacoVscodeApiWrapper | undefined;
    let languageClient: LanguageClientWrapper | undefined;
    let editorApp: EditorApp | undefined;
    let worker: Worker | undefined;
    let documentSubscription: vscode.Disposable | undefined;

    void (async () => {
      apiWrapper = new MonacoVscodeApiWrapper(createVscodeApiConfig());
      await apiWrapper.start();
      if (disposed) return;

      const extension = apiWrapper.getExtensionRegisterResult(
        "custom-data-gts",
      ) as RegisterLocalProcessExtensionResult | undefined;
      if (extension) {
        registerDecorations(await extension.getApi());
      }

      worker = createLanguageServerWorker();
      languageClient = new LanguageClientWrapper(
        createLanguageClientConfig(props.code ?? "", worker),
      );
      await languageClient.start();
      if (disposed) return;

      const editorConfig: EditorAppConfig = {
        codeResources: {
          modified: {
            text: props.code ?? "",
            uri: CUSTOM_DATA_FILE_URI.path,
          },
        },
        editorOptions: {
          minimap: { enabled: false },
          automaticLayout: true,
        },
      };
      editorApp = new EditorApp(editorConfig);
      editorApp.registerOnTextChangedCallback((changes) => {
        props.onCodeChange?.(changes.modified ?? "");
      });
      await editorApp.start(container);
      if (disposed) return;

      const document = await vscode.workspace.openTextDocument(
        CUSTOM_DATA_FILE_URI,
      );
      await vscode.window.showTextDocument(document);
      documentSubscription = vscode.workspace.onDidChangeTextDocument(
        (event) => {
          if (event.document.uri.path === CUSTOM_DATA_FILE_URI.path) {
            props.onCodeChange?.(event.document.getText());
          }
        },
      );
    })();

    onCleanup(() => {
      disposed = true;
      documentSubscription?.dispose();
      void editorApp?.dispose();
      void languageClient?.dispose(true);
      apiWrapper?.dispose();
      worker?.terminate();
    });
  });
  return <div class="editor" ref={container}></div>;
};

const App = () => {
  // 状态管理
  const [activeTab, setActiveTab] = createSignal(0);
  const [step1Complete, setStep1Complete] = createSignal(false);
  const [step2Complete, setStep2Complete] = createSignal(false);

  // 步骤1：Mod代码编辑器
  const [code, setCode] = createSignal(`// 在这里编写你的 GTS 模组。定义会自动获得 ID。
define attachment {
  name "费用护盾" as CostShield;
  description "附着于手牌或牌堆中的牌，使其费用增加 1 点。";
  image "https://example.com/cost-shield.png";
  addCost 1;
}

define skill {
  name "普通攻击" as NormalSkill;
  description "造成 1 点物理伤害。";
  skillType normal;
  cost DiceType.Cryo, 1;
  cost DiceType.Void, 2;
  :damage(DamageType.Physical, 1);
}

define skill {
  name "元素战技" as ElementalSkill;
  description "造成 2 点冰元素伤害。";
  skillType elemental;
  cost DiceType.Cryo, 3;
  :damage(DamageType.Cryo, 2);
}

define character {
  name "银狼" as SilverWolf;
  description "自定义角色示例。";
  image "https://b0.bdstatic.com/f93f5ab0e2d0848b09255837758ea2ee.jpg@h_1280";
  tags cryo, catalyst;
  health 10;
  energy 2;
  skills NormalSkill, ElementalSkill;
}

define card {
  name "掀翻牌桌" as TableFlip;
  description "对敌方所有角色造成 10 点穿透伤害。";
  cost DiceType.Omni, 1;
  :damage(DamageType.Piercing, 10, "all opp character");
}`);

  // 步骤2：卡组构建器
  const [deck0, setDeck0] = createSignal<Deck>({ cards: [], characters: [] });
  const [deck1, setDeck1] = createSignal<Deck>({ cards: [], characters: [] });
  const [showDeckBuilder0, setShowDeckBuilder0] = createSignal(false);
  const [showDeckBuilder1, setShowDeckBuilder1] = createSignal(false);
  const [chessboard0, setChessboard0] = createSignal<Component>();
  const [chessboard1, setChessboard1] = createSignal<Component>();

  // 游戏数据
  const [gameData, setGameData] = createSignal<any>(null);
  const [assetsManager, setAssetsManager] = createSignal<AssetsManager>();

  // 尝试加载mod代码
  const loadMod = () => {
    try {
      const loader = new CustomDataLoader();
      loader.loadMod(code());
      const [gameData, customData] = loader.done();
      setGameData(gameData);

      const am = new AssetsManager({
        customData: [customData],
      });
      setAssetsManager(am);
      am.prepareForSync();

      setStep1Complete(true);
      setActiveTab(1);
    } catch (error) {
      alert(
        `加载mod时出错：${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  };

  // 检查卡组是否有效
  const isDeckValid = (deck: Deck) => {
    return deck.characters.length === 3 && deck.cards.length === 30;
  };

  const canStep2Continue = createMemo(
    () => isDeckValid(deck0()) && isDeckValid(deck1()),
  );

  const loadFromCode = () => {
    const code = prompt("请输入官方牌组码：");
    return assetsManager()!.decode(code ?? "");
  };

  // 检查所有卡组是否有效并进入下一步
  const checkDecksAndContinue = () => {
    if (canStep2Continue()) {
      setStep2Complete(true);
      startGame();
      setActiveTab(2);
    } else {
      alert("请确保两副卡组都有3个角色和30张卡牌！");
    }
  };

  // 开始游戏
  const startGame = () => {
    if (!gameData()) return;

    const initState = Game.createInitialState({
      data: gameData(),
      decks: [deck0(), deck1()],
    });

    const gameInstance = new Game(initState);

    const [io0, Chessboard0] = createClient(0, {
      assetsManager: () => assetsManager()!,
    });
    const [io1, Chessboard1] = createClient(1, {
      assetsManager: () => assetsManager()!,
    });
    setChessboard0(() => Chessboard0);
    setChessboard1(() => Chessboard1);
    gameInstance.players[0].io = io0;
    gameInstance.players[1].io = io1;

    gameInstance.start();
  };

  createEffect(
    on(code, () => {
      setStep1Complete(false);
    }),
  );

  createEffect(
    on([deck0, deck1], () => {
      setStep2Complete(false);
    }),
  );

  return (
    <div class="app">
      {/* 选项卡导航 */}
      <div class="tabs">
        <div
          class={`tab ${activeTab() === 0 ? "active" : ""}`}
          onClick={() => setActiveTab(0)}
        >
          编辑模组代码
        </div>
        <div
          class={`tab ${activeTab() === 1 ? "active" : ""} ${
            !step1Complete() ? "disabled" : ""
          }`}
          onClick={() => step1Complete() && setActiveTab(1)}
        >
          构建你的卡组
        </div>
        <div
          class={`tab ${activeTab() === 2 ? "active" : ""} ${
            !step2Complete() ? "disabled" : ""
          }`}
          onClick={() => step2Complete() && setActiveTab(2)}
        >
          开始游戏！
        </div>
      </div>

      {/* 选项卡内容 */}
      <div class="content">
        {/* 步骤1：Mod代码编辑器 */}
        <div class={`tab-content ${activeTab() === 0 ? "active" : ""}`}>
          <MonacoEditor code={code()} onCodeChange={setCode} />
          <div class="button-container">
            <button onClick={loadMod}>继续</button>
          </div>
        </div>

        {/* 步骤2：卡组构建器 */}
        <div class={`tab-content ${activeTab() === 1 ? "active" : ""}`}>
          {" "}
          <div class="deck-buttons">
            <button onClick={() => setDeck1(deck0())}>复制：先手→后手</button>
            <button onClick={() => setDeck0(deck1())}>复制：后手→先手</button>
          </div>
          <div class="deck-preview">
            <h3>
              先手卡组&nbsp;
              <button onClick={() => setShowDeckBuilder0(true)}>编辑</button>
            </h3>
            <p>
              角色:{" "}
              {deck0()
                .characters.map((id) => assetsManager()?.getNameSync(id))
                .join()}
            </p>
            <p>卡牌: {deck0().cards.length}/30</p>
            <p>状态: {isDeckValid(deck0()) ? "有效" : "无效"}</p>
          </div>
          <div class="deck-preview">
            <h3>
              后手卡组&nbsp;
              <button onClick={() => setShowDeckBuilder1(true)}>编辑</button>
            </h3>
            <p>
              角色:{" "}
              {deck1()
                .characters.map((id) => assetsManager()?.getNameSync(id))
                .join()}
            </p>
            <p>卡牌: {deck1().cards.length}/30</p>
            <p>状态: {isDeckValid(deck1()) ? "有效" : "无效"}</p>
          </div>
          <div class="button-container">
            <button
              onClick={checkDecksAndContinue}
              disabled={!canStep2Continue()}
            >
              继续
            </button>
          </div>
          {/* 卡组1构建器对话框 */}
          <dialog
            open={showDeckBuilder0()}
            ref={(el) => {
              if (showDeckBuilder0()) el.showModal();
              else el.close();
            }}
          >
            <div class="dialog-content">
              <h2>编辑卡组1</h2>
              <Show when={assetsManager()}>
                <DeckBuilder
                  assetsManager={assetsManager()!}
                  deck={deck0()}
                  onChangeDeck={setDeck0}
                />
              </Show>
            </div>
            <div class="dialog-buttons">
              <button onClick={() => setShowDeckBuilder0(false)}>确定</button>
              <button onClick={() => setDeck0(loadFromCode())}>
                从官方牌组码加载
              </button>
            </div>
          </dialog>
          {/* 卡组2构建器对话框 */}
          <dialog
            open={showDeckBuilder1()}
            ref={(el) => {
              if (showDeckBuilder1()) el.showModal();
              else el.close();
            }}
          >
            <div class="dialog-content">
              <h2>编辑卡组2</h2>
              <Show when={assetsManager()}>
                <DeckBuilder
                  assetsManager={assetsManager()!}
                  deck={deck1()}
                  onChangeDeck={setDeck1}
                />
              </Show>
            </div>
            <div class="dialog-buttons">
              <button onClick={() => setShowDeckBuilder1(false)}>确定</button>
              <button onClick={() => setDeck1(loadFromCode())}>
                从官方牌组码加载
              </button>
            </div>
          </dialog>
        </div>

        {/* 步骤3：游戏界面 */}
        <div class={`tab-content ${activeTab() === 2 ? "active" : ""}`}>
          <div class="game-container">
            <Dynamic component={chessboard0()} />
            <Dynamic component={chessboard1()} />
          </div>
        </div>
      </div>
    </div>
  );
};

render(() => <App />, root);
