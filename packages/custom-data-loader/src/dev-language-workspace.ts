/** Virtual project root shared by the browser Worker and Node language server. */
export const LANGUAGE_WORKSPACE = "/workspace";
export const BROWSER_TSDK_URL =
  "https://cdn.jsdelivr.net/npm/typescript@6.0.3/lib";

export const LANGUAGE_GTS_CONFIG = {
  providerImportSource: "@gi-tcg/editor-provider",
  runtimeImportSource: "@gi-tcg/editor-provider/runtime",
};

/** Resolve a deployment path against the page, including HTTPS → WSS. */
export function languageServerUrl(pageUrl: string, configured = "/gts") {
  const url = new URL(configured, pageUrl);
  if (url.protocol === "https:") {
    url.protocol = "wss:";
  } else if (url.protocol === "http:") {
    url.protocol = "ws:";
  }
  if (!["ws:", "wss:"].includes(url.protocol)) {
    throw new Error("Language service URL must use HTTP(S) or WS(S)");
  }
  return url.href;
}

export function createLanguageWorkspace(
  providerDeclarations: Record<string, string>,
): Record<string, string> {
  if (
    !providerDeclarations["vm.d.ts"] ||
    !providerDeclarations["runtime.d.ts"] ||
    !providerDeclarations["data.d.ts"]
  ) {
    throw new Error(
      "缺少编辑器类型声明，请先运行 custom-data-loader 的 build。",
    );
  }
  const providerDirectory = `${LANGUAGE_WORKSPACE}/node_modules/@gi-tcg/editor-provider`;
  const coreDirectory = `${LANGUAGE_WORKSPACE}/node_modules/@gi-tcg/core`;
  const files: Record<string, string> = {};
  for (const [relativePath, content] of Object.entries(providerDeclarations)) {
    if (
      relativePath.startsWith("/") ||
      relativePath.split(/[\\/]/).includes("..") ||
      !relativePath.endsWith(".d.ts")
    ) {
      throw new Error(`Invalid provider declaration path: ${relativePath}`);
    }
    files[`${providerDirectory}/${relativePath}`] = content;
  }
  return {
    ...files,
    [`${providerDirectory}/package.json`]: JSON.stringify({
      name: "@gi-tcg/editor-provider",
      type: "module",
      exports: {
        "./vm": "./vm.d.ts",
        "./runtime": "./runtime.d.ts",
        "./data": "./data.d.ts",
      },
    }),
    [`${coreDirectory}/package.json`]: JSON.stringify({
      name: "@gi-tcg/core",
      type: "module",
      exports: { "./data": "./data.d.ts" },
    }),
    [`${coreDirectory}/data.d.ts`]:
      'export * from "@gi-tcg/editor-provider/data";',
    [`${LANGUAGE_WORKSPACE}/package.json`]: JSON.stringify({
      private: true,
      type: "module",
      gamingTs: LANGUAGE_GTS_CONFIG,
    }),
    [`${LANGUAGE_WORKSPACE}/tsconfig.json`]: JSON.stringify({
      compilerOptions: {
        lib: ["esnext"],
        types: [],
        target: "esnext",
        module: "preserve",
        verbatimModuleSyntax: true,
        erasableSyntaxOnly: true,
        moduleDetection: "force",
        noEmit: true,
        strict: true,
        skipLibCheck: true,
      },
      include: ["**/*.gts", "**/*.ts"],
    }),
    [`${LANGUAGE_WORKSPACE}/example.gts`]: "",
    [`${LANGUAGE_WORKSPACE}/test2.gts`]: "export const A = 1",
  };
}
