/**
 * RSC 虚拟入口模块
 * 这些代码会作为 Vite 虚拟模块提供
 */

import type { Plugin } from 'vite';
import { readdir, stat } from 'node:fs/promises';
import { join, relative } from 'pathe';

// 虚拟模块 ID
export const VIRTUAL_RSC_ENTRY = 'virtual:lastjs-rsc-entry';
export const VIRTUAL_SSR_ENTRY = 'virtual:lastjs-ssr-entry';
export const VIRTUAL_BROWSER_ENTRY = 'virtual:lastjs-browser-entry';

// 路由信息
interface RouteInfo {
  path: string; // URL 路径模式，如 /blog/[slug]
  pagePath: string; // 页面文件路径
  layoutPaths: string[]; // 布局文件路径列表
  loadingPath?: string; // loading.tsx 路径
  errorPath?: string; // error.tsx 路径
  paramNames: string[]; // 动态参数名列表
  isNotFound?: boolean; // 是否是 not-found 页面
}

/**
 * 扫描 app 目录，收集所有路由
 */
async function scanRoutes(appDir: string): Promise<{
  routes: RouteInfo[];
  notFoundPath?: string;
  rootLayoutPath?: string;
  rootErrorPath?: string;
  rootLoadingPath?: string;
}> {
  const routes: RouteInfo[] = [];
  let notFoundPath: string | undefined;
  let rootLayoutPath: string | undefined;
  let rootErrorPath: string | undefined;
  let rootLoadingPath: string | undefined;

  async function scanDir(
    dir: string,
    urlPath: string,
    parentLayouts: string[],
    parentLoading?: string,
    parentError?: string
  ): Promise<void> {
    const entries = await readdir(dir, { withFileTypes: true });

    let currentLayout: string | undefined;
    let currentLoading: string | undefined;
    let currentError: string | undefined;
    let currentPage: string | undefined;

    // 首先扫描当前目录的特殊文件
    for (const entry of entries) {
      if (!entry.isFile()) continue;
      const name = entry.name;
      const fullPath = join(dir, name);

      if (name === 'layout.tsx' || name === 'layout.jsx') {
        currentLayout = fullPath;
        if (urlPath === '/') {
          rootLayoutPath = fullPath;
        }
      } else if (name === 'loading.tsx' || name === 'loading.jsx') {
        currentLoading = fullPath;
        if (urlPath === '/') {
          rootLoadingPath = fullPath;
        }
      } else if (name === 'error.tsx' || name === 'error.jsx') {
        currentError = fullPath;
        if (urlPath === '/') {
          rootErrorPath = fullPath;
        }
      } else if (name === 'page.tsx' || name === 'page.jsx') {
        currentPage = fullPath;
      } else if (name === 'not-found.tsx' || name === 'not-found.jsx') {
        if (urlPath === '/') {
          notFoundPath = fullPath;
        }
      }
    }

    // 构建当前路径的 layouts 链
    const layouts = [...parentLayouts];
    if (currentLayout) {
      layouts.push(currentLayout);
    }

    // 继承或使用当前的 loading/error
    const effectiveLoading = currentLoading || parentLoading;
    const effectiveError = currentError || parentError;

    // 如果有 page，添加路由
    if (currentPage) {
      const paramNames = extractParamNames(urlPath);
      routes.push({
        path: urlPath,
        pagePath: currentPage,
        layoutPaths: layouts,
        loadingPath: effectiveLoading,
        errorPath: effectiveError,
        paramNames,
      });
    }

    // 递归扫描子目录
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const name = entry.name;

      // 跳过特殊目录
      if (name.startsWith('_') || name.startsWith('.')) continue;

      // 处理路由组 (group)
      if (name.startsWith('(') && name.endsWith(')')) {
        await scanDir(
          join(dir, name),
          urlPath, // 路由组不改变 URL
          layouts,
          effectiveLoading,
          effectiveError
        );
        continue;
      }

      // 构建子路径
      let childPath: string;
      if (name.startsWith('[') && name.endsWith(']')) {
        // 动态路由
        childPath = urlPath === '/' ? `/${name}` : `${urlPath}/${name}`;
      } else {
        // 静态路由
        childPath = urlPath === '/' ? `/${name}` : `${urlPath}/${name}`;
      }

      await scanDir(
        join(dir, name),
        childPath,
        layouts,
        effectiveLoading,
        effectiveError
      );
    }
  }

  await scanDir(appDir, '/', [], undefined, undefined);

  return {
    routes,
    notFoundPath,
    rootLayoutPath,
    rootErrorPath,
    rootLoadingPath,
  };
}

