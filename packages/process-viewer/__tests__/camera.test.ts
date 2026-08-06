// Copyright (C) 2026 Piovium Labs
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as
// published by the Free Software Foundation, either version 3 of the
// License, or (at your option) any later version.

import { describe, expect, it } from "vitest";

import { fitCamera, panCamera, zoomCamera } from "../src/camera";

const canvas = { width: 1000, height: 600 };

describe("settlement flow camera", () => {
  it("fits the complete canvas", () => {
    expect(fitCamera(canvas)).toEqual({ x: 0, y: 0, width: 1000, height: 600 });
  });

  it("zooms around the requested anchor", () => {
    const zoomed = zoomCamera(fitCamera(canvas), canvas, 0.5, 0.25, 0.75);
    expect(zoomed).toEqual({ x: 125, y: 225, width: 500, height: 300 });
  });

  it("clamps zoom and pans in diagram coordinates", () => {
    const maximumZoom = zoomCamera(fitCamera(canvas), canvas, 0.01);
    expect(maximumZoom.width).toBe(220);
    expect(maximumZoom.height).toBe(132);
    expect(panCamera(maximumZoom, 12, -8)).toEqual({
      ...maximumZoom,
      x: maximumZoom.x + 12,
      y: maximumZoom.y - 8,
    });
  });
});
