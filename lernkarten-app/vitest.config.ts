import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    // jsdom 27 ist mit Vitest 2 unter Node 22 wegen CJS/ESM-Konflikts in
    // @csstools/css-calc nicht bootbar. Für die reine lib-Logik reicht
    // ein localStorage-Polyfill (siehe lib/__tests__/setup.ts).
    environment: "node",
    globals: true,
    setupFiles: ["./lib/__tests__/setup.ts"],
    include: [
      "lib/**/*.test.ts",
      "lib/**/*.test.tsx",
      "**/__tests__/**/*.test.{ts,tsx}",
    ],
  },
});
