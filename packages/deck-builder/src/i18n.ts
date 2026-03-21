export type Locale = "zh-CN" | "en-US";

const MESSAGES = {
  "zh-CN": {
    characters: "角色牌",
    actionCards: "行动牌",
    versionBelow: "当前仅显示 {version} 及更低版本",
    filter: "筛选",
    clear: "清除",
    collapse: "收起",
    invalid: "失效",
    selected: "已选",
    selectedCount: "已选{count}张",
    loadingCards: "加载卡牌中...",
    loadCardsFailed: "加载卡牌失败！",
    elementType: "元素类型",
    weaponType: "武器类型",
    faction: "所属阵营",
    cardType: "卡牌类型",
    cardTag: "卡牌标签",
    typeModify: "装备牌",
    typeEvent: "事件牌",
    typeAssist: "支援牌",
  },
  "en-US": {
    characters: "Characters",
    actionCards: "Action Cards",
    versionBelow: "Showing {version} and earlier only",
    filter: "Filter",
    clear: "Clear",
    collapse: "Collapse",
    invalid: "Invalid",
    selected: "Selected",
    selectedCount: "Selected x{count}",
    loadingCards: "Loading cards...",
    loadCardsFailed: "Failed to load cards!",
    elementType: "Element",
    weaponType: "Weapon",
    faction: "Faction",
    cardType: "Card Type",
    cardTag: "Card Tag",
    typeModify: "Equipment",
    typeEvent: "Event",
    typeAssist: "Support",
  },
} as const;

export type DeckBuilderTranslationKey = keyof (typeof MESSAGES)["en-US"];

export function translateDeckBuilder(
  locale: Locale,
  key: DeckBuilderTranslationKey,
  params?: Record<string, string | number>,
) {
  const template = MESSAGES[locale][key];
  if (!params) {
    return template;
  }
  return template.replace(/\{(\w+)\}/g, (_, name: string) => {
    return params[name] === void 0 ? `{${name}}` : String(params[name]);
  });
}

export function getCardTypeText(locale: Locale, tagName: string) {
  switch (tagName) {
    case "GCG_CARD_MODIFY":
      return translateDeckBuilder(locale, "typeModify");
    case "GCG_CARD_EVENT":
      return translateDeckBuilder(locale, "typeEvent");
    case "GCG_CARD_ASSIST":
      return translateDeckBuilder(locale, "typeAssist");
    default:
      return tagName;
  }
}
