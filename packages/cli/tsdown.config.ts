import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    cli: 'src/cli.ts',
  },
  format: ['esm'],
  dts: true,
  clean: true,
  splitting: false,
  sourcemap: true,
  external: [
    '@lastjs/core',
    '@lastjs/nitro',
    '@lastjs/vite',
    'commander',
    'picocolors',
    'pathe',
  ],
  esbuildOptions(options) {
    options.platform = 'node';
  },
});
