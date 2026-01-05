/**
 * Last.js 客户端模块
 *
 * 提供客户端路由相关的组件和 hooks
 *
 * @example
 * ```tsx
 * import { Link, useRouter, usePathname, useParams, useSearchParams } from 'lastjs/client';
 * ```
 */

// 组件
export { Link } from './link.js';
export type { LinkProps } from './link.js';

// Hooks
export { useRouter, usePathname, useParams, useSearchParams } from './hooks.js';

// Context (内部使用，但也导出供高级用户使用)
export { RouterProvider, useRouterContext } from './context.js';
export type {
  Router,
  RouterState,
  RouterContextValue,
  RouterProviderProps,
} from './context.js';

// Router (内部使用)
export {
  ClientRouter,
  clientRouter,
  parseParams,
  prefetchModule,
} from './router.js';
export type {
  PageComponent,
  LayoutComponent,
  RouteModule,
  NavigationResult,
} from './router.js';
