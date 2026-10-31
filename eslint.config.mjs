import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // The Windows app build (scripts/build-windows.mjs): a copy of the app
    // plus its node_modules.
    "dist/**",
    // Local reference clone (see .gitignore) - a separate Next.js project
    // with its own lint baseline, not part of this app.
    "fboschinfinite-fusion-nuzlocke/**",
    "reference_domtronn_nuzlocke_app/**",
  ]),
]);

export default eslintConfig;
