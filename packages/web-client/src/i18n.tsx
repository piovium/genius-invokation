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

const STORAGE_KEY = "gi-tcg.web-client.locale";

const MESSAGES = {
  "zh-CN": {
    languageLabel: "语言",
    languageChinese: "中文",
    languageEnglish: "English",
    platformTitle: "七圣召唤模拟对战平台",
    platformLogoAlt: "雨酱牌！",
    logout: "退出登录",
    includeUnreleasedData: "包含未发布数据",
    license: "许可",
    gameVersion: "游戏版本",
    latestBeta: "最新测试版",
    simulatorVersion: "模拟器版本",
    joinQQGroup: "点击加入用户QQ群",
    loadingNow: "加载中，请稍候...",
    loading: "正在加载中...",
    loadingShort: "加载中...",
    loadingEllipsis: "加载中…",
    loadFailed: "加载失败：{message}",
    createDeckFirst: "请先创建一组牌组",
    profile: "个人信息",
    nickname: "昵称",
    chessboardColor: "牌桌颜色",
    gameRecords: "对局记录",
    noGameRecords: "暂无对局记录",
    myDecks: "我的牌组",
    myDecksMore: "我的牌组…",
    add: "添加",
    noDecksAddHint: "暂无牌组，可点击 + 添加",
    newDeck: "新建牌组",
    deckNotFound: "未找到该牌组",
    unsavedChangesConfirm: "您有未保存的更改，是否保存？",
    inputShareCode: "请输入分享码",
    shareCodeCopied: "分享码已复制到剪贴板：{code}",
    importShareCode: "导入分享码",
    generateShareCode: "生成分享码",
    save: "保存",
    cancel: "取消",
    saveDeck: "保存牌组",
    back: "返回",
    userInfoLoadFailed: "用户信息加载失败：{message}",
    pleaseTry: "请尝试",
    guestPrefix: "游客 ",
    welcomeUser: "{guestPrefix}{name}，欢迎你！",
    deckInfoLoading: "牌组信息加载中…",
    deckInfoLoadFailed: "牌组信息加载失败：{message}",
    noDecks: "暂无牌组，",
    goAdd: "前往添加",
    startGame: "开始游戏",
    createRoom: "创建房间…",
    createRoomPlain: "创建房间",
    or: "或者",
    enterRoomCode: "输入房间号",
    joinRoom: "加入房间…",
    joinRoomPlain: "加入房间",
    currentGames: "当前对局",
    roomInfoLoading: "对局信息加载中…",
    roomInfoLoadFailed: "对局信息加载失败：{message}",
    noGames: "暂无对局",
    recommendGithubLogin: "推荐使用 GitHub 登录",
    continueAsGuest: "或者以",
    guestIdentity: "游客身份",
    continueSuffix: "继续……",
    guestNamePlaceholder: "起一个响亮的名字吧！",
    confirm: "确认",
    allowPopup: "请允许弹出窗口以使用 GitHub 登录。",
    guestModeHint:
      "在游客模式下：\n- 您的牌组将保存在本地，不会在云端同步；\n- 您的对局记录将不会在任何地方保存。\n\n如果您希望将对局中的 bug 反馈给开发者，那么强烈建议您使用 GitHub 登录以便我们在数据库中查询对局记录。",
    roomConfig: "房间配置",
    thinkingTime: "思考时间",
    timeConfigMinimal: "最小",
    timeConfigStandard: "标准",
    timeConfigDouble: "双倍",
    timeConfigLong: "超长",
    timeConfigEndless: "≈无尽",
    estimatedEachRound: "预计每回合 {minutes}min",
    initTotalActionTime: "初始化总时间：{seconds}s",
    rerollTime: "每重投时间：{seconds}s",
    roundTotalActionTime: "每回合总时间：{seconds}s",
    actionTime: "每行动时间：{seconds}s",
    publicRoom: "公开房间",
    watchable: "允许观战",
    allowGuestJoin: "允许游客加入",
    guestRecordWarning:
      "有游客参与的对局记录将不会保存。如果您希望将对局中遇到的问题反馈给开发者，建议您{suggestion}。",
    disableGuestJoin: "关闭“允许游客加入”",
    useGithubLogin: "使用 GitHub 登录",
    chooseDeck: "选择出战牌组",
    noDeckForVersion: "暂无该版本可用牌组",
    selectDeckFirst: "请先选择牌组",
    joiningRoom: "正在加入房间…",
    room: "房间 {code}",
    spectateUnavailable: "不可观战",
    slotAvailable: "虚位以待",
    copyShareCode: "复制分享码",
    deleteDeck: "删除牌组",
    deleteDeckConfirm: "确定要删除牌组 {name} 吗？",
    pageNotFound: "页面未找到",
    downloadFailed: "下载失败：{message}",
    defeat: "失败",
    victory: "胜利",
    downloadLog: "下载日志",
    deleteRoomConfirm: "确认删除房间吗？",
    watchLinkCopied: "观战链接已复制到剪贴板！",
    fatalError: "发生致命错误：{message}",
    roomNumber: "房间号：{code}",
    copyWatchLink: "复制观战链接",
    showOpponentBoard: "显示对手棋盘",
    liveMode: "直播模式",
    meLabel: "（您）",
    spectatingLabel: "（观战中）",
    youAreFirst: "您是先手",
    youAreSecond: "您是后手",
    backHome: "回到首页",
    roomLoading: "房间加载中……",
    waitingForOpponent: "等待对手加入房间……",
    roomFinished: "此房间的对局已结束。",
    roomLoadFailed: "加载房间失败！{message}",
  },
  "en-US": {
    languageLabel: "Language",
    languageChinese: "中文",
    languageEnglish: "English",
    platformTitle: "Genius Invokation Battle Platform",
    platformLogoAlt: "YuJiangPai!",
    logout: "Log out",
    includeUnreleasedData: "Includes unreleased data",
    license: "License",
    gameVersion: "Game version",
    latestBeta: "Latest beta",
    simulatorVersion: "Simulator version",
    joinQQGroup: "Join the user QQ group",
    loadingNow: "Loading now, please wait...",
    loading: "Loading...",
    loadingShort: "Loading...",
    loadingEllipsis: "Loading...",
    loadFailed: "Load failed: {message}",
    createDeckFirst: "Please create a deck first",
    profile: "Profile",
    nickname: "Nickname",
    chessboardColor: "Board color",
    gameRecords: "Match history",
    noGameRecords: "No match history yet",
    myDecks: "My Decks",
    myDecksMore: "My Decks...",
    add: "Add",
    noDecksAddHint: "No decks yet. Click + to add one.",
    newDeck: "New Deck",
    deckNotFound: "Deck not found",
    unsavedChangesConfirm: "You have unsaved changes. Save them now?",
    inputShareCode: "Enter share code",
    shareCodeCopied: "Share code copied to clipboard: {code}",
    importShareCode: "Import share code",
    generateShareCode: "Generate share code",
    save: "Save",
    cancel: "Cancel",
    saveDeck: "Save deck",
    back: "Back",
    userInfoLoadFailed: "Failed to load user info: {message}",
    pleaseTry: "Please try",
    guestPrefix: "Guest ",
    welcomeUser: "Welcome, {guestPrefix}{name}!",
    deckInfoLoading: "Loading deck info...",
    deckInfoLoadFailed: "Failed to load deck info: {message}",
    noDecks: "No decks yet, ",
    goAdd: "add one now",
    startGame: "Start Game",
    createRoom: "Create room...",
    createRoomPlain: "Create room",
    or: "or",
    enterRoomCode: "Enter room code",
    joinRoom: "Join room...",
    joinRoomPlain: "Join room",
    currentGames: "Current matches",
    roomInfoLoading: "Loading match info...",
    roomInfoLoadFailed: "Failed to load match info: {message}",
    noGames: "No matches",
    recommendGithubLogin: "Sign in with GitHub",
    continueAsGuest: "Or continue as a",
    guestIdentity: "guest",
    continueSuffix: "...",
    guestNamePlaceholder: "Pick a great name!",
    confirm: "Confirm",
    allowPopup: "Please allow popups to log in with GitHub.",
    guestModeHint:
      "In guest mode:\n- Your decks are stored locally and will not sync to the cloud.\n- Your match history will not be saved anywhere.\n\nIf you want to report bugs from a match, we strongly recommend signing in with GitHub so we can inspect the stored match record.",
    roomConfig: "Room Settings",
    thinkingTime: "Time control",
    timeConfigMinimal: "Minimal",
    timeConfigStandard: "Standard",
    timeConfigDouble: "Double",
    timeConfigLong: "Extended",
    timeConfigEndless: "Almost Endless",
    estimatedEachRound: "About {minutes} min per round",
    initTotalActionTime: "Initial total time: {seconds}s",
    rerollTime: "Reroll time: {seconds}s",
    roundTotalActionTime: "Round total time: {seconds}s",
    actionTime: "Action time: {seconds}s",
    publicRoom: "Public room",
    watchable: "Allow spectators",
    allowGuestJoin: "Allow guests",
    guestRecordWarning:
      "Matches involving guests are not saved. If you want to report issues from a match, we recommend {suggestion}.",
    disableGuestJoin: "disabling guest access",
    useGithubLogin: "signing in with GitHub",
    chooseDeck: "Choose a deck",
    noDeckForVersion: "No deck available for this version",
    selectDeckFirst: "Choose a deck first",
    joiningRoom: "Joining room...",
    room: "Room {code}",
    spectateUnavailable: "Spectating disabled",
    slotAvailable: "Open slot",
    copyShareCode: "Copy share code",
    deleteDeck: "Delete deck",
    deleteDeckConfirm: "Delete deck {name}?",
    pageNotFound: "Page not found",
    downloadFailed: "Download failed: {message}",
    defeat: "Defeat",
    victory: "Victory",
    downloadLog: "Download log",
    deleteRoomConfirm: "Delete this room?",
    watchLinkCopied: "Spectator link copied to clipboard!",
    fatalError: "Fatal error: {message}",
    roomNumber: "Room: {code}",
    copyWatchLink: "Copy spectator link",
    showOpponentBoard: "Show opponent board",
    liveMode: "Live mode",
    meLabel: " (You)",
    spectatingLabel: " (Spectating)",
    youAreFirst: "You go first",
    youAreSecond: "You go second",
    backHome: "Back to home",
    roomLoading: "Loading room...",
    waitingForOpponent: "Waiting for an opponent to join...",
    roomFinished: "This room's match has ended.",
    roomLoadFailed: "Failed to load room: {message}",
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
  dayjsLocale: () => "zh-cn" | "en";
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
    dayjsLocale: () => (locale() === "zh-CN" ? "zh-cn" : "en"),
    t: (key, params) => formatMessage(MESSAGES[locale()][key], params),
  };

  return (
    <I18nContext.Provider value={value}>{props.children}</I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext)!;
}
