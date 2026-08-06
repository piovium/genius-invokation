// Copyright (C) 2026 Piovium Labs
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as
// published by the Free Software Foundation, either version 3 of the
// License, or (at your option) any later version.

import { For, Show, splitProps, type ComponentProps } from "solid-js";

import type { Camera } from "./camera";
import type {
  LayoutedFlowDiagram,
  PositionedFlowEdge,
  PositionedFlowNode,
} from "./layout";
import type { FlowEdgeKind, FlowGroupTone, FlowNodeKind } from "./types";

export interface FlowDiagramSvgProps extends Omit<
  ComponentProps<"svg">,
  "viewBox"
> {
  readonly layout: LayoutedFlowDiagram;
  readonly camera?: Camera;
  readonly staticSize?: boolean;
}

const NODE_COLORS: Record<
  FlowNodeKind,
  { fill: string; stroke: string; accent: string }
> = {
  start: { fill: "#e0f2fe", stroke: "#0284c7", accent: "#0369a1" },
  terminal: { fill: "#dcfce7", stroke: "#16a34a", accent: "#15803d" },
  process: { fill: "#ffffff", stroke: "#475569", accent: "#334155" },
  decision: { fill: "#fef3c7", stroke: "#d97706", accent: "#b45309" },
  event: { fill: "#ecfdf5", stroke: "#059669", accent: "#047857" },
  io: { fill: "#f3e8ff", stroke: "#9333ea", accent: "#7e22ce" },
  note: { fill: "#f8fafc", stroke: "#94a3b8", accent: "#64748b" },
};

const GROUP_COLORS: Record<
  FlowGroupTone,
  { fill: string; stroke: string; text: string }
> = {
  blue: { fill: "#eff6ff", stroke: "#93c5fd", text: "#1d4ed8" },
  green: { fill: "#ecfdf5", stroke: "#86efac", text: "#15803d" },
  amber: { fill: "#fffbeb", stroke: "#fcd34d", text: "#b45309" },
  violet: { fill: "#f5f3ff", stroke: "#c4b5fd", text: "#6d28d9" },
};

const EDGE_COLORS: Record<FlowEdgeKind, string> = {
  control: "#334155",
  data: "#0284c7",
  recursive: "#7c3aed",
};

function nodeShape(node: PositionedFlowNode) {
  const colors = NODE_COLORS[node.kind];
  const common = {
    fill: colors.fill,
    stroke: colors.stroke,
    "stroke-width": node.kind === "start" || node.kind === "terminal" ? 2.5 : 2,
  };
  if (node.kind === "decision") {
    return (
      <polygon
        points={`${node.width / 2},1 ${node.width - 1},${node.height / 2} ${node.width / 2},${node.height - 1} 1,${node.height / 2}`}
        {...common}
      />
    );
  }
  if (node.kind === "io") {
    const inset = 18;
    return (
      <polygon
        points={`${inset},1 ${node.width - 1},1 ${node.width - inset},${node.height - 1} 1,${node.height - 1}`}
        {...common}
      />
    );
  }
  return (
    <rect
      x="1"
      y="1"
      width={node.width - 2}
      height={node.height - 2}
      rx={
        node.kind === "start" || node.kind === "terminal" ? node.height / 2 : 12
      }
      {...common}
      stroke-dasharray={node.kind === "note" ? "7 5" : undefined}
    />
  );
}

function FlowNodeView(props: { node: PositionedFlowNode }) {
  const node = () => props.node;
  const labelHeight = () => node().label.length * 22;
  const detailHeight = () => (node().detail?.length ?? 0) * 18;
  const sourceHeight = () => (node().source ? 22 : 0);
  const totalHeight = () => labelHeight() + detailHeight() + sourceHeight();
  const startY = () => (node().height - totalHeight()) / 2 + 17;
  const colors = () => NODE_COLORS[node().kind];
  return (
    <g
      transform={`translate(${node().x} ${node().y})`}
      data-node-id={node().id}
      role="listitem"
    >
      <Show when={node().source}>
        <title>{node().source}</title>
      </Show>
      {nodeShape(node())}
      <Show when={node().kind === "event"}>
        <line
          x1="12"
          x2="12"
          y1="14"
          y2={node().height - 14}
          stroke={colors().accent}
          stroke-width="4"
          stroke-linecap="round"
        />
      </Show>
      <text
        x={node().width / 2}
        y={startY()}
        text-anchor="middle"
        fill="#0f172a"
        font-family="ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
      >
        <For each={node().label}>
          {(line, index) => (
            <tspan
              x={node().width / 2}
              dy={index() === 0 ? 0 : 22}
              font-size="16"
              font-weight="650"
            >
              {line}
            </tspan>
          )}
        </For>
        <For each={node().detail ?? []}>
          {(line, index) => (
            <tspan
              x={node().width / 2}
              dy={index() === 0 ? 21 : 18}
              fill="#475569"
              font-size="12.5"
              font-weight="450"
            >
              {line}
            </tspan>
          )}
        </For>
        <Show when={node().source}>
          <tspan
            x={node().width / 2}
            dy="20"
            fill={colors().accent}
            font-family="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
            font-size="11.5"
            font-weight="600"
          >
            {node().source}
          </tspan>
        </Show>
      </text>
    </g>
  );
}

function edgePath(section: PositionedFlowEdge["sections"][number]) {
  const points = [
    section.startPoint,
    ...(section.bendPoints ?? []),
    section.endPoint,
  ];
  return points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");
}

