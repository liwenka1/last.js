'use client';

import { useMemo, useSyncExternalStore } from 'react';
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
 * 客户端订阅函数
 */
function subscribe(callback: () => void): () => void {
  if (!isBrowser || !window.__LASTJS_SUBSCRIBE__) {
    return () => {};
  }
  return window.__LASTJS_SUBSCRIBE__(callback);
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
  const pathname = useSyncExternalStore(
    subscribe,
    // getSnapshot: 获取当前状态
    () => window.__LASTJS_STATE__?.pathname ?? window.location.pathname,
    // getServerSnapshot: SSR 时返回默认值
    () => '/'
  );
  return pathname;
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
  const params = useSyncExternalStore(
    subscribe,
    () => window.__LASTJS_STATE__?.params ?? {},
    () => ({})
  );
  return params as T;
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
  const searchParams = useSyncExternalStore(
    subscribe,
    () =>
      window.__LASTJS_STATE__?.searchParams ??
      new URLSearchParams(window.location.search),
    () => new URLSearchParams()
  );
  return useMemo(
    () => new URLSearchParams(searchParams.toString()),
    [searchParams]
  );
}
