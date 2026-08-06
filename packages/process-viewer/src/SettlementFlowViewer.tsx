// Copyright (C) 2026 Piovium Labs
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as
// published by the Free Software Foundation, either version 3 of the
// License, or (at your option) any later version.

import {
  For,
  Show,
  createEffect,
  createResource,
  createSignal,
  splitProps,
  type ComponentProps,
} from "solid-js";

import { fitCamera, panCamera, zoomCamera, type Camera } from "./camera";
import { SETTLEMENT_DIAGRAM_ORDER, settlementDiagrams } from "./diagrams";
import { FlowDiagramSvg } from "./FlowDiagramSvg";
import { getLayoutedFlowDiagram } from "./layout";
import type { SettlementDiagramId } from "./types";

export interface SettlementFlowViewerProps extends ComponentProps<"div"> {
  readonly initialDiagram?: SettlementDiagramId;
}

const DIAGRAM_LABELS: Readonly<Record<SettlementDiagramId, string>> = {
  overview: "结算总览",
  skill: "技能结算",
  event: "事件结算",
};

export function SettlementFlowViewer(props: SettlementFlowViewerProps) {
  const [local, rest] = splitProps(props, [
    "initialDiagram",
    "class",
    "children",
  ]);
  const [diagramId, setDiagramId] = createSignal(
    local.initialDiagram ?? "overview",
  );
  const [layout] = createResource(diagramId, (id) =>
    getLayoutedFlowDiagram(settlementDiagrams[id]),
  );
  const [camera, setCamera] = createSignal<Camera>();

  createEffect(() => {
    const value = layout();
    if (value) {
      setCamera(fitCamera(value));
    }
  });

  const resetCamera = () => {
    const value = layout();
    if (value) {
      setCamera(fitCamera(value));
    }
  };

  const applyZoom = (factor: number, anchorX = 0.5, anchorY = 0.5) => {
    const value = layout();
    const current = camera();
    if (!value || !current) {
      return;
    }
    setCamera(zoomCamera(current, value, factor, anchorX, anchorY));
  };

  let viewport!: HTMLDivElement;
  let drag:
    | {
        pointerId: number;
        startX: number;
        startY: number;
        camera: Camera;
      }
    | undefined;

  const handlePointerDown = (event: PointerEvent) => {
    if (event.button !== 0 || !camera()) {
      return;
    }
    drag = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      camera: camera()!,
    };
    viewport.setPointerCapture(event.pointerId);
    viewport.dataset.dragging = "true";
  };

  const handlePointerMove = (event: PointerEvent) => {
    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }
    const bounds = viewport.getBoundingClientRect();
    const dx =
      -((event.clientX - drag.startX) * drag.camera.width) / bounds.width;
    const dy =
      -((event.clientY - drag.startY) * drag.camera.height) / bounds.height;
    setCamera(panCamera(drag.camera, dx, dy));
  };

  const stopDragging = (event: PointerEvent) => {
    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }
    if (viewport.hasPointerCapture(event.pointerId)) {
      viewport.releasePointerCapture(event.pointerId);
    }
    drag = undefined;
    delete viewport.dataset.dragging;
  };

  const handleWheel = (event: WheelEvent) => {
    const bounds = viewport.getBoundingClientRect();
    event.preventDefault();
    applyZoom(
      event.deltaY > 0 ? 1.14 : 0.86,
      (event.clientX - bounds.left) / bounds.width,
      (event.clientY - bounds.top) / bounds.height,
    );
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    const current = camera();
    if (!current) {
      return;
    }
    const stepX = current.width * 0.06;
    const stepY = current.height * 0.06;
    switch (event.key) {
      case "+":
      case "=":
        applyZoom(0.82);
        break;
      case "-":
        applyZoom(1.22);
        break;
      case "ArrowLeft":
        setCamera(panCamera(current, -stepX, 0));
        break;
      case "ArrowRight":
        setCamera(panCamera(current, stepX, 0));
        break;
      case "ArrowUp":
        setCamera(panCamera(current, 0, -stepY));
        break;
      case "ArrowDown":
        setCamera(panCamera(current, 0, stepY));
        break;
      case "0":
        resetCamera();
        break;
      default:
        return;
    }
    event.preventDefault();
  };

  return (
    <div {...rest} class={`gi-settlement-flow-viewer ${local.class ?? ""}`}>
      <header class="gi-process-toolbar">
        <div class="gi-process-heading">
          <h1>结算流程图</h1>
          <p>以当前 @gi-tcg/core 实现为准</p>
        </div>
        <nav class="gi-process-tabs" aria-label="选择结算流程图">
          <For each={SETTLEMENT_DIAGRAM_ORDER}>
            {(id) => (
              <button
                type="button"
                aria-pressed={diagramId() === id}
                data-active={diagramId() === id ? "true" : undefined}
                onClick={() => setDiagramId(id)}
              >
                {DIAGRAM_LABELS[id]}
              </button>
            )}
          </For>
        </nav>
        <div class="gi-process-actions">
          <button
            type="button"
            aria-label="缩小"
            onClick={() => applyZoom(1.22)}
          >
            −
          </button>
          <button
            type="button"
            aria-label="放大"
            onClick={() => applyZoom(0.82)}
          >
            +
          </button>
          <button type="button" onClick={resetCamera}>
            适应视口
          </button>
          {local.children}
        </div>
      </header>
      <div
        ref={viewport}
        class="gi-process-viewport"
        role="application"
        aria-label="可缩放和平移的结算流程图"
        tabIndex={0}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={stopDragging}
        onPointerCancel={stopDragging}
        onWheel={handleWheel}
        onKeyDown={handleKeyDown}
      >
        <Show
          when={layout()}
          fallback={<div class="gi-process-loading">正在计算流程图布局…</div>}
        >
          {(value) => <FlowDiagramSvg layout={value()} camera={camera()} />}
        </Show>
      </div>
      <footer class="gi-process-help">
        拖动画布以平移；滚轮或 + / − 缩放；方向键平移；按 0 适应视口。
      </footer>
    </div>
  );
}
