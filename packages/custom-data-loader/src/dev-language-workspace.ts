/** The browser Worker and Node language server check the same small project. */
export const LANGUAGE_WORKSPACE = "/workspace";
export const BROWSER_TSDK_URL =
  "https://cdn.jsdelivr.net/npm/typescript@6.0.3/lib";
export const DEFAULT_LANGUAGE_SERVER_URL = "ws://127.0.0.1:3001/gts";

export const LANGUAGE_GTS_CONFIG = {
  providerImportSource: "@gi-tcg/editor-provider",
  runtimeImportSource: "@gi-tcg/editor-provider/runtime",
};

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
  const files: Record<string, string> = {};
  for (const [path, content] of Object.entries(providerDeclarations)) {
    if (
      path.startsWith("/") ||
      path.split(/[\\/]/).includes("..") ||
      !path.endsWith(".d.ts")
    ) {
      throw new Error(`Invalid provider declaration path: ${path}`);
    }
    files[
      `${LANGUAGE_WORKSPACE}/node_modules/@gi-tcg/editor-provider/${path}`
    ] = content;
  }
  return {
    ...files,
    [`${LANGUAGE_WORKSPACE}/node_modules/@gi-tcg/editor-provider/package.json`]:
      JSON.stringify({
        name: "@gi-tcg/editor-provider",
        type: "module",
        exports: {
          "./vm": "./vm.d.ts",
          "./runtime": "./runtime.d.ts",
          "./data": "./data.d.ts",
        },
      }),
    [`${LANGUAGE_WORKSPACE}/node_modules/@gi-tcg/core/package.json`]:
      JSON.stringify({
        name: "@gi-tcg/core",
        type: "module",
        exports: { "./data": "./data.d.ts" },
      }),
    [`${LANGUAGE_WORKSPACE}/node_modules/@gi-tcg/core/data.d.ts`]:
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
