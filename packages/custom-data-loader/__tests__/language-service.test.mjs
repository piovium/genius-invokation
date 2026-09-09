import { afterEach, describe, expect, test } from "vitest";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import ts from "typescript";
import { transpile } from "@gi-tcg/gts-transpiler";
import {
  createLanguageWorkspace,
  LANGUAGE_GTS_CONFIG,
  BROWSER_TSDK_URL,
} from "../src/dev-language-workspace.ts";
import {
  isAllowedOrigin,
  mapWorkspaceUris,
  resolveNativeSdk,
} from "../scripts/language-server.mjs";

const declarations = {
  "vm.d.ts": "declare const vm: {}; export default vm;",
  "runtime.d.ts":
    "export declare function createDefine(): void; export declare function createBinding(): void;",
  "data.d.ts": "export declare const value: number;",
};

describe("shared browser and backend language project", () => {
  test("generated GTS imports and user data imports resolve inside the same provider project", () => {
    const files = createLanguageWorkspace(declarations);
    const host = {
      fileExists: (file) => files[file] !== undefined,
      readFile: (file) => files[file],
      directoryExists: (directory) =>
        Object.keys(files).some((file) => file.startsWith(`${directory}/`)),
      getCurrentDirectory: () => "/workspace",
    };
    const compiled = transpile(
      "export const answer = 42;",
      "example.gts",
      LANGUAGE_GTS_CONFIG,
    ).code;
    expect(compiled).toMatch(/from ['"]@gi-tcg\/editor-provider\/vm['"]/);
    expect(compiled).not.toContain("/vm/vm");
    for (const specifier of [
      "@gi-tcg/editor-provider/vm",
      "@gi-tcg/editor-provider/runtime",
      "@gi-tcg/editor-provider/data",
      "@gi-tcg/core/data",
    ]) {
      const resolved = ts.resolveModuleName(
        specifier,
        "/workspace/example.gts",
        {
          module: ts.ModuleKind.Preserve,
          moduleResolution: ts.ModuleResolutionKind.Bundler,
        },
        host,
      ).resolvedModule;
      expect(resolved?.resolvedFileName, specifier).toMatch(
        /^\/workspace\/node_modules\//,
      );
    }
    expect(JSON.parse(files["/workspace/package.json"]).gamingTs).toEqual(
      LANGUAGE_GTS_CONFIG,
    );
    expect(BROWSER_TSDK_URL).toContain("typescript@6.0.3/lib");
  });

  test("missing declarations fail instead of initializing an empty checker", () => {
    expect(() => createLanguageWorkspace({})).toThrow("类型声明");
  });

  test("provider paths cannot escape the generated project", () => {
    expect(() =>
      createLanguageWorkspace({
        ...declarations,
        "../outside.d.ts": "export {};",
      }),
    ).toThrow("Invalid provider declaration path");
    expect(() =>
      createLanguageWorkspace({
        ...declarations,
        "/outside.d.ts": "export {};",
      }),
    ).toThrow("Invalid provider declaration path");
  });
});

describe("existing JSON-RPC transport adaptation", () => {
  test("URI mapping round-trips diagnostics, definitions and workspace edits without changing code", () => {
    const browser = "file:///workspace";
    const server = "file:///C:/Users/test%20user/Temp/gts-session/workspace";
    const message = {
      params: {
        textDocument: { uri: `${browser}/example.gts`, version: 7 },
        contentChanges: [{ text: `${browser}/literal-in-source` }],
        changes: {
          [`${browser}/test2.gts`]: [{ newText: `${browser}/literal-in-edit` }],
        },
        locations: [{ targetUri: `${browser}/test2.gts` }],
      },
    };
    const mapped = mapWorkspaceUris(message, browser, server);
    expect(mapped.params.textDocument.uri).toBe(`${server}/example.gts`);
    expect(mapped.params.locations[0].targetUri).toBe(`${server}/test2.gts`);
    expect(mapped.params.contentChanges[0].text).toBe(
      `${browser}/literal-in-source`,
    );
    expect(mapped.params.changes[`${server}/test2.gts`][0].newText).toBe(
      `${browser}/literal-in-edit`,
    );
    expect(mapWorkspaceUris(mapped, server, browser)).toEqual(message);
    expect(
      mapWorkspaceUris("file:///workspace-other/file.gts", browser, server),
    ).toBe("file:///workspace-other/file.gts");
    expect(
      mapWorkspaceUris(
        "file:///c%3A/Users/test%20user/Temp/gts-session/workspace/example.gts",
        server,
        browser,
      ),
    ).toBe(`${browser}/example.gts`);
  });

  test("loopback origins work; other page origins require explicit configuration", () => {
    expect(isAllowedOrigin("http://localhost:5173")).toBe(true);
    expect(isAllowedOrigin("http://127.0.0.1:5173")).toBe(true);
    expect(isAllowedOrigin("http://[::1]:5173")).toBe(true);
    expect(isAllowedOrigin("https://example.test")).toBe(false);
    expect(isAllowedOrigin("https://localhost.example.test")).toBe(false);
    expect(isAllowedOrigin("null")).toBe(false);
    expect(
      isAllowedOrigin("https://example.test", ["https://example.test"]),
    ).toBe(true);
  });

  const temporary = [];
  afterEach(async () => {
    await Promise.all(
      temporary
        .splice(0)
        .map((directory) => rm(directory, { recursive: true, force: true })),
    );
  });
  test("backend refuses a stock SDK instead of silently running the old checker", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "gts-stock-sdk-test-"));
    temporary.push(directory);
    const sdk = path.join(directory, "lib");
    await mkdir(sdk);
    await writeFile(
      path.join(directory, "package.json"),
      JSON.stringify({ name: "typescript", version: "6.0.3" }),
    );
    await expect(resolveNativeSdk(sdk)).rejects.toThrow(
      "后台必须使用 typescript-native-bridge",
    );
  });
});
