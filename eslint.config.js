// @ts-check
import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  // Base JS recommended rules
  js.configs.recommended,

  // TypeScript recommended rules across all TS files
  ...tseslint.configs.recommended,

  // Global ignores
  {
    ignores: [
      "**/dist/**",
      "**/node_modules/**",
      "**/*.js.map",
      "coverage/**",
    ],
  },

  // TypeScript source files — typed rules
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parserOptions: {
        projectService: {
          // Root-level config files (vitest.config.ts etc.) live outside any
          // package tsconfig; allow the project service to fall back to the
          // nearest tsconfig for them rather than erroring.
          allowDefaultProject: ["*.ts", "*.tsx"],
          defaultProject: "./tsconfig.node.json",
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Disallow any
      "@typescript-eslint/no-explicit-any": "error",

      // Require explicit return types on exported functions
      "@typescript-eslint/explicit-module-boundary-types": "warn",

      // Prefer const
      "prefer-const": "error",

      // No unused variables (TS-aware)
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],

      // No floating promises
      "@typescript-eslint/no-floating-promises": "error",

      // Consistent type imports
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
    },
  },
);
