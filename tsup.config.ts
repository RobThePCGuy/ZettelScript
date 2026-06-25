import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/cli/index.ts'],
  format: ['esm'],
  // Declarations are emitted by `tsc` (see the `build` script), not tsup's
  // bundled rollup-plugin-dts. That plugin unconditionally injects the
  // deprecated `baseUrl` compiler option (`baseUrl: compilerOptions.baseUrl
  // || '.'`), which trips TS5101 under TypeScript 6+. Letting `tsc` emit
  // declarations honors tsconfig.json verbatim and stays deprecation-free.
  dts: false,
  sourcemap: true,
  clean: true,
  splitting: false,
  target: 'node20',
  outDir: 'dist',
  shims: false,
});
