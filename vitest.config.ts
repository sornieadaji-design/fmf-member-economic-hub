import { defineConfig } from "vitest/config";
import * as path from "node:path";

export default defineConfig({
  // Use the automatic JSX runtime so components under test need no `import React`.
  esbuild: { jsx: "automatic" },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    setupFiles: ["./tests/setup.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
