// @ts-check

import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: [
      "**/*.js",
      "node_modules/",
      "artifacts/",
      "cache/",
      ".github/",
      "hardhat.config.ts",
    ],
  },
);