/**
 * 从 URL 路径中提取参数名
 */
function extractParamNames(urlPath: string): string[] {
  const params: string[] = [];
  const regex = /\[([^\]]+)\]/g;
  let match;
  while ((match = regex.exec(urlPath)) !== null) {
    let paramName = match[1];
    // 处理 catch-all [...slug]
    if (paramName.startsWith('...')) {
      paramName = paramName.slice(3);
    }
    params.push(paramName);
  }
  return params;
}

/**
 * 将 URL 路径模式转换为正则表达式
 */
function pathToRegex(path: string): string {
  // 先处理动态路由参数，再转义其他特殊字符
  let pattern = path
    // 处理 catch-all [...slug] - 先替换为占位符
    .replace(/\[\.\.\.([^\]]+)\]/g, '__CATCHALL_$1__')
    // 处理动态路由 [slug] - 先替换为占位符
    .replace(/\[([^\]]+)\]/g, '__PARAM_$1__')
    // 转义其他特殊字符
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    // 还原 catch-all 为正则捕获组
    .replace(/__CATCHALL_([^_]+)__/g, '(?<$1>.+)')
    // 还原动态路由为正则捕获组
    .replace(/__PARAM_([^_]+)__/g, '(?<$1>[^/]+)');

  return `^${pattern}$`;
}

/**
 * 生成 RSC 入口代码
 */
