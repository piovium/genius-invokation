import { $ } from "bun";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { rollup } from "rollup";
import babel from "@rollup/plugin-babel";
import commonjs from "@rollup/plugin-commonjs";
import nodeResolve from "@rollup/plugin-node-resolve";
import replace from "@rollup/plugin-replace";
import terser from "@rollup/plugin-terser";
import { CORE_VERSION } from "@gi-tcg/core";

async function writeGeneratedJsCodeCpp() {
  const build = await rollup({
    input: `${import.meta.dirname}/../js/main.ts`,
    external: ["@gi-tcg/cbinding-io"],
    plugins: [
      replace({
        preventAssignment: true,
        values: {
          "import.meta.env.DEV": "void 0",
          "process.env.NODE_ENV": JSON.stringify("production"),
        },
      }),
      babel({
        extensions: [".mjs", ".js", ".ts"],
        // We use v8 11.6
        targets: "node 20.0",
        presets: [
          "@babel/preset-typescript",
          [
            "@babel/preset-env",
            {
              bugfixes: true,
              useBuiltIns: "entry",
              corejs: "3.38.1",
            },
          ],
        ],
        babelHelpers: "bundled",
      }),
      commonjs(),
      nodeResolve({
        extensions: [".mjs", ".js", ".ts"],
      }),
      terser(),
    ],
    onwarn: (warn, handler) => {
      if (warn.code === "THIS_IS_UNDEFINED") {
        return;
      }
      handler(warn);
    },
    context: void 0,
  });

  const {
    output: [chunk],
  } = await build.generate({
    format: "es",
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

  await Bun.write(
    OUTPUT_FILEPATH,
    `namespace gitcg {
  namespace v1_0 {
    extern const char JS_CODE[] =
${chunk.code
  .match(/.{1,4096}/g)!
  .map((block) => `    R"${D_CHAR_SEQ}(${block})${D_CHAR_SEQ}"`)
  .join("\n")}
    ;
  }
}`,
  );
}

const INLCUDE_DIR = resolve(import.meta.dirname, `../include/gitcg`);

async function replaceHeaderMacros() {
  const macros = await Bun.file(
    `${import.meta.dirname}/../js/constant.ts`,
  ).text();
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
  const header = await Bun.file(`${INLCUDE_DIR}/gitcg.h`).text();
  const updatedHeader = header.replace(
    /\/\/ >>> generated macros[\s\S]*?\/\/ <<< generated macros/,
    `// >>> generated macros\n${output_source}// <<< generated macros`,
  );

  await Bun.write(`${INLCUDE_DIR}/gitcg.h`, updatedHeader);
}

await writeGeneratedJsCodeCpp();
await replaceHeaderMacros();
