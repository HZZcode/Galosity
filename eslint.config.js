import js from "@eslint/js";
import globals from "globals";
import json from "@eslint/json";
import perfectionist from "eslint-plugin-perfectionist";
import promise from "eslint-plugin-promise";
import floatingPromise from "eslint-plugin-no-floating-promise";
import { defineConfig } from "eslint/config";

export default defineConfig([
  {
    ignores: [
      "./js/grammar.js",
      "package-lock.json",
      "eslint.config.js",
      "mathjax/*",
      "font-awesome/*",

      "./js/files.js",
      "./js/keybind.js",
      "./js/logger.js",
      "./js/split.js",
      "./js/timeout.js",
      "./js/vars.js"
    ]
  },
  {
    files: ["**/*.{js,mjs,cjs}"],
    plugins: { js, perfectionist, promise, floatingPromise },
    extends: ["js/recommended"],
    rules: {
      "require-await": "warn",
      "no-unused-vars": "off",
      "@/no-unused-vars": [
        "warn",
        {
          "vars": "all", "varsIgnorePattern": "^_",
          "args": "after-used", "argsIgnorePattern": "^_",
          "caughtErrors": "all", "caughtErrorsIgnorePattern": "^_"
        }
      ],
      "floatingPromise/no-floating-promise": "error",
      "prefer-const": "warn",
      "eqeqeq": "error",
      "no-undef": "error",
      "no-redeclare": "error",
      "max-len": ["error", { "code": 110 }],
      "no-empty": "error",
      "no-var": "error",
      "no-unused-expressions": ["error", { "allowShortCircuit": false, "allowTernary": false }],
      "no-prototype-builtins": "error",
      "no-console": "warn",
      "semi": ["warn", "always"]
    }
  },
  { files: ["**/*.js"], languageOptions: { sourceType: "module" } },
  { files: ["**/*.{js,mjs,cjs}"], languageOptions: { globals: { ...globals.browser, ...globals.node } } },
  { files: ["**/*.json"], plugins: { json }, language: "json/json", extends: ["json/recommended"] },
]);
