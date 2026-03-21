// Copyright (C) 2024-2025 Guyutongxue
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

import { For, Match, Show, Switch, createSignal } from "solid-js";
import getData from "@gi-tcg/data";
import {
  CURRENT_VERSION,
  GameStateLogEntry,
  Version,
  deserializeGameStateLog,
  VERSIONS,
  Deck,
} from "@gi-tcg/core";
import { StandaloneChild } from "./StandaloneChild";
import { StandaloneParent } from "./StandaloneParent";
import { IS_BETA, SERVER_HOST, WEB_CLIENT_BASE_PATH } from "@gi-tcg/config";
import { DeckBuilder } from "@gi-tcg/deck-builder";
import "@gi-tcg/deck-builder/style.css";
import { DEFAULT_ASSETS_MANAGER } from "@gi-tcg/assets-manager";
import { useI18n } from "./i18n";

enum GameMode {
  NotStarted = 0,
  Standalone = 1,
}

const INIT_DECK0 =
  "FZDByRUNGRCB0WoNFlGgWpEPE0AB9TAPFGCB9kgWGIERCoEQDLFADcQQDPFgacYWDJAA";
const INIT_DECK1 =
  "FdHxNj8TAWDQxFkMFkAhyWIYCYDA45wOCUDQ5J0PGEAh9IIPGWDh9p4YC6FgirYRCxAA";

if (import.meta.env.DEV) {
  // Debug here!
}

