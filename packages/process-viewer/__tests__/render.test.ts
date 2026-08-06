// Copyright (C) 2026 Piovium Labs
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as
// published by the Free Software Foundation, either version 3 of the
// License, or (at your option) any later version.

import { describe, expect, it } from "vitest";

import { settlementDiagrams } from "../src/diagrams";
import { layoutFlowDiagram } from "../src/layout";
import { renderFlowDiagramSvg } from "../src/server";

describe("settlement flow SVG", () => {
  it("lays out and renders accessible native SVG deterministically", async () => {
    const firstLayout = await layoutFlowDiagram(settlementDiagrams.overview);
    const secondLayout = await layoutFlowDiagram(settlementDiagrams.overview);
    expect(secondLayout).toEqual(firstLayout);
    expect(firstLayout.edges.every((edge) => edge.sections.length > 0)).toBe(
      true,
    );

    const svg = renderFlowDiagramSvg(firstLayout);
    expect(svg).toContain("<svg");
    expect(svg).toContain('role="img"');
    expect(svg).toContain("<title");
    expect(svg).toContain("<desc");
    expect(svg).not.toContain("foreignObject");
    expect(svg).not.toContain("[object Object]");
    expect(renderFlowDiagramSvg(secondLayout)).toBe(svg);
  });
});
