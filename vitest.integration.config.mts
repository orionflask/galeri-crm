import path from "node:path";

import { defineConfig } from "vitest/config";

// Integration tests hit the database in DATABASE_URL (start one with `pnpm db:dev`).
export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, "src") },
  },
  test: {
    environment: "node",
    include: ["tests/integration/**/*.test.ts"],
    setupFiles: ["dotenv/config"],
    // One file at a time: shares the connection pool and avoids cross-file interference.
    fileParallelism: false,
  },
});
