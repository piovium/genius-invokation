import {
  ParentProps,
  createMemo,
  createContext,
  createEffect,
  createSignal,
  useContext,
} from "solid-js";
import { AssetsManager } from "@gi-tcg/assets-manager";

export type Locale = "zh-CN" | "en-US";

type TranslationParams = Record<string, string | number>;

const STORAGE_KEY = "gi-tcg.standalone.locale";

const MESSAGES = {
  "zh-CN": {
    languageLabel: "语言",
    languageChinese: "中文",
    languageEnglish: "English",
    localSimulation: "本地模拟",
    deckConfig: "牌组配置",
    firstPlayerDeck: "先手牌组",
    secondPlayerDeck: "后手牌组",
    gameVersion: "游戏版本",
    standaloneDescription:
      "点击下方按钮开始对局；先手方棋盘会在弹出窗口显示，后手方棋盘在本页面显示。",
    standalonePopupHint: "（若弹窗不显示为浏览器阻止，请允许本页面使用弹出式窗口。）",
    betaDeckWarning:
      "请注意：本页面包含未发布的测试版卡牌；包含这些卡牌的分享码仅限在本页面内使用，它们可能是无效的正式版分享码。",
    startGame: "开始对局",
    importLog: "导入日志",
    multiplayerBattle: "多人对战",
    usefulLinks: "友情链接",
    getDeckCode: "获取牌组码：",
    launchDeckBuilder: "启动组牌器",
    projectGithub: "此项目 GitHub",
    inputShareCode: "请输入分享码：",
    deckCodeCopied: "牌组码已复制到剪贴板：{code}",
    readUploadedFileFailed: "读取上传文件失败",
    fileUploadCanceled: "已取消上传文件",
    close: "关闭",
    save: "保存",
    loadFromCode: "从分享码载入",
    internalError:
      "游戏出现了内部错误！请点击主窗口下方“导出日志”按钮生成日志文件，并反馈至 GitHub Issue。\n{message}",
    firstPlayerBoard: "先手方棋盘",
    secondPlayerBoard: "后手方棋盘",
    viewHistory: "查看历史",
    viewingBoardHistory: "{side}手方棋盘（查看历史中）",
    sideFirst: "先",
    sideSecond: "后",
    resumeFromHere: "从此处继续",
    switchPlayer: "切换玩家",
    stepBackward: "后退一步",
    stepForward: "前进一步",
    backToGame: "返回游戏",
    exportLog: "导出日志",
    showDetails: "显示细节",
    closeDetails: "关闭",
  },
  "en-US": {
    languageLabel: "Language",
    languageChinese: "中文",
    languageEnglish: "English",
    localSimulation: "Local Simulation",
    deckConfig: "Deck Setup",
    firstPlayerDeck: "First player's deck",
    secondPlayerDeck: "Second player's deck",
    gameVersion: "Game version",
    standaloneDescription:
      "Start a match with the button below. The first player's board opens in a popup window, while the second player's board stays on this page.",
    standalonePopupHint:
      "(If the popup does not appear, your browser may have blocked it. Please allow popups for this page.)",
    betaDeckWarning:
      "This page includes unreleased beta cards. Share codes containing those cards only work on this page and may be invalid in official releases.",
    startGame: "Start Match",
    importLog: "Import Log",
    multiplayerBattle: "Multiplayer",
    usefulLinks: "Links",
    getDeckCode: "Get a deck code:",
    launchDeckBuilder: "Open Deck Builder",
    projectGithub: "Project GitHub",
    inputShareCode: "Input share code:",
    deckCodeCopied: "Deck code copied to clipboard: {code}",
    readUploadedFileFailed: "Failed to read uploaded file",
    fileUploadCanceled: "File upload canceled",
    close: "Close",
    save: "Save",
    loadFromCode: "Load from code",
    internalError:
      "The game encountered an internal error. Please export the log from the main window and report it in a GitHub issue.\n{message}",
    firstPlayerBoard: "First Player Board",
    secondPlayerBoard: "Second Player Board",
    viewHistory: "View History",
    viewingBoardHistory: "{side} player board (history)",
    sideFirst: "First",
    sideSecond: "Second",
    resumeFromHere: "Resume From Here",
    switchPlayer: "Switch Player",
    stepBackward: "Back",
    stepForward: "Forward",
    backToGame: "Back to Match",
    exportLog: "Export Log",
    showDetails: "Show Details",
    closeDetails: "Close",
  },
} as const;

export type TranslationKey = keyof (typeof MESSAGES)["en-US"];

function normalizeLocale(locale?: string | null): Locale {
  if (!locale) {
    return "zh-CN";
  }
  return locale.toLowerCase().startsWith("zh") ? "zh-CN" : "en-US";
}

function formatMessage(template: string, params?: TranslationParams) {
  if (!params) {
    return template;
  }
  return template.replace(/\{(\w+)\}/g, (_, key: string) => {
    return params[key] === void 0 ? `{${key}}` : String(params[key]);
  });
}

function getInitialLocale(): Locale {
  if (typeof window === "undefined") {
    return "zh-CN";
  }
  const saved = window.localStorage.getItem(STORAGE_KEY);
  return normalizeLocale(saved ?? window.navigator.language);
}

interface I18nContextValue {
  locale: () => Locale;
  setLocale: (locale: Locale) => void;
  assetsManager: () => AssetsManager;
  t: (key: TranslationKey, params?: TranslationParams) => string;
}

const I18nContext = createContext<I18nContextValue>();

export function I18nProvider(props: ParentProps) {
  const [locale, setLocale] = createSignal<Locale>(getInitialLocale());

  createEffect(() => {
    const currentLocale = locale();
    window.localStorage.setItem(STORAGE_KEY, currentLocale);
    document.documentElement.lang = currentLocale;
  });

  const assetsManager = createMemo(
    () => {
      const manager = new AssetsManager({
        language: locale() === "zh-CN" ? "CHS" : "EN",
      });
      void manager.prepareForSync().catch(() => void 0);
      return manager;
    },
  );

  const value: I18nContextValue = {
    locale,
    setLocale,
    assetsManager,
    t: (key, params) => formatMessage(MESSAGES[locale()][key], params),
  };

  return (
    <I18nContext.Provider value={value}>{props.children}</I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext)!;
}