function generateRscEntryCode(
  routes: RouteInfo[],
  notFoundPath?: string,
  rootLayoutPath?: string,
  rootErrorPath?: string,
  rootLoadingPath?: string
): string {
  // 生成路由匹配代码
  const routeMatchers = routes
    .map((route, index) => {
      const regex = pathToRegex(route.path);
      return `  { 
    regex: new RegExp('${regex}'),
    path: '${route.path}',
    pagePath: '${route.pagePath}',
    layoutPaths: ${JSON.stringify(route.layoutPaths)},
    loadingPath: ${route.loadingPath ? `'${route.loadingPath}'` : 'null'},
    errorPath: ${route.errorPath ? `'${route.errorPath}'` : 'null'},
    paramNames: ${JSON.stringify(route.paramNames)},
  }`;
    })
    .join(',\n');

  return `
import { renderToReadableStream } from '@vitejs/plugin-rsc/rsc';
import React, { Suspense } from 'react';

// 路由表
const routes = [
${routeMatchers}
];

// 特殊页面路径
const notFoundPath = ${notFoundPath ? `'${notFoundPath}'` : 'null'};
const rootLayoutPath = ${rootLayoutPath ? `'${rootLayoutPath}'` : 'null'};
const rootErrorPath = ${rootErrorPath ? `'${rootErrorPath}'` : 'null'};
const rootLoadingPath = ${rootLoadingPath ? `'${rootLoadingPath}'` : 'null'};

// 匹配路由
function matchRoute(pathname) {
  for (const route of routes) {
    const match = pathname.match(route.regex);
    if (match) {
      const params = {};
      for (const name of route.paramNames) {
        if (match.groups && match.groups[name]) {
          params[name] = match.groups[name];
        }
      }
      return { route, params };
    }
  }
  return null;
}

// 请求处理器
export default async function handler(request) {
  const url = new URL(request.url);
  
  // 检查是否是 RSC 请求
  const isRsc = 
    request.headers.get('Accept')?.includes('text/x-component') ||
    url.pathname.endsWith('.rsc') ||
    url.searchParams.has('_rsc');
  
  // 清理路径
  let pathname = url.pathname;
  if (pathname.endsWith('.rsc')) {
    pathname = pathname.slice(0, -4) || '/';
  }
  
  // 匹配路由
  const match = matchRoute(pathname);
  
  let PageComponent;
  let params = {};
  let layoutPaths = [];
  let loadingPath = null;
  let errorPath = null;
  let metadata = {};
  let isNotFound = false;
  
  if (match) {
    const { route, params: routeParams } = match;
    params = routeParams;
    layoutPaths = route.layoutPaths;
    loadingPath = route.loadingPath;
    errorPath = route.errorPath;
    
    try {
      const mod = await import(/* @vite-ignore */ route.pagePath);
      PageComponent = mod.default;
      
      // 获取 metadata
      if (mod.metadata) {
        metadata = mod.metadata;
      } else if (mod.generateMetadata) {
        metadata = await mod.generateMetadata({ params });
      }
    } catch (e) {
      console.error('Failed to load page:', e);
      isNotFound = true;
    }
  } else {
    isNotFound = true;
  }
  
  // 处理 404
  if (isNotFound) {
    if (notFoundPath) {
      try {
        const mod = await import(/* @vite-ignore */ notFoundPath);
        PageComponent = mod.default;
        if (mod.metadata) {
          metadata = mod.metadata;
        }
      } catch (e) {
        console.error('Failed to load not-found:', e);
        PageComponent = () => React.createElement('h1', null, '404 - Page Not Found');
      }
    } else {
      PageComponent = () => React.createElement('h1', null, '404 - Page Not Found');
    }
    // 404 页面使用根布局
    if (rootLayoutPath) {
      layoutPaths = [rootLayoutPath];
    }
  }
  
  // 加载所有布局
  const layouts = [];
  for (const layoutPath of layoutPaths) {
    try {
      const mod = await import(/* @vite-ignore */ layoutPath);
      layouts.push(mod.default);
      
      // 合并布局的 metadata（页面的 metadata 优先级更高）
      if (mod.metadata && Object.keys(metadata).length === 0) {
        metadata = { ...mod.metadata, ...metadata };
      }
    } catch (e) {
      console.error('Failed to load layout:', layoutPath, e);
    }
  }
  
  // 加载 loading 组件
  let LoadingComponent = null;
  if (loadingPath) {
    try {
      const mod = await import(/* @vite-ignore */ loadingPath);
      LoadingComponent = mod.default;
    } catch (e) {
      // 忽略
    }
  }
  
  // 构建页面元素
  let pageElement = React.createElement(PageComponent, { params });
  
  // 如果有 loading，用 Suspense 包裹
  if (LoadingComponent) {
    pageElement = React.createElement(
      Suspense,
      { fallback: React.createElement(LoadingComponent) },
      pageElement
    );
  }
  
  // 注意：error.tsx 的 ErrorBoundary 需要在客户端实现
  // 因为 RSC 环境不支持 class 组件
  
  // 从内到外包裹布局
  let root = pageElement;
  for (let i = layouts.length - 1; i >= 0; i--) {
    const Layout = layouts[i];
    root = React.createElement(Layout, { children: root });
  }
  
  // 创建 RSC Payload
  const rscPayload = {
    root,
    pathname,
    params,
    metadata,
  };
  
  // 序列化为 RSC stream
  const rscStream = renderToReadableStream(rscPayload);
  
  // 如果是 RSC 请求，直接返回 RSC stream
  if (isRsc) {
    return new Response(rscStream, {
      status: isNotFound ? 404 : 200,
      headers: {
        'Content-Type': 'text/x-component;charset=utf-8',
      },
    });
  }
  
  // 否则，委托给 SSR 环境进行 HTML 渲染
  const ssrModule = await import.meta.viteRsc.loadModule('ssr', 'index');
  const result = await ssrModule.renderHTML(rscStream, { 
    pathname, 
    params, 
    metadata,
    isNotFound,
  });
  
  return new Response(result.stream, {
    status: result.status || (isNotFound ? 404 : 200),
    headers: {
      'Content-Type': 'text/html;charset=utf-8',
    },
  });
}

// HMR 支持
if (import.meta.hot) {
  import.meta.hot.accept();
}
`;
}

