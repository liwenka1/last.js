import type { Plugin, UserConfig } from 'vite';
import react from '@vitejs/plugin-react';

export interface LastVitePluginOptions {
  /** app 目录路径 */
  appDir?: string;
}

// 客户端入口虚拟模块 ID
const VIRTUAL_CLIENT_ID = '/@lastjs/client';

// 客户端入口代码
const CLIENT_ENTRY_CODE = `
import { hydrateRoot } from 'react-dom/client';
import * as React from 'react';

async function hydrate() {
  const data = window.__LASTJS_DATA__;
  if (!data) {
    console.warn('[Last.js] No hydration data found');
    return;
  }

  const { props, layoutPaths, pagePath } = data;

  try {
    // 动态导入所有 layout 和 page 组件
    const layoutModules = await Promise.all(
      layoutPaths.map((path) => import(/* @vite-ignore */ path))
    );
    const pageModule = await import(/* @vite-ignore */ pagePath);

    const layouts = layoutModules.map((mod) => mod.default || mod);
    const Page = pageModule.default || pageModule;

    // 从 page 开始构建组件树
    let element = React.createElement(Page, props);

    // 从内到外包裹 layout
    for (let i = layouts.length - 1; i >= 0; i--) {
      const Layout = layouts[i];
      element = React.createElement(Layout, { children: element });
    }

    // Hydrate
    const root = document.getElementById('__lastjs');
    if (root) {
      hydrateRoot(root, element);
      console.log('[Last.js] Hydration complete ✓');
    }
  } catch (error) {
    console.error('[Last.js] Hydration failed:', error);
  }
}

// 等待 DOM 加载完成后执行 hydration
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', hydrate);
} else {
  hydrate();
}
`;

/**
 * Last.js Vite 插件
 * 配置 React 支持和 SSR
 */
export function lastVitePlugin(_options: LastVitePluginOptions = {}): Plugin[] {
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
            include: ['react', 'react-dom', 'react-dom/client'],
          },
        };
      },
    },
    {
      name: 'lastjs:client-entry',
      resolveId(id) {
        if (id === VIRTUAL_CLIENT_ID) {
          return id;
        }
        return null;
      },
      load(id) {
        if (id === VIRTUAL_CLIENT_ID) {
          return CLIENT_ENTRY_CODE;
        }
        return null;
      },
    },
  ];
}
