import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// In development, /api/* goes to the Tally API on port 3000.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: { "/api": { target: "http://localhost:3000", rewrite: (p) => p.replace(/^\/api/, "") } },
  },
  test: { environment: "jsdom" },
});
