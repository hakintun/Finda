import { defineConfig } from "vitest/config";

/**
 * Member 2's demo/ prototype uses Node's built-in test runner (node:test),
 * not vitest. Vitest's default glob picks those files up and fails the run,
 * so scope vitest to src only. Run the Node suites separately:
 *   npm run test:engine   → demo/  (Member 2)
 *   npm run test:member3  → tests/ (Member 3)
 */
export default defineConfig({
  test: {
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["node_modules", "demo/**", "tests/**", ".next/**"],
  },
});
