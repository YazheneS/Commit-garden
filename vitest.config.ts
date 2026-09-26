import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Run tests across all workspace packages
    include: [
      "packages/*/src/**/*.test.ts",
      "packages/*/src/**/*.spec.ts",
      "services/*/src/**/*.test.ts",
      "services/*/src/**/*.spec.ts",
      "apps/*/src/**/*.test.ts",
      "apps/*/src/**/*.spec.ts",
    ],
    // Coverage report (opt-in via --coverage flag)
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["packages/*/src/**", "services/*/src/**"],
      exclude: ["**/dist/**", "**/node_modules/**"],
    },
    // Isolate each test file
    isolate: true,
    // Don't fail when no tests exist yet (scaffold phase)
    passWithNoTests: true,
    // Environment
    environment: "node",
  },
});
