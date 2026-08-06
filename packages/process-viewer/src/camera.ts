// Copyright (C) 2026 Piovium Labs
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as
// published by the Free Software Foundation, either version 3 of the
// License, or (at your option) any later version.

export interface Camera {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface CanvasSize {
  readonly width: number;
  readonly height: number;
}

const MIN_VIEW_RATIO = 0.22;

export function fitCamera(canvas: CanvasSize): Camera {
  return { x: 0, y: 0, width: canvas.width, height: canvas.height };
}

export function zoomCamera(
  camera: Camera,
  canvas: CanvasSize,
  factor: number,
  anchorX = 0.5,
  anchorY = 0.5,
): Camera {
  const nextWidth = Math.min(
    canvas.width,
    Math.max(canvas.width * MIN_VIEW_RATIO, camera.width * factor),
  );
  const nextHeight = nextWidth * (camera.height / camera.width);
  return {
    x: camera.x + (camera.width - nextWidth) * anchorX,
    y: camera.y + (camera.height - nextHeight) * anchorY,
    width: nextWidth,
    height: nextHeight,
  };
}

export function panCamera(camera: Camera, dx: number, dy: number): Camera {
  return {
    ...camera,
    x: camera.x + dx,
    y: camera.y + dy,
  };
}
