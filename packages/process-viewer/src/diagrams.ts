// Copyright (C) 2026 Piovium Labs
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as
// published by the Free Software Foundation, either version 3 of the
// License, or (at your option) any later version.

import type {
  FlowDiagram,
  FlowEdge,
  FlowGroup,
  FlowNode,
  SettlementDiagramId,
} from "./types";

const node = (
  id: string,
  kind: FlowNode["kind"],
  label: readonly string[],
  options: Omit<FlowNode, "id" | "kind" | "label"> = {},
): FlowNode => ({ id, kind, label, ...options });

const edge = (
  id: string,
  from: string,
  to: string,
  kind: FlowEdge["kind"] = "control",
  label?: string,
): FlowEdge => ({ id, from, to, kind, label });

const groups = (...items: FlowGroup[]) => items;

const overview: FlowDiagram = {
  id: "overview",
  title: "结算流程总览",
  description:
    "Game 发起技能或事件，SkillExecutor 递归结算，StateMutator 统一应用状态变化、通知前端并处理玩家 IO。",
  direction: "RIGHT",
  groups: groups({
    id: "executor",
    title: "SkillExecutor 递归结算",
    tone: "blue",
  }),
  nodes: [
    node("overview-entry", "start", ["Game 阶段 / 玩家行动"], {
      detail: ["或 SkillExecutor.handleEvent 静态入口"],
      source: "game.ts",
    }),
    node("overview-finalize", "process", ["finalizeSkill(skillInfo, arg)"], {
      detail: ["结算单个主动或响应技能"],
      source: "skill_executor.ts",
      group: "executor",
    }),
    node("overview-context", "process", ["执行技能定义 action"], {
      detail: ["SkillContext 私有状态", "收集 Mutation、通知、事件与请求"],
      source: "runtime/skill_context.ts",
      group: "executor",
    }),
    node("overview-preprocess", "process", ["预处理技能事件列表"], {
      detail: ["免死 / 击倒 / HCI", "固定最终事件顺序"],
      source: "SkillContext.preprocessEventList",
      group: "executor",
    }),
    node("overview-commit", "process", ["提交技能结果"], {
      detail: ["resetState + skillUsed", "主动技能计数与充能"],
      source: "SkillExecutor.executeSkill",
      group: "executor",
    }),
    node("overview-events", "event", ["handleEvent(...emittedEvents)"], {
      detail: ["按列表顺序、深度优先递归结算"],
      source: "SkillExecutor.handleEvent",
      group: "executor",
    }),
    node("overview-switch", "process", ["必要时处理击倒切人"], {
      detail: ["双方并行选择", "当前行动方优先实际切换"],
      source: "SkillExecutor.finalizeSkill",
      group: "executor",
    }),
    node("overview-done", "terminal", ["本层结算完成"]),
    node("overview-mutator", "process", ["StateMutator"], {
      detail: ["应用不可变状态 Mutation", "记录详细日志"],
      source: "mutator.ts",
    }),
    node("overview-notify", "note", ["前端通知 / 暂停点"], {
      detail: ["onNotify", "显式 notifyAndPause → onPause"],
    }),
    node("overview-io", "io", ["Player IO"], {
      detail: ["选出战角色、换牌、重投、选牌"],
    }),
  ],
  edges: [
    edge("overview-e-entry-finalize", "overview-entry", "overview-finalize"),
    edge(
      "overview-e-finalize-context",
      "overview-finalize",
      "overview-context",
    ),
    edge(
      "overview-e-context-preprocess",
      "overview-context",
      "overview-preprocess",
    ),
    edge(
      "overview-e-preprocess-commit",
      "overview-preprocess",
      "overview-commit",
    ),
    edge(
      "overview-e-commit-events",
      "overview-commit",
      "overview-events",
      "data",
      "有序事件列表",
    ),
    edge(
      "overview-e-events-finalize",
      "overview-events",
      "overview-finalize",
      "recursive",
      "响应技能 / 请求技能",
    ),
    edge("overview-e-events-switch", "overview-events", "overview-switch"),
    edge(
      "overview-e-switch-events",
      "overview-switch",
      "overview-events",
      "recursive",
      "onSwitchActive",
    ),
    edge("overview-e-switch-done", "overview-switch", "overview-done"),
    edge(
      "overview-e-context-mutator",
      "overview-context",
      "overview-mutator",
      "data",
      "Mutation",
    ),
    edge(
      "overview-e-commit-mutator",
      "overview-commit",
      "overview-mutator",
      "data",
    ),
    edge(
      "overview-e-mutator-notify",
      "overview-mutator",
      "overview-notify",
      "data",
    ),
    edge(
      "overview-e-events-io",
      "overview-events",
      "overview-io",
      "data",
      "request*",
    ),
    edge(
      "overview-e-io-mutator",
      "overview-io",
      "overview-mutator",
      "data",
      "选择结果",
    ),
  ],
};