function FlowEdgeView(props: {
  edge: PositionedFlowEdge;
  markerPrefix: string;
}) {
  const color = () => EDGE_COLORS[props.edge.kind];
  return (
    <g data-edge-id={props.edge.id}>
      <For each={props.edge.sections}>
        {(section) => (
          <path
            d={edgePath(section)}
            fill="none"
            stroke={color()}
            stroke-width={props.edge.kind === "recursive" ? 2.5 : 2}
            stroke-dasharray={props.edge.kind === "data" ? "7 5" : undefined}
            stroke-linecap="round"
            stroke-linejoin="round"
            marker-end={`url(#${props.markerPrefix}-${props.edge.kind})`}
          />
        )}
      </For>
      <For each={props.edge.labels}>
        {(label) => (
          <Show
            when={typeof label.x === "number" && typeof label.y === "number"}
          >
            <g transform={`translate(${label.x} ${label.y})`}>
              <rect
                width={label.width}
                height={label.height}
                rx="6"
                fill="#ffffff"
                stroke={color()}
                stroke-width="1"
                opacity="0.96"
              />
              <text
                x={(label.width ?? 0) / 2}
                y="15"
                text-anchor="middle"
                fill={color()}
                font-family="ui-sans-serif, system-ui, sans-serif"
                font-size="11.5"
                font-weight="600"
              >
                {label.text}
              </text>
            </g>
          </Show>
        )}
      </For>
    </g>
  );
}

export function FlowDiagramSvg(props: FlowDiagramSvgProps) {
  const [local, rest] = splitProps(props, [
    "layout",
    "camera",
    "staticSize",
    "class",
  ]);
  const markerPrefix = () => `process-${local.layout.diagram.id}-arrow`;
  const camera = () =>
    local.camera ?? {
      x: 0,
      y: 0,
      width: local.layout.width,
      height: local.layout.height,
    };
  const viewBox = () => {
    const value = camera();
    return `${value.x} ${value.y} ${value.width} ${value.height}`;
  };
  const titleId = () => `process-${local.layout.diagram.id}-title`;
  const descriptionId = () => `process-${local.layout.diagram.id}-description`;
  const contentTransform = () =>
    `translate(${local.layout.contentOffsetX} ${local.layout.contentOffsetY})`;
  return (
    <svg
      {...rest}
      xmlns="http://www.w3.org/2000/svg"
      class={`gi-process-diagram-svg ${local.class ?? ""}`}
      viewBox={viewBox()}
      width={local.staticSize ? local.layout.width : undefined}
      height={local.staticSize ? local.layout.height : undefined}
      role="img"
      aria-labelledby={`${titleId()} ${descriptionId()}`}
      preserveAspectRatio="xMidYMid meet"
    >
      <title id={titleId()}>{local.layout.diagram.title}</title>
      <desc id={descriptionId()}>{local.layout.diagram.description}</desc>
      <defs>
        <For each={["control", "data", "recursive"] as const}>
          {(kind) => (
            <marker
              id={`${markerPrefix()}-${kind}`}
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill={EDGE_COLORS[kind]} />
            </marker>
          )}
        </For>
      </defs>
      <rect
        width={local.layout.width}
        height={local.layout.height}
        fill="#f8fafc"
      />
      <text
        x={local.layout.width / 2}
        y="46"
        text-anchor="middle"
        fill="#0f172a"
        font-family="ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
        font-size="28"
        font-weight="750"
      >
        {local.layout.diagram.title}
      </text>
      <text
        x={local.layout.width / 2}
        y="78"
        text-anchor="middle"
        fill="#475569"
        font-family="ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
        font-size="13"
      >
        {local.layout.diagram.description}
      </text>
      <g transform={contentTransform()}>
        <For each={local.layout.groups}>
          {(group) => {
            const colors = GROUP_COLORS[group.tone];
            return (
              <g data-group-id={group.id}>
                <rect
                  x={group.x}
                  y={group.y}
                  width={group.width}
                  height={group.height}
                  rx="18"
                  fill={colors.fill}
                  stroke={colors.stroke}
                  stroke-width="1.5"
                />
                <text
                  x={group.x + 18}
                  y={group.y + 27}
                  fill={colors.text}
                  font-family="ui-sans-serif, system-ui, sans-serif"
                  font-size="14"
                  font-weight="700"
                >
                  {group.title}
                </text>
              </g>
            );
          }}
        </For>
        <For each={local.layout.edges}>
          {(item) => <FlowEdgeView edge={item} markerPrefix={markerPrefix()} />}
        </For>
        <g role="list">
          <For each={local.layout.nodes}>
            {(item) => <FlowNodeView node={item} />}
          </For>
        </g>
      </g>
      <g
        transform={`translate(${Math.max(32, local.layout.width / 2 - 268)} ${local.layout.height - 43})`}
      >
        <text
          x="0"
          y="4"
          fill="#475569"
          font-family="ui-sans-serif, system-ui, sans-serif"
          font-size="12"
          font-weight="700"
        >
          图例
        </text>
        <For
          each={
            [
              ["control", "控制流"],
              ["data", "数据流"],
              ["recursive", "递归结算"],
            ] as const
          }
        >
          {([kind, label], index) => (
            <g transform={`translate(${72 + index() * 150} 0)`}>
              <line
                x1="0"
                x2="48"
                y1="0"
                y2="0"
                stroke={EDGE_COLORS[kind]}
                stroke-width={kind === "recursive" ? 2.5 : 2}
                stroke-dasharray={kind === "data" ? "7 5" : undefined}
                marker-end={`url(#${markerPrefix()}-${kind})`}
              />
              <text
                x="59"
                y="4"
                fill="#475569"
                font-family="ui-sans-serif, system-ui, sans-serif"
                font-size="12"
              >
                {label}
              </text>
            </g>
          )}
        </For>
      </g>
    </svg>
  );
}
