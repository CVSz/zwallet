#!/usr/bin/env bash
set -euo pipefail

cd /opt/zwallet

echo "== Phase 15.1: ESLint quality gate =="

echo "== Install lint dependencies at workspace root =="
pnpm add -Dw \
  eslint \
  @eslint/js \
  globals \
  typescript \
  typescript-eslint \
  eslint-plugin-import \
  eslint-plugin-unicorn \
  eslint-plugin-promise \
  eslint-plugin-security \
  eslint-plugin-sonarjs \
  eslint-plugin-eslint-comments \
  eslint-import-resolver-typescript

echo "== Create root flat ESLint config =="
cat > eslint.config.mjs <<'EOT'
import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import importPlugin from "eslint-plugin-import";
import unicorn from "eslint-plugin-unicorn";
import promisePlugin from "eslint-plugin-promise";
import security from "eslint-plugin-security";
import sonarjs from "eslint-plugin-sonarjs";
import eslintComments from "eslint-plugin-eslint-comments";

export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/build/**",
      "**/.next/**",
      "**/coverage/**",
      "**/node_modules/**",
      "**/*.min.js",
      "**/generated/**",
      "**/tsconfig.tsbuildinfo",
    ],
  },

  js.configs.recommended,

  ...tseslint.configs.recommended,

  {
    files: ["**/*.{js,mjs,cjs,ts,mts,cts,tsx}"],

    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.node,
        ...globals.browser,
      },
    },

    plugins: {
      import: importPlugin,
      unicorn,
      promise: promisePlugin,
      security,
      sonarjs,
      "eslint-comments": eslintComments,
    },

    settings: {
      "import/resolver": {
        typescript: true,
        node: true,
      },
    },

    rules: {
      "no-debugger": "error",
      "no-var": "error",
      "prefer-const": "error",

      "no-console": [
        "warn",
        {
          allow: ["warn", "error"],
        },
      ],

      "@typescript-eslint/consistent-type-imports": [
        "warn",
        {
          prefer: "type-imports",
          fixStyle: "inline-type-imports",
        },
      ],

      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],

      "@typescript-eslint/no-explicit-any": "off",

      "import/first": "warn",
      "import/no-duplicates": "warn",
      "import/newline-after-import": "warn",

      "promise/no-return-wrap": "warn",
      "promise/param-names": "warn",

      "security/detect-eval-with-expression": "error",
      "security/detect-object-injection": "off",
      "security/detect-non-literal-fs-filename": "off",
      "security/detect-child-process": "warn",

      "sonarjs/cognitive-complexity": [
        "warn",
        25
      ],

      "sonarjs/no-duplicate-string": "off",

      "unicorn/prefer-node-protocol": "warn",
      "unicorn/filename-case": "off",
      "unicorn/no-array-reduce": "off",
      "unicorn/prefer-top-level-await": "off",

      "eslint-comments/no-unused-disable": "warn",
    },
  },

  {
    files: [
      "**/*.test.{ts,tsx,js}",
      "**/*.spec.{ts,tsx,js}",
    ],

    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "sonarjs/no-duplicate-string": "off",
    },
  }
);
EOT

echo "== Patch root package scripts =="
node <<'NODE'
const fs = require("node:fs");

const path = "package.json";
const pkg = JSON.parse(fs.readFileSync(path, "utf8"));

pkg.scripts = pkg.scripts || {};
pkg.scripts.lint = "eslint .";
pkg.scripts["lint:fix"] = "eslint . --fix";

fs.writeFileSync(path, JSON.stringify(pkg, null, 2) + "\n");
NODE

echo "== Run non-blocking lint report =="
pnpm lint || true

echo "== Build critical packages =="
pnpm --filter @zwallet/wallet-engine build
pnpm --filter @zwallet/admin-wallet build
pnpm --filter @zwallet/web build

echo "== Phase 15.1 ESLint quality gate complete =="