const skill: FlowDiagram = {
  id: "skill",
  title: "技能结算流程",
  description:
    "对应 SkillExecutor.finalizeSkill、executeSkill 与 SkillContext.preprocessEventList；事件在技能返回前完成击倒判定和排序。",
  direction: "DOWN",
  groups: groups(
    { id: "skill-execute", title: "执行技能定义", tone: "blue" },
    { id: "skill-preprocess", title: "SkillContext 事件预处理", tone: "amber" },
    { id: "skill-commit", title: "提交技能结果", tone: "blue" },
    { id: "skill-finalize", title: "finalizeSkill 后处理", tone: "green" },
    { id: "skill-switch", title: "击倒后的强制切人", tone: "violet" },
  ),
  nodes: [
    node("skill-input", "start", ["输入：skillInfo、arg、当前状态"], {
      source: "SkillExecutor.finalizeSkill",
      group: "skill-execute",
    }),
    node("skill-ended-before", "decision", ["当前 phase 已是 gameEnd？"], {
      group: "skill-execute",
    }),
    node("skill-empty-return", "terminal", ["返回空事件结果"], {
      group: "skill-execute",
    }),
    node("skill-plunging", "process", ["角色主动技能：清除 canPlunging"], {
      detail: ["其它技能跳过此步"],
      source: "SkillExecutor.executeSkill",
      group: "skill-execute",
    }),
    node("skill-run-action", "process", ["执行 skillDef.action"], {
      detail: ["SkillContext 内同步修改私有状态", "EventList 收集事件和请求"],
      group: "skill-execute",
    }),
    node("skill-merge-damage", "process", ["EventList.push 合并同目标伤害"], {
      detail: ["累加 value", "合并 causeDefeated / fromReaction"],
      source: "EventList.push",
      group: "skill-preprocess",
    }),
    node("skill-next-event", "decision", ["取下一个待分类事件"], {
      detail: ["内联技能新发出的事件也追加到同一列表"],
      group: "skill-preprocess",
    }),
    node("skill-event-kind", "decision", ["事件类型？"], {
      group: "skill-preprocess",
    }),
    node("skill-damage-fatal", "decision", ["伤害 causeDefeated？"], {
      group: "skill-preprocess",
    }),
    node("skill-zero-health", "event", ["内联广播 modifyZeroHealth"], {
      detail: ["依次 filter + 执行响应技能"],
      source: "StateMutator.handleInlineEvent",
      group: "skill-preprocess",
    }),
    node("skill-immune", "decision", ["有技能调用 immune(...)？"], {
      group: "skill-preprocess",
    }),
    node("skill-safe-damage", "process", ["加入安全伤害列表"], {
      detail: ["免死时使用 ZeroHealthEventArg"],
      group: "skill-preprocess",
    }),
    node("skill-mark-defeated", "process", ["立即标记角色倒下"], {
      detail: [
        "alive=0；能量和元素附着清零",
        "移除回合技能记录；hasDefeated=true",
      ],
      group: "skill-preprocess",
    }),
    node("skill-critical-damage", "process", ["加入致命伤害列表"], {
      detail: ["记录无存活角色的玩家"],
      group: "skill-preprocess",
    }),
    node("skill-hci-valid", "decision", ["onHandCardInserted 仍有效？"], {
      detail: ["爆牌，或卡牌仍在对应手牌区"],
      group: "skill-preprocess",
    }),
    node("skill-hci", "process", ["加入 HCI 列表"], {
      group: "skill-preprocess",
    }),
    node("skill-drop-hci", "note", ["丢弃过期 HCI 事件"], {
      group: "skill-preprocess",
    }),
    node("skill-other", "process", ["加入其它事件列表"], {
      group: "skill-preprocess",
    }),
    node("skill-more-events", "decision", ["列表中还有事件？"], {
      group: "skill-preprocess",
    }),
    node("skill-game-end", "process", ["按 failedPlayers 判定胜负"], {
      detail: ["一方失败 → 对方获胜", "双方失败 → 平局；phase=gameEnd"],
      group: "skill-preprocess",
    }),
    node("skill-host-sort", "process", ["hostRelatedExecution：重排 HCI"], {
      detail: ["按 host 双方当前手牌顺序稳定排序"],
      group: "skill-preprocess",
    }),
    node("skill-order-events", "process", ["形成 emittedEvents"], {
      detail: [
        "其它 → HCI → 安全伤害 → 致命伤害",
        "致命列表非空即 causeDefeated=true",
      ],
      source: "SkillContext.preprocessEventList",
      group: "skill-preprocess",
    }),
    node("skill-commit", "process", ["提交 SkillContext 结果"], {
      detail: ["skillUsed mutation 前置", "resetState(newState, innerNotify)"],
      source: "SkillExecutor.executeSkill",
      group: "skill-commit",
    }),
    node("skill-ended-after", "decision", ["提交后已 gameEnd？"], {
      group: "skill-finalize",
    }),
    node("skill-initiative", "decision", ["角色主动技能？"], {
      group: "skill-finalize",
    }),
    node("skill-round-log", "process", ["写入本回合技能使用记录"], {
      group: "skill-finalize",
    }),
    node(
      "skill-gain-energy",
      "decision",
      ["允许获得充能，角色存活", "且不是特殊能量角色？"],
      {
        group: "skill-finalize",
      },
    ),
    node("skill-energy-pause", "process", ["增加至多 1 点充能"], {
      detail: ["随后 notifyAndPause()"],
      source: "StateMutator.notifyAndPause",
      group: "skill-finalize",
    }),
    node("skill-handle-events", "event", ["handleEvent(...emittedEvents)"], {
      detail: ["逐项、深度优先递归结算"],
      group: "skill-finalize",
    }),
    node("skill-need-switch", "decision", ["未结束且 causeDefeated？"], {
      group: "skill-finalize",
    }),
    node("skill-choose", "io", ["双方并行检查并选择新出战角色"], {
      detail: ["需要选择者临时 defeatedSwitching=true"],
      group: "skill-switch",
    }),
    node("skill-post-choose", "process", ["一次性通知双方选择结果"], {
      source: "StateMutator.postChooseActive",
      group: "skill-switch",
    }),
    node("skill-switch-active", "process", ["依次实际切换出战角色"], {
      detail: ["当前行动方 → 另一方", "每次递归结算 onSwitchActive"],
      group: "skill-switch",
    }),
    node("skill-restore-flags", "process", ["恢复 defeatedSwitching 标志"], {
      group: "skill-switch",
    }),
    node("skill-done", "terminal", ["本层技能结算完成"]),
  ],
  edges: [
    edge("skill-e-input-ended", "skill-input", "skill-ended-before"),
    edge(
      "skill-e-ended-empty",
      "skill-ended-before",
      "skill-empty-return",
      "control",
      "是",
    ),
    edge(
      "skill-e-ended-plunging",
      "skill-ended-before",
      "skill-plunging",
      "control",
      "否",
    ),
    edge("skill-e-plunging-action", "skill-plunging", "skill-run-action"),
    edge(
      "skill-e-action-merge",
      "skill-run-action",
      "skill-merge-damage",
      "data",
      "EventList",
    ),
    edge("skill-e-merge-next", "skill-merge-damage", "skill-next-event"),
    edge(
      "skill-e-next-kind",
      "skill-next-event",
      "skill-event-kind",
      "control",
      "有",
    ),
    edge(
      "skill-e-next-game-end",
      "skill-next-event",
      "skill-game-end",
      "control",
      "无",
    ),
    edge(
      "skill-e-kind-damage",
      "skill-event-kind",
      "skill-damage-fatal",
      "control",
      "伤害",
    ),
    edge(
      "skill-e-kind-hci",
      "skill-event-kind",
      "skill-hci-valid",
      "control",
      "HCI",
    ),
    edge(
      "skill-e-kind-other",
      "skill-event-kind",
      "skill-other",
      "control",
      "其它",
    ),
    edge(
      "skill-e-damage-safe",
      "skill-damage-fatal",
      "skill-safe-damage",
      "control",
      "否",
    ),
    edge(
      "skill-e-damage-zero",
      "skill-damage-fatal",
      "skill-zero-health",
      "control",
      "是",
    ),
    edge("skill-e-zero-immune", "skill-zero-health", "skill-immune"),
    edge(
      "skill-e-immune-safe",
      "skill-immune",
      "skill-safe-damage",
      "control",
      "是",
    ),
    edge(
      "skill-e-immune-defeat",
      "skill-immune",
      "skill-mark-defeated",
      "control",
      "否",
    ),
    edge(
      "skill-e-defeat-critical",
      "skill-mark-defeated",
      "skill-critical-damage",
    ),
    edge("skill-e-hci-keep", "skill-hci-valid", "skill-hci", "control", "是"),
    edge(
      "skill-e-hci-drop",
      "skill-hci-valid",
      "skill-drop-hci",
      "control",
      "否",
    ),
    edge("skill-e-safe-more", "skill-safe-damage", "skill-more-events"),
    edge("skill-e-critical-more", "skill-critical-damage", "skill-more-events"),
    edge("skill-e-hci-more", "skill-hci", "skill-more-events"),
    edge("skill-e-drop-more", "skill-drop-hci", "skill-more-events"),
    edge("skill-e-other-more", "skill-other", "skill-more-events"),
    edge(
      "skill-e-more-next",
      "skill-more-events",
      "skill-next-event",
      "recursive",
      "是",
    ),
    edge(
      "skill-e-more-game-end",
      "skill-more-events",
      "skill-game-end",
      "control",
      "否",
    ),
    edge("skill-e-game-end-host", "skill-game-end", "skill-host-sort"),
    edge("skill-e-host-order", "skill-host-sort", "skill-order-events"),
    edge("skill-e-order-commit", "skill-order-events", "skill-commit", "data"),
    edge("skill-e-commit-ended", "skill-commit", "skill-ended-after"),
    edge(
      "skill-e-ended-after-done",
      "skill-ended-after",
      "skill-done",
      "control",
      "是",
    ),
    edge(
      "skill-e-ended-after-initiative",
      "skill-ended-after",
      "skill-initiative",
      "control",
      "否",
    ),
    edge(
      "skill-e-initiative-log",
      "skill-initiative",
      "skill-round-log",
      "control",
      "是",
    ),
    edge(
      "skill-e-initiative-events",
      "skill-initiative",
      "skill-handle-events",
      "control",
      "否",
    ),
    edge("skill-e-log-energy", "skill-round-log", "skill-gain-energy"),
    edge(
      "skill-e-energy-pause",
      "skill-gain-energy",
      "skill-energy-pause",
      "control",
      "是",
    ),
    edge(
      "skill-e-energy-events",
      "skill-gain-energy",
      "skill-handle-events",
      "control",
      "否",
    ),
    edge("skill-e-pause-events", "skill-energy-pause", "skill-handle-events"),
    edge("skill-e-events-switch", "skill-handle-events", "skill-need-switch"),
    edge(
      "skill-e-no-switch-done",
      "skill-need-switch",
      "skill-done",
      "control",
      "否",
    ),
    edge(
      "skill-e-switch-choose",
      "skill-need-switch",
      "skill-choose",
      "control",
      "是",
    ),
    edge("skill-e-choose-post", "skill-choose", "skill-post-choose"),
    edge("skill-e-post-switch", "skill-post-choose", "skill-switch-active"),
    edge(
      "skill-e-switch-events",
      "skill-switch-active",
      "skill-handle-events",
      "recursive",
      "onSwitchActive",
    ),
    edge(
      "skill-e-switch-restore",
      "skill-switch-active",
      "skill-restore-flags",
    ),
    edge("skill-e-restore-done", "skill-restore-flags", "skill-done"),
  ],
};

