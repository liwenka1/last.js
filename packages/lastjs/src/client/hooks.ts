'use client';

import { useMemo, useState, useEffect } from 'react';
import type { Router } from './context.js';

/**
 * 检测是否在浏览器环境
 */
const isBrowser = typeof window !== 'undefined';

/**
 * 声明 window 上的 Last.js 全局变量
 */
declare global {
  interface Window {
    __LASTJS_ROUTER__?: Router;
    __LASTJS_STATE__?: {
      pathname: string;
      params: Record<string, string>;
      searchParams: URLSearchParams;
    };
    __LASTJS_SUBSCRIBE__?: (callback: () => void) => () => void;
    __LASTJS_STATE_VERSION__?: number;
  }
}

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
 * 获取当前 pathname
 */
function getCurrentPathname(): string {
  if (!isBrowser) return '/';
  return window.__LASTJS_STATE__?.pathname ?? window.location.pathname;
}

/**
 * 获取当前 params
 */
function getCurrentParams(): Record<string, string> {
  if (!isBrowser) return {};
  return window.__LASTJS_STATE__?.params ?? {};
}

/**
 * 获取当前 searchParams
 */
function getCurrentSearchParams(): URLSearchParams {
  if (!isBrowser) return new URLSearchParams();
  return (
    window.__LASTJS_STATE__?.searchParams ??
    new URLSearchParams(window.location.search)
  );
}

/**
 * 使用路由状态的 hook
 * 订阅全局状态变化并在变化时重新渲染
 */
function useRouteState<T>(getter: () => T): T {
  const [state, setState] = useState<T>(getter);

  useEffect(() => {
    // 组件挂载时更新状态（确保 hydration 后状态正确）
    setState(getter());

    // 订阅状态变化
    if (window.__LASTJS_SUBSCRIBE__) {
      return window.__LASTJS_SUBSCRIBE__(() => {
        setState(getter());
      });
    }

    // 回退：监听 popstate 事件
    const handler = () => setState(getter());
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, []);

  return state;
}

/**
 * useRouter - 获取路由器实例
 *
 * @example
 * ```tsx
 * import { useRouter } from 'lastjs/client';
 *
 * function MyComponent() {
 *   const router = useRouter();
 *
 *   const handleClick = () => {
 *     router.push('/about');
 *   };
 *
 *   return <button onClick={handleClick}>Go to About</button>;
 * }
 * ```
 */
export function useRouter(): Router {
  // 在客户端使用全局路由器
  if (isBrowser && window.__LASTJS_ROUTER__) {
    return window.__LASTJS_ROUTER__;
  }
  return serverRouter;
}

/**
 * usePathname - 获取当前路径
 *
 * @example
 * ```tsx
 * import { usePathname } from 'lastjs/client';
 *
 * function NavLink({ href, children }) {
 *   const pathname = usePathname();
 *   const isActive = pathname === href;
 *
 *   return (
 *     <a href={href} className={isActive ? 'active' : ''}>
 *       {children}
 *     </a>
 *   );
 * }
 * ```
 */
export function usePathname(): string {
  return useRouteState(getCurrentPathname);
}

/**
 * useParams - 获取动态路由参数
 *
 * @example
 * ```tsx
 * // 在 /blog/[slug]/page.tsx 中
 * import { useParams } from 'lastjs/client';
 *
 * function BlogPost() {
 *   const params = useParams();
 *   // 访问 /blog/hello-world 时
 *   // params = { slug: 'hello-world' }
 *
 *   return <h1>Post: {params.slug}</h1>;
 * }
 * ```
 */
export function useParams<
  T extends Record<string, string> = Record<string, string>,
>(): T {
  return useRouteState(getCurrentParams) as T;
}

/**
 * useSearchParams - 获取 URL 查询参数
 *
 * @example
 * ```tsx
 * import { useSearchParams } from 'lastjs/client';
 *
 * function SearchPage() {
 *   const searchParams = useSearchParams();
 *   const query = searchParams.get('q');
 *   const page = searchParams.get('page') || '1';
 *
 *   return (
 *     <div>
 *       <p>Search: {query}</p>
 *       <p>Page: {page}</p>
 *     </div>
 *   );
 * }
 * ```
 */
export function useSearchParams(): URLSearchParams {
  const searchParams = useRouteState(getCurrentSearchParams);
  return useMemo(
    () => new URLSearchParams(searchParams.toString()),
    [searchParams]
  );
}
