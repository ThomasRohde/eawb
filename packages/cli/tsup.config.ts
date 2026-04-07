import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: { compilerOptions: { composite: false } },
  sourcemap: true,
  clean: true,
  // Inline all workspace packages so the published CLI is self-contained.
  // Real npm dependencies (fastify, simple-git, better-sqlite3, etc.) stay
  // external and are declared in package.json#dependencies.
  noExternal: [/^@ea-workbench\//],
  banner: {
    js: '#!/usr/bin/env node',
  },
});
