import type { Plugin, UserConfig } from 'vite';
import react from '@vitejs/plugin-react';

export interface LastVitePluginOptions {
  /** app 目录路径 */
  appDir?: string;
}

// 客户端入口虚拟模块 ID
const VIRTUAL_CLIENT_ID = '/@lastjs/client';

// 客户端入口代码 - 支持客户端路由
const CLIENT_ENTRY_CODE = `
import { hydrateRoot } from 'react-dom/client';
import * as React from 'react';

// 模块缓存
const moduleCache = new Map();

// 加载模块（带缓存）
async function loadModule(path) {
  if (moduleCache.has(path)) {
    return moduleCache.get(path);
  }
  const mod = await import(/* @vite-ignore */ path);
  moduleCache.set(path, mod);
  return mod;
}

// 构建组件树
function buildComponentTree(layouts, Page, props) {
  let element = React.createElement(Page, props);
  for (let i = layouts.length - 1; i >= 0; i--) {
    const Layout = layouts[i];
    element = React.createElement(Layout, { children: element });
  }
  return element;
}

// 订阅者列表（用于 useSyncExternalStore）
const subscribers = new Set();

// 初始化状态版本号
window.__LASTJS_STATE_VERSION__ = 0;

// 通知订阅者
function notifySubscribers() {
  window.__LASTJS_STATE_VERSION__ = (window.__LASTJS_STATE_VERSION__ || 0) + 1;
  subscribers.forEach(fn => fn());
}

// 订阅函数（供 hooks 使用）
window.__LASTJS_SUBSCRIBE__ = (callback) => {
  subscribers.add(callback);
  return () => subscribers.delete(callback);
};

// 初始化全局状态
window.__LASTJS_STATE__ = {
  pathname: window.location.pathname,
  params: {},
  searchParams: new URLSearchParams(window.location.search),
};

// 判断是否是相同的 URL
function isSameUrl(href) {
  const url = new URL(href, window.location.origin);
  const current = window.location.pathname + window.location.search;
  const target = url.pathname + url.search;
  return current === target;
}

// 全局路由器
window.__LASTJS_ROUTER__ = {
  push: async (href) => {
    // 如果目标 URL 与当前 URL 相同，跳过导航
    if (isSameUrl(href)) {
      return;
    }
    window.history.pushState(null, '', href);
    await loadPage(href);
  },
  replace: async (href) => {
    // 如果目标 URL 与当前 URL 相同，跳过导航
    if (isSameUrl(href)) {
      return;
    }
    window.history.replaceState(null, '', href);
    await loadPage(href);
  },
  back: () => window.history.back(),
  forward: () => window.history.forward(),
  prefetch: async (href) => {
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = href;
    document.head.appendChild(link);
  },
  refresh: async () => {
    await loadPage(window.location.pathname + window.location.search);
  },
};

// Root 引用
let root = null;

// 加载页面
async function loadPage(href) {
  try {
    // 获取新页面的数据
    const response = await fetch(href, {
      headers: {
        'X-LastJS-Navigation': 'true',
      },
    });

    if (!response.ok) {
      // 如果服务器返回错误，回退到完整页面加载
      window.location.href = href;
      return;
    }

    const contentType = response.headers.get('content-type');

    // 如果返回 JSON，说明是导航数据
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      const { props, layoutPaths, pagePath, params } = data;

      // 加载模块
      const layoutModules = await Promise.all(
        layoutPaths.map(path => loadModule(path))
      );
      const pageModule = await loadModule(pagePath);

      const layouts = layoutModules.map(mod => mod.default || mod);
      const Page = pageModule.default || pageModule;

      // 更新全局状态
      const url = new URL(href, window.location.origin);
      window.__LASTJS_STATE__ = {
        pathname: url.pathname,
        params: params || {},
        searchParams: new URLSearchParams(url.search),
      };

      // 先通知订阅者状态已更新（这样 useSyncExternalStore 会在渲染时获取新值）
      notifySubscribers();

      // 重新渲染
      const element = buildComponentTree(layouts, Page, props);

      if (root) {
        root.render(element);
      }
    } else {
      // 如果返回 HTML，回退到完整页面加载
      window.location.href = href;
    }
  } catch (error) {
    console.error('[Last.js] Navigation failed:', error);
    // 回退到完整页面加载
    window.location.href = href;
  }
}

// 初始 hydration
async function hydrate() {
  const data = window.__LASTJS_DATA__;
  if (!data) {
    console.warn('[Last.js] No hydration data found');
    return;
  }

  const { props, layoutPaths, pagePath, params } = data;

  try {
    // 动态导入所有 layout 和 page 组件
    const layoutModules = await Promise.all(
      layoutPaths.map(path => loadModule(path))
    );
    const pageModule = await loadModule(pagePath);

    const layouts = layoutModules.map(mod => mod.default || mod);
    const Page = pageModule.default || pageModule;

    // 更新全局状态
    window.__LASTJS_STATE__ = {
      pathname: window.location.pathname,
      params: params || {},
      searchParams: new URLSearchParams(window.location.search),
    };

    // 构建组件树
    const element = buildComponentTree(layouts, Page, props);

    // Hydrate
    const container = document.getElementById('__lastjs');
    if (container) {
      root = hydrateRoot(container, element);
      console.log('[Last.js] Hydration complete ✓');
    }
  } catch (error) {
    console.error('[Last.js] Hydration failed:', error);
  }
}

// 监听浏览器前进/后退
window.addEventListener('popstate', () => {
  loadPage(window.location.pathname + window.location.search);
});

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
