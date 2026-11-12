import { defineConfig } from "vitest/config";

// The API's tests. The dashboard in web/ has its own config and runs with `npm test` there.
export default defineConfig({ test: { fileParallelism: false, include: ["test/**/*.test.ts"] } });
