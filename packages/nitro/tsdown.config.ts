import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  splitting: false,
  sourcemap: true,
  external: [
    '@lastjs/core',
    'nitropack',
    'h3',
    'pathe',
  ],
  esbuildOptions(options) {
    options.platform = 'node';
  },
});

