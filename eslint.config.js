import * as tsParser from "@typescript-eslint/parser";
import solid from "eslint-plugin-solid/configs/v2";

export default [
  {
    ...solid,
    files: [
      "packages/{custom-data-loader,detail-log-viewer,web-ui}/src/**/*.{ts,tsx}",
      "packages/utils/src/solid.ts",
    ],
    languageOptions: {
      ...solid.languageOptions,
      parser: tsParser,
    },
  },
];
