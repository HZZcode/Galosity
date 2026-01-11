import js from "@eslint/js";
import globals from "globals";
import json from "@eslint/json";
import tseslint from "typescript-eslint";
import floatingPromise from "eslint-plugin-no-floating-promise";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import { defineConfig } from "eslint/config";

export default defineConfig([
  tseslint.configs.stylistic,
  {
    ignores: [
      "./js",
      "./dts",
      "./ts/vars/grammar/grammar.js",
      "package-lock.json",
      "eslint.config.js",
      "plugins/analyse/index.js",
      "./build",
      "dependencies"
    ]
  },
  {
    files: ["**/*.{js,mjs,cjs,ts,mts,cts}"],
    plugins: { js, floatingPromise, simpleImportSort },
    extends: ["js/recommended"],
    rules: {
      "@typescript-eslint/no-empty-function": ["error", { "allow": ["private-constructors", "protected-constructors"] }],
      "@typescript-eslint/explicit-member-accessibility": ["warn", { "accessibility": "no-public" }],
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          "args": "all",
          "argsIgnorePattern": "^_",
          "caughtErrors": "all",
          "caughtErrorsIgnorePattern": "^_",
          "destructuredArrayIgnorePattern": "^_",
          "varsIgnorePattern": "^_"
        }
      ],
      "@typescript-eslint/parameter-properties": ["warn", { "prefer": "parameter-property" }],
      "@typescript-eslint/consistent-type-imports": "error",

      "require-await": "warn",
      "no-unused-vars": "off",
      "floatingPromise/no-floating-promise": "error",
      "prefer-const": "warn",
      "eqeqeq": "error",
      "no-undef": "off",
      "no-redeclare": "off",
      "max-len": ["error", { "code": 110 }],
      "no-empty": "error",
      "no-var": "error",
      "no-unused-expressions": ["error", { "allowShortCircuit": false, "allowTernary": false }],
      "no-prototype-builtins": "error",
      "no-console": "warn",
      "semi": ["warn", "always"],
      "simpleImportSort/imports": "warn",
    }
  },
  { files: ["**/*.{js,mjs,cjs,ts,mts,cts}"], languageOptions: { sourceType: "module" } },
  { files: ["ts/main/**/*.{js,mjs,cjs,ts,mts,cts}"], languageOptions: { globals: globals.node } },
  { files: ["**/*.{js,mjs,cjs,ts,mts,cts}"], languageOptions: { globals: { ...globals.browser, ...globals.commonjs } } },
  { files: ["**/*.json"], plugins: { json }, language: "json/json", extends: ["json/recommended"] },
]);