/**
 * SSR 入口代码
 */
export const SSR_ENTRY_CODE = `
import { createFromReadableStream } from '@vitejs/plugin-rsc/ssr';
import React from 'react';
import { renderToReadableStream } from 'react-dom/server.edge';
import { injectRSCPayload } from 'rsc-html-stream/server';

// HTML 转义
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// 生成 metadata HTML
function generateMetadataHtml(metadata) {
  if (!metadata || Object.keys(metadata).length === 0) {
    return '';
  }
  
  let html = '';
  
  if (metadata.title) {
    html += '<title>' + escapeHtml(metadata.title) + '</title>';
  }
  
  if (metadata.description) {
    html += '<meta name="description" content="' + escapeHtml(metadata.description) + '">';
  }
  
  if (metadata.keywords) {
    const keywords = Array.isArray(metadata.keywords) 
      ? metadata.keywords.join(', ') 
      : metadata.keywords;
    html += '<meta name="keywords" content="' + escapeHtml(keywords) + '">';
  }
  
  // Open Graph
  if (metadata.openGraph) {
    const og = metadata.openGraph;
    if (og.title) html += '<meta property="og:title" content="' + escapeHtml(og.title) + '">';
    if (og.description) html += '<meta property="og:description" content="' + escapeHtml(og.description) + '">';
    if (og.image) html += '<meta property="og:image" content="' + escapeHtml(og.image) + '">';
    if (og.url) html += '<meta property="og:url" content="' + escapeHtml(og.url) + '">';
  }
  
  return html;
}

export async function renderHTML(rscStream, options = {}) {
  const { metadata = {}, isNotFound = false } = options;
  
  // 将 RSC stream 分成两份
  const [rscStream1, rscStream2] = rscStream.tee();
  
  // 反序列化 RSC stream 为 React VDOM
  let payload;
  function SsrRoot() {
    payload = payload || createFromReadableStream(rscStream1);
    return React.use(payload).root;
  }
  
  // 获取 bootstrap 脚本
  const bootstrapScriptContent = 
    await import.meta.viteRsc.loadBootstrapScriptContent('index');
  
  let htmlStream;
  let status = isNotFound ? 404 : 200;
  
  try {
    htmlStream = await renderToReadableStream(
      React.createElement(SsrRoot),
      { bootstrapScriptContent }
    );
  } catch (e) {
    console.error('SSR Error:', e);
    status = 500;
    htmlStream = await renderToReadableStream(
      React.createElement('html', null,
        React.createElement('head', null,
          React.createElement('title', null, 'Error')
        ),
        React.createElement('body', null,
          React.createElement('noscript', null, 'Internal Server Error')
        )
      ),
      { bootstrapScriptContent: 'self.__NO_HYDRATE=1;' + bootstrapScriptContent }
    );
  }
  
  // 注入 RSC payload 到 HTML stream
  const responseStream = htmlStream.pipeThrough(injectRSCPayload(rscStream2));
  
  return { stream: responseStream, status };
}
`;

/**
 * Browser 入口代码
 */
