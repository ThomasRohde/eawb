import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: { compilerOptions: { composite: false } },
  sourcemap: true,
  clean: true,
  platform: 'node',
  target: 'node24',
  // tsup defaults `removeNodeProtocol: true`, which installs an esbuild plugin
  // that strips the `node:` prefix from every builtin import. That's fine for
  // long-stable builtins like `node:fs` (Node resolves the bare form too) but
  // catastrophic for `node:sqlite`, which has no bare alias — the stripped
  // `"sqlite"` specifier is unresolvable. We target Node 24+ anyway, so keep
  // the `node:` prefix verbatim.
  removeNodeProtocol: false,
});
