import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // No tests exist yet. Scan every package for future `*.test.ts` files so
    // adding the first test anywhere in the workspace "just works" without
    // per-package vitest configs.
    include: ['packages/*/src/**/*.test.ts', 'packages/*/src/**/*.test.tsx'],
    passWithNoTests: true,
  },
});
