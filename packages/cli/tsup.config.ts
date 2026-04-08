import { defineConfig } from 'tsup';
import { createRequire } from 'node:module';

const pkg = createRequire(import.meta.url)('./package.json') as { version: string };

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: { compilerOptions: { composite: false } },
  sourcemap: true,
  clean: true,
  platform: 'node',
  target: 'node24',
  // Inline the CLI version from package.json so `eawb --version` always
  // matches the published artifact without hand-maintained strings.
  define: {
    __EAWB_VERSION__: JSON.stringify(pkg.version),
  },
  // Inline all workspace packages so the published CLI is self-contained.
  // Real npm dependencies (fastify, simple-git, etc.) stay external and are
  // declared in package.json#dependencies.
  noExternal: [/^@ea-workbench\//],
  // Preserve `node:sqlite` — see runtime/tsup.config.ts for rationale.
  removeNodeProtocol: false,
  banner: {
    js: '#!/usr/bin/env node',
  },
});
