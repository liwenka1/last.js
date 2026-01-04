import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'router/index': 'src/router/index.ts',
    'render/index': 'src/render/index.ts',
    'server/index': 'src/server/index.ts',
    'vite/index': 'src/vite/index.ts',
    cli: 'src/cli/cli.ts',
  },
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  external: ['react', 'react-dom', 'react-dom/server'],
  esbuildOptions(options) {
    options.platform = 'node';
  },
});
