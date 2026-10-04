import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  base: "./",
  plugins: [react(), tailwindcss()],
  build: {
    outDir: "dist",
    target: "es2022",
    sourcemap: false,
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["src/lib/**/*.ts"],
      // Baseline (2026-10-03): stmts 64.33 / branch 65.43 / funcs 75 / lines 63.5.
      // Thresholds start at the highest value currently met and must never be lowered.
      thresholds: {
        statements: 64,
        branches: 65,
        functions: 75,
        lines: 63,
      },
    },
  },
});
