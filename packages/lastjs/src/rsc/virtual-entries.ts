/**
 * RSC 虚拟入口模块
 * 这些代码会作为 Vite 虚拟模块提供
 */

import type { Plugin } from 'vite';

// 虚拟模块 ID
export const VIRTUAL_RSC_ENTRY = 'virtual:lastjs-rsc-entry';
export const VIRTUAL_SSR_ENTRY = 'virtual:lastjs-ssr-entry';
export const VIRTUAL_BROWSER_ENTRY = 'virtual:lastjs-browser-entry';

/**
 * RSC 入口代码
 */
export const RSC_ENTRY_CODE = `
import { renderToReadableStream } from '@vitejs/plugin-rsc/rsc';
import React from 'react';

// RSC Payload 类型
export const RscPayload = {};

// 请求处理器 - 由 @vitejs/plugin-rsc 调用
export default async function handler(request) {
  const url = new URL(request.url);
  
  // 检查是否是 RSC 请求（客户端导航）
  const isRsc = 
    request.headers.get('Accept')?.includes('text/x-component') ||
    url.pathname.endsWith('.rsc') ||
    url.searchParams.has('_rsc');
  
  // 清理路径
  let pathname = url.pathname;
  if (pathname.endsWith('.rsc')) {
    pathname = pathname.slice(0, -4) || '/';
  }
  
  // 动态导入页面组件（基于路径）
  let PageComponent;
  let params = {};
  
  try {
    // 简单的路由匹配
    if (pathname === '/') {
      const mod = await import('/app/page.tsx');
      PageComponent = mod.default;
    } else if (pathname === '/about') {
      const mod = await import('/app/about/page.tsx');
      PageComponent = mod.default;
    } else if (pathname === '/slow') {
      const mod = await import('/app/slow/page.tsx');
      PageComponent = mod.default;
    } else if (pathname === '/error-test') {
      const mod = await import('/app/error-test/page.tsx');
      PageComponent = mod.default;
    } else if (pathname === '/streaming-demo') {
      const mod = await import('/app/streaming-demo/page.tsx');
      PageComponent = mod.default;
    } else if (pathname === '/streaming-demo/blocking') {
      const mod = await import('/app/streaming-demo/blocking/page.tsx');
      PageComponent = mod.default;
    } else if (pathname.startsWith('/blog/')) {
      const slug = pathname.slice(6);
      const mod = await import('/app/blog/[slug]/page.tsx');
      PageComponent = mod.default;
      params = { slug };
    } else if (pathname.startsWith('/user/')) {
      const id = pathname.slice(6);
      const mod = await import('/app/user/[id]/page.tsx');
      PageComponent = mod.default;
      params = { id };
    } else {
      // 404
      const mod = await import('/app/not-found.tsx');
      PageComponent = mod.default;
    }
  } catch (e) {
    console.error('Failed to load page:', e);
    const mod = await import('/app/not-found.tsx');
    PageComponent = mod.default;
  }
  
  // 加载 Layout
  const layoutMod = await import('/app/layout.tsx');
  const Layout = layoutMod.default;
  
  // 构建完整的页面树
  const root = React.createElement(
    Layout,
    null,
    React.createElement(PageComponent, { params })
  );
  
  // 创建 RSC Payload
  const rscPayload = {
    root,
    pathname,
    params,
  };
  
  // 序列化为 RSC stream
  const rscStream = renderToReadableStream(rscPayload);
  
  // 如果是 RSC 请求，直接返回 RSC stream
  if (isRsc) {
    return new Response(rscStream, {
      headers: {
        'Content-Type': 'text/x-component;charset=utf-8',
      },
    });
  }
  
  // 否则，委托给 SSR 环境进行 HTML 渲染
  const ssrModule = await import.meta.viteRsc.loadModule('ssr', 'index');
  const result = await ssrModule.renderHTML(rscStream, { pathname, params });
  
  return new Response(result.stream, {
    status: result.status || 200,
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

/**
 * SSR 入口代码
 */
export const SSR_ENTRY_CODE = `
import { createFromReadableStream } from '@vitejs/plugin-rsc/ssr';
import React from 'react';
import { renderToReadableStream } from 'react-dom/server.edge';
import { injectRSCPayload } from 'rsc-html-stream/server';

export async function renderHTML(rscStream, options = {}) {
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
  let status;
  
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
function updateState() {
  const url = new URL(window.location.href);
  window.__LASTJS_STATE__ = {
    pathname: url.pathname,
    params: {}, // RSC 模式下暂不支持从客户端获取 params
    searchParams: url.searchParams,
  };
  notifySubscribers();
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
  
  // 从 SSR 注入的 RSC stream 反序列化
  const initialPayload = await createFromReadableStream(rscStream);
  
  // 获取 RSC payload
  async function fetchRscPayload() {
    const url = new URL(window.location.href);
    url.searchParams.set('_rsc', '1');
    
    const payload = await createFromFetch(
      fetch(url.toString(), {
        headers: { Accept: 'text/x-component' },
      })
    );
    if (setPayload) {
      setPayload(payload);
    }
  }
  
  // 设置全局路由器
  window.__LASTJS_ROUTER__ = {
    push: async (href) => {
      history.pushState(null, '', href);
      updateState();
      await fetchRscPayload();
    },
    replace: async (href) => {
      history.replaceState(null, '', href);
      updateState();
      await fetchRscPayload();
    },
    back: () => history.back(),
    forward: () => history.forward(),
    prefetch: async (href) => {
      // RSC 模式下的预加载
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
        updateState();
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
export function createRscVirtualPlugin(): Plugin {
  return {
    name: 'lastjs:rsc-virtual-entries',
    enforce: 'pre', // 确保在其他插件之前运行

    resolveId(id) {
      // 处理带或不带 \0 前缀的虚拟模块 ID
      const cleanId = id.startsWith('\0') ? id.slice(1) : id;

      if (cleanId === VIRTUAL_RSC_ENTRY) return '\0' + VIRTUAL_RSC_ENTRY;
      if (cleanId === VIRTUAL_SSR_ENTRY) return '\0' + VIRTUAL_SSR_ENTRY;
      if (cleanId === VIRTUAL_BROWSER_ENTRY)
        return '\0' + VIRTUAL_BROWSER_ENTRY;
      return null;
    },

    load(id) {
      if (id === '\0' + VIRTUAL_RSC_ENTRY) return RSC_ENTRY_CODE;
      if (id === '\0' + VIRTUAL_SSR_ENTRY) return SSR_ENTRY_CODE;
      if (id === '\0' + VIRTUAL_BROWSER_ENTRY) return BROWSER_ENTRY_CODE;
      return null;
    },
  };
}
