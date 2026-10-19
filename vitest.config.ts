import { defineConfig } from "vitest/config";
import * as path from "node:path";

export default defineConfig({
  // Use the automatic JSX runtime so components under test need no `import React`.
  esbuild: { jsx: "automatic" },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    setupFiles: ["./tests/setup.ts"],
    // Integration tests hit a real (Neon) Postgres. A scale-to-zero compute can take
    // several seconds to wake on the first connection, and running every file at once
    // contends for the connection pool — both caused flaky timeouts and teardown errors.
    // Run files serially and give DB work (incl. beforeAll/afterAll hooks) room to breathe.
    testTimeout: 30_000,
    hookTimeout: 30_000,
    fileParallelism: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