const event: FlowDiagram = {
  id: "event",
  title: "事件结算流程",
  description:
    "对应 SkillExecutor.handleEvent：事件按列表顺序处理；嵌套事件和技能在当前位置完成后，才继续外层后续事件。",
  direction: "DOWN",
  groups: groups({
    id: "event-loop",
    title: "handleEvent 事件循环",
    tone: "green",
  }),
  nodes: [
    node("event-input", "start", ["输入：EventAndRequest 列表"], {
      source: "SkillExecutor.handleEvent",
      group: "event-loop",
    }),
    node("event-next", "decision", ["取下一个事件"], { group: "event-loop" }),
    node("event-ended", "decision", ["当前 phase 已是 gameEnd？"], {
      group: "event-loop",
    }),
    node("event-open", "event", ["通知 handleEvent 开始"], {
      detail: ["isClose=false；作用域退出时保证关闭"],
      source: "createHandleEventNotifies",
      group: "event-loop",
    }),
    node("event-dispatch", "decision", ["按事件 / 请求名称分派"], {
      group: "event-loop",
      width: 320,
    }),
    node("event-reroll", "io", ["requestReroll"], {
      detail: ["Player IO：按 times 重投"],
    }),
    node("event-switch-hands", "io", ["requestSwitchHands"], {
      detail: ["Player IO 换牌", "递归结算产生的事件"],
    }),
    node("event-select-card", "io", ["requestSelectCard"], {
      detail: ["Player IO 选牌 → 递归结算结果", "随后递归触发 onSelectCard"],
    }),
    node(
      "event-use-validate",
      "decision",
      ["requestUseSkill：技能可用", "且出战角色未禁用技能？"],
      {
        width: 330,
      },
    ),
    node("event-use-before", "event", ["递归结算 onBeforeUseSkill"], {}),
    node("event-use-finalize", "process", ["finalizeSkill(请求的技能)"], {
      detail: ["计算 charged / plunging / prepared"],
    }),
    node("event-use-after", "event", ["递归结算 onUseSkill"], {}),
    node("event-play-create", "process", ["requestPlayCard"], {
      detail: ["临时创建不爆牌的手牌实体", "查找 playCard 技能"],
    }),
    node("event-play-exists", "decision", ["存在 playCard 技能？"], {}),
    node("event-play-finalize", "process", ["finalizeSkill(playCard)"], {}),
    node(
      "event-adventure-spot",
      "decision",
      ["requestAdventure：已有冒险地点？"],
      {
        width: 340,
      },
    ),
    node("event-adventure-existing", "event", ["地点 exp +1"], {
      detail: ["递归触发该地点 onAdventure"],
    }),
    node("event-adventure-select", "io", ["请求选择冒险地点"], {
      detail: ["递归结算选牌结果", "随后递归触发 onSelectCard"],
    }),
    node("event-end-phase", "process", ["requestTriggerEndPhaseSkill"], {
      detail: [
        "遍历指定实体的 onEndPhase 技能",
        "filter 通过则逐一 finalizeSkill",
      ],
      width: 350,
    }),
    node("event-broadcast", "process", ["普通核心事件：收集响应技能快照"], {
      detail: [
        "onDispose 先加入被弃置实体自身技能",
        "再追加 allSkills(当前场上实体与扩展)",
      ],
      source: "SkillExecutor.broadcastEvent",
      width: 370,
    }),
    node("event-skill-next", "decision", ["取下一个候选技能"], {}),
    node("event-filter", "decision", ["skill.filter 当前状态通过？"], {}),
    node("event-finalize", "process", ["finalizeSkill(响应技能)"], {
      detail: ["其事件在此处深度优先结算"],
    }),
    node("event-finish", "event", ["通知 handleEvent 关闭"], {
      detail: ["isClose=true"],
      group: "event-loop",
    }),
    node("event-more", "decision", ["外层列表还有事件？"], {
      group: "event-loop",
    }),
    node("event-done", "terminal", ["本层事件列表结算完成"]),
  ],
  edges: [
    edge("event-e-input-next", "event-input", "event-next"),
    edge("event-e-next-ended", "event-next", "event-ended", "control", "有"),
    edge("event-e-next-done", "event-next", "event-done", "control", "无"),
    edge("event-e-ended-done", "event-ended", "event-done", "control", "是"),
    edge("event-e-ended-open", "event-ended", "event-open", "control", "否"),
    edge("event-e-open-dispatch", "event-open", "event-dispatch"),
    edge(
      "event-e-dispatch-reroll",
      "event-dispatch",
      "event-reroll",
      "control",
      "reroll",
    ),
    edge(
      "event-e-dispatch-switch-hands",
      "event-dispatch",
      "event-switch-hands",
      "control",
      "switchHands",
    ),
    edge(
      "event-e-dispatch-select",
      "event-dispatch",
      "event-select-card",
      "control",
      "selectCard",
    ),
    edge(
      "event-e-dispatch-use",
      "event-dispatch",
      "event-use-validate",
      "control",
      "useSkill",
    ),
    edge(
      "event-e-dispatch-play",
      "event-dispatch",
      "event-play-create",
      "control",
      "playCard",
    ),
    edge(
      "event-e-dispatch-adventure",
      "event-dispatch",
      "event-adventure-spot",
      "control",
      "adventure",
    ),
    edge(
      "event-e-dispatch-end",
      "event-dispatch",
      "event-end-phase",
      "control",
      "endPhaseSkill",
    ),
    edge(
      "event-e-dispatch-normal",
      "event-dispatch",
      "event-broadcast",
      "control",
      "普通事件",
    ),
    edge("event-e-reroll-finish", "event-reroll", "event-finish"),
    edge(
      "event-e-switch-finish",
      "event-switch-hands",
      "event-finish",
      "recursive",
      "产生的事件",
    ),
    edge(
      "event-e-select-finish",
      "event-select-card",
      "event-finish",
      "recursive",
      "结果 + onSelectCard",
    ),
    edge(
      "event-e-use-invalid",
      "event-use-validate",
      "event-finish",
      "control",
      "否：记录并跳过",
    ),
    edge(
      "event-e-use-before",
      "event-use-validate",
      "event-use-before",
      "control",
      "是",
    ),
    edge(
      "event-e-use-finalize",
      "event-use-before",
      "event-use-finalize",
      "recursive",
    ),
    edge(
      "event-e-use-after",
      "event-use-finalize",
      "event-use-after",
      "recursive",
    ),
    edge("event-e-use-finish", "event-use-after", "event-finish"),
    edge("event-e-play-exists", "event-play-create", "event-play-exists"),
    edge(
      "event-e-play-skip",
      "event-play-exists",
      "event-finish",
      "control",
      "否：跳过",
    ),
    edge(
      "event-e-play-finalize",
      "event-play-exists",
      "event-play-finalize",
      "control",
      "是",
    ),
    edge(
      "event-e-play-finish",
      "event-play-finalize",
      "event-finish",
      "recursive",
    ),
    edge(
      "event-e-adventure-existing",
      "event-adventure-spot",
      "event-adventure-existing",
      "control",
      "是",
    ),
    edge(
      "event-e-adventure-select",
      "event-adventure-spot",
      "event-adventure-select",
      "control",
      "否",
    ),
    edge(
      "event-e-adventure-existing-finish",
      "event-adventure-existing",
      "event-finish",
      "recursive",
      "onAdventure",
    ),
    edge(
      "event-e-adventure-select-finish",
      "event-adventure-select",
      "event-finish",
      "recursive",
      "选牌事件",
    ),
    edge(
      "event-e-end-finish",
      "event-end-phase",
      "event-finish",
      "recursive",
      "逐个技能",
    ),
    edge("event-e-broadcast-next", "event-broadcast", "event-skill-next"),
    edge(
      "event-e-skill-filter",
      "event-skill-next",
      "event-filter",
      "control",
      "有",
    ),
    edge(
      "event-e-skill-finish",
      "event-skill-next",
      "event-finish",
      "control",
      "无",
    ),
    edge(
      "event-e-filter-next",
      "event-filter",
      "event-skill-next",
      "control",
      "否",
    ),
    edge(
      "event-e-filter-finalize",
      "event-filter",
      "event-finalize",
      "control",
      "是",
    ),
    edge(
      "event-e-finalize-next",
      "event-finalize",
      "event-skill-next",
      "recursive",
      "下一候选",
    ),
    edge("event-e-finish-more", "event-finish", "event-more"),
    edge("event-e-more-next", "event-more", "event-next", "recursive", "是"),
    edge("event-e-more-done", "event-more", "event-done", "control", "否"),
  ],
};

export {
  event as settlementEventDiagram,
  overview as settlementOverviewDiagram,
  skill as settlementSkillDiagram,
};

export const SETTLEMENT_DIAGRAM_ORDER = [
  "overview",
  "skill",
  "event",
] as const satisfies readonly SettlementDiagramId[];

export const settlementDiagrams: Readonly<
  Record<SettlementDiagramId, FlowDiagram>
> = { overview, skill, event };
