import type { Plugin, UserConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { serverActionsPlugin } from './plugin-server-actions.js';
import { resolve } from 'pathe';

export interface LastVitePluginOptions {
  /** app 目录路径 */
  appDir?: string;
  /** 根目录路径 */
  rootDir?: string;
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

// ErrorBoundary 类组件
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // 如果是 async 组件错误，回退到完整页面加载
    const errorMessage = error?.message || '';
    if (errorMessage.includes('async') && errorMessage.includes('Client Component')) {
      console.log('[Last.js] Async component detected, falling back to full page load');
      window.location.reload();
      return;
    }
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      // 如果是 async 组件错误，显示加载中（等待 reload）
      const errorMessage = this.state.error?.message || '';
      if (errorMessage.includes('async') && errorMessage.includes('Client Component')) {
        return React.createElement('div', { style: { padding: '2rem', textAlign: 'center' } }, 'Loading...');
      }

      const FallbackComponent = this.props.fallback;
      return React.createElement(FallbackComponent, {
        error: this.state.error,
        reset: this.reset,
      });
    }
    return this.props.children;
  }
}

// 构建组件树
function buildComponentTree(layouts, Page, props, options = {}) {
  const { ErrorComponent, LoadingComponent } = options;

  let element = React.createElement(Page, props);

  // 如果有 Loading 组件，用 Suspense 包裹
  if (LoadingComponent) {
    element = React.createElement(
      React.Suspense,
      { fallback: React.createElement(LoadingComponent) },
      element
    );
  }

  // 如果有 Error 组件，用 ErrorBoundary 包裹
  if (ErrorComponent) {
    element = React.createElement(
      ErrorBoundary,
      { fallback: ErrorComponent },
      element
    );
  }

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

// 更新或创建 meta 标签
function updateMetaTag(name, content, isProperty = false) {
  const attr = isProperty ? 'property' : 'name';
  let meta = document.querySelector(\`meta[\${attr}="\${name}"]\`);
  if (content) {
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute(attr, name);
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', content);
  } else if (meta) {
    meta.remove();
  }
}

// 更新页面 metadata
function updateMetadata(metadata) {
  if (!metadata) return;

  // 更新 title
  if (metadata.title) {
    const title = typeof metadata.title === 'string'
      ? metadata.title
      : metadata.title.default;
    document.title = title;
  }

  // 更新 description
  if (metadata.description !== undefined) {
    updateMetaTag('description', metadata.description);
  }

  // 更新 keywords
  if (metadata.keywords !== undefined) {
    const keywords = Array.isArray(metadata.keywords)
      ? metadata.keywords.join(', ')
      : metadata.keywords;
    updateMetaTag('keywords', keywords);
  }

  // 更新 Open Graph
  if (metadata.openGraph) {
    const og = metadata.openGraph;
    if (og.title) updateMetaTag('og:title', og.title, true);
    if (og.description) updateMetaTag('og:description', og.description, true);
    if (og.url) updateMetaTag('og:url', og.url, true);
    if (og.siteName) updateMetaTag('og:site_name', og.siteName, true);
    if (og.type) updateMetaTag('og:type', og.type, true);
    if (og.locale) updateMetaTag('og:locale', og.locale, true);
    // 注意：og:image 可能有多个，这里只处理第一个
    if (og.images && og.images[0]) {
      updateMetaTag('og:image', og.images[0].url, true);
    }
  }

  // 更新 Twitter Card
  if (metadata.twitter) {
    const tw = metadata.twitter;
    if (tw.card) updateMetaTag('twitter:card', tw.card);
    if (tw.title) updateMetaTag('twitter:title', tw.title);
    if (tw.description) updateMetaTag('twitter:description', tw.description);
    if (tw.creator) updateMetaTag('twitter:creator', tw.creator);
    if (tw.images && tw.images[0]) {
      updateMetaTag('twitter:image', tw.images[0]);
    }
  }
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

// 正在导航中的标记
let isNavigating = false;

// 标记是否正在处理 async 组件错误（防止无限循环）
let handlingAsyncError = false;

// 全局路由器
window.__LASTJS_ROUTER__ = {
  push: async (href) => {
    // 如果目标 URL 与当前 URL 相同，跳过导航
    if (isSameUrl(href)) {
      return;
    }
    // 防止重复导航
    if (isNavigating) {
      return;
    }
    isNavigating = true;
    window.history.pushState(null, '', href);
    await loadPage(href);
    isNavigating = false;
  },
  replace: async (href) => {
    // 如果目标 URL 与当前 URL 相同，跳过导航
    if (isSameUrl(href)) {
      return;
    }
    // 防止重复导航
    if (isNavigating) {
      return;
    }
    isNavigating = true;
    window.history.replaceState(null, '', href);
    await loadPage(href);
    isNavigating = false;
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
    // refresh 总是使用完整页面加载
    window.location.reload();
  },
};

// Root 引用
let root = null;

// 检查组件是否是 async 函数
function isAsyncFunction(fn) {
  if (!fn) return false;
  // 检查是否是 async function
  if (fn.constructor && fn.constructor.name === 'AsyncFunction') {
    return true;
  }
  // 检查函数字符串
  const fnStr = fn.toString();
  if (fnStr.startsWith('async ') || fnStr.includes('async function')) {
    return true;
  }
  return false;
}

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

          const { props, layoutPaths, pagePath, params, metadata, errorPath, loadingPath } = data;

      // 加载模块
      const layoutModules = await Promise.all(
        layoutPaths.map(path => loadModule(path))
      );
      const pageModule = await loadModule(pagePath);

      const layouts = layoutModules.map(mod => mod.default || mod);
      const Page = pageModule.default || pageModule;

      // 检查页面组件是否是 async 函数
      if (isAsyncFunction(Page)) {
        console.log('[Last.js] Page contains async component, falling back to full page load');
        window.location.href = href;
        return;
      }

      // 加载 error 和 loading 组件（如果存在）
      let ErrorComponent = null;
      let LoadingComponent = null;
      if (errorPath) {
        const errorMod = await loadModule(errorPath);
        ErrorComponent = errorMod.default || errorMod;
      }
      if (loadingPath) {
        const loadingMod = await loadModule(loadingPath);
        LoadingComponent = loadingMod.default || loadingMod;
      }

      // 更新全局状态
      const url = new URL(href, window.location.origin);
      window.__LASTJS_STATE__ = {
        pathname: url.pathname,
        params: params || {},
        searchParams: new URLSearchParams(url.search),
      };

      // 更新页面 metadata
      updateMetadata(metadata);

      // 先通知订阅者状态已更新（这样 useSyncExternalStore 会在渲染时获取新值）
      notifySubscribers();

      // 重新渲染
      const element = buildComponentTree(layouts, Page, props, {
        ErrorComponent,
        LoadingComponent,
      });

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

  const { props, layoutPaths, pagePath, params, errorPath, loadingPath } = data;

  try {
    // 动态导入所有 layout 和 page 组件
    const layoutModules = await Promise.all(
      layoutPaths.map(path => loadModule(path))
    );
    const pageModule = await loadModule(pagePath);

    const layouts = layoutModules.map(mod => mod.default || mod);
    const Page = pageModule.default || pageModule;

    // 加载 error 和 loading 组件（如果存在）
    let ErrorComponent = null;
    let LoadingComponent = null;
    if (errorPath) {
      const errorMod = await loadModule(errorPath);
      ErrorComponent = errorMod.default || errorMod;
    }
    if (loadingPath) {
      const loadingMod = await loadModule(loadingPath);
      LoadingComponent = loadingMod.default || loadingMod;
    }

    // 更新全局状态
    window.__LASTJS_STATE__ = {
      pathname: window.location.pathname,
      params: params || {},
      searchParams: new URLSearchParams(window.location.search),
    };

    // 构建组件树
    const element = buildComponentTree(layouts, Page, props, {
      ErrorComponent,
      LoadingComponent,
    });

    // Hydrate - 由于 layout 渲染了完整的 HTML 结构，我们 hydrate 到 document
    root = hydrateRoot(document, element, {
      onRecoverableError(error) {
        // 忽略预期的 hydration 不匹配
        const errorMessage = error?.message || '';
        if (errorMessage.includes('Hydration') || errorMessage.includes('hydration')) {
          // 这些通常是服务端和客户端渲染差异，React 会自动修复
          return;
        }
        console.error('[Last.js] Recoverable error:', error);
      },
    });
    console.log('[Last.js] Hydration complete ✓');
  } catch (error) {
    console.error('[Last.js] Hydration failed:', error);
  }
}

// 监听浏览器前进/后退
window.addEventListener('popstate', () => {
  if (isNavigating) return;
  isNavigating = true;
  loadPage(window.location.pathname + window.location.search).finally(() => {
    isNavigating = false;
  });
});

// 全局错误处理器
window.addEventListener('error', (event) => {
  if (handlingAsyncError) return; // 防止无限循环

  const errorMessage = event.error?.message || event.message || '';
  
  // 对于严重的渲染错误，回退到完整页面加载
  if (errorMessage.includes('Cannot read') || errorMessage.includes('undefined')) {
    handlingAsyncError = true;
    console.error('[Last.js] Critical error detected:', errorMessage);
    event.preventDefault();
    window.location.assign(window.location.href);
  }
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
  const { appDir = 'app', rootDir = process.cwd() } = _options;
  const resolvedAppDir = resolve(rootDir, appDir);

  // 获取 React 插件（使用 SWC）
  const reactPlugin = react();
  const plugins = Array.isArray(reactPlugin) ? reactPlugin : [reactPlugin];

  return [
    // SWC 处理 React 编译（快）
    ...plugins,

    // Babel 处理 Server Actions 转换（灵活）
    serverActionsPlugin({ appDir: resolvedAppDir }),

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
