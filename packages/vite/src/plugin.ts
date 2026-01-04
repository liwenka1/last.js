import type { Plugin } from 'vite';
import react from '@vitejs/plugin-react';

export interface LastVitePluginOptions {
  appDir?: string;
}

export function lastVitePlugin(options: LastVitePluginOptions = {}): Plugin[] {
  const { appDir = 'app' } = options;

  const reactPlugin = react();
  const plugins = Array.isArray(reactPlugin) ? reactPlugin : [reactPlugin];

  return [
    ...plugins,
    {
      name: 'last:config',
      config() {
        return {
          appType: 'custom',
          root: appDir,
          build: {
            outDir: '../.last/client',
            manifest: true,
            ssrManifest: true,
            rollupOptions: {
              input: {
                main: `${appDir}/entry-client.tsx`,
              },
            },
          },
        };
      },
    },
  ];
}