export const BROWSER_ENTRY_CODE = `
import {
  createFromReadableStream,
  createFromFetch,
} from '@vitejs/plugin-rsc/browser';
import React from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { rscStream } from 'rsc-html-stream/client';

// 全局错误边界
class GlobalErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('GlobalErrorBoundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return React.createElement('html', null,
        React.createElement('head', null,
          React.createElement('title', null, 'Error')
        ),
        React.createElement('body', null,
          React.createElement('div', { style: { padding: '2rem', fontFamily: 'system-ui' } },
            React.createElement('h1', { style: { color: '#e53e3e' } }, 'Something went wrong'),
            React.createElement('pre', { 
              style: { background: '#f7fafc', padding: '1rem', borderRadius: '4px', overflow: 'auto' } 
            }, this.state.error?.message),
            React.createElement('button', {
              onClick: () => window.location.reload(),
              style: { 
                marginTop: '1rem', padding: '0.5rem 1rem', 
                background: '#4299e1', color: 'white', 
                border: 'none', borderRadius: '4px', cursor: 'pointer' 
              }
            }, 'Reload')
          )
        )
      );
    }
    return this.props.children;
  }
}

// 全局状态订阅者
const subscribers = new Set();
function notifySubscribers() {
  window.__LASTJS_STATE_VERSION__ = (window.__LASTJS_STATE_VERSION__ || 0) + 1;
  subscribers.forEach(cb => cb());
}

// 更新全局状态
function updateState(params = {}) {
  const url = new URL(window.location.href);
  window.__LASTJS_STATE__ = {
    pathname: url.pathname,
    params: params,
    searchParams: url.searchParams,
  };
  notifySubscribers();
}

// 更新 metadata
function updateMetadata(metadata) {
  if (!metadata) return;
  
  if (metadata.title) {
    document.title = metadata.title;
  }
  
  // 更新 description
  let descMeta = document.querySelector('meta[name="description"]');
  if (metadata.description) {
    if (!descMeta) {
      descMeta = document.createElement('meta');
      descMeta.name = 'description';
      document.head.appendChild(descMeta);
    }
    descMeta.content = metadata.description;
  }
}

// 设置全局订阅函数
window.__LASTJS_SUBSCRIBE__ = (callback) => {
  subscribers.add(callback);
  return () => subscribers.delete(callback);
};

// 初始化状态
window.__LASTJS_STATE_VERSION__ = 0;
updateState();

async function main() {
  let setPayload;
  let currentParams = {};
  
  // 从 SSR 注入的 RSC stream 反序列化
  const initialPayload = await createFromReadableStream(rscStream);
  
  // 更新初始 metadata
  if (initialPayload.metadata) {
    updateMetadata(initialPayload.metadata);
  }
  if (initialPayload.params) {
    currentParams = initialPayload.params;
    updateState(currentParams);
  }
  
  // 获取 RSC payload
  async function fetchRscPayload() {
    const url = new URL(window.location.href);
    url.searchParams.set('_rsc', '1');
    
    const payload = await createFromFetch(
      fetch(url.toString(), {
        headers: { Accept: 'text/x-component' },
      })
    );
    
    // 更新 metadata
    if (payload.metadata) {
      updateMetadata(payload.metadata);
    }
    
    // 更新 params
    if (payload.params) {
      currentParams = payload.params;
      updateState(currentParams);
    }
    
    if (setPayload) {
      setPayload(payload);
    }
  }
  
  // 设置全局路由器
  window.__LASTJS_ROUTER__ = {
    push: async (href) => {
      history.pushState(null, '', href);
      updateState(currentParams);
      await fetchRscPayload();
    },
    replace: async (href) => {
      history.replaceState(null, '', href);
      updateState(currentParams);
      await fetchRscPayload();
    },
    back: () => history.back(),
    forward: () => history.forward(),
    prefetch: async (href) => {
      try {
        const url = new URL(href, window.location.origin);
        url.searchParams.set('_rsc', '1');
        await fetch(url.toString(), {
          headers: { Accept: 'text/x-component' },
          priority: 'low',
        });
      } catch (e) {
        // 忽略预加载错误
      }
    },
    refresh: async () => {
      await fetchRscPayload();
    },
  };
  
  function BrowserRoot() {
    const [payload, setPayload_] = React.useState(initialPayload);
    
    React.useEffect(() => {
      setPayload = (v) => React.startTransition(() => setPayload_(v));
    }, []);
    
    // 监听浏览器后退/前进
    React.useEffect(() => {
      const handlePopState = () => {
        updateState(currentParams);
        fetchRscPayload();
      };
      window.addEventListener('popstate', handlePopState);
      return () => window.removeEventListener('popstate', handlePopState);
    }, []);
    
    return payload.root;
  }
  
  // Hydration
  const browserRoot = React.createElement(
    React.StrictMode, null,
    React.createElement(GlobalErrorBoundary, null,
      React.createElement(BrowserRoot)
    )
  );
  
  if ('__NO_HYDRATE' in globalThis) {
    createRoot(document).render(browserRoot);
  } else {
    hydrateRoot(document, browserRoot);
  }
  
  // 服务端 HMR
  if (import.meta.hot) {
    import.meta.hot.on('rsc:update', () => fetchRscPayload());
  }
}

main();
`;

