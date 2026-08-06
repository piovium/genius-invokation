// Copyright (C) 2026 Piovium Labs
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as
// published by the Free Software Foundation, either version 3 of the
// License, or (at your option) any later version.

import { describe, expect, it } from "vitest";

import {
  SETTLEMENT_DIAGRAM_ORDER,
  settlementEventDiagram,
  settlementDiagrams,
  settlementOverviewDiagram,
  settlementSkillDiagram,
} from "../src/diagrams";

describe("settlement flow model", () => {
  it("exposes the three readonly definitions through the aggregate map", () => {
    expect(settlementDiagrams).toEqual({
      overview: settlementOverviewDiagram,
      skill: settlementSkillDiagram,
      event: settlementEventDiagram,
    });
  });

  for (const id of SETTLEMENT_DIAGRAM_ORDER) {
    it(`${id} has a valid connected graph`, () => {
      const diagram = settlementDiagrams[id];
      const nodeIds = diagram.nodes.map((node) => node.id);
      const edgeIds = diagram.edges.map((edge) => edge.id);
      const groupIds = diagram.groups.map((group) => group.id);
      expect(new Set(nodeIds).size).toBe(nodeIds.length);
      expect(new Set(edgeIds).size).toBe(edgeIds.length);
      expect(new Set(groupIds).size).toBe(groupIds.length);

      const connected = new Set<string>();
      for (const edge of diagram.edges) {
        expect(nodeIds).toContain(edge.from);
        expect(nodeIds).toContain(edge.to);
        connected.add(edge.from);
        connected.add(edge.to);
      }
      expect(connected).toEqual(new Set(nodeIds));

      for (const node of diagram.nodes) {
        if (node.group) {
          expect(groupIds).toContain(node.group);
        }
      }
    });
  }

  it("contains every current request branch and no removed shallow flow", () => {
    const serialized = JSON.stringify(settlementDiagrams);
    expect(serialized).not.toContain("浅层事件结算");
    expect(serialized).not.toContain("墓碑区");
    for (const request of [
      "requestReroll",
      "requestSwitchHands",
      "requestSelectCard",
      "requestUseSkill",
      "requestPlayCard",
      "requestAdventure",
      "requestTriggerEndPhaseSkill",
    ]) {
      expect(serialized).toContain(request);
    }
  });

  it("records the implemented skill event order", () => {
    const skillText = JSON.stringify(settlementDiagrams.skill);
    expect(skillText).toContain("其它 → HCI → 安全伤害 → 致命伤害");
    expect(skillText).toContain("modifyZeroHealth");
    expect(skillText).toContain("hostRelatedExecution");
    expect(skillText).toContain("notifyAndPause");
  });
});
