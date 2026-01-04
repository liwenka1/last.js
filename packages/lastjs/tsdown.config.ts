import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    cli: 'src/cli.ts',
    router: 'src/router.ts',
    render: 'src/render.ts',
    nitro: 'src/nitro.ts',
    vite: 'src/vite.ts',
  },
  format: ['esm'],
  dts: true,
  clean: true,
  splitting: false,
  sourcemap: true,
  external: [
    '@lastjs/core',
    '@lastjs/cli',
    '@lastjs/nitro',
    '@lastjs/vite',
    'react',
    'react-dom',
  ],
  esbuildOptions(options) {
    options.platform = 'node';
  },
});