/**
 * 创建 RSC 虚拟模块插件
 */
export function createRscVirtualPlugin(appDir?: string): Plugin {
  let rscEntryCode = '';
  let isReady = false;

  return {
    name: 'lastjs:rsc-virtual-entries',
    enforce: 'pre',

    async buildStart() {
      // 扫描路由并生成 RSC 入口代码
      const dir = appDir || join(process.cwd(), 'app');
      try {
        const {
          routes,
          notFoundPath,
          rootLayoutPath,
          rootErrorPath,
          rootLoadingPath,
        } = await scanRoutes(dir);
        rscEntryCode = generateRscEntryCode(
          routes,
          notFoundPath,
          rootLayoutPath,
          rootErrorPath,
          rootLoadingPath
        );
        isReady = true;
        console.log(`[lastjs] Scanned ${routes.length} routes`);
      } catch (e) {
        console.error('[lastjs] Failed to scan routes:', e);
        rscEntryCode = generateRscEntryCode(
          [],
          undefined,
          undefined,
          undefined,
          undefined
        );
        isReady = true;
      }
    },

    resolveId(id) {
      const cleanId = id.startsWith('\0') ? id.slice(1) : id;

      if (cleanId === VIRTUAL_RSC_ENTRY) return '\0' + VIRTUAL_RSC_ENTRY;
      if (cleanId === VIRTUAL_SSR_ENTRY) return '\0' + VIRTUAL_SSR_ENTRY;
      if (cleanId === VIRTUAL_BROWSER_ENTRY)
        return '\0' + VIRTUAL_BROWSER_ENTRY;
      return null;
    },

    load(id) {
      if (id === '\0' + VIRTUAL_RSC_ENTRY) {
        return (
          rscEntryCode ||
          generateRscEntryCode([], undefined, undefined, undefined, undefined)
        );
      }
      if (id === '\0' + VIRTUAL_SSR_ENTRY) return SSR_ENTRY_CODE;
      if (id === '\0' + VIRTUAL_BROWSER_ENTRY) return BROWSER_ENTRY_CODE;
      return null;
    },

    // 监听文件变化，重新扫描路由
    async handleHotUpdate({ file, server }) {
      const dir = appDir || join(process.cwd(), 'app');
      if (
        file.startsWith(dir) &&
        (file.endsWith('page.tsx') ||
          file.endsWith('page.jsx') ||
          file.endsWith('layout.tsx') ||
          file.endsWith('layout.jsx') ||
          file.endsWith('loading.tsx') ||
          file.endsWith('loading.jsx') ||
          file.endsWith('error.tsx') ||
          file.endsWith('error.jsx') ||
          file.endsWith('not-found.tsx') ||
          file.endsWith('not-found.jsx'))
      ) {
        // 重新扫描路由
        try {
          const {
            routes,
            notFoundPath,
            rootLayoutPath,
            rootErrorPath,
            rootLoadingPath,
          } = await scanRoutes(dir);
          rscEntryCode = generateRscEntryCode(
            routes,
            notFoundPath,
            rootLayoutPath,
            rootErrorPath,
            rootLoadingPath
          );
          console.log(`[lastjs] Routes updated: ${routes.length} routes`);

          // 触发 RSC 入口模块更新
          const mod = server.environments.rsc?.moduleGraph?.getModuleById(
            '\0' + VIRTUAL_RSC_ENTRY
          );
          if (mod) {
            server.environments.rsc?.moduleGraph?.invalidateModule(mod);
          }
        } catch (e) {
          console.error('[lastjs] Failed to update routes:', e);
        }
      }
    },
  };
}
