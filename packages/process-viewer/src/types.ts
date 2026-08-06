// Copyright (C) 2026 Piovium Labs
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as
// published by the Free Software Foundation, either version 3 of the
// License, or (at your option) any later version.

export type SettlementDiagramId = "overview" | "skill" | "event";

export type FlowDirection = "DOWN" | "RIGHT";

export type FlowNodeKind =
  "start" | "process" | "decision" | "event" | "io" | "terminal" | "note";

export type FlowEdgeKind = "control" | "data" | "recursive";

export type FlowGroupTone = "blue" | "green" | "amber" | "violet";

export interface FlowGroup {
  readonly id: string;
  readonly title: string;
  readonly tone: FlowGroupTone;
}

export interface FlowNode {
  readonly id: string;
  readonly kind: FlowNodeKind;
  /** Lines are deliberately wrapped in the model for deterministic SVG output. */
  readonly label: readonly string[];
  readonly detail?: readonly string[];
  readonly source?: string;
  readonly group?: string;
  readonly width?: number;
  readonly height?: number;
}

export interface FlowEdge {
  readonly id: string;
  readonly from: string;
  readonly to: string;
  readonly kind: FlowEdgeKind;
  readonly label?: string;
}

export interface FlowDiagram {
  readonly id: SettlementDiagramId;
  readonly title: string;
  readonly description: string;
  readonly direction: FlowDirection;
  readonly groups: readonly FlowGroup[];
  readonly nodes: readonly FlowNode[];
  readonly edges: readonly FlowEdge[];
}
