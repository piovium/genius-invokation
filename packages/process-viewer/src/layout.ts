// Copyright (C) 2026 Piovium Labs
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as
// published by the Free Software Foundation, either version 3 of the
// License, or (at your option) any later version.

import ELK from "elkjs/lib/elk.bundled.js";
import type {
  ElkEdgeSection,
  ElkExtendedEdge,
  ElkLabel,
  ElkNode,
} from "elkjs/lib/elk-api";

import type { FlowDiagram, FlowEdge, FlowGroup, FlowNode } from "./types";

export interface PositionedFlowNode extends FlowNode {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface PositionedFlowEdge extends FlowEdge {
  readonly sections: readonly ElkEdgeSection[];
  readonly labels: readonly ElkLabel[];
}

export interface PositionedFlowGroup extends FlowGroup {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface LayoutedFlowDiagram {
  readonly diagram: FlowDiagram;
  readonly width: number;
  readonly height: number;
  readonly contentWidth: number;
  readonly contentHeight: number;
  readonly contentOffsetX: number;
  readonly contentOffsetY: number;
  readonly nodes: readonly PositionedFlowNode[];
  readonly edges: readonly PositionedFlowEdge[];
  readonly groups: readonly PositionedFlowGroup[];
}

const HEADER_HEIGHT = 118;
const FOOTER_HEIGHT = 74;
const MIN_CANVAS_WIDTH = 960;
const GROUP_PADDING_X = 28;
const GROUP_PADDING_TOP = 48;
const GROUP_PADDING_BOTTOM = 28;

const elk = new ELK();

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function textColumns(value: string): number {
  let result = 0;
  for (const character of value) {
    result += character.codePointAt(0)! > 0xff ? 2 : 1;
  }
  return result;
}

export function getFlowNodeSize(node: FlowNode) {
  const lines = [...node.label, ...(node.detail ?? []), node.source ?? ""];
  const maxColumns = Math.max(...lines.map(textColumns));
  const defaultWidth = Math.min(410, Math.max(230, 54 + maxColumns * 7.2));
  const labelHeight = node.label.length * 22;
  const detailHeight = (node.detail?.length ?? 0) * 18;
  const sourceHeight = node.source ? 25 : 0;
  const defaultHeight = Math.max(
    64,
    32 + labelHeight + detailHeight + sourceHeight,
  );
  return {
    width: node.width ?? defaultWidth,
    height: node.height ?? defaultHeight,
  };
}

function edgeLabelSize(text: string) {
  return {
    width: Math.max(28, textColumns(text) * 7 + 18),
    height: 22,
  };
}

function createElkGraph(diagram: FlowDiagram): ElkNode {
  const direction = diagram.direction;
  const nodeOrder = new Map(
    diagram.nodes.map((item, index) => [item.id, index]),
  );
  return {
    id: `diagram-${diagram.id}`,
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": direction,
      "elk.edgeRouting": "ORTHOGONAL",
      "elk.padding": "[top=34,left=42,bottom=34,right=42]",
      "elk.spacing.nodeNode": direction === "DOWN" ? "54" : "66",
      "elk.layered.spacing.nodeNodeBetweenLayers":
        direction === "DOWN" ? "76" : "92",
      "elk.layered.spacing.edgeNodeBetweenLayers": "34",
      "elk.layered.spacing.edgeEdgeBetweenLayers": "22",
      "elk.layered.considerModelOrder.strategy": "NODES_AND_EDGES",
      "elk.layered.cycleBreaking.strategy": "GREEDY_MODEL_ORDER",
      "elk.layered.feedbackEdges": "true",
      "elk.layered.nodePlacement.strategy": "BRANDES_KOEPF",
      "elk.layered.crossingMinimization.strategy": "LAYER_SWEEP",
      "elk.layered.unnecessaryBendpoints": "true",
    },
    children: diagram.nodes.map((item) => ({
      id: item.id,
      ...getFlowNodeSize(item),
    })),
    edges: diagram.edges
      .filter(
        (item) =>
          item.kind !== "recursive" ||
          nodeOrder.get(item.to)! > nodeOrder.get(item.from)!,
      )
      .map<ElkExtendedEdge>((item) => ({
        id: item.id,
        sources: [item.from],
        targets: [item.to],
        labels: item.label
          ? [
              {
                id: `${item.id}-label`,
                text: item.label,
                ...edgeLabelSize(item.label),
              },
            ]
          : [],
        layoutOptions: {
          "elk.layered.priority.direction":
            item.kind === "control" ? "10" : item.kind === "data" ? "2" : "0",
        },
      })),
  };
}

function createFeedbackEdge(
  edge: FlowEdge,
  nodes: ReadonlyMap<string, PositionedFlowNode>,
  diagram: FlowDiagram,
  index: number,
  contentWidth: number,
  contentHeight: number,
): PositionedFlowEdge {
  const source = nodes.get(edge.from)!;
  const target = nodes.get(edge.to)!;
  const labelSize = edge.label ? edgeLabelSize(edge.label) : null;
  if (diagram.direction === "DOWN") {
    const onLeft = index % 2 === 0;
    const gutter = onLeft ? 12 + index * 5 : contentWidth - 12 - index * 5;
    const startPoint = {
      x: onLeft ? source.x : source.x + source.width,
      y: source.y + source.height / 2,
    };
    const endPoint = {
      x: onLeft ? target.x : target.x + target.width,
      y: target.y + target.height / 2,
    };
    return {
      ...edge,
      sections: [
        {
          id: `${edge.id}-feedback`,
          startPoint,
          bendPoints: [
            { x: gutter, y: startPoint.y },
            { x: gutter, y: endPoint.y },
          ],
          endPoint,
        },
      ],
      labels:
        edge.label && labelSize
          ? [
              {
                id: `${edge.id}-label`,
                text: edge.label,
                ...labelSize,
                x: onLeft ? gutter + 6 : gutter - labelSize.width - 6,
                y: (startPoint.y + endPoint.y) / 2 - labelSize.height / 2,
              },
            ]
          : [],
    };
  }
  const onTop = index % 2 === 0;
  const gutter = onTop ? 12 + index * 5 : contentHeight - 12 - index * 5;
  const startPoint = {
    x: source.x + source.width / 2,
    y: onTop ? source.y : source.y + source.height,
  };
  const endPoint = {
    x: target.x + target.width / 2,
    y: onTop ? target.y : target.y + target.height,
  };
  return {
    ...edge,
    sections: [
      {
        id: `${edge.id}-feedback`,
        startPoint,
        bendPoints: [
          { x: startPoint.x, y: gutter },
          { x: endPoint.x, y: gutter },
        ],
        endPoint,
      },
    ],
    labels:
      edge.label && labelSize
        ? [
            {
              id: `${edge.id}-label`,
              text: edge.label,
              ...labelSize,
              x: (startPoint.x + endPoint.x) / 2 - labelSize.width / 2,
              y: onTop ? gutter + 5 : gutter - labelSize.height - 5,
            },
          ]
        : [],
  };
}

function layoutGroups(
  diagram: FlowDiagram,
  nodes: readonly PositionedFlowNode[],
): PositionedFlowGroup[] {
  return diagram.groups.flatMap((group) => {
    const members = nodes.filter((item) => item.group === group.id);
    if (members.length === 0) {
      return [];
    }
    const left = Math.min(...members.map((item) => item.x));
    const top = Math.min(...members.map((item) => item.y));
    const right = Math.max(...members.map((item) => item.x + item.width));
    const bottom = Math.max(...members.map((item) => item.y + item.height));
    return [
      {
        ...group,
        x: round(left - GROUP_PADDING_X),
        y: round(top - GROUP_PADDING_TOP),
        width: round(right - left + GROUP_PADDING_X * 2),
        height: round(bottom - top + GROUP_PADDING_TOP + GROUP_PADDING_BOTTOM),
      },
    ];
  });
}

export async function layoutFlowDiagram(
  diagram: FlowDiagram,
): Promise<LayoutedFlowDiagram> {
  const result = await elk.layout(createElkGraph(diagram));
  const modelNodes = new Map(diagram.nodes.map((item) => [item.id, item]));
  const nodes = (result.children ?? []).map<PositionedFlowNode>((item) => {
    const model = modelNodes.get(item.id);
    if (!model) {
      throw new Error(`ELK returned unknown node ${item.id}`);
    }
    return {
      ...model,
      x: round(item.x ?? 0),
      y: round(item.y ?? 0),
      width: round(item.width ?? getFlowNodeSize(model).width),
      height: round(item.height ?? getFlowNodeSize(model).height),
    };
  });
  const contentWidth = round(result.width ?? 0);
  const contentHeight = round(result.height ?? 0);
  const resultEdges = new Map(
    (result.edges ?? []).map((item) => [item.id, item]),
  );
  const positionedNodes = new Map(nodes.map((item) => [item.id, item]));
  let feedbackIndex = 0;
  const edges = diagram.edges.map<PositionedFlowEdge>((model) => {
    const item = resultEdges.get(model.id);
    if (!item) {
      return createFeedbackEdge(
        model,
        positionedNodes,
        diagram,
        feedbackIndex++,
        contentWidth,
        contentHeight,
      );
    }
    return {
      ...model,
      sections: (item.sections ?? []).map((section) => ({
        ...section,
        startPoint: {
          x: round(section.startPoint.x),
          y: round(section.startPoint.y),
        },
        bendPoints: section.bendPoints?.map((point) => ({
          x: round(point.x),
          y: round(point.y),
        })),
        endPoint: {
          x: round(section.endPoint.x),
          y: round(section.endPoint.y),
        },
      })),
      labels: (item.labels ?? []).map((label) => ({
        ...label,
        x: typeof label.x === "number" ? round(label.x) : label.x,
        y: typeof label.y === "number" ? round(label.y) : label.y,
        width:
          typeof label.width === "number" ? round(label.width) : label.width,
        height:
          typeof label.height === "number" ? round(label.height) : label.height,
      })),
    };
  });
  const width = Math.max(MIN_CANVAS_WIDTH, contentWidth);
  const contentOffsetX = round((width - contentWidth) / 2);
  const contentOffsetY = HEADER_HEIGHT;
  return {
    diagram,
    width,
    height: contentHeight + HEADER_HEIGHT + FOOTER_HEIGHT,
    contentWidth,
    contentHeight,
    contentOffsetX,
    contentOffsetY,
    nodes,
    edges,
    groups: layoutGroups(diagram, nodes),
  };
}

const layoutCache = new Map<FlowDiagram["id"], Promise<LayoutedFlowDiagram>>();

export function getLayoutedFlowDiagram(diagram: FlowDiagram) {
  let cached = layoutCache.get(diagram.id);
  if (!cached) {
    cached = layoutFlowDiagram(diagram);
    layoutCache.set(diagram.id, cached);
  }
  return cached;
}
