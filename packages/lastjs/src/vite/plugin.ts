import type { Plugin, UserConfig } from 'vite';
import react from '@vitejs/plugin-react';

export interface LastVitePluginOptions {
  /** app 目录路径 */
  appDir?: string;
}

/**
 * Last.js Vite 插件
 * 配置 React 支持和 SSR
 */
export function lastVitePlugin(options: LastVitePluginOptions = {}): Plugin[] {
  const { appDir = 'app' } = options;

  // 获取 React 插件
  const reactPlugin = react();
  const plugins = Array.isArray(reactPlugin) ? reactPlugin : [reactPlugin];

  return [
    ...plugins,
    {
      name: 'lastjs:config',
      config(): UserConfig {
        return {
          appType: 'custom',
          ssr: {
            // React 相关包设为外部依赖，让 Node.js 直接加载
            external: ['react', 'react-dom', 'react-dom/server'],
            noExternal: [],
          },
          optimizeDeps: {
            include: ['react', 'react-dom'],
          },
        };
      },
    },
  ];
}

