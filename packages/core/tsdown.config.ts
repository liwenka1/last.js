import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'router/index': 'src/router/index.ts',
    'render/index': 'src/render/index.ts',
    'types/index': 'src/types/index.ts',
  },
  format: ['esm'],
  dts: true,
  clean: true,
  splitting: false,
  sourcemap: true,
  external: ['react', 'react-dom', 'pathe', 'ufo'],
  esbuildOptions(options) {
    options.platform = 'node';
  },
});