export function App() {
  const { locale, setLocale, assetsManager, t } = useI18n();
  if (window.opener !== null) {
    // eslint-disable-next-line solid/components-return-once
    return <StandaloneChild />;
  }
  const [mode, setMode] = createSignal<GameMode>(GameMode.NotStarted);
  const [logs, setLogs] = createSignal<GameStateLogEntry[]>();
  const [deck0, setDeck0] = createSignal(INIT_DECK0);
  const [deck1, setDeck1] = createSignal(INIT_DECK1);
  const [version, setVersion] = createSignal<Version>(CURRENT_VERSION);

  const importLog = async () => {
    return new Promise<GameStateLogEntry[]>((resolve, reject) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "application/json";
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement)?.files?.[0];
        if (!file) {
          reject(t("readUploadedFileFailed"));
          return;
        }
        const reader = new FileReader();
        reader.onload = (event) => {
          const contents = event.target?.result as string;
          try {
            const logs = JSON.parse(contents);
            const version = logs.gv;
            resolve(deserializeGameStateLog(getData(version), logs));
          } catch (error) {
            reject(error);
          }
        };
        reader.readAsText(file);
      };
      input.oncancel = () => {
        reject(t("fileUploadCanceled"));
      };
      input.click();
    });
  };

  let deckBuilderDialog!: HTMLDialogElement;
  const [loadDeckBuilder, setLoadDeckBuilder] = createSignal(false);
  const [deckBuilderValue, setDeckBuilderValue] = createSignal<Deck>({
    characters: [],
    cards: [],
  });
  const openDeckBuilder = () => {
    setLoadDeckBuilder(true);
    deckBuilderDialog.showModal();
  };
  const closeDeckBuilder = () => {
    deckBuilderDialog.close();
  };
  const loadDeckBuilderValue = async () => {
    const code = prompt(t("inputShareCode"));
    if (code === null) {
      return;
    }
    try {
      const deck = DEFAULT_ASSETS_MANAGER.decode(code);
      setDeckBuilderValue(deck);
    } catch (e) {
      if (e instanceof Error) {
        alert(e.message);
      }
      console.error(e);
    }
  };
  const saveDeckBuilderValue = async () => {
    const deck = deckBuilderValue();
    try {
      const code = DEFAULT_ASSETS_MANAGER.encode(deck);
      await navigator.clipboard.writeText(code);
      alert(t("deckCodeCopied", { code }));
    } catch (e) {
      if (e instanceof Error) {
        alert(e.message);
      }
      console.error(e);
    }
  };

  return (
    <div>
      <div class="app-toolbar">
        <label class="language-picker">
          <span>{t("languageLabel")}</span>
          <select
            value={locale()}
            onChange={(e) => setLocale(e.currentTarget.value as "zh-CN" | "en-US")}
          >
            <option value="zh-CN">{t("languageChinese")}</option>
            <option value="en-US">{t("languageEnglish")}</option>
          </select>
        </label>
      </div>
      <Switch>
        <Match when={mode() === GameMode.NotStarted}>
          <div class="tabs">
            <input
              class="tab__input"
              type="radio"
              name="gameModeTab"
              id="standaloneInput"
              checked
            />
            <label class="tab__header" for="standaloneInput">
              {t("localSimulation")}
            </label>
            <div class="tab__content config-panel">
              <div class="config-panel__title">{t("deckConfig")}</div>
              <div class="config-panel__deck">
                <label>{t("firstPlayerDeck")}</label>
                <input
                  type="text"
                  value={deck0()}
                  onInput={(e) => setDeck0(e.currentTarget.value)}
                />
              </div>
              <div class="config-panel__deck">
                <label>{t("secondPlayerDeck")}</label>
                <input
                  type="text"
                  value={deck1()}
                  onInput={(e) => setDeck1(e.currentTarget.value)}
                />
              </div>
              <div class="config-panel__deck">
                <label>{t("gameVersion")}</label>
                <select
                  value={version()}
                  onChange={(e) => setVersion(e.target.value as Version)}
                >
                  <For each={VERSIONS}>
                    {(ver) => <option value={ver}>{ver}</option>}
                  </For>
                </select>
              </div>
              <div class="config-panel__description">
                {t("standaloneDescription")}
                <br />
                {t("standalonePopupHint")}
                <Show when={IS_BETA}>
                  <br />
                  <strong>{t("betaDeckWarning")}</strong>
                </Show>
              </div>
              <div class="config-panel__button-group">
                <button onClick={() => setMode(1)}>{t("startGame")}</button>
                <button
                  onClick={async () => {
                    const logs = await importLog().catch(alert);
                    if (logs) {
                      setLogs(logs);
                      setMode(1);
                    }
                  }}
                >
                  {t("importLog")}
                </button>
              </div>
            </div>
            <input
              class="tab__input"
              type="radio"
              name="gameModeTab"
              id="multiplayerInput"
              disabled
            />
            <label class="tab__header" for="multiplayerInput">
              <a href={`${SERVER_HOST}${WEB_CLIENT_BASE_PATH}`} target="_blank">
                {t("multiplayerBattle")}
              </a>
            </label>
            <div class="tab__content config-panel" />
            <div class="tab__spacer" />
          </div>
          <h3>{t("usefulLinks")}</h3>
          <ul>
            <li>
              {t("getDeckCode")}
              <a
                href="https://webstatic.mihoyo.com/ys/event/bbs-lineup-qskp/index.html"
                target="_blank"
              >
                米游社「七圣召唤」卡牌广场
              </a>
            </li>
            <li>
              {t("getDeckCode")}
              <a href="https://www.summoners.top/teams" target="_blank">
                召唤之巅：原神赛事数据统计平台
              </a>
            </li>
            <li>
              {t("getDeckCode")}
              <button onClick={openDeckBuilder}>{t("launchDeckBuilder")}</button>
            </li>
            <li>
              {t("projectGithub")}{" "}
              <a
                href="https://github.com/Guyutongxue/genius-invokation"
                target="_blank"
              >
                GitHub
              </a>
            </li>
            <li>
              <a
                href="https://jarvis-yu.github.io/Dottore-Genius-Invokation-TCG-PWA/"
                target="_blank"
              >
                Dottore 七圣召唤模拟器
              </a>
              （
              <a
                href="https://github.com/Jarvis-Yu/Dottore-Genius-Invokation-TCG-Simulator"
                target="_blank"
              >
                GitHub
              </a>
              ）
            </li>
            <li>
              <a href="https://7shengzhaohuan.online/lpsim" target="_blank">
                七圣召唤水皇模拟器 "LPSim"
              </a>
              （
              <a href="https://github.com/LPSim/backend" target="_blank">
                GitHub
              </a>
              ）
            </li>
            <li>
              <a
                href="https://flick-ai.github.io/Genius-Invokation"
                target="_blank"
              >
                flick-ai 七圣召唤模拟器
              </a>
              （
              <a
                href="https://github.com/flick-ai/Genius-Invokation"
                target="_blank"
              >
                GitHub
              </a>
              ）
            </li>
          </ul>
        </Match>
        <Match when={mode() === GameMode.Standalone}>
          <StandaloneParent
            logs={logs()}
            deck0={deck0()}
            deck1={deck1()}
            version={version()}
          />
        </Match>
      </Switch>
      <dialog ref={deckBuilderDialog!} class="deck-builder-dialog">
        <Show when={loadDeckBuilder()}>
          <DeckBuilder
            class="deck-builder"
            assetsManager={assetsManager()}
            deck={deckBuilderValue()}
            onChangeDeck={setDeckBuilderValue}
          />
        </Show>
        <div class="deck-builder-actions">
          <button onClick={closeDeckBuilder}>{t("close")}</button>
          <button onClick={saveDeckBuilderValue}>{t("save")}</button>
          <button onClick={loadDeckBuilderValue}>{t("loadFromCode")}</button>
        </div>
      </dialog>
    </div>
  );
}
