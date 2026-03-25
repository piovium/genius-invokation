// Copyright (C) 2026 Piovium Labs
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

export default {
  reaction: {
    Melt: "融化",
    Vaporize: "蒸发",
    Overloaded: "超载",
    Superconduct: "超导",
    ElectroCharged: "感电",
    Frozen: "冻结",
    Swirl: "扩散",
    Crystallize: "结晶",
    Burning: "燃烧",
    Bloom: "绽放",
    Quicken: "原激化",
    LunarElectroCharged: "月感电",
    LunarBloom: "月绽放",
    LunarCrystallizeHydro: "月结晶",
  },
  action: {
    Cryo: "冰元素",
    Hydro: "水元素",
    Pyro: "火元素",
    Electro: "雷元素",
    Anemo: "风元素",
    Geo: "岩元素",
    Dendro: "草元素",
    Omni: "万能元素",
    Aligned: "相同元素",
    Void: "任意元素",
    Elemental: "元素",

    tuneToDice: "调和为{{diceType}}骰",

    chooseSupportToDispose: "支援区已满，需先选择一张支援牌弃置",
    // chooseEquipmentToReplace: "已有同类装备，打出后将覆盖原有装备",
    // failToCreateSummon: "召唤物区已满，无法创建更多召唤物",
    // refreshSummon: "召唤物已存在，再次创建可刷新可用次数",

    applyToTarget: "对所选目标生效",

    conditionNotMet: "未满足使用条件",
    noTarget: "没有可用的目标",
    noDice: "元素骰子不足",
    noEnergy: "角色充能不足",
    disabled: "不可进行此操作",

    payCostNoDice: "无需支付更多元素骰",
    payCost: "请支付{{cost}}",
    payCostSingle: "{{count}}个{{diceType}}骰",
    payCostAndSeparator: "和",

    playCardHint: "打出手牌「{{name}}」",
    switchRoleHint: "切换出战角色为「{{name}}」",

    confirmButtonPlayCard: "打出手牌",
    confirmButtonDefault: "确定",
    confirmButtonElementalTuning: "元素调和",

    chooseTarget: "请选择目标",
    chooseOneDiceToTune: "请选择1个元素骰调和",
    chooseActiveCharacter: "请选择出战角色",
  },
  ui: {
    giveUpGame: "放弃对局",
    buttonConfirm: "确定",
    buttonCancel: "取消",
    confirmGiveUpGame: "确定放弃对局吗？",
    liveStreamingMode: "直播模式",
    gameVictory: "对局胜利",
    gameDefeat: "对局失败",
  },
  bottom: {
    invalidatedCardEffectHint: "此牌效果将被无效",
    fastAction: "快速行动",
  },
  capsule: {
    hintMySideFirst: "我方先手",
    hintOppSideFirst: "对方先手",
  },
  history: {
    unknownDice: "未知元素",

    createStatus: "附属状态：",
    createEquipment: "附属装备：",

    removeCombatStatus: "出战状态消失",
    removeStatus: "失去状态：{{entity}}",
    removeEquipment: "失去装备：{{entity}}",
    removeSummon: "召唤物弃置",
    removeSupport: "支援区卡牌弃置",

    transformOld: "转换形态...",
    transformNew: "转换形态完成",

    switchActive: "角色出战",
    overloaded: "超载",
    cardEffect: "卡牌效果",

    willTriggered: "触发效果",
    triggered: "触发效果",

    myDrawCards: "我方抓{{count}}张牌",
    oppDrawCards: "对方抓{{count}}张牌",

    myStealOppHand: "我方夺取对方手牌",
    oppStealMyHand: "对方夺取我方手牌",

    myCreateCombatStatus: "我方生成出战状态",
    oppCreateCombatStatus: "对方生成出战状态",
    myCreateSummon: "我方生成召唤物",
    oppCreateSummon: "对方生成召唤物",
    myCreateSupport: "我方生成支援区卡牌",
    oppCreateSupport: "对方生成支援区卡牌",

    myGenerateDice: "我方生成{{count}}个{{diceType}}骰",
    oppGenerateDice: "对方生成{{count}}个{{diceType}}骰",

    myAbsorbDice: "我方弃置了{{count}}个元素骰",
    oppAbsorbDice: "对方弃置了{{count}}个元素骰",

    myCreateCardToPile: "我方生成卡牌, 并将其置入牌库",
    oppCreateCardToPile: "对方生成卡牌, 并将其置入牌库",
    myGainHandCard: "我方获得手牌",
    oppGainHandCard: "对方获得手牌",

    mySwitchHandOnce: "我方替换了1次手牌",
    oppSwitchHandOnce: "对方替换了1次手牌",

    myPutHandToPile: "我方将{{count}}张手牌置入牌库",
    oppPutHandToPile: "对方将{{count}}张手牌置入牌库",

    myRerolledTimes: "我方进行了{{count}}次重投",
    oppRerolledTimes: "对方进行了{{count}}次重投",

    takeDamage: "受到{{count}}点{{damageType}}",
    healthTo: "，生命值{{old}}→{{next}}",
    defeated: "，被击倒",

    reviveAnd: "复苏，并受到{{count}}点治疗",
    immuneDefeatedAnd: "角色免于被击倒，并受到{{count}}点治疗",
    healed: "受到{{count}}点治疗",

    applyElement: "附着{{elementType}}",

    gainMaxHealth: "获得{{count}}点最大生命值，最大生命值{{old}}→{{next}}",

    gainEnergy: "获得{{count}}点充能，充能值{{old}}→{{next}}",
    loseEnergy: "消耗{{count}}点充能，充能值{{old}}→{{next}}",

    myDiscardHand: "我方舍弃手牌",
    oppDiscardHand: "对方舍弃手牌",

    elementalTuning: "元素调和",

    myConvertToDice: "我方将{{count}}个元素骰转换为{{diceType}}骰",
    oppConvertToDice: "对方将{{count}}个元素骰转换为{{diceType}}骰",
    myConvertSomeDice: "我方将若干元素骰转换为{{diceType}}骰",
    oppConvertSomeDice: "对方将若干元素骰转换为{{diceType}}骰",

    blockedNoEffect: "遭到反制，未能生效",

    swapPosition: "与{{name}}交换位置",

    overflowCard: "因刻意的游戏设计而回归地脉",

    replaceInitialHand: "替换起始手牌",
    chooseInitialActiveCharacter: "选择初始出战角色",
    roundStart: "回合{{round}} 开始",
    endPhase: "结束阶段",

    myActionTurn: "我方行动",
    oppActionTurn: "对方行动",
    myDeclareEndTurn: "我方宣布回合结束",
    oppDeclareEndTurn: "对方宣布回合结束",

    myInitialActiveTitle: "我方选择初始出战角色",
    oppInitialActiveTitle: "对方选择初始出战角色",
    mySwitchActiveTitle: "我方切换角色",
    oppSwitchActiveTitle: "对方切换角色",
    myChooseActiveTitle: "我方选择出战角色",
    oppChooseActiveTitle: "对方选择出战角色",

    myUseTechniqueTitle: "我方使用特技",
    oppUseTechniqueTitle: "对方使用特技",
    myUseSkillTitle: "我方使用技能",
    oppUseSkillTitle: "对方使用技能",
    useTechnique: "使用特技",
    useSkill: "使用技能",

    myPlayCardTitle: "我方打出手牌",
    oppPlayCardTitle: "对方打出手牌",

    mySelectCardTitle: "我方执行挑选",
    oppSelectCardTitle: "对方执行挑选",

    myElementalTuningTitle: "我方进行「元素调和」",
    oppElementalTuningTitle: "对方进行「元素调和」",

    myTriggeredSelectEffect: "我方触发挑选效果",
    oppTriggeredSelectEffect: "对方触发挑选效果",

    judgeAction: "裁判行动",

    loading: "加载中···",
    loadFailed: "加载失败",
    jumpLatest: "跳转至最新",
  },
  mini: {
    mySwitchingHands: "我方正在替换手牌…",
    oppSwitchingHands: "对方正在替换手牌…",
    mySelectingCards: "我方正在挑选…",
    oppSelectingCards: "对方正在挑选…",
    myRerolling: "我方正在重投骰子…",
    oppRerolling: "对方正在重投骰子…",
  },
  notification: {
    normalAttack: "普通攻击",
    elementalSkill: "元素战技",
    elementalBurst: "元素爆发",
    passiveSkill: "被动技能",
    oppSwitchRole: "对方切换角色：",
    mySwitchRole: "我方切换角色：",
    overloaded: "超载",
  },
  player: {
    waiting: "正在等待...",
    acting: "正在行动...",
    choosingActive: "正在选择出战角色...",
    rerolling: "正在重投骰子...",
    switchingHands: "正在替换手牌...",
    selectingCards: "正在挑选...",
    declaredEndStatus: "已宣布结束",
  },
  view: {
    replaceHandsTitle: "替换手牌",
    rerollDiceTitle: "重投骰子",
    chooseCard: "挑选卡牌",
    confirmButton: "确定",
  },
  phase: {
    actionPhase: "行动阶段",
    endPhase: "结束阶段",
    rollPhase: "投掷阶段",

    myActionTurn: "我方行动",
    oppActionTurn: "对方行动",
    myDeclareEndTurn: "我方宣布回合结束",
    oppDeclareEndTurn: "对方宣布回合结束",
    gainFirst: "，获得先手",

    round: "第 {{round}} 回合",
    mySideFirst: "我方先手",
    oppSideFirst: "对方先手",
  },
  skill: {
    notYourTurn: "现在不是你的行动轮",
  },
};
