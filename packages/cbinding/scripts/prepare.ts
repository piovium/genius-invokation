import path, { resolve } from "node:path";
import { rolldown } from "rolldown";
import babel from "@rollup/plugin-babel";
import { replacePlugin as replace } from "rolldown/plugins";
import { CORE_VERSION } from "@gi-tcg/core";
import { mkdir, readFile, writeFile } from "node:fs/promises";

async function writeGeneratedJsCodeCpp() {
  const build = await rolldown({
    input: `${import.meta.dirname}/../js/main.ts`,
    external: ["@gi-tcg/cbinding-io"],
    context: "globalThis",
    plugins: [
      replace(
        {
          "import.meta.env.DEV": "void 0",
          "process.env.NODE_ENV": JSON.stringify("production"),
        },
        {
          preventAssignment: true,
        },
      ),
      babel({
        extensions: [".mjs", ".js", ".ts"],
        // We use v8 14.8
        targets: { node: "26.0" },
        presets: [
          "@babel/preset-typescript",
          [
            "@babel/preset-env",
            {
              bugfixes: true,
              useBuiltIns: "entry",
              corejs: "3.49.0",
            },
          ],
        ],
        babelHelpers: "bundled",
      }),
    ],
  });

  const {
    output: [chunk],
  } = await build.generate({
    format: "es",
    minify: true,
  });

  const OUTPUT_FILEPATH = resolve(
    import.meta.dirname,
    `../generated/js_code.cpp`,
  );

  const D_CHAR_SEQ = "###";

  if (chunk.type !== "chunk") {
    throw new Error("Unexpected output type");
  }

  if (chunk.code.includes(D_CHAR_SEQ)) {
    throw new Error(
      "Bundled code includes d_char_seq, please reselect another sequence",
    );
  }

  await mkdir(path.dirname(OUTPUT_FILEPATH), { recursive: true });
  await writeFile(
    OUTPUT_FILEPATH,
    `
namespace gitcg {
  namespace v1_0 {
    extern const char JS_CODE[] =
${chunk.code
  .match(/[\s\S]{1,4096}/g)!
  .map((block) => `    R"${D_CHAR_SEQ}(${block})${D_CHAR_SEQ}"`)
  .join("\n")}
    ;
  }
}`,
  );
}

const INLCUDE_DIR = resolve(import.meta.dirname, `../include/gitcg`);

async function replaceHeaderMacros() {
  const macros = await readFile(
    `${import.meta.dirname}/../js/constant.ts`,
    "utf-8",
  );
  let output_source = `#define GITCG_CORE_VERSION ${JSON.stringify(
    CORE_VERSION,
  )}\n`;
  const regexp = /export const ([A-Z0-9_]+) = (\d+);/g;
  for (
    let result: RegExpExecArray | null = null;
    (result = regexp.exec(macros));
  ) {
    const [_, name, value] = result;
    output_source += `#define ${name} ${value}\n`;
  }
  const header = await readFile(`${INLCUDE_DIR}/gitcg.h`, "utf-8");
  const updatedHeader = header.replace(
    /\/\/ >>> generated macros[\s\S]*?\/\/ <<< generated macros/,
    `// >>> generated macros\n${output_source}// <<< generated macros`,
  );

  await writeFile(`${INLCUDE_DIR}/gitcg.h`, updatedHeader);
}

await writeGeneratedJsCodeCpp();
await replaceHeaderMacros();
