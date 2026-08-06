// Copyright (C) 2026 Piovium Labs
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as
// published by the Free Software Foundation, either version 3 of the
// License, or (at your option) any later version.

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createServer } from "vite";
import solid from "vite-plugin-solid";

import { SETTLEMENT_DIAGRAM_ORDER, settlementDiagrams } from "../src/diagrams";
import { layoutFlowDiagram, type LayoutedFlowDiagram } from "../src/layout";

const CHECK_ONLY = process.argv.includes("--check");
const REPOSITORY_ROOT = path.resolve(import.meta.dirname, "../../..");
const PACKAGE_ROOT = path.resolve(import.meta.dirname, "..");
const OUTPUT_DIRECTORY = path.join(REPOSITORY_ROOT, "docs/images");

const staleFiles: string[] = [];
type RenderFlowDiagramSvg = (layout: LayoutedFlowDiagram) => string;

// Load the renderer through Vite so TSX receives the same Solid transform as
// the browser library build. The layout itself stays DOM-free and runs in Node.
const vite = await createServer({
  root: PACKAGE_ROOT,
  configFile: false,
  appType: "custom",
  plugins: [
    solid({
      ssr: true,
      hot: false,
      dev: false,
      solid: { hydratable: false },
    }),
  ],
  server: { middlewareMode: true, hmr: false, ws: false },
});
const rendererModule = (await vite.ssrLoadModule("/src/server.tsx")) as {
  renderFlowDiagramSvg: RenderFlowDiagramSvg;
};
const { renderFlowDiagramSvg } = rendererModule;

try {
  for (const id of SETTLEMENT_DIAGRAM_ORDER) {
    const layout = await layoutFlowDiagram(settlementDiagrams[id]);
    const content = renderFlowDiagramSvg(layout);
    const filename = `process-${id}.svg`;
    const outputPath = path.join(OUTPUT_DIRECTORY, filename);
    if (CHECK_ONLY) {
      const existing = await readFile(outputPath, "utf8").catch(() => null);
      if (existing !== content) {
        staleFiles.push(filename);
      }
    } else {
      await writeFile(outputPath, content);
      process.stdout.write(
        `Rendered ${path.relative(REPOSITORY_ROOT, outputPath)}\n`,
      );
    }
  }
} finally {
  await vite.close();
}

if (staleFiles.length > 0) {
  throw new Error(
    `Generated settlement diagrams are stale: ${staleFiles.join(", ")}. Run \`pnpm --filter @gi-tcg/process-viewer render\`.`,
  );
}
