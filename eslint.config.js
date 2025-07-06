import js from "@eslint/js";
import globals from "globals";
import json from "@eslint/json";
import tseslint from "typescript-eslint";
import perfectionist from "eslint-plugin-perfectionist";
import promise from "eslint-plugin-promise";
import floatingPromise from "eslint-plugin-no-floating-promise";
import { defineConfig } from "eslint/config";

export default defineConfig([
  tseslint.configs.recommended,
  {
    ignores: [
      "./js/*",
      "package-lock.json",
      "eslint.config.js",
      "mathjax/*",
      "font-awesome/*"
    ]
  },
  {
    files: ["**/*.{js,mjs,cjs,ts,mts,cts}"],
    plugins: { js, perfectionist, promise, floatingPromise },
    extends: ["js/recommended"],
    rules: {
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-require-imports": "off",
      
      "require-await": "warn",
      "no-unused-vars": "off",
      "@/no-unused-vars": "off",
      "floatingPromise/no-floating-promise": "error",
      "prefer-const": "warn",
      "eqeqeq": "error",
      "no-undef": "off",
      "no-redeclare": "error",
      "max-len": ["error", { "code": 110 }],
      "no-empty": "error",
      "no-var": "error",
      "no-unused-expressions": ["error", { "allowShortCircuit": false, "allowTernary": false }],
      "no-prototype-builtins": "error",
      "no-console": "warn",
      "semi": ["warn", "always"],
    }
  },
  { files: ["**/*.{js,mjs,cjs,ts,mts,cts}"], languageOptions: { sourceType: "module" } },
  { files: ["**/*.{js,mjs,cjs,ts,mts,cts}"], languageOptions: { globals: globals.node } },
  { files: ["**/*.json"], plugins: { json }, language: "json/json", extends: ["json/recommended"] },
]);
