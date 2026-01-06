import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'client/index': 'src/client/index.ts',
    'router/index': 'src/router/index.ts',
    'render/index': 'src/render/index.ts',
    'server/index': 'src/server/index.ts',
    'vite/index': 'src/vite/index.ts',
    'navigation/index': 'src/navigation/index.ts',
    cli: 'src/cli/cli.ts',
  },
  format: ['esm'],
  // 输出 .js 而不是 .mjs（因为 package.json 已设置 "type": "module"）
  fixedExtension: false,
  dts: true,
  clean: true,
  sourcemap: true,
  platform: 'node',
  external: ['react', 'react-dom', 'react-dom/server', 'react-dom/client'],
});
