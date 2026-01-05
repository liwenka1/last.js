'use client';

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react';

/**
 * 路由状态
 */
export interface RouterState {
  /** 当前路径 */
  pathname: string;
  /** 路由参数 */
  params: Record<string, string>;
  /** 查询参数 */
  searchParams: URLSearchParams;
}

/**
 * 路由器接口
 */
export interface Router {
  /** 导航到指定路径 */
  push: (href: string) => Promise<void>;
  /** 替换当前路径（不添加历史记录） */
  replace: (href: string) => Promise<void>;
  /** 后退 */
  back: () => void;
  /** 前进 */
  forward: () => void;
  /** 预加载页面 */
  prefetch: (href: string) => Promise<void>;
  /** 刷新当前页面 */
  refresh: () => Promise<void>;
}

/**
 * RouterContext 值
 */
export interface RouterContextValue {
  state: RouterState;
  router: Router;
}

// 创建 Context（用于 SSR 和直接使用 RouterProvider 的场景）
const RouterContext = createContext<RouterContextValue | null>(null);

/**
 * 检测是否在浏览器环境
 */
const isBrowser = typeof window !== 'undefined';

/**
 * 服务端默认路由器（空操作）
 */
const serverRouter: Router = {
  push: async () => {},
  replace: async () => {},
  back: () => {},
  forward: () => {},
  prefetch: async () => {},
  refresh: async () => {},
};

/**
 * 服务端默认状态
 */
const serverState: RouterState = {
  pathname: '/',
  params: {},
  searchParams: new URLSearchParams(),
};

/**
 * 声明 window 上的 Last.js 全局变量
 */
declare global {
  interface Window {
    __LASTJS_ROUTER_CONTEXT__?: React.Context<RouterContextValue | null>;
  }
}

/**
 * 获取 RouterContext
 * 在服务端返回默认值，避免报错
 * 在客户端优先使用 window.__LASTJS_ROUTER_CONTEXT__
 */
export function useRouterContext(): RouterContextValue {
  // 在客户端，优先使用客户端入口代码创建的 Context
  const runtimeContext =
    isBrowser && window.__LASTJS_ROUTER_CONTEXT__
      ? window.__LASTJS_ROUTER_CONTEXT__
      : RouterContext;

  // 使用 useContext 获取值
  // 注意：这里的 useContext 调用必须是无条件的
  const context = useContext(runtimeContext);

  // 服务端渲染时返回默认值
  if (!context) {
    if (!isBrowser) {
      return {
        state: serverState,
        router: serverRouter,
      };
    }
    throw new Error(
      'useRouter must be used within a RouterProvider. ' +
        'Make sure your component is wrapped with RouterProvider.'
    );
  }
  return context;
}

/**
 * RouterProvider Props
 */
export interface RouterProviderProps {
  children: ReactNode;
  /** 初始路径 */
  initialPathname?: string;
  /** 初始参数 */
  initialParams?: Record<string, string>;
  /** 导航回调 - 实际执行页面加载 */
  onNavigate?: (href: string, options?: { replace?: boolean }) => Promise<void>;
}

/**
 * 预加载缓存
 */
const prefetchCache = new Set<string>();

/**
 * RouterProvider 组件
 */
export function RouterProvider({
  children,
  initialPathname = '/',
  initialParams = {},
  onNavigate,
}: RouterProviderProps) {
  const [state, setState] = useState<RouterState>(() => {
    // 客户端初始化时从 window.location 获取
    if (typeof window !== 'undefined') {
      return {
        pathname: window.location.pathname,
        params: initialParams,
        searchParams: new URLSearchParams(window.location.search),
      };
    }
    return {
      pathname: initialPathname,
      params: initialParams,
      searchParams: new URLSearchParams(),
    };
  });

  // 监听浏览器前进/后退
  useEffect(() => {
    const handlePopState = () => {
      setState((prev) => ({
        ...prev,
        pathname: window.location.pathname,
        searchParams: new URLSearchParams(window.location.search),
      }));

      // 触发页面重新加载
      onNavigate?.(window.location.pathname + window.location.search, {
        replace: true,
      });
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [onNavigate]);

  // 导航实现
  const navigate = useCallback(
    async (href: string, options?: { replace?: boolean }) => {
      const url = new URL(href, window.location.origin);

      // 更新状态
      setState((prev) => ({
        ...prev,
        pathname: url.pathname,
        searchParams: new URLSearchParams(url.search),
      }));

      // 更新浏览器历史
      if (options?.replace) {
        window.history.replaceState(null, '', href);
      } else {
        window.history.pushState(null, '', href);
      }

      // 调用导航回调加载新页面
      await onNavigate?.(href, options);
    },
    [onNavigate]
  );

  // Router 方法
  const router: Router = {
    push: useCallback((href: string) => navigate(href), [navigate]),

    replace: useCallback(
      (href: string) => navigate(href, { replace: true }),
      [navigate]
    ),

    back: useCallback(() => {
      window.history.back();
    }, []),

    forward: useCallback(() => {
      window.history.forward();
    }, []),

    prefetch: useCallback(async (href: string) => {
      // 避免重复预加载
      if (prefetchCache.has(href)) return;
      prefetchCache.add(href);

      try {
        // 使用 link preload 预加载页面
        const link = document.createElement('link');
        link.rel = 'prefetch';
        link.href = href;
        document.head.appendChild(link);
      } catch {
        // 预加载失败不影响主流程
      }
    }, []),

    refresh: useCallback(async () => {
      await onNavigate?.(window.location.pathname + window.location.search, {
        replace: true,
      });
    }, [onNavigate]),
  };

  const value: RouterContextValue = {
    state,
    router,
  };

  return (
    <RouterContext.Provider value={value}>{children}</RouterContext.Provider>
  );
}

/**
 * 更新路由参数（内部使用）
 */
export function updateRouterParams(_params: Record<string, string>) {
  // 这个函数会在导航完成后被调用，更新 params
  // 实际实现会在 router.ts 中
}
